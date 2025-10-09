import { CommandContext, Context } from "grammy";
import { Logger } from "pino";

export const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again later.";

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getUserIdFromCtx(ctx: CommandContext<Context>) {
  const userId = ctx.from?.id;

  if (!userId) {
    throw new Error("No user ID found in the context");
  }

  return userId;
}
