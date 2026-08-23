import { Test, TestingModule } from "@nestjs/testing";
import { TasksResolver } from "./tasks.resolver";
import { TasksService } from "./tasks.service";
import { PubSubService } from "../pubsub/pubsub.service";
import { GqlAuthGuard } from "../auth/guards/gqlAuth.guard";

const mockTasksService = {
  createTask: jest.fn(),
  getTask: jest.fn(),
  getTasks: jest.fn(),
  updateTask: jest.fn(),
  cancelTask: jest.fn(),
  retryTask: jest.fn(),
  getTaskStats: jest.fn(),
};

const mockPubSubService = {
  publish: jest.fn().mockResolvedValue(undefined),
  asyncIterator: jest.fn().mockReturnValue({}),
};

const mockUser = { id: "user-1", email: "a@b.com", role: "USER" };

describe("TasksResolver", () => {
  let resolver: TasksResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksResolver,
        { provide: TasksService, useValue: mockTasksService },
        { provide: PubSubService, useValue: mockPubSubService },
      ],
    })
      .overrideGuard(GqlAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<TasksResolver>(TasksResolver);
    jest.clearAllMocks();
  });

  describe("createTask", () => {
    it("should create a task and publish both taskCreated and taskUpdated events", async () => {
      const task = { id: "t1", title: "My Task", userId: "user-1" };
      mockTasksService.createTask.mockResolvedValue(task);

      const result = await resolver.createTask(mockUser, { title: "My Task" });

      expect(mockTasksService.createTask).toHaveBeenCalledWith("user-1", {
        title: "My Task",
      });
      expect(mockPubSubService.publish).toHaveBeenCalledWith("taskCreated", {
        taskCreated: task,
      });
      expect(mockPubSubService.publish).toHaveBeenCalledWith("taskUpdated", {
        taskUpdated: task,
      });
      expect(result).toEqual(task);
    });
  });

  describe("cancelTask", () => {
    it("should cancel the task and publish taskUpdated", async () => {
      const task = { id: "t1", status: "CANCELLED", userId: "user-1" };
      mockTasksService.cancelTask.mockResolvedValue(task);

      await resolver.cancelTask("t1");

      expect(mockPubSubService.publish).toHaveBeenCalledWith("taskUpdated", {
        taskUpdated: task,
      });
    });
  });

  describe("taskUpdated subscription filter (static method)", () => {
    const payload = { taskUpdated: { id: "t1", userId: "user-1" } };

    it("should pass all events when no userId is provided", () => {
      expect(TasksResolver.filterTaskUpdated(payload, {})).toBe(true);
      expect(TasksResolver.filterTaskUpdated(payload, { userId: undefined })).toBe(true);
    });

    it("should pass events whose userId matches the subscriber", () => {
      expect(TasksResolver.filterTaskUpdated(payload, { userId: "user-1" })).toBe(true);
    });

    it("should block events whose userId does not match the subscriber", () => {
      expect(TasksResolver.filterTaskUpdated(payload, { userId: "user-2" })).toBe(false);
    });
  });
});
