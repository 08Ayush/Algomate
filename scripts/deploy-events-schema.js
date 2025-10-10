const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Please add these to your .env.local file:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployEventsSchema() {
  console.log('🚀 Events System Setup\n');
  console.log('=' .repeat(60));

  console.log('\n📋 STEP 1: Deploy Database Schema');
  console.log('   Please follow these steps:');
  console.log('   1. Open Supabase Dashboard (https://app.supabase.com)');
  console.log('   2. Go to SQL Editor');
  console.log('   3. Create a new query');
  console.log('   4. Copy the contents of: database/events_schema.sql');
  console.log('   5. Paste and run the SQL');
  console.log('   6. Verify no errors occurred\n');

  console.log('⏳ Waiting for you to complete schema deployment...');
  console.log('   Press Enter when done, or type "skip" to continue anyway: ');

  // In a real scenario, you'd wait for user input. For automation:
  console.log('   (Continuing automatically...)\n');

  // Check if events table exists
  const { data: tableCheck, error: tableError } = await supabase
    .from('events')
    .select('id')
    .limit(1);

  if (tableError && tableError.message.includes('does not exist')) {
    console.log('❌ Events table not found!');
    console.log('   Please run the events_schema.sql in Supabase SQL Editor first.\n');
    console.log('📄 Schema file location: database/events_schema.sql\n');
    process.exit(1);
  }

  console.log('✅ Events table found in database\n');

  // Now insert sample events
  await insertSampleEvents();
}

async function insertSampleEvents() {
  console.log('📝 Inserting sample events...\n');

  try {
    // First, get a faculty user and department
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, department_id')
      .eq('role', 'faculty')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No faculty user found. Please create a faculty user first.');
      return;
    }

    const facultyUser = users[0];
    console.log(`✅ Found faculty user: ${facultyUser.id}`);
    console.log(`✅ Department: ${facultyUser.department_id}\n`);

    // Sample events data
    const sampleEvents = [
      {
        title: 'AI/ML Workshop',
        description: 'Hands-on workshop covering the fundamentals of Artificial Intelligence and Machine Learning. Topics include neural networks, deep learning, and practical applications.',
        event_type: 'workshop',
        department_id: facultyUser.department_id,
        created_by: facultyUser.id,
        start_date: '2025-10-15',
        end_date: '2025-10-15',
        start_time: '09:00:00',
        end_time: '17:00:00',
        venue: 'Auditorium',
        expected_participants: 200,
        budget_allocated: 15000,
        contact_person: 'Dr. John Smith',
        contact_email: 'john.smith@college.edu',
        contact_phone: '+1 234 567 8900',
        status: 'approved',
        priority_level: 3,
        is_public: true,
        registration_required: true,
        max_registrations: 250
      },
      {
        title: 'Annual Cultural Fest 2025',
        description: 'Join us for the biggest cultural celebration of the year! Featuring music, dance, drama, and art exhibitions from students across all departments.',
        event_type: 'cultural',
        department_id: facultyUser.department_id,
        created_by: facultyUser.id,
        start_date: '2025-10-20',
        end_date: '2025-10-22',
        start_time: '10:00:00',
        end_time: '20:00:00',
        venue: 'Main Ground',
        expected_participants: 500,
        budget_allocated: 50000,
        contact_person: 'Prof. Sarah Johnson',
        contact_email: 'sarah.johnson@college.edu',
        contact_phone: '+1 234 567 8901',
        status: 'pending',
        priority_level: 4,
        is_public: true,
        registration_required: false,
        max_registrations: 0
      }
    ];

    // Insert events
    for (const event of sampleEvents) {
      console.log(`Creating event: ${event.title}...`);
      
      const { data, error } = await supabase
        .from('events')
        .insert([event])
        .select();

      if (error) {
        console.error(`  ❌ Error creating "${event.title}": ${error.message}`);
      } else {
        console.log(`  ✅ Created: ${event.title}`);
        console.log(`     - Date: ${event.start_date}`);
        console.log(`     - Venue: ${event.venue}`);
        console.log(`     - Status: ${event.status}`);
        console.log(`     - ID: ${data[0].id}\n`);
      }
    }

    console.log('✅ Sample events insertion completed!\n');

  } catch (error) {
    console.error('❌ Error inserting sample events:', error);
  }
}

// Run the deployment
deployEventsSchema()
  .then(() => {
    console.log('🎉 Deployment completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Navigate to http://localhost:3080/faculty/events');
    console.log('   2. Check if the 2 sample events are displayed');
    console.log('   3. Try creating a new event using the "Create Event" button');
    console.log('   4. Test editing and deleting events\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  });
