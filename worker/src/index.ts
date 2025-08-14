import { Redis } from 'ioredis';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
interface StreamEntry {
  id: string;
  fields: string[];
}

async function startWorker() {
  try {
    const response = await fetch('http://localhost:3000/workers/register', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Worker registration failed: ${response.statusText}`);
    }
    const { workerId } = await response.json();
    setInterval(async () => {
      try {
        await fetch('http://localhost:3000/workers/register', {
          method: 'POST',
        });
      } catch (error) {
        console.error(`Worker ${workerId} heartbeat failed:`, error);
      }
    }, 30000);
    console.log(`Worker ${workerId} started`);
    while (true) {
      const result = await redis.xread('BLOCK', 5000, 'STREAMS', 'tasks', '0');
      if (!result) {
        console.log('No new tasks, waiting...');
        continue;
      }
      for (const [stream, entries] of result as [string, [string, string[]][]][]) {
        if (stream !== 'tasks') continue; // Safety check
        for (const [id, fields] of entries) {
          // Fields is string[], e.g., ['key1', 'value1', 'taskId', 'some-id']
          const taskIdIndex = fields.indexOf('taskId');
          if (taskIdIndex === -1 || taskIdIndex + 1 >= fields.length) {
            console.error(`Invalid task format in stream entry ${id}`);
            continue;
          }
          const taskId = fields[taskIdIndex + 1];
          console.log(`Worker ${workerId} processing task ${taskId}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await redis.xdel('tasks', id);
        }
      }
    }
  } catch (error) {
    console.error('Worker error:', error);
    process.exit(1); 
  }
}
startWorker();