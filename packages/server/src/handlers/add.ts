import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService, UserWalletAlreadyExistsError } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { formatAddress, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { Limiter } from "../limiter";

export function getAddHandler(
  logger: Logger,
  limiter: Limiter,
  user: UserService,
  wallet: WalletService,
) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      logger.error("No user ID found in the context");
      limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
      return;
    }

    const address = ctx.message?.text.split(/\s+/)[1];

    if (!address) {
      limiter.reply(ctx, "Please provide a wallet address.\n\nUsage: /add <wallet_address>");
      return;
    }

    logger.info({ userId, address }, "Add command executed");

    try {
      await wallet.upsert(address);
    } catch (error) {
      if (error instanceof InvalidEthereumAddressError) {
        limiter.reply(ctx, "Please provide a valid Ethereum address.");
      } else {
        logger.error({ error, userId, address }, "Error upserting wallet");
        limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
      }
      return;
    }

    try {
      await user.addWallet(userId, address);
      limiter.reply(ctx, `Successfully added ${formatAddress(address)}.`);
    } catch (error) {
      if (error instanceof UserWalletAlreadyExistsError) {
        limiter.reply(ctx, `${formatAddress(address)} is already associated with your account.`);
      } else {
        logger.error({ error, userId, address }, "Error adding wallet to user");
        limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
      }
    }
  };
}
