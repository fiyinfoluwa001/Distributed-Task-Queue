import { Test, TestingModule } from "@nestjs/testing";
import { TaskProcessor } from "./task.processor";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "./queue.service";
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

function makeJob(name: string, data: Record<string, any>): Job {
  return { name, data } as any;
}

describe("TaskProcessor", () => {
  let processor: TaskProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QueueService, useValue: mockQueueService },
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
    });
    mockPrisma.workerLog.create.mockResolvedValue({});
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
      // Make executeTask finish instantly without actual delay
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
});
