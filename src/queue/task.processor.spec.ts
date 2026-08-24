import { Test, TestingModule } from "@nestjs/testing";
import { TaskProcessor } from "./task.processor";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "./queue.service";
import { PubSubService } from "../pubsub/pubsub.service";
import { TaskStatus } from "../generated/prisma/enums";
import { Job } from "bullmq";

const mockPrisma = {
  task: {
    update: jest.fn(),
  },
  workerLog: {
    create: jest.fn(),
  },
};

const mockQueueService = {
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
};

const mockPubSubService = {
  publish: jest.fn(),
};

function makeJob(name: string, data: Record<string, any>): Job {
  return {
    name,
    data,
    updateProgress: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe("TaskProcessor", () => {
  let processor: TaskProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QueueService, useValue: mockQueueService },
        { provide: PubSubService, useValue: mockPubSubService },
      ],
    }).compile();

    processor = module.get<TaskProcessor>(TaskProcessor);
    jest.clearAllMocks();

    // Default: lock is always available unless overridden
    mockQueueService.acquireLock.mockResolvedValue(true);
    mockQueueService.releaseLock.mockResolvedValue(undefined);
    mockPrisma.task.update.mockResolvedValue({
      id: "task-1",
      payload: { key: "value" },
      userId: "user-1",
    });
    mockPrisma.workerLog.create.mockResolvedValue({});
    mockPubSubService.publish.mockResolvedValue(undefined);
  });

  describe("process", () => {
    it("should call handleTask when job name is process-task", async () => {
      const spy = jest
        .spyOn(processor as any, "handleTask")
        .mockResolvedValue({ done: true });

      await processor.process(makeJob("process-task", { taskId: "task-1" }));

      expect(spy).toHaveBeenCalled();
    });

    it("should not call handleTask for unknown job names", async () => {
      const spy = jest
        .spyOn(processor as any, "handleTask")
        .mockResolvedValue({});

      await processor.process(makeJob("unknown-job", { taskId: "task-1" }));

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("handleTask", () => {
    it("should return early without updating task when lock cannot be acquired", async () => {
      mockQueueService.acquireLock.mockResolvedValue(false);

      await (processor as any).handleTask(
        makeJob("process-task", { taskId: "task-1" })
      );

      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it("should set task status to PROCESSING when lock is acquired", async () => {
      jest
        .spyOn(processor as any, "executeTask")
        .mockResolvedValue({ done: true });

      await (processor as any).handleTask(
        makeJob("process-task", { taskId: "task-1" })
      );

      const firstCall = mockPrisma.task.update.mock.calls[0][0];
      expect(firstCall.data.status).toBe(TaskStatus.PROCESSING);
      expect(firstCall.data).toHaveProperty("startedAt");
      expect(firstCall.data.attempts).toEqual({ increment: 1 });
    });

    it("should set task status to COMPLETED on success", async () => {
      jest
        .spyOn(processor as any, "executeTask")
        .mockResolvedValue({ done: true });

      await (processor as any).handleTask(
        makeJob("process-task", { taskId: "task-1" })
      );

      const lastCall =
        mockPrisma.task.update.mock.calls[
          mockPrisma.task.update.mock.calls.length - 1
        ][0];
      expect(lastCall.data.status).toBe(TaskStatus.COMPLETED);
      expect(lastCall.data).toHaveProperty("completedAt");
    });

    it("should set task status to FAILED and rethrow when executeTask throws", async () => {
      jest
        .spyOn(processor as any, "executeTask")
        .mockRejectedValue(new Error("task exploded"));

      await expect(
        (processor as any).handleTask(
          makeJob("process-task", { taskId: "task-1" })
        )
      ).rejects.toThrow("task exploded");

      const failedCall = mockPrisma.task.update.mock.calls.find(
        ([arg]) => arg.data.status === TaskStatus.FAILED
      );
      expect(failedCall).toBeDefined();
      expect(failedCall[0].data.error).toBe("task exploded");
    });

    it("should always release the lock in the finally block", async () => {
      jest
        .spyOn(processor as any, "executeTask")
        .mockRejectedValue(new Error("boom"));

      await expect(
        (processor as any).handleTask(
          makeJob("process-task", { taskId: "task-1" })
        )
      ).rejects.toThrow();

      expect(mockQueueService.releaseLock).toHaveBeenCalledWith(
        "task-1",
        expect.any(String)
      );
    });
  });

  describe("progress reporting", () => {
    it("should update task progress in MySQL via updateProgress helper", async () => {
      mockPrisma.task.update.mockResolvedValue({
        id: "task-1",
        progress: 50,
        userId: "user-1",
      });

      await (processor as any).updateProgress("task-1", 50);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: "task-1" },
        data: { progress: 50 },
      });
    });

    it("should publish taskUpdated via PubSub when progress changes", async () => {
      const updatedTask = { id: "task-1", progress: 75, userId: "user-1" };
      mockPrisma.task.update.mockResolvedValue(updatedTask);

      await (processor as any).updateProgress("task-1", 75);

      expect(mockPubSubService.publish).toHaveBeenCalledWith("taskUpdated", {
        taskUpdated: updatedTask,
      });
    });

    it("should call job.updateProgress at stages 10, 50, 90, 100 during executeTask", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5); // always succeed
      jest
        .spyOn(processor as any, "updateProgress")
        .mockResolvedValue(undefined);

      const mockJob = {
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as any;

      jest.useFakeTimers();
      const resultPromise = (processor as any).executeTask(
        { id: "task-1", payload: {} },
        mockJob
      );
      await jest.runAllTimersAsync();
      await resultPromise;
      jest.useRealTimers();
      jest.spyOn(Math, "random").mockRestore();

      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(90);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });

    it("should persist each progress milestone to MySQL via updateProgress", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const updateProgressSpy = jest
        .spyOn(processor as any, "updateProgress")
        .mockResolvedValue(undefined);

      const mockJob = {
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as any;

      jest.useFakeTimers();
      const resultPromise = (processor as any).executeTask(
        { id: "task-1", payload: {} },
        mockJob
      );
      await jest.runAllTimersAsync();
      await resultPromise;
      jest.useRealTimers();
      jest.spyOn(Math, "random").mockRestore();

      expect(updateProgressSpy).toHaveBeenCalledWith("task-1", 10);
      expect(updateProgressSpy).toHaveBeenCalledWith("task-1", 50);
      expect(updateProgressSpy).toHaveBeenCalledWith("task-1", 90);
      expect(updateProgressSpy).toHaveBeenCalledWith("task-1", 100);
    });
  });
});
