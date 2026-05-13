require('dotenv').config();
const https = require('https');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const senderEmail = "gajulasiddhu06@gmail.com";
const recipientEmail = "gajulasiddhu06@gmail.com"; // Self-test

const data = JSON.stringify({
    sender: { name: 'Insurance AI', email: senderEmail },
    to: [{ email: recipientEmail }],
    subject: 'Test OTP',
    htmlContent: 'Your test code is: 123456'
});

const options = {
    hostname: 'api.brevo.com',
    port: 443,
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': data.length
    }
};

console.log('Sending test Email to Brevo...');
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
