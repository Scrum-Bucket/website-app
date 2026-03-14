const backend = require("../src/backend.js");
const supertest = require("supertest");

test("test app runs", async() => {
    const result = await supertest(backend.app).get("/").expect(200);
    expect(result.text).toBe("Backend running.");
});