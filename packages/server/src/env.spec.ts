import ms from "ms";
import { getEnv } from "./env";

let previousEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  process.env = {
    BOT_TOKEN: "test-bot-token",
    DATABASE_URL: "postgresql://user:password@localhost:5432/dbname",
    LIMITER_INTERVAL: "2000",
    LIMITER_INTERVAL_CAP: "50",
    DISPATCH_CRON: "*/20 * * * * *",
  };
});

beforeAll(() => {
  previousEnv = process.env;
});

afterAll(() => {
  process.env = previousEnv;
});

describe("getEnv", () => {
  it("should parse and return environment variables", () => {
    expect(getEnv()).toEqual({
      BOT_TOKEN: "test-bot-token",
      DATABASE_URL: "postgresql://user:password@localhost:5432/dbname",
      LIMITER_INTERVAL: 2000,
      LIMITER_INTERVAL_CAP: 50,
      DISPATCH_CRON: "*/20 * * * * *",
    });
  });

  it("should fail if there is no bot token", () => {
    delete process.env.BOT_TOKEN;

    expect(() => getEnv()).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [
            "BOT_TOKEN"
          ],
          "message": "Invalid input: expected string, received undefined"
        }
      ]"
    `);
  });

  it("should fail if there is no database url", () => {
    delete process.env.DATABASE_URL;

    expect(() => getEnv()).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [
            "DATABASE_URL"
          ],
          "message": "Invalid input: expected string, received undefined"
        }
      ]"
    `);
  });

  it("should fail if the database url is not a valid url", () => {
    process.env.DATABASE_URL = "not-a-valid-url";

    expect(() => getEnv()).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          "code": "invalid_format",
          "format": "url",
          "path": [
            "DATABASE_URL"
          ],
          "message": "Invalid URL"
        }
      ]"
    `);
  });

  it("should use default values for limiter if not provided", () => {
    delete process.env.LIMITER_INTERVAL;
    delete process.env.LIMITER_INTERVAL_CAP;

    const env = getEnv();

    expect(env.LIMITER_INTERVAL).toEqual(ms("1s"));
    expect(env.LIMITER_INTERVAL_CAP).toEqual(30);
  });

  it("should fail if limiter interval and are not numbers", () => {
    process.env.LIMITER_INTERVAL = "abc";
    process.env.LIMITER_INTERVAL_CAP = "abc";

    expect(() => getEnv()).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          "expected": "number",
          "code": "invalid_type",
          "received": "NaN",
          "path": [
            "LIMITER_INTERVAL"
          ],
          "message": "Invalid input: expected number, received NaN"
        },
        {
          "expected": "number",
          "code": "invalid_type",
          "received": "NaN",
          "path": [
            "LIMITER_INTERVAL_CAP"
          ],
          "message": "Invalid input: expected number, received NaN"
        }
      ]"
    `);
  });

  it("should fail if limiter interval and cap are not positive integers", () => {
    process.env.LIMITER_INTERVAL = "0";
    process.env.LIMITER_INTERVAL_CAP = "0";

    expect(() => getEnv()).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          "origin": "number",
          "code": "too_small",
          "minimum": 0,
          "inclusive": false,
          "path": [
            "LIMITER_INTERVAL"
          ],
          "message": "Too small: expected number to be >0"
        },
        {
          "origin": "number",
          "code": "too_small",
          "minimum": 0,
          "inclusive": false,
          "path": [
            "LIMITER_INTERVAL_CAP"
          ],
          "message": "Too small: expected number to be >0"
        }
      ]"
    `);
  });

  it("should use default value for dispatch cron if not provided", () => {
    delete process.env.DISPATCH_CRON;

    expect(getEnv().DISPATCH_CRON).toEqual("*/30 * * * * *");
  });
});
