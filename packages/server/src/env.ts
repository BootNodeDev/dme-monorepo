import ms from "ms";
import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string(),
  DATABASE_URL: z.url(),
  LIMITER_INTERVAL: z.coerce.number().int().positive().default(ms("1s")),
  LIMITER_INTERVAL_CAP: z.coerce.number().int().positive().default(30),
  DISPATCH_CRON: z.string().default("* * * * * *"),
  OUT_OF_RANGE_CRON: z.string().default("0 * * * *"),
  UNCOLLECTED_FEES_CRON: z.string().default("0 */2 * * *"),
  MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  MESSAGES_PER_DISPATCH: z.coerce.number().int().positive().default(30),
});

export function getEnv() {
  return EnvSchema.parse(process.env);
}
