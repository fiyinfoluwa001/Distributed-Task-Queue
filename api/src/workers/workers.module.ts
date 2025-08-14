import { Module } from '@nestjs/common';
import { WorkersController } from './workers.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkersController],
})
export class WorkersModule {}