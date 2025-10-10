import { ETHEREUM_ADDRESS_1, MAX_ATTEMPTS, MESSAGE_CONTENT, USER_ID_1, USER_ID_2 } from "../tests/constants";
import { prisma } from "../tests/setup";
import { MessageService, UsersForAddressNotFoundError } from "./message";
import { UserService } from "./user";
import { WalletService } from "./wallet";
import { CommandContext, Context } from "grammy";

let wallet: WalletService;
let user: UserService;
let message: MessageService;

beforeEach(async () => {
  wallet = new WalletService(prisma);
  user = new UserService(prisma);
  message = new MessageService(prisma, MAX_ATTEMPTS);
});

describe("create", () => {
  it("should fail when no users are found for the address", async () => {
    await expect(message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1)).rejects.toBeInstanceOf(
      UsersForAddressNotFoundError,
    );
  });

  it("should create a new message", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsert(USER_ID_2);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await user.upsertWallet(USER_ID_2, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const result = await prisma.message.findMany({ include: { recipients: true } });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      content: MESSAGE_CONTENT,
      createdAt: expect.any(Date),
      id: expect.any(String),
      priority: 0,
      recipients: [
        {
          attempts: 0,
          createdAt: expect.any(Date),
          deliveredAt: null,
          error: null,
          maxAttempts: 5,
          messageId: result[0].id,
          nextAttemptAt: expect.any(Date),
          sentAt: null,
          status: "PENDING",
          userId: USER_ID_1,
        },
        {
          attempts: 0,
          createdAt: expect.any(Date),
          deliveredAt: null,
          error: null,
          maxAttempts: 5,
          messageId: result[0].id,
          nextAttemptAt: expect.any(Date),
          sentAt: null,
          status: "PENDING",
          userId: USER_ID_2,
        },
      ],
    });
  });
});

describe("createForCtx", () => {
  it("should create a message for a specific user from context", async () => {
    await user.upsert(USER_ID_1);

    const ctx = {
      chat: { id: USER_ID_1 },
    } as CommandContext<Context>;

    await message.createForCtx(MESSAGE_CONTENT, ctx);

    const result = await prisma.message.findMany({ include: { recipients: true } });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      content: MESSAGE_CONTENT,
      createdAt: expect.any(Date),
      id: expect.any(String),
      priority: 1000, // TOP_PRIORITY
      recipients: [
        {
          attempts: 0,
          createdAt: expect.any(Date),
          deliveredAt: null,
          error: null,
          maxAttempts: 5,
          messageId: result[0].id,
          nextAttemptAt: expect.any(Date),
          sentAt: null,
          status: "PENDING",
          userId: USER_ID_1,
        },
      ],
    });
  });

  it("should use custom options when provided", async () => {
    await user.upsert(USER_ID_1);

    const ctx = {
      chat: { id: USER_ID_1 },
    } as CommandContext<Context>;

    await message.createForCtx(MESSAGE_CONTENT, ctx, { priority: 500, maxAttempts: 3 });

    const result = await prisma.message.findMany({ include: { recipients: true } });
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(500);
    expect(result[0].recipients[0].maxAttempts).toBe(3);
  });

  it("should do nothing when userId is not found in context", async () => {
    const ctx = {
      chat: { id: undefined },
    } as unknown as CommandContext<Context>;

    await message.createForCtx(MESSAGE_CONTENT, ctx);

    const result = await prisma.message.findMany();
    expect(result).toHaveLength(0);
  });
});

describe("listSendable", () => {
  it("should list messages that are pending", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const [userMessage1, userMessage2] = await prisma.userMessage.findMany({});

    await prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId: userMessage1.userId,
          messageId: userMessage1.messageId,
        },
      },
      data: {
        status: "SENT",
      },
    });

    const sendables = await message.listSendable();
    expect(sendables).toHaveLength(1);
    expect(sendables[0].messageId).toBe(userMessage2.messageId);
  });

  it("should list messages that have a lower nextAttemptAt than now", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const [userMessage1, userMessage2] = await prisma.userMessage.findMany({});

    await prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId: userMessage1.userId,
          messageId: userMessage1.messageId,
        },
      },
      data: {
        nextAttemptAt: new Date(Date.now() + 1000 * 60), // 1 minute in the future
      },
    });

    const sendables = await message.listSendable();
    expect(sendables).toHaveLength(1);
    expect(sendables[0].messageId).toBe(userMessage2.messageId);
  });

  it("should order messages by priority", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1, { priority: 1 });
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1, { priority: 2 });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const sendables = await message.listSendable();
    expect(sendables).toHaveLength(2);
    expect(sendables[0].message.priority).toBe(2);
    expect(sendables[1].message.priority).toBe(1);
  });

  it("should return max of provided take values", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);

    const promises: Promise<void>[] = [];

    for (let i = 0; i < 5; i++) {
      promises.push(message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1));
    }

    await Promise.all(promises);

    const sendables = await message.listSendable(3);
    expect(sendables).toHaveLength(3);
  });
});

describe("updateForSend", () => {
  it("should update a user message for sending", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const [userMessage] = await prisma.userMessage.findMany({});

    await message.updateForSend(USER_ID_1, userMessage.messageId);

    const [updatedUserMessage] = await prisma.userMessage.findMany({});

    expect(updatedUserMessage.status).toBe("SENT");
    expect(updatedUserMessage.attempts).toBe(userMessage.attempts + 1);
    expect(updatedUserMessage.sentAt).toEqual(expect.any(Date));
  });

  it('should revert changes if the message is not "PENDING"', async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const [userMessage] = await prisma.userMessage.findMany({});

    await prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId: userMessage.userId,
          messageId: userMessage.messageId,
        },
      },
      data: {
        status: "SENT",
      },
    });

    await expect(message.updateForSend(USER_ID_1, userMessage.messageId)).rejects.toThrow(
      "Message is not pending",
    );
  });

  it("should revert changes if the max attempts has been reached", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const [userMessage] = await prisma.userMessage.findMany({});

    await prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId: userMessage.userId,
          messageId: userMessage.messageId,
        },
      },
      data: {
        attempts: userMessage.maxAttempts,
      },
    });

    await expect(message.updateForSend(USER_ID_1, userMessage.messageId)).rejects.toThrow(
      "Max attempts reached",
    );
  });
});

describe("updateForSuccess", () => {
  it("should update a user message for success", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const [userMessage] = await prisma.userMessage.findMany({});

    await prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId: userMessage.userId,
          messageId: userMessage.messageId,
        },
      },
      data: {
        status: "SENT",
      },
    });

    await message.updateForSuccess(USER_ID_1, userMessage.messageId);

    const [updatedUserMessage] = await prisma.userMessage.findMany({});

    expect(updatedUserMessage.status).toBe("DELIVERED");
    expect(updatedUserMessage.deliveredAt).toEqual(expect.any(Date));
  });

  it('should revert changes if the message is not "SENT"', async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const [userMessage] = await prisma.userMessage.findMany({});

    await expect(message.updateForSuccess(USER_ID_1, userMessage.messageId)).rejects.toThrow(
      "Message is not sent",
    );
  });
});

describe("updateForFailure", () => {
  it("should update a user message for failure", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1, { maxAttempts: 1 });

    const [userMessage] = await prisma.userMessage.findMany({});

    await prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId: userMessage.userId,
          messageId: userMessage.messageId,
        },
      },
      data: {
        status: "SENT",
        attempts: 1,
      },
    });

    await message.updateForFailure(USER_ID_1, userMessage.messageId, "Network error");

    const [updatedUserMessage] = await prisma.userMessage.findMany({});

    expect(updatedUserMessage.status).toBe("FAILED");
    expect(updatedUserMessage.error).toBe("Network error");
  });

  it("should update to pending if there are remaining attempts", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1, { maxAttempts: 3 });

    const [userMessage] = await prisma.userMessage.findMany({});

    await prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId: userMessage.userId,
          messageId: userMessage.messageId,
        },
      },
      data: {
        status: "SENT",
        attempts: 1,
      },
    });

    await message.updateForFailure(USER_ID_1, userMessage.messageId, "Network error");

    const [updatedUserMessage] = await prisma.userMessage.findMany({});

    expect(updatedUserMessage.status).toBe("PENDING");
  });

  it('should fail if the message is not "SENT"', async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const [userMessage] = await prisma.userMessage.findMany({});

    await expect(
      message.updateForFailure(USER_ID_1, userMessage.messageId, "Network error"),
    ).rejects.toThrow("Message is not sent");
  });
});
