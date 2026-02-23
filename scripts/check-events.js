const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDg3ODgsImV4cCI6MjA3NDQ4NDc4OH0.ghVoq26l_vh4cOM9Nkf2hh2AMPRDmNKZPl4zm3NRHpA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvents() {
  const studentId = 'b22ccefe-f02f-4839-8930-5e78720aee3e';
  
  console.log('🎯 Checking Events for Student Dashboard');
  console.log('='.repeat(60));
  
  try {
    // 1. Get student info
    const { data: student } = await supabase
      .from('users')
      .select('id, first_name, last_name, department_id')
      .eq('id', studentId)
      .single();
    
    console.log('\n✅ Student:', student.first_name, student.last_name);
    console.log('   Department ID:', student.department_id);
    
    // 2. Check all events in the database
    console.log('\n📋 ALL Events in Database:');
    const { data: allEvents, error: allError } = await supabase
      .from('events')
      .select('id, title, status, start_date, end_date, venue, department_id, created_by')
      .order('start_date', { ascending: false });
    
    if (allError) {
      console.error('❌ Error:', allError);
    } else {
      console.log(`   Found ${allEvents?.length || 0} total events`);
      if (allEvents && allEvents.length > 0) {
        allEvents.forEach((event, index) => {
          console.log(`\n   ${index + 1}. ${event.title}`);
          console.log(`      Status: ${event.status}`);
          console.log(`      Date: ${event.start_date}`);
          console.log(`      Department ID: ${event.department_id}`);
          console.log(`      Venue: ${event.venue || 'N/A'}`);
        });
      }
    }
    
    // 3. Check events with status='approved'
    console.log('\n\n📋 Events with status=approved:');
    const { data: approvedEvents, error: approvedError } = await supabase
      .from('events')
      .select('id, title, status, start_date, department_id')
      .eq('status', 'approved');
    
    if (approvedError) {
      console.error('❌ Error:', approvedError);
    } else {
      console.log(`   Found ${approvedEvents?.length || 0} approved events`);
      if (approvedEvents && approvedEvents.length > 0) {
        approvedEvents.forEach(event => {
          console.log(`   - ${event.title} (${event.start_date})`);
        });
      }
    }
    
    // 4. Check events for student's department
    console.log('\n\n📋 Events for Student\'s Department (CSE):');
    const { data: deptEvents, error: deptError } = await supabase
      .from('events')
      .select('id, title, status, start_date, department_id')
      .eq('department_id', student.department_id);
    
    if (deptError) {
      console.error('❌ Error:', deptError);
    } else {
      console.log(`   Found ${deptEvents?.length || 0} events for department`);
      if (deptEvents && deptEvents.length > 0) {
        deptEvents.forEach(event => {
          console.log(`   - ${event.title} (Status: ${event.status}, Date: ${event.start_date})`);
        });
      }
    }
    
    // 5. Test the EXACT query from the API
    const today = new Date().toISOString().split('T')[0];
    console.log('\n\n🔍 Testing API Query (approved + department + future dates):');
    console.log(`   Today's date: ${today}`);
    
    const { data: apiEvents, error: apiError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        start_date,
        end_date,
        venue,
        event_type,
        status,
        creator:users!events_created_by_fkey (
          id,
          first_name,
          last_name,
          faculty_type
        )
      `)
      .eq('department_id', student.department_id)
      .eq('status', 'approved')
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(8);
    
    if (apiError) {
      console.error('❌ API Query Error:', apiError);
    } else {
      console.log(`\n✅ API Query Result: ${apiEvents?.length || 0} events`);
      if (apiEvents && apiEvents.length > 0) {
        apiEvents.forEach((event, index) => {
          console.log(`\n   ${index + 1}. ${event.title}`);
          console.log(`      Date: ${event.start_date} to ${event.end_date}`);
          console.log(`      Venue: ${event.venue}`);
          console.log(`      Type: ${event.event_type}`);
          console.log(`      Creator: ${event.creator?.first_name} ${event.creator?.last_name}`);
        });
      } else {
        console.log('\n   ⚠️  No events match the criteria:');
        console.log('      - Department: CSE');
        console.log('      - Status: approved');
        console.log(`      - Start date >= ${today}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Check Complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkEvents();
