import { Controller, Post, Get, Body } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() body: { payload: any; priority?: number }) {
    return this.tasksService.createTask(body.payload, body.priority || 0);
  }

  @Get()
  async list() {
    return this.tasksService.listTasks();
  }

  @Get('pending')
  async getPending() {
    return this.tasksService.getPendingTasks();
  }
}