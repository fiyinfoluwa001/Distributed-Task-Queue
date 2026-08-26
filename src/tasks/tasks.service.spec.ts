import { Test, TestingModule } from "@nestjs/testing";
import { TasksService } from "./tasks.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { MetricsService } from "../metrics/metrics.service";

describe("TasksService", () => {
  let service: TasksService;
  let prisma: PrismaService;

  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockQueueService = {
    addTask: jest.fn(),
    addToDeadLetterQueue: jest.fn(),
  };

  const mockMetricsService = {
    incrementTasksCreated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createTask", () => {
    it("should create a task and add to queue", async () => {
      const mockTask = {
        id: "1",
        title: "Test Task",
        status: "PENDING",
        priority: "NORMAL",
        userId: "user-1",
      };

      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.createTask("user-1", {
        title: "Test Task",
      });

      expect(result).toEqual(mockTask);
      expect(mockQueueService.addTask).toHaveBeenCalledWith(mockTask);
      expect(mockMetricsService.incrementTasksCreated).toHaveBeenCalledWith(
        "NORMAL"
      );
    });
  });

  describe("deadTasks", () => {
    it("should return all tasks with DEAD status", async () => {
      const deadTask = { id: "dead-1", status: "DEAD", userId: "user-1" };
      mockPrismaService.task.findMany.mockResolvedValue([deadTask]);

      const result = await service.deadTasks();

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "DEAD" } })
      );
      expect(result).toEqual([deadTask]);
    });
  });

  describe("replayDeadTask", () => {
    it("should reset a dead task and re-enqueue it", async () => {
      const deadTask = { id: "dead-1", status: "DEAD", attempts: 3, maxRetries: 3, workerLogs: [] };
      const requeuedTask = { id: "dead-1", status: "QUEUED", attempts: 0, progress: 0 };

      mockPrismaService.task.findUnique.mockResolvedValue(deadTask);
      mockPrismaService.task.update.mockResolvedValue(requeuedTask);

      const result = await service.replayDeadTask("dead-1");

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "dead-1" },
          data: expect.objectContaining({ status: "QUEUED", attempts: 0, progress: 0 }),
        })
      );
      expect(mockQueueService.addTask).toHaveBeenCalledWith(requeuedTask);
      expect(result).toEqual(requeuedTask);
    });

    it("should throw if the task is not DEAD", async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        id: "task-1", status: "FAILED", workerLogs: [],
      });

      await expect(service.replayDeadTask("task-1")).rejects.toThrow(
        "Can only replay dead tasks"
      );
    });
  });
});
