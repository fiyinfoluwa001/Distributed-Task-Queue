import { Test } from '@nestjs/testing';
  import { TasksController } from './tasks.controller';
  import { TasksService } from './tasks.service';
  import { AuthService } from '../auth/auth.service';

  describe('TasksController', () => {
    let controller: TasksController;
    let tasksService: TasksService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TasksController],
        providers: [
          {
            provide: TasksService,
            useValue: {
              createTask: jest.fn().mockResolvedValue({ id: 'task1', payload: { test: true }, priority: 1, status: 'pending' }),
              listTasks: jest.fn().mockResolvedValue([{ id: 'task1', status: 'pending' }]),
              getPendingTasks: jest.fn().mockResolvedValue([{ id: 'task1', status: 'pending' }]),
              getTask: jest.fn().mockResolvedValue({ id: 'task1', status: 'pending' }),
              updateTaskStatus: jest.fn().mockResolvedValue({ id: 'task1', status: 'in-progress' }),
              syncTasks: jest.fn().mockResolvedValue([{ id: 'task1' }]),
            },
          },
          { provide: AuthService, useValue: { validateToken: jest.fn(() => ({ role: 'admin' })) } },
          { provide: 'PrismaService', useValue: {} },
        ],
      }).compile();
      controller = module.get<TasksController>(TasksController);
      tasksService = module.get<TasksService>(TasksService);
    });

    it('should create a task', async () => {
      const result = await controller.create({ payload: { test: true }, priority: 1 });
      expect(result).toEqual({ id: 'task1', payload: { test: true }, priority: 1, status: 'pending' });
      expect(tasksService.createTask).toHaveBeenCalledWith({ test: true }, 1);
    });

    it('should list tasks', async () => {
      const result = await controller.list();
      expect(result).toEqual([{ id: 'task1', status: 'pending' }]);
      expect(tasksService.listTasks).toHaveBeenCalled();
    });

    it('should get pending tasks', async () => {
      const result = await controller.getPending();
      expect(result).toEqual([{ id: 'task1', status: 'pending' }]);
      expect(tasksService.getPendingTasks).toHaveBeenCalled();
    });

    it('should get a task by ID', async () => {
      const result = await controller.getTask('task1');
      expect(result).toEqual({ id: 'task1', status: 'pending' });
      expect(tasksService.getTask).toHaveBeenCalledWith('task1');
    });

    it('should start a task', async () => {
      const result = await controller.startTask('task1');
      expect(result).toEqual({ id: 'task1', status: 'in-progress' });
      expect(tasksService.updateTaskStatus).toHaveBeenCalledWith('task1', 'in-progress');
    });

    it('should complete a task', async () => {
      const result = await controller.completeTask('task1');
      expect(result).toEqual({ id: 'task1', status: 'in-progress' });
      expect(tasksService.updateTaskStatus).toHaveBeenCalledWith('task1', 'completed');
    });

    it('should sync tasks', async () => {
      const result = await controller.syncTasks({ tasks: [{ payload: { test: true }, priority: 1 }] });
      expect(result).toEqual([{ id: 'task1' }]);
      expect(tasksService.syncTasks).toHaveBeenCalledWith([{ payload: { test: true }, priority: 1 }]);
    });
  });