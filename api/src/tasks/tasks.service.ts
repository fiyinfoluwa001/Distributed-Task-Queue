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
    data:{
      payload,
      priority,
      status: 'pending',
      retryCount: 0,
      maxRetries : 3
    }
  });
await this.redis.zadd('priority_tasks', priority, task.id);
    return task;
  }

  async listTasks() {
    return this.prisma.task.findMany();
  }

  async getPendingTasks() {
    return this.prisma.task.findMany({ where: { status: 'pending' } });
  }
  async getTask(id: string) {
    return this.prisma.task.findUnique({where: {id}})
  } 
  async updateTaskStatus (id: string, status: string) {
    return this.prisma.task.update({
      where: {id},
      data: {status, updatedAt: new Date()}
    })
  }
  async syncTasks(tasks: {payload: any; priority: number}[]) {
    const createdTasks = []
    for (const {payload, priority} of tasks)     {
      const task = await this.createTask(payload, priority);
      createdTasks.push(task)
    }
    return createdTasks
  }
}