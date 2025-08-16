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
        { provide: 'PrismaService', useValue: {} },
      ],
    }).compile();
    controller = module.get<TasksController>(TasksController);
  });

  it('should create a task', async () => {
    expect(controller.create({ payload: { test: true } })).toBeDefined();
  });
});