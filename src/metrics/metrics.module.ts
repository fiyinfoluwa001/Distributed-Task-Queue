import { Module } from "@nestjs/common";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { MetricsService } from "./metrics.service";
import { MetricsController } from "./metrics.controller";
import {
  taskCreatedCounter,
  taskCompletedCounter,
  taskFailedCounter,
  activeTasksGauge,
  queueSizeGauge,
  taskDurationHistogram,
} from "./metrics.service";

@Module({
  imports: [
    PrometheusModule.register({
      path: "/metrics",
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    MetricsService,
    taskCreatedCounter,
    taskCompletedCounter,
    taskFailedCounter,
    activeTasksGauge,
    queueSizeGauge,
    taskDurationHistogram,
  ],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
