import { Module } from "@nestjs/common";
import { BullBoardModule as BullBoardLibModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

@Module({
  imports: [
    BullBoardLibModule.forRoot({
      route: "/queues",
      adapter: ExpressAdapter,
    }),
    BullBoardLibModule.forFeature({
      name: "tasks",
      adapter: BullMQAdapter,
    }),
  ],
})
export class BullBoardModule {}
