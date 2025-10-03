import cron from "node-cron";
import PQueue from "p-queue";
import { MessageService } from "../services/message";
import ms from "ms";

export class DispatchJob {
  private queue: PQueue;
  private userQueues: Map<number, PQueue>;
  private isExecuting: boolean = false;

  constructor(
    private message: MessageService,
    private schedule: string,
    private send: (userId: number, content: string) => Promise<unknown>,
  ) {
    this.queue = new PQueue({
      intervalCap: 30,
      interval: ms('1s'),
      carryoverIntervalCount: false,
    });

    this.userQueues = new Map();
  }

  start() {
    cron.schedule(this.schedule, this.execute.bind(this));
  }

  async execute() {
    if (this.isExecuting) {
      return;
    }

    this.isExecuting = true;

    try {
      const messages = await this.message.listSendable();

      for (const msg of messages) {
        for (const recipient of msg.recipients) {
          const attempt = await this.message.newAttempt(msg.id, recipient.userId);

          this.queue.add(async () => {
            return this.getUserQueue(recipient.userId).add(async () => {
              try {
                await this.send(recipient.userId, msg.content);
                await this.message.markAsDelivered(attempt);
              } catch (error) {
                await this.message.markAsFailed(attempt, (error as Error).message);
              }
            });
          });
        }
      }

      await this.queue.onIdle();
      this.cleanupUserQueues();
    } finally {
      this.isExecuting = false;
    }
  }

  private getUserQueue(userId: number): PQueue {
    if (!this.userQueues.has(userId)) {
      this.userQueues.set(
        userId,
        new PQueue({
          intervalCap: 1,
          interval: ms('1s'),
          carryoverIntervalCount: false,
        }),
      );
    }

    return this.userQueues.get(userId)!;
  }

  private cleanupUserQueues() {
    for (const [userId, queue] of this.userQueues) {
      if (queue.size === 0 && queue.pending === 0) {
        this.userQueues.delete(userId);
      }
    }
  }
}
