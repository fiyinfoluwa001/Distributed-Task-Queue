import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { TaskPriority } from "../generated/prisma/enums";
import { Task } from "../generated/prisma/client";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class QueueService {
  private redisClient: Redis;

  constructor(
    @InjectQueue("tasks") private taskQueue: Queue,
    private configService: ConfigService
  ) {
    this.redisClient = new Redis({
      host: this.configService.get("REDIS_HOST"),
      port: this.configService.get("REDIS_PORT"),
    });
  }

  async addTask(task: Task): Promise<void> {
    const priority = this.getPriorityValue(task.priority);

    await this.taskQueue.add(
      "process-task",
      { taskId: task.id },
      {
        priority,
        attempts: task.maxRetries,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        delay: task.scheduledAt ? task.scheduledAt.getTime() - Date.now() : 0,
      }
    );
  }

  async acquireLock(taskId: string, workerId: string): Promise<boolean> {
    const lockKey = `task:lock:${taskId}`;
    const result = await this.redisClient.set(
      lockKey,
      workerId,
      "EX",
      300,
      "NX"
    );
    return result === "OK";
  }

  async releaseLock(taskId: string, workerId: string): Promise<void> {
    const lockKey = `task:lock:${taskId}`;
    const currentOwner = await this.redisClient.get(lockKey);

    if (currentOwner === workerId) {
      await this.redisClient.del(lockKey);
    }
  }

  async getQueueHealth() {
    const waiting = await this.taskQueue.getWaitingCount();
    const active = await this.taskQueue.getActiveCount();
    const completed = await this.taskQueue.getCompletedCount();
    const failed = await this.taskQueue.getFailedCount();

    return { waiting, active, completed, failed };
  }

  private getPriorityValue(priority: TaskPriority): number {
    const priorityMap = {
      [TaskPriority.CRITICAL]: 1,
      [TaskPriority.HIGH]: 2,
      [TaskPriority.NORMAL]: 3,
      [TaskPriority.LOW]: 4,
    };
    return priorityMap[priority] || 3;
  }
}
