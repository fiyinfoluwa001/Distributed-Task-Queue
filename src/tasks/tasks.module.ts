import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { TasksResolver } from "./tasks.resolver";
import { PrismaService } from "../prisma/prisma.service";
import { QueueModule } from "../queue/queue.module";
import { MetricsModule } from "../metrics/metrics.module";

@Module({
  imports: [QueueModule, MetricsModule],
  providers: [TasksService, TasksResolver, PrismaService],
  exports: [TasksService],
})
export class TasksModule {}
