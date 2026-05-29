const originalSkipDotenv = process.env.SKIP_DOTENV;
const originalBackendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
const originalCorsOrigin = process.env.CORS_ORIGIN;
const originalRequireBackendAccessToken = process.env.REQUIRE_BACKEND_ACCESS_TOKEN;
const originalTokenSecret = process.env.TOKEN_SECRET;

process.env.SKIP_DOTENV = "true";
process.env.BACKEND_ACCESS_TOKEN = "test-backend-access-token";
process.env.CORS_ORIGIN = "https://polite-sea-008d19c10.7.azurestaticapps.net/";
process.env.TOKEN_SECRET = "test-token-secret";

const supertest = require("supertest");
const mockingoose = require("mockingoose").default;
const backend = require("../src/backend.js");
const userModel = require("../src/user/user.js");
const bcrypt = require("bcrypt");

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockingoose.resetAll();
});

afterAll(() => {
  restoreEnv("SKIP_DOTENV", originalSkipDotenv);
  restoreEnv("BACKEND_ACCESS_TOKEN", originalBackendAccessToken);
  restoreEnv("CORS_ORIGIN", originalCorsOrigin);
  restoreEnv("REQUIRE_BACKEND_ACCESS_TOKEN", originalRequireBackendAccessToken);
  restoreEnv("TOKEN_SECRET", originalTokenSecret);
});

test("signin page is public", async () => {
  const result = await supertest(backend.app).get("/signin").expect(200);

  expect(result.text).toContain("Backend Sign In");
});

test("deployed frontend origin can make credentialed cors requests", async () => {
  const result = await supertest(backend.app)
    .options("/users/login")
    .set("Origin", "https://polite-sea-008d19c10.7.azurestaticapps.net")
    .set("Access-Control-Request-Method", "POST")
    .expect(204);

  expect(result.headers["access-control-allow-origin"]).toBe(
    "https://polite-sea-008d19c10.7.azurestaticapps.net"
  );
  expect(result.headers["access-control-allow-credentials"]).toBe("true");
});

test("local frontend origin can use any dev port for credentialed cors requests", async () => {
  const result = await supertest(backend.app)
    .options("/users/login")
    .set("Origin", "http://localhost:5174")
    .set("Access-Control-Request-Method", "POST")
    .expect(204);

  expect(result.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
  expect(result.headers["access-control-allow-credentials"]).toBe("true");
});

test("backend same-origin signin form post is not blocked by cors", async () => {
  const result = await supertest(backend.app)
    .post("/signin")
    .set("Host", "crabrave-g0ave8bxcmgxasa0.westus3-01.azurewebsites.net")
    .set("X-Forwarded-Proto", "https")
    .set("Origin", "https://crabrave-g0ave8bxcmgxasa0.westus3-01.azurewebsites.net")
    .type("form")
    .send({ token: "test-backend-access-token", next: "/users" })
    .expect(302);

  expect(result.headers.location).toBe("/users");
  expect(result.headers["set-cookie"][0]).toContain("backendAuthToken=");
});

test("api request without backend access token is allowed", async () => {
  mockingoose(userModel).toReturn([], "find");

  const result = await supertest(backend.app)
    .get("/users")
    .set("Accept", "application/json")
    .expect(200);

  expect(result.body).toStrictEqual([]);
});

test("backend access token can be required with env flag", async () => {
  process.env.REQUIRE_BACKEND_ACCESS_TOKEN = "true";

  try {
    const result = await supertest(backend.app)
      .get("/users")
      .set("Accept", "application/json")
      .expect(401);

    expect(result.body.error).toBe("Authentication required.");
  } finally {
    restoreEnv("REQUIRE_BACKEND_ACCESS_TOKEN", originalRequireBackendAccessToken);
  }
});

test("frontend login does not require backend access token", async () => {
  const existingUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "frontend-user",
    passWord: await bcrypt.hash("password123", 10),
    status: 0,
    favorites: [],
    crab: [],
  };

  mockingoose(userModel).toReturn(existingUser, "findOne");
  mockingoose(userModel).toReturn({ ...existingUser, status: 1 }, "findOneAndUpdate");

  const result = await supertest(backend.app)
    .post("/users/login")
    .send({ username: "frontend-user", password: "password123" })
    .expect(200);

  expect(result.body.status).toBe(1);
  expect(result.body.accessToken).toBeUndefined();
  expect(result.headers["set-cookie"][0]).toContain("userAuthToken=");
});

test("frontend user auth cookie can access protected routes", async () => {
  const existingUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "frontend-user",
    passWord: await bcrypt.hash("password123", 10),
    status: 0,
    favorites: [],
    crab: [],
  };

  mockingoose(userModel).toReturn(existingUser, "findOne");
  mockingoose(userModel).toReturn({ ...existingUser, status: 1 }, "findOneAndUpdate");

  const loginResult = await supertest(backend.app)
    .post("/users/login")
    .send({ username: "frontend-user", password: "password123" })
    .expect(200);

  mockingoose(userModel).toReturn([], "find");

  const usersResult = await supertest(backend.app)
    .get("/users")
    .set("Cookie", loginResult.headers["set-cookie"])
    .expect(200);

  expect(usersResult.body).toStrictEqual([]);
});

test("current user profile comes from the frontend user session", async () => {
  const existingUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "frontend-user",
    passWord: await bcrypt.hash("password123", 10),
    status: 0,
    favorites: [],
    crab: { color: "#3498db", hat: "pirate_captain_hat.png" },
  };

  mockingoose(userModel).toReturn(existingUser, "findOne");
  mockingoose(userModel).toReturn({ ...existingUser, status: 1 }, "findOneAndUpdate");

  const loginResult = await supertest(backend.app)
    .post("/users/login")
    .send({ username: "frontend-user", password: "password123" })
    .expect(200);

  const signinResult = await supertest(backend.app)
    .post("/signin")
    .type("form")
    .send({ token: "test-backend-access-token", next: "/users" })
    .expect(302);

  mockingoose(userModel).toReturn({ ...existingUser, status: 1 }, "findOne");

  const cookies = [...signinResult.headers["set-cookie"], ...loginResult.headers["set-cookie"]].map(
    (cookie) => cookie.split(";")[0]
  );

  const profileResult = await supertest(backend.app)
    .get("/users/me")
    .set("Cookie", cookies)
    .expect(200);

  expect(profileResult.body.userName).toBe("frontend-user");
  expect(profileResult.body.passWord).toBeUndefined();
  expect(profileResult.body.crab).toStrictEqual(existingUser.crab);
});

test("frontend signup creates an authenticated user session", async () => {
  const createdUser = {
    _id: "507f1f77bcf86cd799439012",
    userName: "new-frontend-user",
    passWord: "hashedpassword",
    status: 0,
    favorites: [],
    crab: [],
  };

  mockingoose(userModel).toReturn(null, "findOne");
  mockingoose(userModel).toReturn(createdUser, "save");

  const result = await supertest(backend.app)
    .post("/users")
    .send({ username: "new-frontend-user", password: "password123" })
    .expect(201);

  expect(result.body.userName).toBe("new-frontend-user");
  expect(result.body.authenticated).toBe(true);
  expect(result.body.passWord).toBeUndefined();
  expect(result.headers["set-cookie"][0]).toContain("userAuthToken=");
});

test("browser request without backend access token is allowed", async () => {
  mockingoose(userModel).toReturn([], "find");

  const result = await supertest(backend.app).get("/users").set("Accept", "text/html").expect(200);

  expect(result.body).toStrictEqual([]);
});

test("invalid bearer token is ignored when backend access token is disabled", async () => {
  mockingoose(userModel).toReturn([], "find");

  const result = await supertest(backend.app)
    .get("/users")
    .set("Accept", "application/json")
    .set("Authorization", "Bearer invalid-token")
    .expect(200);

  expect(result.body).toStrictEqual([]);
});

test("current user profile still requires a frontend user session", async () => {
  const result = await supertest(backend.app)
    .get("/users/me")
    .set("Accept", "application/json")
    .expect(401);

  expect(result.body.error).toBe("User session required.");
});

test("protected request accepts shared backend access token", async () => {
  mockingoose(userModel).toReturn([], "find");

  const result = await supertest(backend.app)
    .get("/users")
    .set("Authorization", "Bearer test-backend-access-token")
    .expect(200);

  expect(result.body).toStrictEqual([]);
});

test("signin returns a jwt that can access protected routes", async () => {
  mockingoose(userModel).toReturn([], "find");

  const signinResult = await supertest(backend.app)
    .post("/signin")
    .set("Accept", "application/json")
    .send({ token: "test-backend-access-token" })
    .expect(200);

  expect(signinResult.body.tokenType).toBe("Bearer");
  expect(signinResult.body.token).toBeTruthy();

  const usersResult = await supertest(backend.app)
    .get("/users")
    .set("Authorization", `Bearer ${signinResult.body.token}`)
    .expect(200);

  expect(usersResult.body).toStrictEqual([]);
});

test("signin form sets an auth cookie for browser access", async () => {
  mockingoose(userModel).toReturn([], "find");

  const signinResult = await supertest(backend.app)
    .post("/signin")
    .type("form")
    .send({ token: "test-backend-access-token", next: "/users" })
    .expect(302);

  expect(signinResult.headers.location).toBe("/users");
  expect(signinResult.headers["set-cookie"][0]).toContain("backendAuthToken=");

  const usersResult = await supertest(backend.app)
    .get("/users")
    .set("Cookie", signinResult.headers["set-cookie"])
    .expect(200);

  expect(usersResult.body).toStrictEqual([]);
});

test("signout link clears the auth cookie and redirects to signin", async () => {
  const result = await supertest(backend.app)
    .get("/signout")
    .set("Cookie", ["backendAuthToken=test-token", "userAuthToken=test-user-token"])
    .expect(302);

  expect(result.headers.location).toBe("/signin");
  expect(result.headers["set-cookie"].join(";")).toContain("backendAuthToken=");
  expect(result.headers["set-cookie"].join(";")).toContain("userAuthToken=");
});
