import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string(),
  DATABASE_URL: z.url(),
});

export function getEnv() {
  return EnvSchema.parse(process.env);
}
