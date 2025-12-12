import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { MetricsService } from "../metrics/metrics.service";
import { CreateTaskInput, UpdateTaskInput } from "../graphql/dto/task.input";
import { TaskStatus } from "@prisma/client";

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private metricsService: MetricsService
  ) {}

  async createTask(userId: string, input: CreateTaskInput) {
    const task = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority || "NORMAL",
        payload: input.payload,
        scheduledAt: input.scheduledAt,
        userId,
      },
      include: { user: true },
    });

    // Add to queue if not scheduled for future
    if (!input.scheduledAt || new Date(input.scheduledAt) <= new Date()) {
      await this.prisma.task.update({
        where: { id: task.id },
        data: { status: TaskStatus.QUEUED },
      });
      await this.queueService.addTask(task);
    }

    this.metricsService.incrementTasksCreated(task.priority);

    return task;
  }

  async getTask(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        user: true,
        workerLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async getTasks(userId?: string, status?: TaskStatus, limit = 50, offset = 0) {
    return this.prisma.task.findMany({
      where: {
        ...(userId && { userId }),
        ...(status && { status }),
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async updateTask(id: string, input: UpdateTaskInput) {
    return this.prisma.task.update({
      where: { id },
      data: input,
      include: { user: true },
    });
  }

  async cancelTask(id: string) {
    const task = await this.getTask(id);

    if (task.status === TaskStatus.COMPLETED) {
      throw new Error("Cannot cancel completed task");
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: TaskStatus.CANCELLED },
      include: { user: true },
    });
  }

  async retryTask(id: string) {
    const task = await this.getTask(id);

    if (task.status !== TaskStatus.FAILED) {
      throw new Error("Can only retry failed tasks");
    }

    if (task.attempts >= task.maxRetries) {
      throw new Error("Task has exceeded maximum retry attempts");
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.QUEUED,
        error: null,
      },
      include: { user: true },
    });

    await this.queueService.addTask(updatedTask);

    return updatedTask;
  }

  async getTaskStats() {
    const stats = await this.prisma.task.groupBy({
      by: ["status"],
      _count: true,
    });

    const result = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    stats.forEach((stat) => {
      result.total += stat._count;
      result[stat.status.toLowerCase()] = stat._count;
    });

    return result;
  }
}
