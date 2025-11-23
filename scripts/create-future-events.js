const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
// Use service role key for admin operations
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkwODc4OCwiZXhwIjoyMDc0NDg0Nzg4fQ.hlG84S_fYQ0hc8yctVXibOHLObWLrSZxGnFoOWeLrfg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFutureEvent() {
  console.log('🎯 Creating Future Event');
  console.log('='.repeat(60));
  
  try {
    const departmentId = '817ba459-92f5-4a7c-ba0f-82ec6e441f9a'; // CSE
    const collegeId = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'; // SVPCET
    
    // Find a faculty member to be the creator
    const { data: faculty } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'faculty')
      .eq('department_id', departmentId)
      .limit(1)
      .single();
    
    if (!faculty) {
      console.error('❌ No faculty found to create event');
      return;
    }
    
    console.log('✅ Event creator:', faculty.first_name, faculty.last_name);
    
    // Create events 5 days, 10 days, and 15 days in the future
    const events = [
      {
        title: 'Tech Talk: Future of AI',
        description: 'Guest lecture on artificial intelligence and machine learning trends',
        event_type: 'seminar',
        start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '10:00:00',
        end_time: '12:00:00',
        venue: 'Auditorium',
        status: 'approved',
        department_id: departmentId,
        created_by: faculty.id,
        expected_participants: 100,
        registration_required: true
      },
      {
        title: 'Hackathon 2025',
        description: '24-hour coding competition for all students',
        event_type: 'technical',
        start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '09:00:00',
        end_time: '09:00:00',
        venue: 'Lab Complex',
        status: 'approved',
        department_id: departmentId,
        created_by: faculty.id,
        expected_participants: 50,
        registration_required: true
      },
      {
        title: 'Industry Expert Session',
        description: 'Software engineering best practices from industry experts',
        event_type: 'workshop',
        start_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '14:00:00',
        end_time: '17:00:00',
        venue: 'Seminar Hall',
        status: 'approved',
        department_id: departmentId,
        created_by: faculty.id,
        expected_participants: 80,
        registration_required: false
      }
    ];
    
    console.log(`\n📅 Creating ${events.length} future events...\n`);
    
    for (const event of events) {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error creating "${event.title}":`, error.message);
      } else {
        console.log(`✅ Created: ${data.title}`);
        console.log(`   Date: ${data.start_date}`);
        console.log(`   Venue: ${data.venue}`);
        console.log(`   Status: ${data.status}\n`);
      }
    }
    
    console.log('='.repeat(60));
    console.log('✅ Future events created successfully!');
    console.log('   Refresh the dashboard to see them.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createFutureEvent();
