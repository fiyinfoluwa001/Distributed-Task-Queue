import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../infra/.env' });

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

const offlineTasks: { payload: any; priority: number }[] = [];

async function startWorker() {
  try {
    const response = await fetch('http://localhost:3000/workers/register', { method: 'POST' });
    if (!response.ok) throw new Error(`Worker registration failed: ${response.statusText}`);
    const { workerId } = await response.json();

    setInterval(async () => {
      try {
        await fetch('http://localhost:3000/workers/register', { method: 'POST' });
        if (offlineTasks.length > 0) {
          await fetch('http://localhost:3000/tasks/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: offlineTasks }),
          });
          offlineTasks.length = 0;
        }
      } catch (error) {
        console.error(`Worker ${workerId} heartbeat/sync failed:`, error);
      }
    }, 30000);

    console.log(`Worker ${workerId} started`);

    while (true) {
      try {
        const taskIds = await redis.zrange('priority_tasks', 0, 0, 'WITHSCORES');
        if (!taskIds.length) {
          console.log('No tasks, waiting...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        const taskId = taskIds[0]; // taskId is first element
        const priority = parseInt(taskIds[1]); // score is second element
        const lockKey = `lock:${taskId}`;
        const acquired = await redis.set(lockKey, workerId, 'PX', 10000, 'NX');
        if (!acquired) continue;

        try {
          const response = await fetch(`http://localhost:3000/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${await getWorkerToken()}` },
          });
          if (!response.ok) throw new Error(`Failed to fetch task ${taskId}`);
          const task = await response.json();
          if (task.status !== 'pending') {
            await redis.zrem('priority_tasks', taskId);
            await redis.del(lockKey);
            continue;
          }

          await fetch(`http://localhost:3000/tasks/${taskId}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${await getWorkerToken()}` },
          });
          console.log(`Worker ${workerId} processing task ${taskId}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await fetch(`http://localhost:3000/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${await getWorkerToken()}` },
          });
          await redis.zrem('priority_tasks', taskId);
        } catch (error) {
          console.error(`Task ${taskId} failed:`, error);
          const retryCount = parseInt((await redis.get(`retry:${taskId}`)) || '0');
          const newRetryCount = retryCount + 1;
          if (newRetryCount >= 3) {
            await redis.xadd('dlq', '*', 'taskId', taskId);
            await redis.zrem('priority_tasks', taskId);
          } else {
            const backoff = Math.pow(2, newRetryCount) * 1000;
            await redis.set(`retry:${taskId}`, newRetryCount, 'PX', backoff);
            offlineTasks.push({ payload: { taskId }, priority });
          }
        } finally {
          await redis.del(lockKey);
        }
      } catch (error) {
        console.error('Worker loop error:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error('Worker error:', error);
    process.exit(1);
  }
}

async function getWorkerToken() {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'worker' }),
  });
  const { token } = await response.json();
  return token;
}

startWorker();