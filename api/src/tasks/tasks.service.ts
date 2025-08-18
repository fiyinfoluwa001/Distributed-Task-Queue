import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis';

@Injectable()
export class TasksService {
  private redis: Redis;

  constructor(private prisma: PrismaService) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

async createTask(payload: any, priority: number) {
  const task = await this.prisma.task.create({
    data: { payload, priority, status: 'pending' },
  });
  await this.redis.zadd('tasks', '*', 'taskId', task.id);
  return task;
}

  async listTasks() {
    return this.prisma.task.findMany();
  }

  async getPendingTasks() {
    return this.prisma.task.findMany({ where: { status: 'pending' } });
  }
}