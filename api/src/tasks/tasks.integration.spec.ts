import { Test, TestingModule } from '@nestjs/testing';
  import { INestApplication } from '@nestjs/common';
  import request from 'supertest';
  import { AppModule } from '../app.module';
  import { PrismaService } from '../prisma/prisma.service';
  import { Redis } from 'ioredis';

  describe('Tasks API (Integration)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let redis: Redis;
    let token: string;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      prisma = moduleFixture.get<PrismaService>(PrismaService);
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await app.init();

      // Generate JWT
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ role: 'admin' });
      token = response.body.token;
    });

    afterAll(async () => {
      await prisma.$disconnect();
      await redis.quit();
      await app.close();
    });

    beforeEach(async () => {
      await prisma.task.deleteMany();
      await redis.flushall();
    });

    it('should create a task', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ payload: { test: true }, priority: 1 })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
      expect(response.body.priority).toBe(1);

      const tasksInRedis = await redis.zrange('priority_tasks', 0, -1);
      expect(tasksInRedis).toContain(response.body.id);
    });

    it('should list tasks', async () => {
      await prisma.task.create({
        data: { payload: { test: true }, priority: 1, status: 'pending' },
      });

      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id');
    });

    it('should sync offline tasks', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ tasks: [{ payload: { test: true }, priority: 1 }] })
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('pending');
    });

    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
      expect(response.body.redis).toBe('connected');
    });
  });