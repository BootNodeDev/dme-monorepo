import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { formatAddress, getUserIdFromCtx, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { Limiter } from "../limiter";

export function getAddHandler(
  logger: Logger,
  limiter: Limiter,
  user: UserService,
  wallet: WalletService,
) {
  return async (ctx: CommandContext<Context>) => {
    try {
      const userId = getUserIdFromCtx(ctx);

      const address = ctx.message?.text.split(/\s+/)[1];

      if (!address) {
        limiter.reply(ctx, "Please provide a wallet address.\n\nUsage: /add <address>");
        return;
      }

      try {
        await wallet.upsert(address);
      } catch (error) {
        if (error instanceof InvalidEthereumAddressError) {
          limiter.reply(ctx, "Please provide a valid Ethereum address.");
          return;
        }

        throw error;
      }

      await user.upsertWallet(userId, address);

      limiter.reply(ctx, `Successfully added ${formatAddress(address)}`);
    } catch (error) {
      logger.error({ error, ctx });

      limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
    }
  };
}
