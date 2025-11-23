const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkwODc4OCwiZXhwIjoyMDc0NDg0Nzg4fQ.hlG84S_fYQ0hc8yctVXibOHLObWLrSZxGnFoOWeLrfg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCseDsEvent() {
  console.log('🎯 Creating Pending Event for CSE-DS Department');
  console.log('='.repeat(60));
  
  try {
    const cseDsDeptId = '6f6eafb0-ed58-43f2-9cd5-3d54f0fd6dcc'; // CSE-DS
    
    // Find Dr. Jayshri Harde or any CSE-DS faculty
    const { data: faculty } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('department_id', cseDsDeptId)
      .eq('role', 'faculty')
      .limit(1)
      .single();
    
    if (!faculty) {
      console.error('❌ No faculty found in CSE-DS department');
      return;
    }
    
    console.log('✅ Event creator:', faculty.first_name, faculty.last_name);
    
    // Create a pending event
    const newEvent = {
      title: 'Data Science Workshop',
      description: 'Hands-on workshop on Data Science techniques, tools, and best practices. Learn about data preprocessing, visualization, and machine learning algorithms.',
      event_type: 'workshop',
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: '10:00:00',
      end_time: '16:00:00',
      venue: 'Computer Lab 301',
      status: 'pending',
      department_id: cseDsDeptId,
      created_by: faculty.id,
      expected_participants: 60,
      registration_required: true
    };
    
    const { data: event, error } = await supabase
      .from('events')
      .insert(newEvent)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating event:', error);
      return;
    }
    
    console.log('\n✅ Event created successfully!');
    console.log('   Title:', event.title);
    console.log('   Date:', event.start_date);
    console.log('   Venue:', event.venue);
    console.log('   Status:', event.status);
    console.log('   Department:', 'CSE-DS');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Complete!');
    console.log('   Refresh the faculty events page to see and approve it.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createCseDsEvent();
