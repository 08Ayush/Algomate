const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ciiukyhjjbbxortzfxsj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU');

async function checkUsers() {
  console.log('=== CHECKING STUDENT USERS ===');
  const { data: students, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, college_id, department_id, current_semester')
    .eq('role', 'student')
    .eq('is_active', true)
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Found', students.length, 'student users:');
  students.forEach(student => {
    console.log('- Name:', student.first_name, student.last_name);
    console.log('  ID:', student.id);
    console.log('  Email:', student.email);
    console.log('  College ID:', student.college_id);
    console.log('  Department ID:', student.department_id);
    console.log('  Semester:', student.current_semester);
    console.log('---');
  });
  
  if (students.length === 0) {
    console.log('\n=== CREATING A TEST STUDENT ===');
    const { data: college } = await supabase.from('colleges').select('id').limit(1).single();
    const { data: department } = await supabase.from('departments').select('id').limit(1).single();
    
    if (college && department) {
      const { data: newStudent, error: insertError } = await supabase
        .from('users')
        .insert({
          first_name: 'Test',
          last_name: 'Student',
          email: 'student.test@college.edu',
          role: 'student',
          college_id: college.id,
          department_id: department.id,
          current_semester: 1,
          is_active: true,
          password_hash: '$2a$10$example.hash.for.password123'
        })
        .select('*')
        .single();
      
      if (insertError) {
        console.error('Error creating student:', insertError);
      } else {
        console.log('✅ Created test student:', newStudent);
        console.log('Login credentials:');
        console.log('Email: student.test@college.edu');
        console.log('Password: password123');
      }
    }
  }
}

checkUsers().catch(console.error);