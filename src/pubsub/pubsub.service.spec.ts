import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PubSubService } from "./pubsub.service";

// Mock graphql-redis-subscriptions so no real Redis connection is opened
const mockPubSub = {
  publish: jest.fn().mockResolvedValue(undefined),
  asyncIterator: jest.fn().mockReturnValue({ [Symbol.asyncIterator]: () => {} }),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock("graphql-redis-subscriptions", () => ({
  RedisPubSub: jest.fn().mockImplementation(() => mockPubSub),
}));

// Mock ioredis so no real Redis connection is opened
jest.mock("ioredis", () =>
  jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue("OK"),
  }))
);

const mockConfigService = {
  get: jest.fn((key: string, fallback?: any) => {
    const values: Record<string, any> = { REDIS_HOST: "localhost", REDIS_PORT: 6379 };
    return values[key] ?? fallback;
  }),
};

describe("PubSubService", () => {
  let service: PubSubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubSubService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PubSubService>(PubSubService);
    jest.clearAllMocks();
  });

  it("should use RedisPubSub instance (not in-memory PubSub)", () => {
    // The service's internal pubSub should be the mock RedisPubSub instance
    expect((service as any).pubSub).toBe(mockPubSub);
  });

  it("should publish events via RedisPubSub", async () => {
    await service.publish("taskCreated", {
      taskCreated: { id: "t1" } as any,
    });
    expect(mockPubSub.publish).toHaveBeenCalledWith("taskCreated", {
      taskCreated: { id: "t1" },
    });
  });

  it("should return an asyncIterator for the given event", () => {
    service.asyncIterator("taskUpdated");
    expect(mockPubSub.asyncIterator).toHaveBeenCalledWith("taskUpdated");
  });

  it("should accept an array of event names for asyncIterator", () => {
    service.asyncIterator(["taskCreated", "taskUpdated"]);
    expect(mockPubSub.asyncIterator).toHaveBeenCalledWith([
      "taskCreated",
      "taskUpdated",
    ]);
  });
});
