import { getEnv } from "./env";

let previousEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  process.env = {
    BOT_TOKEN: "test-bot-token",
    DATABASE_URL: "postgresql://user:password@localhost:5432/dbname",
    MAX_ATTEMPTS: "5",
    MESSAGES_PER_DISPATCH: "30",
    DISPATCH_CRON: "* * * * * *",
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
      DISPATCH_CRON: "* * * * * *",
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
});
