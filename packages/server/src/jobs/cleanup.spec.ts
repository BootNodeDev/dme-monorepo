import { CRON_SCHEDULE } from "../tests/constants";
import { getMockLogger, getMockMessageService } from "../tests/mocks";
import { CleanupJob } from "./cleanup";
import cron from "node-cron";

jest.mock("node-cron");

describe("CleanupJob", () => {
  describe("start", () => {
    it("should start the job with the provided cron schedule", () => {
      const message = getMockMessageService();
      const logger = getMockLogger();
      const schedule = "0 0 * * *";
      const cutoff = "1w";
      const job = new CleanupJob(logger, message, schedule, cutoff);
      const mockCron = jest.spyOn(cron, "schedule");

      job.start();

      expect(mockCron).toHaveBeenCalledWith(schedule, expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith({ schedule }, "Job Started");
    });
  });

  describe("execute", () => {
    it("should delete old messages", async () => {
      const message = getMockMessageService();
      const logger = getMockLogger();
      const schedule = CRON_SCHEDULE;
      const cutoff = "1w";
      const job = new CleanupJob(logger, message, schedule, cutoff);

      message.deleteBefore.mockResolvedValue({ count: 5 });

      await job.execute();

      expect(logger.info).toHaveBeenCalledWith("Executing");
      expect(message.deleteBefore).toHaveBeenCalledWith(expect.any(Date));
      expect(logger.info).toHaveBeenCalledWith(
        { count: 5, beforeDate: expect.any(Date) },
        "Executed"
      );
    });

    it("should handle deleteBefore failure", async () => {
      const message = getMockMessageService();
      const logger = getMockLogger();
      const schedule = CRON_SCHEDULE;
      const cutoff = "1w";
      const job = new CleanupJob(logger, message, schedule, cutoff);
      const error = new Error("Database error");

      message.deleteBefore.mockRejectedValue(error);

      await job.execute();

      expect(logger.info).toHaveBeenCalledWith("Executing");
      expect(logger.error).toHaveBeenCalledWith({ err: error }, "Failed");
    });
  });
});