const jwt = require("jsonwebtoken");
const supertest = require("supertest");

const { createApp } = require("../src/app/createApp.js");
const { createRateLimiter } = require("../src/http/rate-limit.js");
const userModel = require("../src/user/user.js");

const originalBackendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
const originalBackendAuthToken = process.env.BACKEND_AUTH_TOKEN;
const originalTokenSecret = process.env.TOKEN_SECRET;
const originalSameSite = process.env.AUTH_COOKIE_SAME_SITE;
const originalSkipDotenv = process.env.SKIP_DOTENV;

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function makeFrontendToken(payload = {}) {
  return jwt.sign(
    {
      type: "frontend-user",
      userId: "user-1",
      username: "Captain",
      sessionId: "session-1",
      ...payload,
    },
    process.env.TOKEN_SECRET
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SKIP_DOTENV = "true";
  process.env.TOKEN_SECRET = "test-token-secret";
  process.env.BACKEND_ACCESS_TOKEN = "test-backend-access-token";
});

afterAll(() => {
  restoreEnv("BACKEND_ACCESS_TOKEN", originalBackendAccessToken);
  restoreEnv("BACKEND_AUTH_TOKEN", originalBackendAuthToken);
  restoreEnv("TOKEN_SECRET", originalTokenSecret);
  restoreEnv("AUTH_COOKIE_SAME_SITE", originalSameSite);
  restoreEnv("SKIP_DOTENV", originalSkipDotenv);
});

test("rate limiter default key uses forwarded ip, direct ip, socket address, and unknown fallback", () => {
  const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  limiter({ headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } }, res, next);
  limiter({ headers: { "x-forwarded-for": "1.2.3.4" } }, res, next);
  expect(res.status).toHaveBeenCalledWith(429);

  limiter({ headers: {}, ip: "9.9.9.9" }, res, next);
  limiter({ headers: {}, socket: { remoteAddress: "8.8.8.8" } }, res, next);
  limiter({ headers: {} }, res, next);
  expect(next).toHaveBeenCalledTimes(4);
});

test("signin covers missing shared token, invalid json credentials, explicit sameSite, and json signout", async () => {
  const app = createApp({ startCleanup: false });

  delete process.env.BACKEND_ACCESS_TOKEN;
  delete process.env.BACKEND_AUTH_TOKEN;
  await supertest(app)
    .post("/signin")
    .set("Accept", "application/json")
    .send({ token: "anything" })
    .expect(500);

  process.env.BACKEND_ACCESS_TOKEN = "test-backend-access-token";
  await supertest(app)
    .post("/signin")
    .set("Accept", "application/json")
    .send({ token: "wrong" })
    .expect(401);

  process.env.AUTH_COOKIE_SAME_SITE = "strict";
  const signinResult = await supertest(app)
    .post("/signin")
    .set("Accept", "application/json")
    .send({ token: "test-backend-access-token" })
    .expect(200);
  expect(signinResult.headers["set-cookie"][0]).toContain("SameSite=Strict");

  await supertest(app).post("/signout").set("Accept", "application/json").expect(204);
});

test("authentication handles fallback shared token, malformed bearer headers, invalid token types, and html redirects", async () => {
  const app = createApp({ startCleanup: false });

  delete process.env.BACKEND_ACCESS_TOKEN;
  process.env.BACKEND_AUTH_TOKEN = "fallback-token";
  userModel.find = jest.fn().mockResolvedValue([]);
  await supertest(app).get("/users").set("Authorization", "Bearer fallback-token").expect(200);

  await supertest(app)
    .get("/users")
    .set("Accept", "application/json")
    .set("Authorization", "Basic fallback-token")
    .expect(401);

  const invalidTypeToken = jwt.sign({ type: "not-supported" }, process.env.TOKEN_SECRET);
  await supertest(app)
    .get("/users")
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${invalidTypeToken}`)
    .expect(401);

  await supertest(app).get("/users").set("Accept", "text/html").expect(302).expect((result) => {
    expect(result.headers.location).toBe("/signin?next=%2Fusers");
  });
});

test("frontend-user authentication rejects missing, inactive, and stale sessions", async () => {
  const app = createApp({ startCleanup: false });

  userModel.findById = jest.fn().mockResolvedValueOnce(null);
  await supertest(app)
    .get("/users/me")
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${makeFrontendToken()}`)
    .expect(401);

  userModel.findById = jest.fn().mockResolvedValueOnce({ _id: "user-1", status: 0 });
  await supertest(app)
    .get("/users/me")
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${makeFrontendToken()}`)
    .expect(401);

  userModel.findById = jest.fn().mockResolvedValueOnce({
    _id: "user-1",
    status: 1,
    activeSessions: {
      "session-1": new Date(Date.now() - 120000).toISOString(),
      "session-2": new Date().toISOString(),
    },
  });
  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  await supertest(app)
    .get("/users/me")
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${makeFrontendToken()}`)
    .expect(401);
  expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
    "user-1",
    expect.objectContaining({
      status: 1,
      activeSessions: expect.objectContaining({ "session-2": expect.any(String) }),
    })
  );
});
