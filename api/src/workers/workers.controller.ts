// api/src/workers/workers.controller.ts
import { Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller ('workers')
export class WorkersController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  async register() {
    const worker = await this.prisma.worker.create({
      data: { heartbeat: new Date() },
    });
    return { workerId: worker.id };
  }
}