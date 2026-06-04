const { requireEnv } = require("../src/env.js");
const {
  createCorsMiddleware,
  getRequestOrigin,
  isAllowedCorsOrigin,
  normalizeCorsOrigin,
} = require("../src/http/cors-config.js");
const { createRateLimiter } = require("../src/http/rate-limit.js");
const { AUTO_LOGOUT_INTERVAL_MS, startActivityCleanup } = require("../src/jobs/activity-cleanup.js");
const roomServices = require("../src/rooms/room-services.js");
const userServices = require("../src/user/user-services.js");

describe("infrastructure helpers", () => {
  const originalRequiredValue = process.env.REQUIRED_TEST_VALUE;

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();

    if (originalRequiredValue === undefined) {
      delete process.env.REQUIRED_TEST_VALUE;
    } else {
      process.env.REQUIRED_TEST_VALUE = originalRequiredValue;
    }
  });

  test("requireEnv returns configured values and rejects missing values", () => {
    process.env.REQUIRED_TEST_VALUE = "present";
    expect(requireEnv("REQUIRED_TEST_VALUE")).toBe("present");

    delete process.env.REQUIRED_TEST_VALUE;
    expect(() => requireEnv("REQUIRED_TEST_VALUE")).toThrow(
      "REQUIRED_TEST_VALUE environment variable is required."
    );
  });

  test("cors helpers normalize malformed origins and derive request origins", () => {
    expect(normalizeCorsOrigin("https://example.com///")).toBe("https://example.com");
    expect(normalizeCorsOrigin("not a url///")).toBe("not a url");
    expect(isAllowedCorsOrigin("http://localhost:9999")).toBe(true);

    expect(
      getRequestOrigin({
        protocol: "http",
        headers: {
          host: "local.test",
          "x-forwarded-host": "forwarded.test, ignored.test",
          "x-forwarded-proto": "https, http",
        },
      })
    ).toBe("https://forwarded.test");
  });

  test("cors middleware rejects disallowed origins", (done) => {
    const middleware = createCorsMiddleware();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const req = {
      headers: {
        origin: "https://evil.example",
        host: "api.example",
      },
      method: "GET",
      protocol: "https",
    };
    const res = {
      end: jest.fn(),
      getHeader: jest.fn(),
      setHeader: jest.fn(),
    };

    middleware(req, res, (error) => {
      expect(error.message).toBe("Not allowed by CORS");
      console.warn.mockRestore();
      done();
    });
  });

  test("rate limiter allows fresh windows and blocks excess requests", () => {
    jest.useFakeTimers();
    const limiter = createRateLimiter({
      keyGenerator: () => "client-1",
      maxRequests: 1,
      message: "Slow down",
      windowMs: 1000,
    });
    const req = { headers: {} };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    limiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: "Slow down" });

    jest.advanceTimersByTime(1001);
    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test("activity cleanup starts an unrefed interval and handles service failures", () => {
    jest.useFakeTimers();
    jest.spyOn(userServices, "logoutInactiveUsers").mockRejectedValue(new Error("users failed"));
    jest.spyOn(roomServices, "pruneInactiveRooms").mockRejectedValue(new Error("rooms failed"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const interval = startActivityCleanup();

    expect(typeof interval.unref).toBe("function");
    jest.advanceTimersByTime(AUTO_LOGOUT_INTERVAL_MS);

    return Promise.resolve().then(() => {
      expect(userServices.logoutInactiveUsers).toHaveBeenCalled();
      expect(roomServices.pruneInactiveRooms).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      console.error.mockRestore();
    });
  });
});
