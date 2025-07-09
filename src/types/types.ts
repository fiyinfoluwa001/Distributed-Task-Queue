import {z} from 'zod'
export const TaskSchema = z.object({
    id: z.string().uuid(),
    type: z.string(),
    payload: z.record(z.unknown()),
    priority: z.number().min(1).max(10).default(5),
    maxRetries: z.number().min(1000).default(30000),
    createdAt: z.date().default(() => new Date())
});
export type Task = z.infer<typeof TaskSchema>;

export type TaskResult = {
    status: 'completed' | 'failed' | 'retrying';
    output ?: unknown;
    error?: string;
    retryCount?: number;
}
export type TaskHandler <T extends Task> = (
    task : T,
    progress: (percentage: number) => void
) => Promise<TaskResult>

export type TaskRegistry = {
    [key: string]: TaskHandler<any>;
};

export type WorkerOptions = {
    concurrency: number;
    stalledInterval: number;
    lockDuration: number
};

export type QueueEvents = {
    onTaskProgress: ( taskId: string, progress: number) => void;
    onTaskCompleted: (taskId: string, result: unknown) => void
    onTaskFailed: (TaskId: string, error: Error) => void
}