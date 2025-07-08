import {Worker} from 'bullmq'
import {connection} from '../common/config'

const worker = new Worker('tasks', async job => {
    switch(job.name) {
        case 'imageProcessing': 
            return processImage(job.data)
        case 'dataAnalysis':
            return analyzeData(job.data)
            default: 
                throw new Error('Unknown task type.')
    }
}, {connection})

async function processImage(data: any) {
    console.log('Processing image: ', data.imageId);
    return {status: 'processed'}
}

async function analyzeData (data: any) {
    console.log('Analyze data', data.datasetId)
    return { insights: []}
}