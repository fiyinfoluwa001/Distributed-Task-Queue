import  * as cron from 'node-cron';
import { DateTime } from 'luxon';
import  * as dotenv from 'dotenv';
import axios from 'axios';
dotenv.config({path: '../../infra/.env'});
const API_URL = "http://localhost:3000";

async function getAdminToken () {
    const response = await axios.post(`${API_URL}/auth/login`, {role: 'admin'});
    return response.data.token;
}
async function scheduleTasks () {
    const token = await getAdminToken();
    cron.schedule('0 9 * * * ', async () => {
        const now = DateTime.now().setZone('Africa/Lagos')
        console.log(`Scheduling daily tasks at ${now.toISO()}`);
        try {
            await axios.post(
                `${API_URL}/tasks`,
                {payload: {type: 'dailyReport', timestamp: now.toISO()}, priority : 1},
                {headers: {Authorization: `Bearer ${token}`}}
            );
            console.log('Daily tasks scheduled.')
        }   catch (error: any) {
            console.log('Failed to schedule tasks: ', error.message)
        }
    }, {
        timezone : 'Africa/Lagos'
    })
}

scheduleTasks().catch(console.error)