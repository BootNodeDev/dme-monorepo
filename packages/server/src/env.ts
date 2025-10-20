import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string(),
  DATABASE_URL: z.url(),
  MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  MESSAGES_PER_DISPATCH: z.coerce.number().int().positive().default(30),
  CLEANUP_CUTOFF: z.string().default("1w"),
  CLEANUP_CRON: z.string().default("0 0 * * *"),
  DISPATCH_CRON: z.string().default("* * * * * *"),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  return EnvSchema.parse(process.env);
}
