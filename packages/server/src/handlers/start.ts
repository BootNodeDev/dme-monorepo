import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import {
  UserAlreadyExistsError,
  UserService,
  UserWalletAlreadyExistsError,
} from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { formatAddress, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { FALLBACK_MESSAGE } from "./fallback";
import { Limiter } from "../limiter";

export function getStartHandler(
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

    let alreadyExists = false;

    try {
      await user.create(userId);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        alreadyExists = true;
      } else {
        logger.error({ error, userId }, "Error creating user");
        limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
        return;
      }
    }

    const address = ctx.message?.text.split(/\s+/)[1];

    logger.info({ userId, address }, "Start command executed");

    let walletAlreadySubscribed = false;

    if (address) {
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
      } catch (error) {
        if (error instanceof UserWalletAlreadyExistsError) {
          walletAlreadySubscribed = true;
        } else {
          logger.error({ error, userId, address }, "Error adding wallet to user");
          limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
          return;
        }
      }
    }

    const response: string[] = [];

    response.push(alreadyExists ? "Welcome back!" : "Welcome!");

    if (address && !walletAlreadySubscribed) {
      response.push(`You have successfully subscribed ${formatAddress(address)}`);
    }

    response.push(`${FALLBACK_MESSAGE}`);

    limiter.reply(ctx, response.join("\n\n"));
  };
}
