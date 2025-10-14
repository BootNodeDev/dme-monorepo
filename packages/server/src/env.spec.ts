import { getEnv } from "./env";

let previousEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  process.env = {
    BOT_TOKEN: "test-bot-token",
    DATABASE_URL: "postgresql://user:password@localhost:5432/dbname",
    MAX_ATTEMPTS: "5",
    MESSAGES_PER_DISPATCH: "30",
    CLEANUP_CRON: "0 0 * * *",
    CLEANUP_CUTOFF: "1w",
    DISPATCH_CRON: "* * * * * *",
    OUT_OF_RANGE_CRON: "* * * * * *",
    UNCOLLECTED_FEES_CRON: "* * * * * *",
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
      MAX_ATTEMPTS: 5,
      MESSAGES_PER_DISPATCH: 30,
      CLEANUP_CRON: "0 0 * * *",
      CLEANUP_CUTOFF: "1w",
      DISPATCH_CRON: "* * * * * *",
      OUT_OF_RANGE_CRON: "* * * * * *",
      UNCOLLECTED_FEES_CRON: "* * * * * *",
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

  it("should use default value for dispatch cron if not provided", () => {
    delete process.env.DISPATCH_CRON;

    expect(getEnv().DISPATCH_CRON).toEqual("* * * * * *");
  });

  it("should use default value for cleanup cron if not provided", () => {
    delete process.env.CLEANUP_CRON;

    expect(getEnv().CLEANUP_CRON).toEqual("0 0 * * *");
  });

  it("should use default value for cleanup cutoff if not provided", () => {
    delete process.env.CLEANUP_CUTOFF;

    expect(getEnv().CLEANUP_CUTOFF).toEqual("1w");
  });

  it("should use default value for max attempts if not provided", () => {
    delete process.env.MAX_ATTEMPTS;

    expect(getEnv().MAX_ATTEMPTS).toEqual(5);
  });

  it("should use default value for messages per dispatch if not provided", () => {
    delete process.env.MESSAGES_PER_DISPATCH;

    expect(getEnv().MESSAGES_PER_DISPATCH).toEqual(30);
  });

  it("should fail if max attempts is not a positive integer", () => {
    process.env.MAX_ATTEMPTS = "0";

    expect(() => getEnv()).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          "origin": "number",
          "code": "too_small",
          "minimum": 0,
          "inclusive": false,
          "path": [
            "MAX_ATTEMPTS"
          ],
          "message": "Too small: expected number to be >0"
        }
      ]"
    `);
  });
});
