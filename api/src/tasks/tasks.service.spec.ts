import { Test } from '@nestjs/testing';
  import { TasksService } from './tasks.service';
  import { PrismaService } from '../prisma/prisma.service';
  import { Redis } from 'ioredis';

  describe('TasksService', () => {
    let service: TasksService;
    let prisma: PrismaService;
    let redis: Redis;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TasksService,
          {
            provide: PrismaService,
            useValue: {
              task: {
                create: jest.fn().mockResolvedValue({ id: 'task1', payload: { test: true }, priority: 1, status: 'pending', retryCount: 0, maxRetries: 3 }),
                findMany: jest.fn().mockResolvedValue([{ id: 'task1' }]),
                findUnique: jest.fn().mockResolvedValue({ id: 'task1' }),
                update: jest.fn().mockResolvedValue({ id: 'task1', status: 'in-progress' }),
              },
            },
          },
          {
            provide: Redis,
            useValue: {
              zadd: jest.fn().mockResolvedValue(1),
              zrange: jest.fn().mockResolvedValue(['task1', '1']),
              zcard: jest.fn().mockResolvedValue(1),
            },
          },
        ],
      }).compile();
      service = module.get<TasksService>(TasksService);
      prisma = module.get<PrismaService>(PrismaService);
      redis = module.get<Redis>(Redis);
    });

    it('should create a task', async () => {
      const result = await service.createTask({ test: true }, 1);
      expect(result).toEqual({ id: 'task1', payload: { test: true }, priority: 1, status: 'pending', retryCount: 0, maxRetries: 3 });
      expect(prisma.task.create).toHaveBeenCalled();
      expect(redis.zadd).toHaveBeenCalledWith('priority_tasks', 1, 'task1');
    });

    it('should sync tasks', async () => {
      const result = await service.syncTasks([{ payload: { test: true }, priority: 1 }]);
      expect(result).toHaveLength(1);
      expect(prisma.task.create).toHaveBeenCalled();
    });
  });