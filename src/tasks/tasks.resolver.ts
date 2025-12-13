import { Resolver, Query, Mutation, Args, Subscription } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
// import { PubSub } from "graphql-subscriptions";
import { TasksService } from "./tasks.service";
import { GqlAuthGuard } from "../auth/guards/gqlAuth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/currentUser.decorator";
import { CreateTaskInput, UpdateTaskInput } from "../graphql/dto/task.input";
import { UserRole, TaskStatus } from "../generated/prisma/enums";

// const pubSub = new PubSub();

@Resolver("Task")
export class TasksResolver {
  constructor(private tasksService: TasksService) {}

  @Query("task")
  @UseGuards(GqlAuthGuard)
  async task(@Args("id") id: string) {
    return this.tasksService.getTask(id);
  }

  @Query("tasks")
  @UseGuards(GqlAuthGuard)
  async tasks(
    @CurrentUser() user: any,
    @Args("status", { nullable: true }) status?: TaskStatus,
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number
  ) {
    return this.tasksService.getTasks(user.id, status, limit, offset);
  }

  @Query("task")
  @UseGuards(GqlAuthGuard)
  async taskStats() {
    return this.tasksService.getTaskStats();
  }

  @Mutation("createTask")
  @UseGuards(GqlAuthGuard)
  async createTask(
    @CurrentUser() user: any,
    @Args("input") input: CreateTaskInput
  ) {
    const task = await this.tasksService.createTask(user.id, input);
    pubSub.publish("taskCreated", { taskCreated: task });
    pubSub.publish("taskUpdated", { taskUpdated: task });
    return task;
  }

  @Mutation("updateTask")
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateTask(
    @Args("id") id: string,
    @Args("input") input: UpdateTaskInput
  ) {
    const task = await this.tasksService.updateTask(id, input);
    pubSub.publish("taskUpdated", { taskUpdated: task });
    return task;
  }

  @Mutation("cancelTask")
  @UseGuards(GqlAuthGuard)
  async cancelTask(@Args("id") id: string) {
    const task = await this.tasksService.cancelTask(id);
    pubSub.publish("taskUpdated", { taskUpdated: task });
    return task;
  }

  @Mutation("retryTask")
  @UseGuards(GqlAuthGuard)
  async retryTask(@Args("id") id: string) {
    const task = await this.tasksService.retryTask(id);
    pubSub.publish("taskUpdated", { taskUpdated: task });
    return task;
  }

  @Subscription()
  taskCreated() {
    return pubSub.asyncIterator("taskCreated");
  }

  @Subscription()
  taskUpdated(@Args("userId", { nullable: true }) userId?: string) {
    return pubSub.asyncIterator("taskUpdated");
  }
}
