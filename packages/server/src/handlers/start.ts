import { Logger } from "pino";
import { UserService } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { formatAddress, baseHandler } from "./misc/utils";
import { MessageService } from "../services/message";
import { PositionService } from "../services/position";
import { getOutOfRangePositions, getOutOfRangePositionsMessage } from "../jobs/outOfRange";
import {
  getUncollectedFeesPositions,
  getUncollectedFeesPositionsMessage,
} from "../jobs/uncolletedFees";

export function getStartHandler(
  logger: Logger,
  message: MessageService,
  user: UserService,
  wallet: WalletService,
  position: PositionService,
) {
  return baseHandler(logger, message, async (userId, ctx) => {
    await user.upsert(userId);

    const address = ctx.message?.text.split(/\s+/)[1];

    logger.info({ userId, address }, "Start command executed");

    if (address) {
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
    }

    const msg: string[] = [];

    msg.push("Welcome!");

    if (address) {
      msg.push(`You have successfully subscribed ${formatAddress(address)}`);

      const oorPositions = await getOutOfRangePositions(address, position);

      if (oorPositions.length > 0) {
        const oorPositionsMessage = getOutOfRangePositionsMessage(oorPositions, address);

        msg.push(oorPositionsMessage);
      }

      const ufPositions = await getUncollectedFeesPositions(address, position);

      if (ufPositions.length > 0) {
        const ufPositionsMessage = getUncollectedFeesPositionsMessage(ufPositions, address);

        msg.push(ufPositionsMessage);
      }
    }

    await message.createForUser(msg.join("\n\n"), userId);
  });
}
