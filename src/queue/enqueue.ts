import Redis from 'ioredis';
import {v4 as uuid} from 'uuid';
import { Task } from '../types/task';

const redis = new Redis();

export const enqueueTask = async (tenantId: string, type: string, payload: any) => {
    const task: Task = {
        id: uuid(),
        tenantId,
        type,
        payload,
        createdAt: Date.now()
    }
    await redis.zadd('taskQueue', task.createdAt.toString(), JSON.stringify(task))
    console.log(`Task ${task.id} enqueued.`)
}