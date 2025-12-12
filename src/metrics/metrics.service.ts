import { Injectable } from "@nestjs/common";
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from "@willsoto/nestjs-prometheus";
import { Counter, Gauge, Histogram } from "prom-client";
import { InjectMetric } from "@willsoto/nestjs-prometheus";

// Define metric providers
export const taskCreatedCounter = makeCounterProvider({
  name: "tasks_created_total",
  help: "Total number of tasks created",
  labelNames: ["priority"],
});

export const taskCompletedCounter = makeCounterProvider({
  name: "tasks_completed_total",
  help: "Total number of tasks completed",
});

export const taskFailedCounter = makeCounterProvider({
  name: "tasks_failed_total",
  help: "Total number of tasks failed",
});

export const activeTasksGauge = makeGaugeProvider({
  name: "tasks_active",
  help: "Number of currently active tasks",
});

export const queueSizeGauge = makeGaugeProvider({
  name: "queue_size",
  help: "Current size of task queue",
});

export const taskDurationHistogram = makeHistogramProvider({
  name: "task_duration_seconds",
  help: "Task execution duration in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric("tasks_created_total")
    public tasksCreated: Counter<string>,

    @InjectMetric("tasks_completed_total")
    public tasksCompleted: Counter<string>,

    @InjectMetric("tasks_failed_total")
    public tasksFailed: Counter<string>,

    @InjectMetric("tasks_active")
    public activeTasks: Gauge<string>,

    @InjectMetric("queue_size")
    public queueSize: Gauge<string>,

    @InjectMetric("task_duration_seconds")
    public taskDuration: Histogram<string>
  ) {}

  incrementTasksCreated(priority: string) {
    this.tasksCreated.inc({ priority });
  }

  incrementTasksCompleted() {
    this.tasksCompleted.inc();
  }

  incrementTasksFailed() {
    this.tasksFailed.inc();
  }

  setActiveTasks(count: number) {
    this.activeTasks.set(count);
  }

  setQueueSize(size: number) {
    this.queueSize.set(size);
  }

  recordTaskDuration(durationSeconds: number) {
    this.taskDuration.observe(durationSeconds);
  }
}
