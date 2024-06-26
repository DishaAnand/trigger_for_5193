const cron = require('node-cron');
const express = require('express');
const axios = require('axios');
const twilio = require('twilio');
const compression = require('compression');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
const SSE = require('express-sse');
require('dotenv').config();

const app = express();
const port = 8080;
const sse = new SSE();
app.use(compression());

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
let seatFillingStarted;

// Global variables for status updates
let currentStatus = {
    currentLength,
    lastCheckedAt: lastCheckedAt ? moment(lastCheckedAt).tz('America/Halifax').format('YYYY-MM-DD HH:mm:ss') : 'Not checked yet',
    cronJobRunning
};

// Function to make voice call
async function makeVoiceCall() {
    try {
        await client.calls.create({
            twiml: `<Response><Say>The length of the response has increased. Check the API.</Say></Response>`,
            to: toPhoneNumber,
            from: fromPhoneNumber
        });
        console.log('Voice call initiated successfully.');
        seatFillingStarted = true;
    } catch (error) {
        console.error('Error initiating voice call:', error.message);
    }
}

async function checkArrayOfObjects(array) {
    for (const obj of array) {
        if (obj.CRSE_NUMB === "5193" && parseInt(obj.ENRL) > 0) {
            return true;
        }
    }
    return false;
}

async function findCourseEnrollment(array) {
    const course = array.find(obj => obj.CRSE_NUMB === "5193");
    return parseInt(course.ENRL);
}


// Function to make API request and check response length
async function checkResponseLength() {
    try {
        const response = await axios.get(url);

        // Length of the response
        currentLength = response.data.length;
        lastCheckedAt = new Date();

        // Check if length has increased
        const enrollmentStarted = await checkArrayOfObjects(response.data);
        if (currentLength == 96 && enrollmentStarted) {
            await makeVoiceCall();
            seatFillingStarted = true;
        } else {
            console.log("Length of response has not increased. " + "current length: " + currentLength);
        }
        
        const courseEnrollment = await findCourseEnrollment(response.data);
        
        // Update current status
        currentStatus = {
            currentLength,
            lastCheckedAt: moment(lastCheckedAt).tz('America/Halifax').format('YYYY-MM-DD HH:mm:ss'),
            cronJobRunning,
            courseEnrollment
        };

        // Broadcast status updates
        sse.send(currentStatus);
    } catch (error) {
        console.error("Error occurred while fetching data:", error.message);
    }
}

// Schedule the job to run every 10 sec
function startCronJob() {
    job = cron.schedule('*/10 * * * * *', checkResponseLength);
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
    res.send(`
        <h1>API Monitoring Service</h1>
        ${!seatFillingStarted ? '<h2 style="color: red">Not Available yet 😒</h2>' : '<p style="color: green;">5193 AVAILABLE NOW 😰✅</p>'}
        <div id="status">
            <p>Current length of response: ${currentStatus.currentLength || 'Not available'}</p>
            <p>Last checked at: ${currentStatus.lastCheckedAt}</p>
            <p>Cron job running: ${currentStatus.cronJobRunning}</p>
            <p id="countdown"></p>
        </div>
        <form action="/check" method="POST">
            <button type="submit">Check Now</button>
        </form>
        <script>
            function startCronJob() {
                fetch('/start-cron-job', { method: 'POST' })
                    .then(response => response.text())
                    .then(data => console.log(data))
                    .catch(error => console.error(error));
            }
            function stopCronJob() {
                fetch('/stop-cron-job', { method: 'POST' })
                    .then(response => response.text())
                    .then(data => console.log(data))
                    .catch(error => console.error(error));
            }
            // SSE event listener
            const eventSource = new EventSource('/status');
            eventSource.onmessage = function(event) {
                const data = JSON.parse(event.data);
                const statusDiv = document.getElementById('status');
                statusDiv.innerHTML = "<p>Current length of response: " + (data.currentLength || 'Not available') + "</p>" +
                    "<p>Last checked at: " + data.lastCheckedAt + "</p>" +
                    "<p>Cron job running: " + data.cronJobRunning + "</p>" +
                    "<p>Current Enrollment: " + data.courseEnrollment + "</p>";
            }
        </script>
    `);
});

app.post('/check', (req, res) => {
    checkResponseLength();
    res.redirect('/');
});

app.post('/start-cron-job', (req, res) => {
    startCronJob();
    res.send('Cron job started');
});

app.post('/stop-cron-job', (req, res) => {
    stopCronJob();
    res.send('Cron job stopped');
});

app.get('/status', sse.init);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Start the cron job initially
startCronJob();
