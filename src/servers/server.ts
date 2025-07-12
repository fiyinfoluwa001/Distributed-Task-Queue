import express from 'express'
import {Queue} from 'bullmq'
import { connection } from '../common/config'
import bodyParser from 'body-parser'
import {v4 as uuidv4} from 'uuid'
import {createBullBoard} from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express'
const taskQueue = new Queue('tasks', {connection})
const app = express()
app.use(express.json())
// Board for UI monitoring
const serverAdapter = new ExpressAdapter()
createBullBoard({
    queues: [new BullMQAdapter(taskQueue)],
    serverAdapter
})
serverAdapter.setBasePath('/admin');
app.use('/admin', serverAdapter.getRouter())

// Task submission endpoint
app.post('/tasks', async (req, res) => {
    const {type, data, priority} = req.body;
    const job = await taskQueue.add(type, data, {
        priority: priority || 'normal',
        jobId: uuidv4()
    })
    res.send({id: job.id})
})
app.use(bodyParser.json())
app.listen(4000, () => {
    console.log('Producer running on port 4000.')
})