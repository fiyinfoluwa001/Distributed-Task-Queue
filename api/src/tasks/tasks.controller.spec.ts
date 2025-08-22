import { Test } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        TasksService,
        { provide: 'PrismaService', useValue: {task: {create: jest.fn(), findMany: jest.fn(),  findUnique: jest.fn(), update: jest.fn()}} },
        {provide: 'AuthService', useValue: {validateToken: jest.fn(() => ({role: 'admin'}))}}
      ],
    }).compile();
    controller = module.get<TasksController>(TasksController);
  });

  it('should create a task', async () => {
    expect(controller.create({ payload: { test: true } })).toBeDefined();
  });
  it ('should sync tasks', async () => {
    const result = await controller.syncTasks({tasks: [{payload: {test: true}, priority: 1}]})
    expect(result).toBeDefined()
  })
});