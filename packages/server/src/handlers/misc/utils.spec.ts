import { formatAddress } from "./utils";
import { ETHEREUM_ADDRESS_1 } from "../../tests/constants";

describe("formatAddress", () => {
  it("should return the shortened version of the address", () => {
    expect(formatAddress(ETHEREUM_ADDRESS_1)).toBe("0xBEE9...BBAB");
  });
});
