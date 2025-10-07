export const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again later.";

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
