import 'dotenv/config';
import fetch from 'node-fetch';

async function check() {
  const url = 'http://localhost:3001/api/health';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Health Check Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

check();
