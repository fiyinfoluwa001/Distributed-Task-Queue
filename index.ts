import {enqueueTask} from './src/queue/enqueue'
import {dispatchTasks} from './src/queue/dispatcher'
import { runWorker } from './src/queue/worker'

const mode = process.argv[2]
if (mode === 'enqueue') {
    enqueueTask('tenant A', 'email', {subject: 'Hello'})
}   else if (mode === 'dispatch') {
    setInterval(dispatchTasks, 1000 )
}    else if (mode === 'worker' ) {
    runWorker()
}
else {
    console.log('Usage: ts-node src/index.ts [enqueue|dispatcher|worker]')
}