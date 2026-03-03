/**
 * Test script: verify the full auth flow end-to-end
 * Run with: node scripts/test-auth-flow.js
 */
require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Simulate what the frontend does: create token from stored user object
const storedUser = {
  id: '2d1a31bc-969f-4711-9e2f-65237ea3251d',
  email: 'college.admin@svpcet.in',
  college_uid: 'ADMIN001',
  role: 'college_admin',
  college_id: 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f',
  department_id: null,
  faculty_type: null,
  first_name: 'College',
  last_name: 'Admin',
  cachedAt: Date.now()
};

const token = Buffer.from(JSON.stringify(storedUser)).toString('base64');
console.log('Token (first 60 chars):', token.substring(0, 60) + '...');

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body.substring(0, 200) });
      });
    });

    req.on('error', e => resolve({ status: 'ERROR', body: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 'TIMEOUT', body: '' }); });
    req.end();
  });
}

async function run() {
  const endpoints = [
    `/api/admin/departments?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/admin/stats?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/notifications?user_id=2d1a31bc-969f-4711-9e2f-65237ea3251d&limit=10`,
    `/api/admin/colleges?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/admin/faculty?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/admin/classrooms?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/admin/batches?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/admin/subjects?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/timetables?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/admin/students?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
    `/api/events?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f`,
  ];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    console.log(`\nGET ${endpoint}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Body: ${result.body}`);
  }
}

run();
