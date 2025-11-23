const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function diagnoseTimetables() {
  console.log('🔍 Diagnosing Timetable Data...\n');
  
  try {
    // 1. Check published timetables
    console.log('1️⃣ Checking published timetables...');
    const { data: timetables, error: ttError } = await supabase
      .from('generated_timetables')
      .select(`
        id,
        title,
        status,
        semester,
        academic_year,
        batch_id,
        created_at,
        approved_at,
        batches (
          id,
          name,
          section,
          department_id,
          departments (name)
        )
      `)
      .eq('status', 'published');
    
    if (ttError) {
      console.error('❌ Error fetching timetables:', ttError);
      return;
    }
    
    console.log(`✅ Found ${timetables?.length || 0} published timetables\n`);
    
    if (timetables && timetables.length > 0) {
      timetables.forEach((tt, idx) => {
        console.log(`📋 Timetable ${idx + 1}:`);
        console.log(`   ID: ${tt.id}`);
        console.log(`   Title: ${tt.title}`);
        console.log(`   Batch: ${tt.batches?.name} ${tt.batches?.section}`);
        console.log(`   Department: ${tt.batches?.departments?.name}`);
        console.log(`   Semester: ${tt.semester}`);
        console.log(`   Academic Year: ${tt.academic_year}`);
        console.log(`   Approved: ${tt.approved_at || 'N/A'}`);
        console.log('');
      });
      
      // 2. Check scheduled classes for first timetable
      const firstTimetable = timetables[0];
      console.log(`\n2️⃣ Checking scheduled classes for: ${firstTimetable.title}`);
      
      const { data: classes, error: classError } = await supabase
        .from('scheduled_classes')
        .select(`
          id,
          timetable_id,
          subject_id,
          faculty_id,
          classroom_id,
          time_slot_id,
          class_type,
          subjects (name, code),
          time_slots (day, start_time, end_time)
        `)
        .eq('timetable_id', firstTimetable.id);
      
      if (classError) {
        console.error('❌ Error fetching classes:', classError);
      } else {
        console.log(`✅ Found ${classes?.length || 0} scheduled classes`);
        
        if (classes && classes.length > 0) {
          console.log('\n📚 Sample classes:');
          classes.slice(0, 5).forEach((cls, idx) => {
            console.log(`   ${idx + 1}. ${cls.subjects?.name} (${cls.subjects?.code})`);
            console.log(`      Day: ${cls.time_slots?.day}`);
            console.log(`      Time: ${cls.time_slots?.start_time} - ${cls.time_slots?.end_time}`);
            console.log(`      Type: ${cls.class_type}`);
          });
        } else {
          console.log('⚠️  No scheduled classes found for this timetable!');
          console.log('   This is why the timetable shows "0 classes"');
        }
      }
      
      // 3. Check if batch has enrolled students
      console.log(`\n3️⃣ Checking student enrollment for batch...`);
      const { data: enrollment, error: enrollError } = await supabase
        .from('student_batch_enrollment')
        .select(`
          student_id,
          users (first_name, last_name, email)
        `)
        .eq('batch_id', firstTimetable.batch_id)
        .eq('is_active', true);
      
      if (enrollError) {
        console.error('❌ Error fetching enrollment:', enrollError);
      } else {
        console.log(`✅ Found ${enrollment?.length || 0} enrolled students`);
        if (enrollment && enrollment.length > 0) {
          console.log(`   Sample: ${enrollment[0].users?.first_name} ${enrollment[0].users?.last_name}`);
        }
      }
      
    } else {
      console.log('⚠️  No published timetables found!');
      
      // Check if any timetables exist at all
      const { data: allTT, error: allError } = await supabase
        .from('generated_timetables')
        .select('id, title, status')
        .limit(10);
      
      if (allTT && allTT.length > 0) {
        console.log(`\n📊 Found ${allTT.length} timetables with other statuses:`);
        allTT.forEach(tt => {
          console.log(`   - ${tt.title}: ${tt.status}`);
        });
      }
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

diagnoseTimetables();
