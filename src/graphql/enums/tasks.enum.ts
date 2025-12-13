import { registerEnumType } from "@nestjs/graphql";

export enum TaskPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum TaskStatus {
  PENDING = "PENDING",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

// Register enums for GraphQL schema generation
registerEnumType(TaskPriority, {
  name: "TaskPriority",
  description: "Priority levels for tasks",
});

registerEnumType(TaskStatus, {
  name: "TaskStatus",
  description: "Status of a task",
});
