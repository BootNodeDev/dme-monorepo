import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { formatAddress, getUserIdFromCtx, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { MessageService } from "../services/message";

export function getAddHandler(
  logger: Logger,
  message: MessageService,
  user: UserService,
  wallet: WalletService,
) {
  return async (ctx: CommandContext<Context>) => {
    try {
      const userId = getUserIdFromCtx(ctx);

      const address = ctx.message?.text.split(/\s+/)[1];

      if (!address) {
        await message.createForCtx("Please provide a wallet address.\n\nUsage: /add <address>", ctx);
        return;
      }

      try {
        await wallet.upsert(address);
      } catch (error) {
        if (error instanceof InvalidEthereumAddressError) {
          await message.createForCtx("Please provide a valid Ethereum address.", ctx);
          return;
        }

        throw error;
      }

      await user.upsertWallet(userId, address);

      await message.createForCtx(`Successfully added ${formatAddress(address)}`, ctx);
    } catch (error) {
      logger.error({ error, ctx });

      await message.createForCtx(UNEXPECTED_ERROR_MESSAGE, ctx);
    }
  };
}
