import { Test, TestingModule } from "@nestjs/testing";
import { SchedulerService } from "./scheduler.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { TaskStatus } from "../generated/prisma/enums";

const mockPrisma = {
  task: {
    findMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockQueueService = {
  addTask: jest.fn(),
  getQueueHealth: jest.fn(),
};

describe("SchedulerService", () => {
  let service: SchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    jest.clearAllMocks();
  });

  describe("processScheduledTasks", () => {
    it("should do nothing when there are no overdue scheduled tasks", async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.processScheduledTasks();

      expect(mockPrisma.task.update).not.toHaveBeenCalled();
      expect(mockQueueService.addTask).not.toHaveBeenCalled();
    });

    it("should set status to QUEUED and enqueue each overdue task", async () => {
      const tasks = [
        { id: "t1", title: "Task 1" },
        { id: "t2", title: "Task 2" },
      ];
      mockPrisma.task.findMany.mockResolvedValue(tasks);
      mockPrisma.task.update.mockResolvedValue({});
      mockQueueService.addTask.mockResolvedValue(undefined);

      await service.processScheduledTasks();

      expect(mockPrisma.task.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: TaskStatus.QUEUED },
      });
      expect(mockQueueService.addTask).toHaveBeenCalledTimes(2);
    });

    it("should continue processing remaining tasks when one fails to enqueue", async () => {
      const tasks = [{ id: "t1" }, { id: "t2" }];
      mockPrisma.task.findMany.mockResolvedValue(tasks);
      mockPrisma.task.update.mockResolvedValue({});
      mockQueueService.addTask
        .mockRejectedValueOnce(new Error("Redis down"))
        .mockResolvedValueOnce(undefined);

      // Should not throw
      await expect(service.processScheduledTasks()).resolves.not.toThrow();
      expect(mockQueueService.addTask).toHaveBeenCalledTimes(2);
    });
  });

  describe("cleanupOldTasks", () => {
    it("should delete completed tasks older than 30 days", async () => {
      mockPrisma.task.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupOldTasks();

      const call = mockPrisma.task.deleteMany.mock.calls[0][0];
      expect(call.where.status).toBe(TaskStatus.COMPLETED);
      expect(call.where.completedAt.lt).toBeInstanceOf(Date);

      // Verify the cutoff is approximately 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const diff = Math.abs(
        call.where.completedAt.lt.getTime() - thirtyDaysAgo.getTime()
      );
      expect(diff).toBeLessThan(5000); // within 5 seconds
    });
  });

  describe("retryStuckTasks", () => {
    it("should do nothing when no tasks are stuck", async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.retryStuckTasks();

      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it("should reset a stuck task to PENDING when under maxRetries", async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { id: "t1", attempts: 1, maxRetries: 3 },
      ]);
      mockPrisma.task.update.mockResolvedValue({});

      await service.retryStuckTasks();

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: TaskStatus.PENDING, startedAt: null },
      });
    });

    it("should mark a stuck task as FAILED when it has reached maxRetries", async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { id: "t1", attempts: 3, maxRetries: 3 },
      ]);
      mockPrisma.task.update.mockResolvedValue({});

      await service.retryStuckTasks();

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: {
          status: TaskStatus.FAILED,
          error: "Task stuck in processing state",
        },
      });
    });
  });
});
