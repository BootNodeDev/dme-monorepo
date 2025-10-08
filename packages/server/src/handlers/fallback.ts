import { Context } from "grammy";
import { Logger } from "pino";
import { ReplyFn } from "../limiter";

export const FALLBACK_MESSAGE = `Available commands:

/start <wallet_address> 
  - Start the bot and optionally add your first wallet

/add <wallet_address> 
  - Add a wallet to your account

/list 
  - List all your wallets

/remove <wallet_address> 
  - Remove a wallet from your account

/help 
  - Show this help message`;

export function getFallbackHandler(logger: Logger, reply: ReplyFn) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id;
    const message = ctx.message?.text;

    logger.info({ userId, message });

    reply(ctx, FALLBACK_MESSAGE);
  };
}
