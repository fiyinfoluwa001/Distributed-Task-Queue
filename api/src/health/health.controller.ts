import {Controller, Get} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Gauge, Counter, Registry } from 'prom-client';
import {Redis} from 'ioredis';
const register = new Registry();

const taskQueueDepth = new Gauge ({
    name: 'taskQueueDepth',
    help: "Number of tasks in a queue",
    registers: [register]
});
const taskFailures = new Counter ({
    name: 'taskFailureTotal',
    help: 'Total number of task failures',
    registers: [register]
})
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
        const queueDepth = await this.redis.zcard('priorityTasks');
        taskQueueDepth.set(queueDepth)
        return {taskCount,pendingTasks, activeWorkers, queueDepth, prometheus: await register.metrics()}
    }
}