const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ciiukyhjjbbxortzfxsj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU');

async function populateBatchSubjects() {
  console.log('=== UNDERSTANDING BATCH-SUBJECT RELATIONSHIPS ===');
  
  // Get the B.Ed batch
  const { data: batch } = await supabase
    .from('batches')
    .select('*')
    .eq('name', 'B.Ed - Semester 1')
    .single();
  
  console.log('B.Ed Batch:', batch);
  
  // Get subjects that could be mandatory for this batch
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, code, name, credits, subject_type')
    .eq('college_id', batch.college_id)
    .eq('semester', 1)
    .limit(5);
  
  console.log('\nAvailable subjects for B.Ed Semester 1:', subjects);
  
  console.log('\n=== BATCH_SUBJECTS TABLE PURPOSE ===');
  console.log('The batch_subjects table is used for:');
  console.log('1. MANDATORY subjects that ALL students in a batch must take');
  console.log('2. Direct batch-to-subject assignments (not choice-based)');
  console.log('3. Traditional curriculum (non-NEP) subject allocation');
  console.log('4. Subjects with fixed faculty assignments');
  
  console.log('\n=== NEP 2020 vs TRADITIONAL FLOW ===');
  console.log('NEP 2020 (Current): Batch → Elective Buckets → Subjects (choice-based)');
  console.log('Traditional: Batch → Subjects (fixed via batch_subjects table)');
  
  console.log('\n=== EXAMPLE: Add mandatory subjects to batch_subjects ===');
  console.log('If you want to add mandatory subjects, run:');
  
  if (subjects && subjects.length > 0) {
    console.log(`
// Example batch_subjects entries:
INSERT INTO batch_subjects (
  batch_id, 
  subject_id, 
  required_hours_per_week, 
  is_mandatory,
  priority_level
) VALUES
('${batch.id}', '${subjects[0].id}', 4, true, 1), -- ${subjects[0].name}
('${batch.id}', '${subjects[1]?.id}', 3, true, 2)  -- ${subjects[1]?.name}
`);
  }
  
  console.log('\n=== TO POPULATE BATCH_SUBJECTS (if needed) ===');
  console.log('Uncomment the code below if you want to add mandatory subjects:');
  console.log('This is only needed for traditional (non-NEP) curriculum or fixed mandatory subjects.');
  
  // UNCOMMENT BELOW TO ACTUALLY ADD SUBJECTS TO BATCH_SUBJECTS
  /*
  if (subjects && subjects.length >= 2) {
    const batchSubjects = [
      {
        batch_id: batch.id,
        subject_id: subjects[0].id,
        required_hours_per_week: 4,
        is_mandatory: true,
        priority_level: 1,
        can_split_sessions: true,
        scheduling_flexibility: 3
      },
      {
        batch_id: batch.id,
        subject_id: subjects[1].id,
        required_hours_per_week: 3,
        is_mandatory: true,
        priority_level: 2,
        can_split_sessions: true,
        scheduling_flexibility: 5
      }
    ];
    
    const { data: inserted, error } = await supabase
      .from('batch_subjects')
      .insert(batchSubjects)
      .select('*');
    
    if (error) {
      console.error('Error inserting batch subjects:', error);
    } else {
      console.log('Successfully added batch subjects:', inserted);
    }
  }
  */
}

populateBatchSubjects().catch(console.error);