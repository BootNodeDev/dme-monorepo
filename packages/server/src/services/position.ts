import axios from "axios";

const REVERT_API_URL = "https://api.revert.finance";

type RevertPosition = {
  network: string;
  in_range: boolean;
  pool_price: string;
  price_lower: string;
  price_upper: string;
  tokens: { [address: string]: { symbol: string } };
  nft_id: number;
};

export type Position = {
  network: string;
  inRange: boolean;
  poolPrice: string;
  priceLower: string;
  priceUpper: string;
  tokens: { symbol: string }[];
  nftId: number;
};

export class PositionService {
  async getPositions(address: string): Promise<Position[]> {
    const positions: RevertPosition[] = (
      await axios.get(`${REVERT_API_URL}/v1/positions/uniswapv3/account/${address}?active=true`)
    ).data.data;

    return positions.map((p) => {
      return {
        network: p.network,
        inRange: p.in_range,
        poolPrice: p.pool_price,
        priceLower: p.price_lower,
        priceUpper: p.price_upper,
        tokens: Object.values(p.tokens).map((t) => ({
          symbol: t.symbol,
        })),
        nftId: p.nft_id,
      };
    });
  }
}
