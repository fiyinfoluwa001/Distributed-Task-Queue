import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis';
@Injectable()
export class TaskService {
    private redis: Redis;
    constructor(private prisma: PrismaService)
}

