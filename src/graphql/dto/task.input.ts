import { Field, InputType } from "@nestjs/graphql";
import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";
import { TaskPriority } from "@prisma/client";

@InputType()
export class CreateTaskInput {
  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @Field(() => String, { nullable: true })
  @IsOptional()
  payload?: any;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}

@InputType()
export class UpdateTaskInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  title?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  status?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  priority?: TaskPriority;
}
