import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

export interface TaskCreatedPayload {
  taskCreated: any;
}

export interface TaskUpdatedPayload {
  taskUpdated: any;
}

type PubSubEvents = {
  taskCreated: TaskCreatedPayload;
  taskUpdated: TaskUpdatedPayload;
};

@Injectable()
export class PubSubService implements OnModuleDestroy {
  private pubSub: RedisPubSub;
  private publisher: Redis;
  private subscriber: Redis;

  constructor(private configService: ConfigService) {
    const options = {
      host: this.configService.get("REDIS_HOST", "localhost"),
      port: this.configService.get<number>("REDIS_PORT", 6379),
    };

    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);

    this.pubSub = new RedisPubSub({
      publisher: this.publisher,
      subscriber: this.subscriber,
    });
  }

  async publish<T extends keyof PubSubEvents>(
    event: T,
    payload: PubSubEvents[T]
  ): Promise<void> {
    await this.pubSub.publish(event as string, payload);
  }

  asyncIterator<T extends keyof PubSubEvents>(event: T | T[]) {
    return this.pubSub.asyncIterator(event as string | string[]);
  }

  async onModuleDestroy() {
    await this.pubSub.close();
  }
}
