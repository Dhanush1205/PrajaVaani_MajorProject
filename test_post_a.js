const http = require('http');

const data = JSON.stringify({
  name: 'a',
  email: 'a@y.com',
  password: 'a'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => { console.log('Status:', res.statusCode, 'Body:', body); });
});

req.on('error', (error) => { console.error('Error:', error); });
req.write(data);
req.end();
