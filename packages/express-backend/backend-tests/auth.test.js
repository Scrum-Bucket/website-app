const originalSkipDotenv = process.env.SKIP_DOTENV;
const originalBackendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
const originalCorsOrigin = process.env.CORS_ORIGIN;
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

test("protected api request without token is rejected", async () => {
  const result = await supertest(backend.app)
    .get("/users")
    .set("Accept", "application/json")
    .expect(401);

  expect(result.body.error).toBe("Authentication required.");
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

test("protected browser request without token redirects to signin", async () => {
  const result = await supertest(backend.app)
    .get("/users")
    .set("Accept", "text/html")
    .expect(302);

  expect(result.headers.location).toBe("/signin?next=%2Fusers");
});

test("protected request rejects invalid bearer token", async () => {
  const result = await supertest(backend.app)
    .get("/users")
    .set("Accept", "application/json")
    .set("Authorization", "Bearer invalid-token")
    .expect(401);

  expect(result.body.error).toBe("Invalid or expired access token.");
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
