import axios from "axios";

type RevertPosition = {
  network: string;
  in_range: boolean;
  pool_price: string;
  price_lower: string;
  price_upper: string;
  tokens: { [address: string]: { symbol: string; price: string } };
  nft_id: number;
  token0: string;
  token1: string;
  uncollected_fees0: string;
  uncollected_fees1: string;
  current_amount0: string;
  current_amount1: string;
  performance: {
    usd: {
      pnl: string;
    };
  };
};

export type Position = {
  network: string;
  inRange: boolean;
  poolPrice: string;
  priceLower: string;
  priceUpper: string;
  nftId: number;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Price: string;
  token1Price: string;
  uncollectedFees0: string;
  uncollectedFees1: string;
  currentAmount0: string;
  currentAmount1: string;
  pnlUsd: string;
};

export class PositionService {
  async getPositions(address: string): Promise<Position[]> {
    const positions: RevertPosition[] = (
      await axios.get(
        `https://api.revert.finance/v1/positions/uniswapv3/account/${address}?active=true`,
      )
    ).data.data;

    return positions.map((p) => {
      return {
        network: p.network,
        inRange: p.in_range,
        poolPrice: p.pool_price,
        priceLower: p.price_lower,
        priceUpper: p.price_upper,
        tokens: [{ symbol: p.tokens.token9 }],
        nftId: p.nft_id,
        token0Address: p.token0,
        token1Address: p.token1,
        token0Symbol: p.tokens[p.token0].symbol,
        token1Symbol: p.tokens[p.token1].symbol,
        token0Price: p.tokens[p.token0].price,
        token1Price: p.tokens[p.token1].price,
        uncollectedFees0: p.uncollected_fees0,
        uncollectedFees1: p.uncollected_fees1,
        currentAmount0: p.current_amount0,
        currentAmount1: p.current_amount1,
        pnlUsd: p.performance.usd.pnl,
      };
    });
  }
}
