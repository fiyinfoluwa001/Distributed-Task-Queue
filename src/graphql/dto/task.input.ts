import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
} from "class-validator";
import { TaskPriority, TaskStatus } from "../../generated/prisma/enums";

// ✅ Plain class, no decorators
export class CreateTaskInput {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsObject()
  @IsOptional()
  payload?: any;

  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}

export class UpdateTaskInput {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;
}
