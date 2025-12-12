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
});
