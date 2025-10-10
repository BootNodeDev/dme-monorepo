import { Logger } from "pino";
import { UserService } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { baseHandler, formatAddress } from "./misc/utils";
import { MessageService } from "../services/message";

export function getAddHandler(
  logger: Logger,
  message: MessageService,
  user: UserService,
  wallet: WalletService,
) {
  return baseHandler(logger, message, async (userId, ctx) => {
    const address = ctx.message?.text.split(/\s+/)[1];

    if (!address) {
      await message.createForUser(
        "Please provide a wallet address.\n\nUsage: /add <address>",
        userId,
      );

      return;
    }

    try {
      await wallet.upsert(address);
    } catch (error) {
      if (error instanceof InvalidEthereumAddressError) {
        await message.createForUser("Please provide a valid Ethereum address.", userId);

        return;
      }

      throw error;
    }

    await user.upsertWallet(userId, address);

    await message.createForUser(`Successfully added ${formatAddress(address)}`, userId);
  });
}
