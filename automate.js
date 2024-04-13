const cron = require('node-cron');
const express = require('express');
const axios = require('axios');
const twilio = require('twilio');
const bodyParser = require('body-parser');
const moment = require('moment');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Twilio credentials
const accountSid = process.env.SID;
const authToken = process.env.TOKEN;
const fromPhoneNumber = '+12514511242';
const toPhoneNumber = '+17828827136';

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// API endpoint
const url = 'https://self-service.dal.ca/BannerExtensibility/internalPb/virtualDomains.dal_stuweb_academicTimetable?MjY%3DcGFnZV9zaXpl=MjE%3DOTk5OQ%3D%3D&MzI%3DdGVybXM%3D=ODg%3DMjAyNDMwOw%3D%3D&MzY%3Db2Zmc2V0=NDI%3DMA%3D%3D&Mzc%3DcGFnZV9udW0%3D=ODA%3DMQ%3D%3D&NDY%3DY3JzZV9udW1i=NTA%3Dnull&NTU%3DZGlzdHJpY3Rz=NDM%3DMTAwOzIwMDszMDA7NDAwOw%3D%3D&NzQ%3DbWF4=MjA%3DMTAwMA%3D%3D&ODI%3Dc3Vial9jb2Rl=Mg%3D%3DQ1NDSQ%3D%3D&encoded=true';

// Previous length of response
let prevLength = 95;
let currentLength;
let lastCheckedAt;
let cronJobRunning = false;
let job;

// Function to make voice call
async function makeVoiceCall() {
    try {
        await client.calls.create({
            twiml: `<Response><Say>The length of the response has increased. Check the API.</Say></Response>`,
            to: toPhoneNumber,
            from: fromPhoneNumber
        });
        console.log('Voice call initiated successfully.');
    } catch (error) {
        console.error('Error initiating voice call:', error.message);
    }
}

// Function to make API request and check response length
async function checkResponseLength() {
    try {
        const response = await axios.get(url);

        // Length of the response
        currentLength = response.data.length;
        lastCheckedAt = new Date();

        // Check if length has increased
        if (currentLength > prevLength) {
            await makeVoiceCall();
            prevLength = currentLength;
        } else {
            console.log("Length of response has not increased. " + "current length: " + currentLength);
        }
    } catch (error) {
        console.error("Error occurred while fetching data:", error.message);
    }
}

// Schedule the job to run every 2 minutes
function startCronJob() {
    job = cron.schedule('*/1 * * * *', checkResponseLength);
    cronJobRunning = true;
}

// Stop the cron job
function stopCronJob() {
    if (job) {
        job.stop();
        cronJobRunning = false;
    }
}

// Routes
app.get('/', (req, res) => {
    const data = {
        currentLength,
        lastCheckedAt: lastCheckedAt ? moment(lastCheckedAt).format('YYYY-MM-DD HH:mm:ss') : 'Not checked yet',
        cronJobRunning
    };
    res.send(`
        <h1>API Monitoring Service</h1>
        <p>Current length of response: ${data.currentLength || 'Not available'}</p>
        <p>Last checked at: ${data.lastCheckedAt}</p>
        <p>Cron job running: ${data.cronJobRunning}</p>
        <form action="/check" method="POST">
            <button type="submit">Check Now</button>
        </form>
        <button onclick="startCronJob()">Start Cron Job</button>
        <button onclick="stopCronJob()">Stop Cron Job</button>
    `);
});

app.post('/check', (req, res) => {
    checkResponseLength();
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Start the cron job initially
startCronJob();
