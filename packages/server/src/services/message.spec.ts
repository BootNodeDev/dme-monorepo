import ms from "ms";
import { ETHEREUM_ADDRESS_1, MESSAGE_CONTENT, USER_ID_1, USER_ID_2 } from "../tests/constants";
import { prisma } from "../tests/setup";
import { MessageService, UsersForAddressNotFoundError } from "./message";
import { UserService } from "./user";
import { WalletService } from "./wallet";

let wallet: WalletService;
let user: UserService;
let message: MessageService;

beforeEach(async () => {
  wallet = new WalletService(prisma);
  user = new UserService(prisma);
  message = new MessageService(prisma);
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
    expect(result[0].content).toBe(MESSAGE_CONTENT);
    expect(result[0].recipients).toHaveLength(2);
    expect(result[0].recipients[0].userId).toBe(USER_ID_1);
    expect(result[0].recipients[1].userId).toBe(USER_ID_2);
  });
});

describe("listSendable", () => {
  it("should return a list of messages that have never been sent yet", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsert(USER_ID_2);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await user.upsertWallet(USER_ID_2, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const result = await message.listSendable();
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(MESSAGE_CONTENT);
    expect(result[0].recipients).toHaveLength(2);
    expect(result[0].recipients[0].userId).toBe(USER_ID_1);
    expect(result[0].recipients[1].userId).toBe(USER_ID_2);

    await prisma.userMessageAttempt.create({
      data: {
        attempt: 1,
        userId: result[0].recipients[0].userId,
        messageId: result[0].id,
      },
    });

    const result2 = await message.listSendable();
    expect(result2).toHaveLength(1);
    expect(result2[0].content).toBe(MESSAGE_CONTENT);
    expect(result2[0].recipients).toHaveLength(1);
    expect(result2[0].recipients[0].userId).toBe(USER_ID_2);
  });

  it("should return a list of messages that have failed attempts", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsert(USER_ID_2);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await user.upsertWallet(USER_ID_2, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const result = await message.listSendable();
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(MESSAGE_CONTENT);
    expect(result[0].recipients).toHaveLength(2);
    expect(result[0].recipients[0].userId).toBe(USER_ID_1);
    expect(result[0].recipients[1].userId).toBe(USER_ID_2);

    const nextAttemptAt = new Date();

    await prisma.userMessageAttempt.create({
      data: {
        attempt: 1,
        userId: result[0].recipients[0].userId,
        messageId: result[0].id,
        nextAttemptAt,
      },
    });

    await prisma.userMessageAttempt.create({
      data: {
        attempt: 1,
        userId: result[0].recipients[1].userId,
        messageId: result[0].id,
        deliveredAt: new Date(),
      },
    });

    const result2 = await message.listSendable();
    expect(result2).toHaveLength(1);
    expect(result2[0].content).toBe(MESSAGE_CONTENT);
    expect(result2[0].recipients).toHaveLength(1);
    expect(result2[0].recipients[0].userId).toBe(USER_ID_1);
  });

  it("should exclude messages that have reached 3 attempts", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const result = await message.listSendable();
    expect(result).toHaveLength(1);
    expect(result[0].recipients).toHaveLength(1);

    const messageId = result[0].id;
    const userId = result[0].recipients[0].userId;
    const nextAttemptAt = new Date();

    await prisma.userMessageAttempt.create({
      data: {
        attempt: 1,
        userId,
        messageId,
        nextAttemptAt: nextAttemptAt,
      },
    });

    await prisma.userMessageAttempt.create({
      data: {
        attempt: 2,
        userId,
        messageId,
        nextAttemptAt: nextAttemptAt,
      },
    });

    const resultAfter2Attempts = await message.listSendable();
    expect(resultAfter2Attempts).toHaveLength(1);
    expect(resultAfter2Attempts[0].recipients).toHaveLength(1);

    await prisma.userMessageAttempt.create({
      data: {
        attempt: 3,
        userId,
        messageId,
        nextAttemptAt: nextAttemptAt,
      },
    });

    const resultAfter3Attempts = await message.listSendable();
    expect(resultAfter3Attempts).toHaveLength(0);
  });

  it("should exclude messages with nextAttemptAt in the future", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const messages = await prisma.message.findMany({});
    const messageId = messages[0].id;

    const now = new Date();

    await prisma.userMessageAttempt.create({
      data: {
        attempt: 1,
        userId: USER_ID_1,
        messageId,
        nextAttemptAt: now,
      },
    });

    const result = await message.listSendable();
    expect(result).toHaveLength(1);

    const futureDate = new Date(Date.now() + ms("10s"));

    await prisma.userMessageAttempt.update({
      where: {
        userId_messageId_attempt: {
          userId: USER_ID_1,
          messageId,
          attempt: 1,
        },
      },
      data: {
        nextAttemptAt: futureDate,
      },
    });

    const resultAfter = await message.listSendable();
    expect(resultAfter).toHaveLength(0);
  });
});

describe("newAttempt", () => {
  it("should create an attempt with attempt number 1 when there are no previous attempts for the user and message", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const messages = await prisma.message.findMany({});
    const attempts = await prisma.userMessageAttempt.findMany({
      where: { userId: USER_ID_1, messageId: messages[0].id },
    });

    expect(attempts).toHaveLength(0);

    await message.newAttempt(messages[0].id, USER_ID_1);

    const attemptsAfter = await prisma.userMessageAttempt.findMany({
      where: { userId: USER_ID_1, messageId: messages[0].id },
    });

    expect(attemptsAfter).toHaveLength(1);
    expect(attemptsAfter[0].attempt).toBe(1);
  });

  it("should create an attempt with attempt number incremented by 1 when there are previous attempts for the user and message", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const messages = await prisma.message.findMany({});

    await message.newAttempt(messages[0].id, USER_ID_1);
    await message.newAttempt(messages[0].id, USER_ID_1);

    const attempts = await prisma.userMessageAttempt.findMany({});

    expect(attempts).toHaveLength(2);
    expect(attempts[0].attempt).toBe(1);
    expect(attempts[1].attempt).toBe(2);
  });
});

describe("markAsDelivered", () => {
  it("should mark an attempt as delivered", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const messages = await prisma.message.findMany({});

    await message.newAttempt(messages[0].id, USER_ID_1);

    const attempts = await prisma.userMessageAttempt.findMany({});
    expect(attempts).toHaveLength(1);
    expect(attempts[0].deliveredAt).toBeNull();

    await message.markAsDelivered(attempts[0]);

    const attemptsAfter = await prisma.userMessageAttempt.findMany({});
    expect(attemptsAfter).toHaveLength(1);
    expect(attemptsAfter[0].deliveredAt).not.toBeNull();
  });
});

describe("markAsFailed", () => {
  it("should mark an attempt as failed with an error message", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const messages = await prisma.message.findMany({});

    await message.newAttempt(messages[0].id, USER_ID_1);

    const attempts = await prisma.userMessageAttempt.findMany({});
    expect(attempts).toHaveLength(1);
    expect(attempts[0].error).toBeNull();

    const errorMessage = "Failed to send message";
    await message.markAsFailed(attempts[0], errorMessage);

    const attemptsAfter = await prisma.userMessageAttempt.findMany({});
    expect(attemptsAfter).toHaveLength(1);
    expect(attemptsAfter[0].error).toBe(errorMessage);
  });

  it("should set exponential backoff nextAttemptAt times", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.upsert(USER_ID_1);
    await user.upsertWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await message.create(MESSAGE_CONTENT, ETHEREUM_ADDRESS_1);

    const messages = await prisma.message.findMany({});
    const messageId = messages[0].id;

    const testCases = [
      { attempt: 1, expectedDelayMs: ms("1m") },
      { attempt: 2, expectedDelayMs: ms("2m") },
      { attempt: 3, expectedDelayMs: ms("4m") },
      { attempt: 4, expectedDelayMs: ms("8m") },
      { attempt: 5, expectedDelayMs: ms("16m") },
      { attempt: 6, expectedDelayMs: ms("32m") },
      { attempt: 7, expectedDelayMs: ms("1h") },
      { attempt: 8, expectedDelayMs: ms("1h") },
    ];

    for (const { attempt, expectedDelayMs } of testCases) {
      await prisma.userMessageAttempt.create({
        data: {
          attempt,
          userId: USER_ID_1,
          messageId,
        },
      });

      const attempts = await prisma.userMessageAttempt.findMany({
        where: { userId: USER_ID_1, messageId, attempt },
      });
      expect(attempts).toHaveLength(1);

      const beforeTime = Date.now();
      await message.markAsFailed(attempts[0], `Test error for attempt ${attempt}`);

      const updatedAttempt = await prisma.userMessageAttempt.findUnique({
        where: {
          userId_messageId_attempt: {
            userId: USER_ID_1,
            messageId,
            attempt,
          },
        },
      });

      expect(updatedAttempt?.nextAttemptAt).toBeDefined();
      const actualDelay = updatedAttempt!.nextAttemptAt!.getTime() - beforeTime;

      expect(actualDelay).toBeGreaterThanOrEqual(expectedDelayMs - 100);
      expect(actualDelay).toBeLessThanOrEqual(expectedDelayMs + 100);
    }
  });
});
