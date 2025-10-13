import { Logger } from "pino";
import { UserService } from "../services/user";
import { formatAddress, baseHandler } from "./misc/utils";
import { MessageService } from "../services/message";

export function getListHandler(logger: Logger, message: MessageService, user: UserService) {
  return baseHandler(logger, message, async (userId) => {
    const userWallets = await user.listWallets(userId);

    if (userWallets.length === 0) {
      await message.createForUser(
        "You don't have any wallets associated with your account yet.\n\nUse /add <address> to add one.",
        userId,
      );
      return;
    }

    const walletList = userWallets
      .map((wallet, index) => `${index + 1}. ${formatAddress(wallet)}`)
      .join("\n");

    await message.createForUser(`Your wallets:\n\n${walletList}`, userId);
  });
}
