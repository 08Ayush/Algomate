
const dotenv = require('dotenv');
dotenv.config();

import { authenticate } from './shared/middleware/auth';
import { NextRequest } from 'next/server';

// Mock User
const user = {
    id: "2d1a31bc-969f-4711-9e2f-65237ea3251d",
    email: "college.admin@svpcet.in",
    role: "college_admin",
    college_id: "c25be3d2-4b6d-4373-b6de-44a4e2a2508f",
    department_id: null,
    faculty_type: null
};

const token = Buffer.from(JSON.stringify(user)).toString('base64');
console.log('Testing Token:', token);

// Mock Request
const mockRequest = {
    headers: {
        get: (name: string) => {
            if (name.toLowerCase() === 'authorization') {
                return `Bearer ${token}`;
            }
            return null;
        }
    }
} as unknown as NextRequest;

async function run() {
    console.log('Running authenticate()...');
    const result = await authenticate(mockRequest);
    console.log('Result:', result);
}

run().catch(console.error);
