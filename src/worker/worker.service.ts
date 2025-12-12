import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { TaskStatus } from "@prisma/client";

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService
  ) {}

  async processNextTask() {
    const task = await this.prisma.task.findFirst({
      where: {
        status: TaskStatus.PENDING,
        scheduledAt: {
          lte: new Date(),
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    if (!task) {
      this.logger.log("No pending tasks found");
      return null;
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.QUEUED },
    });

    await this.queueService.addTask(task);

    this.logger.log(`Task ${task.id} added to queue`);

    return task;
  }

  async retryFailedTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.status !== TaskStatus.FAILED) {
      throw new Error("Task not found or not in failed state");
    }

    if (task.attempts >= task.maxRetries) {
      throw new Error("Task has exceeded maximum retry attempts");
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.PENDING,
        error: null,
      },
    });

    await this.queueService.addTask(task);

    return task;
  }

  async getWorkerStats() {
    const logs = await this.prisma.workerLog.groupBy({
      by: ["workerId"],
      _count: true,
    });

    return logs;
  }
}
