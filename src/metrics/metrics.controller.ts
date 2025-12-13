import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { TaskStatus } from "../generated/prisma/enums";

@Controller("health")
export class MetricsController {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService
  ) {}

  @Get()
  async healthCheck() {
    const queueHealth = await this.queueService.getQueueHealth();

    const taskStats = await this.prisma.task.groupBy({
      by: ["status"],
      _count: true,
    });

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      queue: queueHealth,
      tasks: taskStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {}),
    };
  }

  @Get("database")
  async databaseHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "healthy", database: "connected" };
    } catch (error) {
      return {
        status: "unhealthy",
        database: "disconnected",
        error: error.message,
      };
    }
  }
}
