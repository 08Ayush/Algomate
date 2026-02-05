/**
 * Notification System Test Script
 * Run this with: npx tsx scripts/test-notifications.ts
 * 
 * This script tests the notification API endpoints
 */

const BASE_URL = 'http://localhost:3000';

// Helper to create auth token (mock - replace with real token from your login)
function createMockToken(userData: any): string {
    return Buffer.from(JSON.stringify(userData)).toString('base64');
}

// Sample test user data - replace with actual user IDs from your database
const TEST_ADMIN = {
    user_id: 'YOUR_ADMIN_USER_ID',  // Replace with actual admin user ID
    role: 'college_admin',
    college_id: 'YOUR_COLLEGE_ID',  // Replace with actual college ID
    department_id: 'YOUR_DEPARTMENT_ID',  // Replace with actual department ID
    first_name: 'Admin',
    last_name: 'User'
};

const TEST_FACULTY = {
    user_id: 'YOUR_FACULTY_USER_ID',  // Replace with actual faculty user ID
    role: 'faculty',
    college_id: 'YOUR_COLLEGE_ID',
    department_id: 'YOUR_DEPARTMENT_ID',
    first_name: 'Test',
    last_name: 'Faculty'
};

const TEST_STUDENT = {
    user_id: 'YOUR_STUDENT_USER_ID',  // Replace with actual student user ID
    role: 'student',
    college_id: 'YOUR_COLLEGE_ID',
    department_id: 'YOUR_DEPARTMENT_ID',
    batch_id: 'YOUR_BATCH_ID',  // Replace with actual batch ID
    first_name: 'Test',
    last_name: 'Student'
};

async function testAPI(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    user: any,
    body?: any
): Promise<any> {
    const token = createMockToken(user);

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json();
        return { status: response.status, data };
    } catch (error: any) {
        return { status: 500, error: error.message };
    }
}

async function runTests() {
    console.log('🧪 Starting Notification System Tests\n');
    console.log('='.repeat(60));

    // Test 1: Get notifications for admin
    console.log('\n📥 Test 1: Fetch notifications for admin user');
    const notificationsResult = await testAPI('/api/notifications', 'GET', TEST_ADMIN);
    console.log('Status:', notificationsResult.status);
    console.log('Response:', JSON.stringify(notificationsResult.data, null, 2).slice(0, 500));

    // Test 2: Create announcement
    console.log('\n📢 Test 2: Create announcement');
    const announcementResult = await testAPI('/api/announcements', 'POST', TEST_ADMIN, {
        title: 'Test Announcement',
        content: 'This is a test announcement created by the notification testing script.',
        targetType: 'college',
        priority: 'normal',
        notifyStudents: true,
        notifyFaculty: true
    });
    console.log('Status:', announcementResult.status);
    console.log('Response:', JSON.stringify(announcementResult.data, null, 2));

    // Test 3: Fetch announcements
    console.log('\n📋 Test 3: Fetch announcements');
    const fetchAnnouncementsResult = await testAPI('/api/announcements', 'GET', TEST_ADMIN);
    console.log('Status:', fetchAnnouncementsResult.status);
    console.log('Response:', JSON.stringify(fetchAnnouncementsResult.data, null, 2).slice(0, 500));

    // Test 4: Create event with notifications
    console.log('\n📅 Test 4: Create event with notifications');
    const eventResult = await testAPI('/api/events', 'POST', TEST_ADMIN, {
        title: 'Test Event',
        description: 'This is a test event for notification testing.',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        venue: 'Main Auditorium',
        department_id: TEST_ADMIN.department_id,
        college_id: TEST_ADMIN.college_id,
        created_by: TEST_ADMIN.user_id,
        notifyStudents: true,
        notifyFaculty: true
    });
    console.log('Status:', eventResult.status);
    console.log('Response:', JSON.stringify(eventResult.data, null, 2));

    // Test 5: Check student notifications after announcements/events
    console.log('\n🔔 Test 5: Check student notifications');
    const studentNotifications = await testAPI('/api/notifications', 'GET', TEST_STUDENT);
    console.log('Status:', studentNotifications.status);
    console.log('Unread count:', studentNotifications.data?.unreadCount || 0);
    console.log('Total notifications:', studentNotifications.data?.notifications?.length || 0);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Notification System Tests Complete\n');

    // Summary
    console.log('📊 Test Summary:');
    console.log('  - Notifications API: ' + (notificationsResult.status === 200 ? '✅' : '❌'));
    console.log('  - Create Announcement: ' + (announcementResult.status === 200 ? '✅' : '❌'));
    console.log('  - Fetch Announcements: ' + (fetchAnnouncementsResult.status === 200 ? '✅' : '❌'));
    console.log('  - Create Event: ' + (eventResult.status === 200 || eventResult.status === 201 ? '✅' : '❌'));
    console.log('  - Student Notifications: ' + (studentNotifications.status === 200 ? '✅' : '❌'));
}

// Instructions
console.log(`
╔══════════════════════════════════════════════════════════════╗
║        NOTIFICATION SYSTEM TESTING SCRIPT                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Before running, update the following in this file:           ║
║                                                               ║
║  1. TEST_ADMIN.user_id     - Admin user UUID from database    ║
║  2. TEST_ADMIN.college_id  - College UUID from database       ║
║  3. TEST_ADMIN.department_id - Department UUID                ║
║  4. TEST_FACULTY.user_id   - Faculty user UUID                ║
║  5. TEST_STUDENT.user_id   - Student user UUID                ║
║  6. TEST_STUDENT.batch_id  - Batch UUID                       ║
║                                                               ║
║  You can find these UUIDs in Supabase:                        ║
║    - Table Editor > users                                     ║
║    - Table Editor > colleges                                  ║
║    - Table Editor > departments                               ║
║    - Table Editor > batches                                   ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
`);

runTests().catch(console.error);
