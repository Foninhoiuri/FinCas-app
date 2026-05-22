import http from 'http';

const data = JSON.stringify({ invite_token: 'ALVES-X79K' });

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/auth/validate-token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
