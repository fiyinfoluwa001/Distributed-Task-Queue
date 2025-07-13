import {Queue, Worker, QueueEvents, Job} from 'bullmq'
import IORedis from 'ioredis'
import { Task, TaskHandler, TaskRegistry, TaskResult } from '../types/types'
import { TaskSchema } from '../types/types'
import {v4 as uuidv4} from 'uuid'
import { logger } from '../common/logger'
import { WebSocketServer } from 'ws'

export class DistributedTaskQueue {
    private queue: Queue;
    private workers: Worker[] = []
    private queueEvents: QueueEvents;
    private taskRegistry: TaskRegistry = {}
    private redis : IORedis
    private wss: WebSocketServer
    private workerOptions: WorkerOptions;

    constructor (
    redisConnection : IORedis,
    queueName: string = "default",
    workerOptions: WorkerOptions = {
      concurrency: 10,
      stalledInterval: 30000,
      lockDuration: 60000,
    }
)   {
    this.redis = redisConnection;
    this.workerOptions = workerOptions
    this.queue = new Queue(queueName, {connection: this.redis})
    this.queueEvents =  new QueueEvents(queueName, {connection: this.redis})

    this.wss = new WebSocketServer({port: 8080})
    this.setupWebSocketServer()
    this.setupEventListeners()
}
private setupWebSocketServer() {
    this.wss.on("connection", (ws) => {
        logger.info("New Websocket connection")
        ws.on("message", (message) => {
            logger.debug(`Received Websocket message: ${message}`)
        })
        ws.send(JSON.stringify({type: "connected", queue: this.queue.name}))
    })
}

private broadcast(message: any) {
    this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message))
        }
    })
}
private setupEventListeners() {
    this.queueEvents.on("completed", ({jobId, returnvalue}) => {
        logger.info(`Job ${jobId} completed with result: ${returnvalue}`)
        this.broadcast({
            type: "taskCompleted",
            taskId: jobId,
            result: returnvalue,
        })
    })
    this.queueEvents.on("failed", ({jobId, failedReason}) => {
        logger.error(`Job ${jobId} failed with Reason: ${failedReason}`)
        this.broadcast({
            type: "taskFailed",
            taskId: jobId,
            error: failedReason
        })
    })
    this.queueEvents.on("progress", ({jobId, data}) => {
        logger.debug(`Job ${jobId} progress: ${data}%`)
        this.broadcast({
            type: "taskProgress",
            taskId: jobId,
            progress: data
        })
    })
}
    registerTaskHandler<T extends Task>(
    taskType: string,
    handler: TaskHandler<T>
): void {
    this.taskRegistry[taskType] = handler
    const worker = new Worker(
        this.queue.name,
        async(job: Job) => {
            const task = TaskSchema.parse(job.data)
            const progress = (p: number) => job.updateProgress(p)
            try {
                const handler = this.taskRegistry[task.type]
                if (!handler) {
                    throw new Error(`No handler registered for task type ${task.type} `)
                }
                const result = await handler( task, progress);
                return result;
            } catch (error) {
                logger.error(`Error processing task ${task.id}: ${error}`)
                throw error
            }
        },
        {
            connection: this.redis,
            concurrency: this.workerOptions.concurrency,
            stalledInterval: this.workerOptions.stalledInterval,
            lockDuration: this.workerOptions.lockDuration
        }
    )
    this.workers.push(worker)
    logger.info(`Registered handler for task type ${taskType}`)
}
    async enqueueTask <T extends Omit<Task, "id" | "createdAT">>(task: T):Promise<string> {
        const taskWithId = {
            ...task,
            id: uuidv4(),
            createdAt: new Date()
        };
        const validatedTask = TaskSchema.parse(taskWithId);
        const job = await this.queue.add(
            validatedTask.type,
            validatedTask,
            {
                jobId: validatedTask.id,
                priority: validatedTask.priority,
                attempts: validatedTask.maxRetries,
                backoff: {
                    type: "exponential",
                    delay: 1000,
                },
                timeout: validatedTask.timeout
            }
        )
        logger.info(`Enqueued task ${job.id} of type ${validatedTask.type}`);
        return job.id;
    }
    async close(): Promise<void> {
        await this.queue.close();
        await  Promise.all(this.workers.map((worker) => worker.close()))
        await this.queueEvents.close()
        this.wss.close()
        logger.info('Queue and workers closed successfully')
    }
}
