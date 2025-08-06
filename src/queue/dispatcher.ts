import Redis from "ioredis";
import { checkRateLimit } from "./limiter";
const redis = new Redis();
export const dispatchTasks = async () => {
    const tasks = await redis.zrangebyscore('taskQueue', 0, Date.now(), 'LIMIT', 0, 10)
    for (const taskStr of tasks) {
        const task = JSON.parse(taskStr);
        const allowed = await  checkRateLimit(task.tenantId, 5, 60_000)
        if (!allowed) continue;
        await redis.lpush('workerQueue', taskStr)
        await redis.zrem('taskQueue', taskStr)
        console.log(`Dispatch task ${task.id}`)

    }
}