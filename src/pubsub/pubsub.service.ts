import { Injectable } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";

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
export class PubSubService {
  private pubSub: any;

  constructor() {
    this.pubSub = new PubSub();
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
}
