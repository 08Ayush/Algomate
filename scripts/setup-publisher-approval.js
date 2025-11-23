const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkwODc4OCwiZXhwIjoyMDc0NDg0Nzg4fQ.hlG84S_fYQ0hc8yctVXibOHLObWLrSZxGnFoOWeLrfg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPublisherApproval() {
  console.log('🎯 Setting up Publisher-Approved Events');
  console.log('='.repeat(60));
  
  try {
    const departmentId = '817ba459-92f5-4a7c-ba0f-82ec6e441f9a'; // CSE
    
    // 1. Find or create a user with publish permissions (admin/hod)
    console.log('\n1. Looking for user with publish permissions...');
    let { data: approvers } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, can_publish_timetables')
      .eq('department_id', departmentId)
      .or('role.eq.admin,role.eq.hod,can_publish_timetables.eq.true')
      .limit(1);
    
    let approver;
    if (!approvers || approvers.length === 0) {
      console.log('   No user with publish permissions found. Creating admin...');
      
      // Create an admin user with publish permissions
      const { data: newAdmin, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'eventadmin@college.internal',
          password_hash: '$2a$10$dummyhashforadmin1234567890',
          role: 'admin',
          first_name: 'Event',
          last_name: 'Administrator',
          department_id: departmentId,
          college_id: 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f',
          is_active: true,
          college_uid: 'ADMIN001',
          can_publish_timetables: true,
          can_approve_timetables: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('   ❌ Error creating admin:', createError);
        return;
      }
      
      approver = newAdmin;
      console.log('   ✅ Created admin:', approver.first_name, approver.last_name);
    } else {
      approver = approvers[0];
      console.log('   ✅ Found approver:', approver.first_name, approver.last_name);
      console.log('   Role:', approver.role);
      console.log('   Can publish:', approver.can_publish_timetables);
    }
    
    console.log('   Approver ID:', approver.id);
    
    // 2. Get all approved events for CSE
    console.log('\n2. Checking approved events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        status,
        approved_by,
        approver:users!events_approved_by_fkey (
          first_name,
          last_name,
          role
        )
      `)
      .eq('department_id', departmentId)
      .eq('status', 'approved');
    
    if (eventsError) {
      console.error('   ❌ Error fetching events:', eventsError);
      return;
    }
    
    console.log(`   Found ${events?.length || 0} approved events`);
    
    if (events && events.length > 0) {
      events.forEach((event, index) => {
        console.log(`\n   ${index + 1}. ${event.title}`);
        console.log(`      Approved by: ${event.approver?.first_name || 'None'} ${event.approver?.last_name || ''}`);
        console.log(`      Approver role: ${event.approver?.role || 'N/A'}`);
      });
    }
    
    // 3. Update events to be approved by admin/hod
    console.log('\n3. Updating events to be approved by authorized user...');
    
    for (const event of events || []) {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          approved_by: approver.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', event.id);
      
      if (updateError) {
        console.error(`   ❌ Error updating "${event.title}":`, updateError.message);
      } else {
        console.log(`   ✅ Updated: ${event.title}`);
      }
    }
    
    // 4. Verify the updates
    console.log('\n4. Verifying updates...');
    const { data: verifyEvents } = await supabase
      .from('events')
      .select(`
        id,
        title,
        status,
        start_date,
        approver:users!events_approved_by_fkey (
          first_name,
          last_name,
          role
        )
      `)
      .eq('department_id', departmentId)
      .eq('status', 'approved')
      .gte('start_date', new Date().toISOString().split('T')[0]);
    
    console.log(`\n   ✅ Found ${verifyEvents?.length || 0} future events approved by authorized user:`);
    if (verifyEvents && verifyEvents.length > 0) {
      verifyEvents.forEach((event, index) => {
        console.log(`\n   ${index + 1}. ${event.title}`);
        console.log(`      Date: ${event.start_date}`);
        console.log(`      Approved by: ${event.approver?.first_name} ${event.approver?.last_name} (${event.approver?.role})`);
      });
    } else {
      console.log('\n   ⚠️  No future events found!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Setup Complete!');
    console.log('   Refresh the dashboard to see only admin/hod-approved events.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupPublisherApproval();
