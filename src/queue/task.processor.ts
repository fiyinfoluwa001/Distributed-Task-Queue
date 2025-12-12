import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TaskStatus } from "@prisma/client";
import { QueueService } from "./queue.service";
import { v4 as uuidv4 } from "uuid";

@Processor("tasks")
export class TaskProcessor {
  private readonly logger = new Logger(TaskProcessor.name);
  private readonly workerId = uuidv4();

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService
  ) {}

  @Process("process-task")
  async handleTask(job: Job) {
    const { taskId } = job.data;

    this.logger.log(
      `Worker ${this.workerId} attempting to process task ${taskId}`
    );

    // Try to acquire distributed lock
    const lockAcquired = await this.queueService.acquireLock(
      taskId,
      this.workerId
    );

    if (!lockAcquired) {
      this.logger.warn(`Task ${taskId} is already being processed`);
      return;
    }

    try {
      // Update task status to PROCESSING
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

      // Simulate task execution (replace with actual business logic)
      const result = await this.executeTask(task);

      // Update task as completed
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
    } catch (error) {
      this.logger.error(`Task ${taskId} failed:`, error);

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.FAILED,
          error: error.message,
        },
      });

      await this.logWorkerActivity(
        taskId,
        `Task failed: ${error.message}`,
        "error"
      );

      throw error; // Re-throw for Bull's retry mechanism
    } finally {
      // Release the lock
      await this.queueService.releaseLock(taskId, this.workerId);
    }
  }

  private async executeTask(task: any): Promise<any> {
    // Implement your actual task logic here
    // This is a simulation
    const executionTime = Math.random() * 3000 + 1000; // 1-4 seconds

    await new Promise((resolve) => setTimeout(resolve, executionTime));

    // Simulate occasional failures for testing
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

  private async logWorkerActivity(
    taskId: string,
    message: string,
    level = "info"
  ) {
    await this.prisma.workerLog.create({
      data: {
        taskId,
        workerId: this.workerId,
        message,
        level,
      },
    });
  }
}
