import { UserService } from "../services/user";

export function getMockUserService() {
  return {
    upsert: jest.fn(),
    upsertWallet: jest.fn(),
    listWallets: jest.fn(),
    removeWallet: jest.fn(),
  } as unknown as jest.Mocked<UserService>;
}
