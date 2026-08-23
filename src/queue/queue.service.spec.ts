import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { QueueService } from "./queue.service";

// Fake the Redis client so the constructor doesn't try to open a real connection
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn().mockResolvedValue("OK"),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
  }));
});

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
  getWaitingCount: jest.fn().mockResolvedValue(3),
  getActiveCount: jest.fn().mockResolvedValue(1),
  getCompletedCount: jest.fn().mockResolvedValue(10),
  getFailedCount: jest.fn().mockResolvedValue(2),
};

const mockConfigService = {
  get: jest.fn((key: string, fallback?: any) => {
    const values: Record<string, any> = {
      REDIS_HOST: "localhost",
      REDIS_PORT: 6379,
    };
    return values[key] ?? fallback;
  }),
};

describe("QueueService", () => {
  let service: QueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: getQueueToken("tasks"), useValue: mockQueue },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    jest.clearAllMocks();
  });

  describe("addTask", () => {
    const baseTask = {
      id: "task-1",
      maxRetries: 3,
      scheduledAt: null,
    } as any;

    it("should add CRITICAL priority as BullMQ priority 1", async () => {
      await service.addTask({ ...baseTask, priority: "CRITICAL" });

      expect(mockQueue.add).toHaveBeenCalledWith(
        "process-task",
        { taskId: "task-1" },
        expect.objectContaining({ priority: 1, attempts: 3 })
      );
    });

    it("should add HIGH priority as BullMQ priority 2", async () => {
      await service.addTask({ ...baseTask, priority: "HIGH" });
      expect(mockQueue.add).toHaveBeenCalledWith(
        "process-task",
        { taskId: "task-1" },
        expect.objectContaining({ priority: 2 })
      );
    });

    it("should add NORMAL priority as BullMQ priority 3", async () => {
      await service.addTask({ ...baseTask, priority: "NORMAL" });
      expect(mockQueue.add).toHaveBeenCalledWith(
        "process-task",
        { taskId: "task-1" },
        expect.objectContaining({ priority: 3 })
      );
    });

    it("should add LOW priority as BullMQ priority 4", async () => {
      await service.addTask({ ...baseTask, priority: "LOW" });
      expect(mockQueue.add).toHaveBeenCalledWith(
        "process-task",
        { taskId: "task-1" },
        expect.objectContaining({ priority: 4 })
      );
    });

    it("should set a delay when scheduledAt is in the future", async () => {
      const future = new Date(Date.now() + 60_000);
      await service.addTask({ ...baseTask, priority: "NORMAL", scheduledAt: future });

      const call = mockQueue.add.mock.calls[0][2];
      expect(call.delay).toBeGreaterThan(0);
    });

    it("should set delay 0 when scheduledAt is null", async () => {
      await service.addTask({ ...baseTask, priority: "NORMAL", scheduledAt: null });

      const call = mockQueue.add.mock.calls[0][2];
      expect(call.delay).toBe(0);
    });
  });

  describe("acquireLock", () => {
    it("should return true when Redis SET returns OK", async () => {
      (service as any).redisClient.set.mockResolvedValue("OK");
      const result = await service.acquireLock("task-1", "worker-1");
      expect(result).toBe(true);
    });

    it("should return false when Redis SET returns null (lock already held)", async () => {
      (service as any).redisClient.set.mockResolvedValue(null);
      const result = await service.acquireLock("task-1", "worker-2");
      expect(result).toBe(false);
    });
  });

  describe("getQueueHealth", () => {
    it("should return counts from all queue methods", async () => {
      mockQueue.getWaitingCount.mockResolvedValue(3);
      mockQueue.getActiveCount.mockResolvedValue(1);
      mockQueue.getCompletedCount.mockResolvedValue(10);
      mockQueue.getFailedCount.mockResolvedValue(2);

      const health = await service.getQueueHealth();

      expect(health).toEqual({ waiting: 3, active: 1, completed: 10, failed: 2 });
    });
  });
});
