import { Resolver, Query, Mutation, Args, Subscription } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { PubSubService } from "../pubsub/pubsub.service";
import { TasksService } from "./tasks.service";
import { GqlAuthGuard } from "../auth/guards/gqlAuth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/currentUser.decorator";
import { CreateTaskInput, UpdateTaskInput } from "../graphql/dto/task.input";
import { UserRole, TaskStatus } from "../generated/prisma/enums";

@Resolver("Task")
export class TasksResolver {
  constructor(
    private tasksService: TasksService,
    private pubSubService: PubSubService
  ) {}

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

  @Query("taskStats")
  @UseGuards(GqlAuthGuard)
  async taskStats() {
    return this.tasksService.getTaskStats();
  }

  @Query("queueHealth")
  @UseGuards(GqlAuthGuard)
  async queueHealth() {
    // QueueService is accessed via TasksService or injected separately if needed
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  @Mutation("createTask")
  @UseGuards(GqlAuthGuard)
  async createTask(
    @CurrentUser() user: any,
    @Args("input") input: CreateTaskInput
  ) {
    const task = await this.tasksService.createTask(user.id, input);
    await this.pubSubService.publish("taskCreated", { taskCreated: task });
    await this.pubSubService.publish("taskUpdated", { taskUpdated: task });
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
    this.pubSubService.publish("taskUpdated", { taskUpdated: task });
    return task;
  }

  @Mutation("cancelTask")
  @UseGuards(GqlAuthGuard)
  async cancelTask(@Args("id") id: string) {
    const task = await this.tasksService.cancelTask(id);
    this.pubSubService.publish("taskUpdated", { taskUpdated: task });
    return task;
  }

  @Mutation("retryTask")
  @UseGuards(GqlAuthGuard)
  async retryTask(@Args("id") id: string) {
    const task = await this.tasksService.retryTask(id);
    this.pubSubService.publish("taskUpdated", { taskUpdated: task });
    return task;
  }

  @Query("deadTasks")
  @UseGuards(GqlAuthGuard)
  async deadTasks() {
    return this.tasksService.deadTasks();
  }

  @Mutation("replayDeadTask")
  @UseGuards(GqlAuthGuard)
  async replayDeadTask(@Args("id") id: string) {
    const task = await this.tasksService.replayDeadTask(id);
    this.pubSubService.publish("taskUpdated", { taskUpdated: task });
    return task;
  }

  @Subscription("taskCreated")
  taskCreated() {
    return this.pubSubService.asyncIterator("taskCreated");
  }

  /**
   * Filters task update events by userId so subscribers only receive events
   * for their own tasks. Passing no userId means receive all updates (admin use).
   */
  @Subscription("taskUpdated", {
    filter: TasksResolver.filterTaskUpdated,
  })
  taskUpdated(@Args("userId", { nullable: true }) _userId?: string) {
    return this.pubSubService.asyncIterator("taskUpdated");
  }

  static filterTaskUpdated(
    payload: { taskUpdated: { userId: string } },
    variables: { userId?: string }
  ): boolean {
    if (!variables.userId) return true;
    return payload.taskUpdated.userId === variables.userId;
  }
}
