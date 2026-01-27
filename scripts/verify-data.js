const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ciiukyhjjbbxortzfxsj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verify() {
    const results = {};

    console.log('Fetching 1 course (full structure)...');
    const { data: courses, error: courseError } = await supabase.from('courses').select('*').limit(1);
    if (courseError) results.courseError = courseError;
    else results.courseSample = courses[0];

    console.log('Fetching 1 classroom (full structure)...');
    const { data: classrooms, error: classroomError } = await supabase.from('classrooms').select('*').limit(1);
    if (classroomError) results.classroomError = classroomError;
    else results.classroomSample = classrooms[0];

    fs.writeFileSync('debug_schema.json', JSON.stringify(results, null, 2), 'utf8');
    console.log('Done.');
}

verify();
