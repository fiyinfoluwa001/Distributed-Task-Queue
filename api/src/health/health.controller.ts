import {Controller, Get} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {Redis} from 'ioredis';
@Controller()
export class HealthController {
    private redis: Redis;
    constructor(private prisma : PrismaService) {
        this.redis = new Redis (process.env.REDIS_URL || 'redis://redis:6379')
    }
    @Get('health')
    async healthCheck() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            await this.redis.ping()
            return {status: 'ok', database: 'connected', redis: 'connected'}
        } catch (error) {
            return {status: 'error', error: error.message}
        }
    }
    @Get('metrics')
    async metrics() {
        const taskCount = await this.prisma.task.count();
        const pendingTasks = await this.prisma.task.count({where: {status: 'pending'}})
        const activeWorkers = await this.prisma.worker.count({
            where: {heartbeat: {gt: new Date(Date.now() - 60000)}}
        })
        return {taskCount,pendingTasks, activeWorkers}
    }
}