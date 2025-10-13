import { Logger } from "pino";
import { UserService } from "../services/user";
import { Bot, Context, SessionFlavor } from "grammy";
import { MessageService } from "../services/message";
import { WalletService } from "../services/wallet";

export function getMockUserService() {
  return {
    upsert: jest.fn(),
    listWallets: jest.fn(),
    upsertWallet: jest.fn(),
    removeWallet: jest.fn(),
  } as unknown as jest.Mocked<UserService>;
}

export function getMockMessageService() {
  return {
    create: jest.fn(),
    createForCtx: jest.fn(),
    createForUser: jest.fn(),
    listSendable: jest.fn(),
    updateForSend: jest.fn(),
    updateForSuccess: jest.fn(),
    updateForFailure: jest.fn(),
  } as unknown as jest.Mocked<MessageService>;
}

export function getMockWalletService() {
  return {
    upsert: jest.fn(),
    listAll: jest.fn(),
  } as unknown as jest.Mocked<WalletService>;
}

export function getMockLogger() {
  return {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<Logger>;
}

export function getMockBot() {
  return {
    api: {
      sendMessage: jest.fn(),
    },
  } as unknown as jest.Mocked<Bot<Context & SessionFlavor<unknown>>>;
}
