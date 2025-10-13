import cron from "node-cron";
import { Logger } from "pino";
import { MessageService } from "../services/message";
import { Position, PositionService } from "../services/position";
import { WalletService } from "../services/wallet";
import { formatAddress } from "../handlers/misc/utils";
import { formatCurrency } from "./misc/utils";

export class SummaryJob {
  constructor(
    private logger: Logger,
    private message: MessageService,
    private schedule: string,
    private wallet: WalletService,
    private position: PositionService,
  ) {}

  start() {
    cron.schedule(this.schedule, this.execute.bind(this));

    this.logger.info({ schedule: this.schedule }, "Job started");
  }

  async execute() {
    this.logger.info("Executing");

    const wallets = await this.wallet.listAll();

    for (const address of wallets) {
      const positions = await this.position.getPositions(address);

      if (positions.length === 0) {
        continue;
      }

      const summaryMessage = getSummaryMessage(positions, address);

      await this.message.create(summaryMessage, address);

      this.logger.info({ address, positions: positions.length }, "Created summary message");
    }
  }
}

export function getSummaryMessage(ufPositions: Position[], address: string): string {
  const content: string[] = [];

  content.push(`⚖️ ${formatAddress(address)} Summary:\n`);

  let totalValue = 0;
  let pnl = 0;

  for (const pos of ufPositions) {
    totalValue +=
      parseFloat(pos.currentAmount0) * parseFloat(pos.token0Price) +
      parseFloat(pos.currentAmount1) * parseFloat(pos.token1Price);

    pnl += parseFloat(pos.pnlUsd);
  }

  content.push(`Assets Value: ${formatCurrency(totalValue)}`);
  content.push(`Total PnL (USD): ${formatCurrency(pnl)}\n`);
  content.push(`👉🏻 [More details](https://revert.finance/#/account/${address})`);

  return content.join("\n");
}
