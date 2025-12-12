import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("Tasks (e2e)", () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post("/graphql")
      .send({
        query: `
          mutation {
            login(input: { email: "test@example.com", password: "password" }) {
              accessToken
            }
          }
        `,
      });

    authToken = JSON.parse(loginResponse.body.data.login).accessToken;
  });

  it("should create a task", () => {
    return request(app.getHttpServer())
      .post("/graphql")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        query: `
          mutation {
            createTask(input: {
              title: "E2E Test Task"
              description: "Testing task creation"
              priority: NORMAL
            }) {
              id
              title
              status
            }
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.createTask).toHaveProperty("id");
        expect(res.body.data.createTask.title).toBe("E2E Test Task");
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
