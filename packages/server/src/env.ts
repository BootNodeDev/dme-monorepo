import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string(),
  DATABASE_URL: z.url(),
  MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  MESSAGES_PER_DISPATCH: z.coerce.number().int().positive().default(30),
  CLEANUP_CUTOFF: z.string().default("1w"),
  CLEANUP_CRON: z.string().default("0 0 * * *"),
  DISPATCH_CRON: z.string().default("* * * * * *"),
  OUT_OF_RANGE_CRON: z.string().default("0 * * * *"),
  UNCOLLECTED_FEES_CRON: z.string().default("0 */2 * * *"),
  SUMMARY_CRON: z.string().default("0 */3 * * *"),
});

export function getEnv() {
  return EnvSchema.parse(process.env);
}
