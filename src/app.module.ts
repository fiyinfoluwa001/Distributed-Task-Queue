import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ConfigModule } from "@nestjs/config";
import { join } from "path";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { TasksModule } from "./tasks/tasks.module";
import { QueueModule } from "./queue/queue.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { MetricsModule } from "./metrics/metrics.module";
import { WorkerService } from "./worker/worker.service";
import { GraphqlModule } from "./graphql/grapgql.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ["./**/*.gql"],
      playground: true,
      subscriptions: {
        "graphql-ws": true,
      },
      context: ({ req }) => ({ req }),
      definitions: {
        path: join(process.cwd(), "src/graphql/graphql.ts"),
        outputAs: "class",
      },
    }),
    PrismaModule,
    AuthModule,
    TasksModule,
    QueueModule,
    SchedulerModule,
    MetricsModule,
    GraphqlModule,
  ],
  providers: [WorkerService],
})
export class AppModule {}
