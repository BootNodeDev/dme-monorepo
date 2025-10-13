import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string(),
  DATABASE_URL: z.url(),
  MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  MESSAGES_PER_DISPATCH: z.coerce.number().int().positive().default(30),
  DISPATCH_CRON: z.string().default("* * * * * *"),
});

export function getEnv() {
  return EnvSchema.parse(process.env);
}
