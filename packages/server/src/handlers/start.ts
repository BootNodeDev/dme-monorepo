import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { formatAddress, getUserIdFromCtx, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { Limiter } from "../limiter";

export function getStartHandler(
  logger: Logger,
  limiter: Limiter,
  user: UserService,
  wallet: WalletService,
) {
  return async (ctx: CommandContext<Context>) => {
    try {
      const userId = getUserIdFromCtx(ctx);

      await user.upsert(userId);

      const address = ctx.message?.text.split(/\s+/)[1];

      logger.info({ userId, address }, "Start command executed");

      if (address) {
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
      }

      const msg: string[] = [];

      msg.push("Welcome!");

      if (address) {
        msg.push(`You have successfully subscribed ${formatAddress(address)}`);
      }

      limiter.reply(ctx, msg.join("\n\n"));
    } catch (error) {
      logger.error({ error, ctx });

      limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
    }
  };
}
