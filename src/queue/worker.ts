import Redis from 'ioredis'
const redis = new Redis ();
export const runWorker = async () => {
    while (true) {
        const taskStr = await redis.brpop('workerQueue', 0)
        if (!taskStr) continue
        const task = JSON.parse(taskStr[1])
        console.log(`Processing task ${task.id} for tenant at ${task.tenantId}`)
        await new Promise((res) => {
            setTimeout(res, 1000)
        })
    }
}
