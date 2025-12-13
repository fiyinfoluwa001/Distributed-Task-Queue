import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { TaskStatus } from "../generated/prisma/enums";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledTasks() {
    this.logger.log("Checking for scheduled tasks...");

    const scheduledTasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.PENDING,
        scheduledAt: {
          lte: new Date(),
          not: null,
        },
      },
      take: 50,
    });

    if (scheduledTasks.length === 0) {
      this.logger.log("No scheduled tasks to process");
      return;
    }

    this.logger.log(`Found ${scheduledTasks.length} scheduled tasks`);

    for (const task of scheduledTasks) {
      try {
        await this.prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.QUEUED },
        });

        await this.queueService.addTask(task);

        this.logger.log(`Scheduled task ${task.id} added to queue`);
      } catch (error) {
        this.logger.error(`Failed to queue scheduled task ${task.id}:`, error);
      }
    }
  }

  @Cron("0 2 * * *")
  async cleanupOldTasks() {
    this.logger.log("Running task cleanup...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.task.deleteMany({
      where: {
        status: TaskStatus.COMPLETED,
        completedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old tasks`);
  }

  // Monitor queue health every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorQueueHealth() {
    const health = await this.queueService.getQueueHealth();

    this.logger.log("Queue Health:", health);

    // Alert if queue is backing up
    if (health.waiting > 1000) {
      this.logger.warn(
        `Queue backlog detected: ${health.waiting} waiting tasks`
      );
      // Implement alerting logic here (email, Slack, etc.)
    }
  }

  // Retry stuck tasks every 10 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryStuckTasks() {
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const stuckTasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.PROCESSING,
        startedAt: {
          lt: fifteenMinutesAgo,
        },
      },
    });

    if (stuckTasks.length > 0) {
      this.logger.warn(`Found ${stuckTasks.length} stuck tasks`);

      for (const task of stuckTasks) {
        if (task.attempts < task.maxRetries) {
          await this.prisma.task.update({
            where: { id: task.id },
            data: {
              status: TaskStatus.PENDING,
              startedAt: null,
            },
          });
          this.logger.log(`Reset stuck task ${task.id}`);
        } else {
          await this.prisma.task.update({
            where: { id: task.id },
            data: {
              status: TaskStatus.FAILED,
              error: "Task stuck in processing state",
            },
          });
          this.logger.log(`Marked stuck task ${task.id} as failed`);
        }
      }
    }
  }
}
