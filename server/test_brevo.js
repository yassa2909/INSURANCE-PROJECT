require('dotenv').config();
const https = require('https');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const phone = "916355854371"; // Test number from .env

const data = JSON.stringify({
    type: 'transactional',
    sender: 'INSURE',
    recipient: phone,
    content: `Test OTP: 123456`
});

const options = {
    hostname: 'api.brevo.com',
    port: 443,
    path: '/v3/transactionalSMS/sms',
    method: 'POST',
    headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': data.length
    }
};

console.log('Sending test SMS to Brevo...');
const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
