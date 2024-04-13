const express = require('express');
const axios = require('axios');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const port = 3000; // You can change this port as per your preference

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
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json, text/plain, /',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Cookie': 'JSESSIONID=A10F0FF11FB868969265E9EA52F5471F; _gcl_au=1.1.2017541632.1711712166; _ga_0HY41G82W8=GS1.2.1711713485.1.1.1711714166.0.0.0; _ga_9KVDMCX0SS=GS1.1.1711713484.1.1.1711715954.0.0.0; _gid=GA1.2.122377588.1712899122; _clck=1dm7pkh%7C2%7Cfkv%7C0%7C1549; _ga_574899B7C5=GS1.1.1712899122.5.0.1712899126.0.0.0; _ga_ZWDDEPWW2T=GS1.1.1712899127.8.1.1712899215.0.0.0; _ga=GA1.1.1718844392.1711712166; _uetsid=c0d2d1e0f90411ee8a6fc788da673d12; _uetvid=87ca0560edc011ee9d2391cbc69fe3e1; _clsk=b8260n%7C1712950940707%7C2%7C1%7Ch.clarity.ms%2Fcollect; _ga_10ZKDM5ZR2=GS1.1.1712950930.14.1.1712951658.0.0.0; _ga_03M7E9DG13=GS1.1.1712950930.10.1.1712951659.0.0.0; _ga_BMZTR0CC5Y=GS1.1.1712950930.9.1.1712951659.0.0.0',
                'Referer': 'https://self-service.dal.ca/BannerExtensibility/customPage/page/dal.stuweb_academicTimetable',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"'
            }
        });

        // Length of the response
        const currentLength = response.data.length;

        // Check if length has increased
        if (currentLength > prevLength) {
            await makeVoiceCall();
            prevLength = currentLength;
        } else {
            console.log("Length of response has not increased.");
        }
    } catch (error) {
        console.error("Error occurred while fetching data:", error.message);
    }
}

// Call the function every 2 minutes
setInterval(checkResponseLength, 30_000); // 30_000 milliseconds = 30 seconds

app.get('/', (req, res) => {
    res.send('API Monitoring Service');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
