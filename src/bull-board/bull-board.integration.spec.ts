import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { BullModule } from "@nestjs/bullmq";
const request = require("supertest");

describe("Bull Board UI", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({
          connection: { host: "localhost", port: 6379 },
        }),
        BullModule.registerQueue({ name: "tasks" }),

        BullBoardModule.forRoot({
          route: "/queues",
          adapter: ExpressAdapter,
        }),

        BullBoardModule.forFeature({
          name: "tasks",
          adapter: BullMQAdapter,
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  }, 15_000);

  afterAll(async () => {
    await app.close();
  }, 15_000);

  it("GET /queues should mount and return 200 with the Bull Board HTML UI", async () => {
    const res = await request(app.getHttpServer()).get("/queues");
    expect(res.status).toBe(200);
    // Bull Board serves an HTML page
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("GET /queues/ (trailing slash) should also return 200", async () => {
    const res = await request(app.getHttpServer()).get("/queues/");
    expect(res.status).toBe(200);
  });
});
