import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QueueService } from "./queue.service";
import { TaskProcessor } from "./task.processor";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get("REDIS_HOST", "localhost"),
          port: configService.get<number>("REDIS_PORT", 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: "tasks" }),
  ],
  providers: [QueueService, TaskProcessor],
  exports: [QueueService],
})
export class QueueModule {}
