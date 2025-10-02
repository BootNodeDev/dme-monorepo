import { ETHEREUM_ADDRESS_1, USER_ID_1, USER_ID_2 } from "../tests/constants";
import { prisma } from "../tests/setup";
import { MessageService, UsersForAddressNotFoundError } from "./message";
import { UserService } from "./user";
import { WalletService } from "./wallet";

describe("create", () => {
  it("should fail when no users are found for the address", async () => {
    const message = new MessageService(prisma);

    await expect(message.create("Hello World!", ETHEREUM_ADDRESS_1)).rejects.toBeInstanceOf(
      UsersForAddressNotFoundError,
    );
  });

  it("should create a new message", async () => {
    const messageContent = "Hello World!";

    const wallet = new WalletService(prisma);
    const user = new UserService(prisma);
    const message = new MessageService(prisma);

    await wallet.upsert(ETHEREUM_ADDRESS_1);

    await user.create(USER_ID_1);
    await user.create(USER_ID_2);

    await user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await user.addWallet(USER_ID_2, ETHEREUM_ADDRESS_1);

    await message.create(messageContent, ETHEREUM_ADDRESS_1);

    const result = await prisma.message.findMany({ include: { recipients: true } });
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(messageContent);
    expect(result[0].recipients).toHaveLength(2);
    expect(result[0].recipients[0].userId).toBe(USER_ID_1);
    expect(result[0].recipients[1].userId).toBe(USER_ID_2);
  });
});
