import { formatAddress } from "./utils";
import { ETHEREUM_ADDRESS_1 } from "../../tests/constants";

describe("formatAddress", () => {
  it("formats a full ethereum address", () => {
    expect(formatAddress(ETHEREUM_ADDRESS_1)).toBe("0xBEE9...BBAB");
  });
});
