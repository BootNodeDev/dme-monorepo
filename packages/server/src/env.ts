import ms from "ms";
import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string(),
  DATABASE_URL: z.url(),
  LIMITER_INTERVAL: z.coerce.number().int().positive().default(ms("1s")),
  LIMITER_INTERVAL_CAP: z.coerce.number().int().positive().default(30),
  DISPATCH_CRON: z.string().default("*/30 * * * * *"),
  OUT_OF_RANGE_CRON: z.string().default("0 * * * *"),
});

export function getEnv() {
  return EnvSchema.parse(process.env);
}
