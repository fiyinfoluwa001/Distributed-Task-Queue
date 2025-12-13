import { Module } from "@nestjs/common";
import { DateTimeScalar } from "./scalars/dateTime.scalars";
import { JSONScalar } from "./scalars/json.scalars";

@Module({
  providers: [DateTimeScalar, JSONScalar],
})
export class GraphqlModule {}
