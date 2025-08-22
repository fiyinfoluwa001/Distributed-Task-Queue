import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
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
  @Get(':id')
  async getTask(@Param('id') id: string) {
    return this.tasksService.getTask(id);
  }
  @Post(':id/start')
  async startTask(@Param('id') id: string) {
    return this.tasksService.updateTaskStatus(id, 'in-progress')
  }
  @Post(':id/complete')
  async completeTask(@Param('id') id: string) {
    return this.tasksService.updateTaskStatus(id, 'completed')
  }
@Post('sync')
    async syncTasks(@Body() body: { tasks: { payload: any; priority: number }[] }) {
      return this.tasksService.syncTasks(body.tasks);
    }
}
  