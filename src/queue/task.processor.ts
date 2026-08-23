import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TaskStatus } from "../generated/prisma/enums";
import { QueueService } from "./queue.service";
import { v4 as uuidv4 } from "uuid";

@Processor("tasks")
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);
  private readonly workerId = uuidv4();

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === "process-task") {
      return this.handleTask(job);
    }
  }

  private async handleTask(job: Job): Promise<any> {
    const { taskId } = job.data;

    this.logger.log(`Worker ${this.workerId} attempting to process task ${taskId}`);

    const lockAcquired = await this.queueService.acquireLock(taskId, this.workerId);

    if (!lockAcquired) {
      this.logger.warn(`Task ${taskId} is already being processed`);
      return;
    }

    try {
      const task = await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.PROCESSING,
          startedAt: new Date(),
          workerId: this.workerId,
          attempts: { increment: 1 },
        },
      });

      await this.logWorkerActivity(taskId, "Task processing started");

      const result = await this.executeTask(task);

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
          result,
        },
      });

      await this.logWorkerActivity(taskId, "Task completed successfully");
      this.logger.log(`Task ${taskId} completed successfully`);

      return result;
    } catch (error) {
      this.logger.error(`Task ${taskId} failed:`, error);

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.FAILED,
          error: error.message,
        },
      });

      await this.logWorkerActivity(taskId, `Task failed: ${error.message}`, "error");

      throw error;
    } finally {
      await this.queueService.releaseLock(taskId, this.workerId);
    }
  }

  private async executeTask(task: any): Promise<any> {
    const executionTime = Math.random() * 3000 + 1000;
    await new Promise((resolve) => setTimeout(resolve, executionTime));

    if (Math.random() < 0.1) {
      throw new Error("Simulated task failure");
    }

    return {
      processedAt: new Date().toISOString(),
      workerId: this.workerId,
      executionTime: Math.round(executionTime),
      data: task.payload,
    };
  }

  private async logWorkerActivity(taskId: string, message: string, level = "info") {
    await this.prisma.workerLog.create({
      data: { taskId, workerId: this.workerId, message, level },
    });
  }
}
