import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { emit } from "process";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: "query", emit: "event" },
        { level: "error", emit: "stdout" },
        { level: "warn", emit: "stdout" },
      ],
      errorFormat: "pretty",
    });

    if (process.env.NODE_ENV === "development") {
      //@ts-ignore
      this.$on("query", (e) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Prisma is connected to the database");
    } catch (error) {
      this.logger.error("Failed to connect to the database", error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Prisma disconnected from the database");
  }

  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.$transaction(fn);
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error("Database health check failed ", error);
      return false;
    }
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot clean database in production");
    }

    const models = Reflect.ownKeys(this).filter(
      //@ts-ignore
      (key) => key[0] !== "_" && key !== "constructor"
    );
    return Promise.all(
      models.map((modelKey) => {
        //@ts-ignore
        return this[modelKey].deleteMany?.();
      })
    );
  }
}
