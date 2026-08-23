import { Test, TestingModule } from "@nestjs/testing";
import { MetricsService } from "./metrics.service";
import { Counter, Gauge, Histogram } from "prom-client";

const makeCounter = () => ({ inc: jest.fn() });
const makeGauge = () => ({ set: jest.fn() });
const makeHistogram = () => ({ observe: jest.fn() });

describe("MetricsService", () => {
  let service: MetricsService;

  const mockCounters = {
    tasksCreated: makeCounter(),
    tasksCompleted: makeCounter(),
    tasksFailed: makeCounter(),
  };
  const mockGauges = {
    activeTasks: makeGauge(),
    queueSize: makeGauge(),
  };
  const mockHistogram = makeHistogram();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: "PROM_METRIC_TASKS_CREATED_TOTAL", useValue: mockCounters.tasksCreated },
        { provide: "PROM_METRIC_TASKS_COMPLETED_TOTAL", useValue: mockCounters.tasksCompleted },
        { provide: "PROM_METRIC_TASKS_FAILED_TOTAL", useValue: mockCounters.tasksFailed },
        { provide: "PROM_METRIC_TASKS_ACTIVE", useValue: mockGauges.activeTasks },
        { provide: "PROM_METRIC_QUEUE_SIZE", useValue: mockGauges.queueSize },
        { provide: "PROM_METRIC_TASK_DURATION_SECONDS", useValue: mockHistogram },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    jest.clearAllMocks();
  });

  it("incrementTasksCreated should call inc with priority label", () => {
    service.incrementTasksCreated("HIGH");
    expect(mockCounters.tasksCreated.inc).toHaveBeenCalledWith({ priority: "HIGH" });
  });

  it("incrementTasksCompleted should call inc", () => {
    service.incrementTasksCompleted();
    expect(mockCounters.tasksCompleted.inc).toHaveBeenCalled();
  });

  it("incrementTasksFailed should call inc", () => {
    service.incrementTasksFailed();
    expect(mockCounters.tasksFailed.inc).toHaveBeenCalled();
  });

  it("setActiveTasks should call set with the count", () => {
    service.setActiveTasks(5);
    expect(mockGauges.activeTasks.set).toHaveBeenCalledWith(5);
  });

  it("setQueueSize should call set with the size", () => {
    service.setQueueSize(42);
    expect(mockGauges.queueSize.set).toHaveBeenCalledWith(42);
  });

  it("recordTaskDuration should call observe with the duration", () => {
    service.recordTaskDuration(1.23);
    expect(mockHistogram.observe).toHaveBeenCalledWith(1.23);
  });
});
