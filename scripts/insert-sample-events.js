const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Found' : '❌ Missing');
  console.error('\n💡 Tip: Using SERVICE_ROLE_KEY to bypass RLS for data insertion');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertSampleEvents() {
  console.log('🚀 Inserting Sample Events...\n');

  try {
    // First, get a faculty user and department
    console.log('📋 Step 1: Finding faculty user...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, department_id, first_name, last_name, email')
      .eq('role', 'faculty')
      .limit(1);

    if (userError) {
      console.error('❌ Error fetching users:', userError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ No faculty user found. Please create a faculty user first.');
      return;
    }

    const facultyUser = users[0];
    console.log(`✅ Found faculty user: ${facultyUser.first_name} ${facultyUser.last_name}`);
    console.log(`   Email: ${facultyUser.email}`);
    console.log(`   User ID: ${facultyUser.id}`);
    console.log(`   Department ID: ${facultyUser.department_id}\n`);

    // Sample events data
    const sampleEvents = [
      {
        title: 'AI/ML Workshop - Introduction to Machine Learning',
        description: 'Hands-on workshop covering the fundamentals of Artificial Intelligence and Machine Learning. Topics include neural networks, deep learning, and practical applications using Python and TensorFlow.',
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
        title: 'Annual Cultural Fest 2025 - TechnoFiesta',
        description: 'Join us for the biggest cultural celebration of the year! Featuring music performances, dance competitions, drama presentations, and art exhibitions from talented students across all departments. Special guest performances and food stalls.',
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

    console.log('📋 Step 2: Inserting events...\n');

    // Insert events
    for (let i = 0; i < sampleEvents.length; i++) {
      const event = sampleEvents[i];
      console.log(`${i + 1}. Creating: "${event.title}"`);
      
      const { data, error } = await supabase
        .from('events')
        .insert([event])
        .select();

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        console.error(`   Details: ${JSON.stringify(error, null, 2)}\n`);
      } else {
        console.log(`   ✅ Created successfully!`);
        console.log(`   📍 Details:`);
        console.log(`      - Event ID: ${data[0].id}`);
        console.log(`      - Date: ${event.start_date}`);
        console.log(`      - Time: ${event.start_time} - ${event.end_time}`);
        console.log(`      - Venue: ${event.venue}`);
        console.log(`      - Status: ${event.status}`);
        console.log(`      - Type: ${event.event_type}`);
        console.log(`      - Priority: ${event.priority_level}/5\n`);
      }
    }

    // Verify events were inserted
    console.log('📋 Step 3: Verifying events in database...');
    const { data: allEvents, error: fetchError } = await supabase
      .from('events')
      .select('id, title, status, start_date, venue')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('❌ Error fetching events:', fetchError.message);
    } else {
      console.log(`✅ Found ${allEvents.length} events in database:\n`);
      allEvents.forEach((event, idx) => {
        console.log(`   ${idx + 1}. ${event.title}`);
        console.log(`      - Status: ${event.status}`);
        console.log(`      - Date: ${event.start_date}`);
        console.log(`      - Venue: ${event.venue}\n`);
      });
    }

    console.log('=' .repeat(60));
    console.log('🎉 Sample events inserted successfully!');
    console.log('=' .repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('   1. Start your dev server: npm run dev');
    console.log('   2. Navigate to: http://localhost:3080/faculty/events');
    console.log('   3. Login as faculty user');
    console.log('   4. View the 2 sample events in the calendar/list');
    console.log('   5. Click "Create Event" to test creating new events');
    console.log('   6. Try editing/deleting events\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
insertSampleEvents()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
