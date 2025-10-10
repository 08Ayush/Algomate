const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDg3ODgsImV4cCI6MjA3NDQ4NDc4OH0.ghVoq26l_vh4cOM9Nkf2hh2AMPRDmNKZPl4zm3NRHpA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSVPCETCurriculum() {
    console.log('🚀 Starting SVPCET CSE Curriculum Setup...');
    
    try {
        // Step 1: Get the CSE department
        const { data: department, error: deptError } = await supabase
            .from('departments')
            .select('id, college_id')
            .eq('code', 'CSE')
            .single();
            
        if (deptError || !department) {
            throw new Error('CSE department not found');
        }
        
        console.log('✅ Found CSE department:', department);
        
        // Step 2: Remove existing subjects and qualifications
        console.log('🧹 Cleaning existing subjects...');
        
        // Remove faculty qualifications first
        const { error: deleteQualError } = await supabase
            .from('faculty_qualified_subjects')
            .delete()
            .eq('subject_id', 'in', `(SELECT id FROM subjects WHERE department_id = ${department.id})`);
            
        // Remove existing subjects
        const { error: deleteSubError } = await supabase
            .from('subjects')
            .delete()
            .eq('department_id', department.id);
            
        console.log('✅ Cleaned existing subjects');
        
        // Step 3: Insert complete SVPCET CSE curriculum
        console.log('📚 Inserting SVPCET CSE curriculum...');
        
        const svpcetSubjects = [
            // SEMESTER 1 (11 subjects)
            { name: 'Engineering Chemistry', code: '25CE101T', credits_per_week: 2, subject_type: 'THEORY', semester: 1 },
            { name: 'Engineering Chemistry Lab', code: '25CE101P', credits_per_week: 1, subject_type: 'LAB', semester: 1 },
            { name: 'Linear Algebra and Calculus', code: '25CE102T', credits_per_week: 3, subject_type: 'THEORY', semester: 1 },
            { name: 'Linear Algebra and Calculus Lab', code: '25CE102P', credits_per_week: 1, subject_type: 'LAB', semester: 1 },
            { name: 'Logic building with C', code: '25CE103T', credits_per_week: 3, subject_type: 'THEORY', semester: 1 },
            { name: 'Logic building with C Lab', code: '25CE103P', credits_per_week: 1, subject_type: 'LAB', semester: 1 },
            { name: 'Competitive Programming - I', code: '25CE104T', credits_per_week: 2, subject_type: 'THEORY', semester: 1 },
            { name: 'Concept in Computer Engineering-I', code: '25CE105T', credits_per_week: 2, subject_type: 'THEORY', semester: 1 },
            { name: 'Business Communication Skills I Lab', code: '25CE106P', credits_per_week: 1, subject_type: 'LAB', semester: 1 },
            { name: 'Indian Knowledge Systems', code: '25CE107T', credits_per_week: 2, subject_type: 'THEORY', semester: 1 },
            { name: 'Co-curricular Courses - I', code: '25CE108T', credits_per_week: 2, subject_type: 'THEORY', semester: 1 },
            
            // SEMESTER 2 (11 subjects)
            { name: 'Engineering Physics and Materials Science', code: '25CE201T', credits_per_week: 2, subject_type: 'THEORY', semester: 2 },
            { name: 'Engineering Physics and Materials Science Lab', code: '25CE201P', credits_per_week: 1, subject_type: 'LAB', semester: 2 },
            { name: 'Statistics and Probability', code: '25CE202T', credits_per_week: 3, subject_type: 'THEORY', semester: 2 },
            { name: 'Statistics and Probability Lab', code: '25CE202P', credits_per_week: 1, subject_type: 'LAB', semester: 2 },
            { name: 'Problem Solving with Python', code: '25CE203T', credits_per_week: 3, subject_type: 'THEORY', semester: 2 },
            { name: 'Problem Solving with Python Lab', code: '25CE203P', credits_per_week: 1, subject_type: 'LAB', semester: 2 },
            { name: 'Competitive Programming - II', code: '25CE204T', credits_per_week: 2, subject_type: 'THEORY', semester: 2 },
            { name: 'Modern Web Technologies', code: '25CE205T', credits_per_week: 2, subject_type: 'THEORY', semester: 2 },
            { name: 'Business Communication Skills - II Lab', code: '25CE206P', credits_per_week: 1, subject_type: 'LAB', semester: 2 },
            { name: 'Design Thinking', code: '25CE207T', credits_per_week: 2, subject_type: 'THEORY', semester: 2 },
            { name: 'Co-curricular Courses - II', code: '25CE208T', credits_per_week: 2, subject_type: 'THEORY', semester: 2 },
            
            // SEMESTER 3 (11 subjects)
            { name: 'Mathematics for Computer Engineering', code: '25CE301T', credits_per_week: 3, subject_type: 'THEORY', semester: 3 },
            { name: 'Data Structure', code: '25CE302T', credits_per_week: 3, subject_type: 'THEORY', semester: 3 },
            { name: 'Data Structure Lab', code: '25CE302P', credits_per_week: 1, subject_type: 'LAB', semester: 3 },
            { name: 'Digital Circuits', code: '25CE303T', credits_per_week: 2, subject_type: 'THEORY', semester: 3 },
            { name: 'Digital Circuits Lab', code: '25CE303P', credits_per_week: 1, subject_type: 'LAB', semester: 3 },
            { name: 'Computer Architecture', code: '25CE304T', credits_per_week: 2, subject_type: 'THEORY', semester: 3 },
            { name: 'Computer Lab-I', code: '25CE305P', credits_per_week: 1, subject_type: 'LAB', semester: 3 },
            { name: 'Constitution of India', code: '25ES301T', credits_per_week: 2, subject_type: 'THEORY', semester: 3 },
            { name: 'Fundamentals of Entrepreneurship', code: '25ES302T', credits_per_week: 2, subject_type: 'THEORY', semester: 3 },
            { name: 'Career Development - I', code: '25CE341P', credits_per_week: 1, subject_type: 'PRACTICAL', semester: 3 },
            { name: 'MDM-I (Essentials of computing Systems)', code: '25CE331M', credits_per_week: 2, subject_type: 'THEORY', semester: 3 },
            
            // SEMESTER 4 (10 subjects)
            { name: 'Data Communication', code: '25CE401T', credits_per_week: 3, subject_type: 'THEORY', semester: 4 },
            { name: 'Database Management System', code: '25CE402T', credits_per_week: 3, subject_type: 'THEORY', semester: 4 },
            { name: 'Database Management System Lab', code: '25CE402P', credits_per_week: 1, subject_type: 'LAB', semester: 4 },
            { name: 'Object Oriented Programming', code: '25CE403T', credits_per_week: 3, subject_type: 'THEORY', semester: 4 },
            { name: 'Object Oriented Programming Lab', code: '25CE403P', credits_per_week: 1, subject_type: 'LAB', semester: 4 },
            { name: 'Environmental Science', code: '25ES401T', credits_per_week: 2, subject_type: 'THEORY', semester: 4 },
            { name: 'Fundamentals of Economics and Management', code: '25ES402T', credits_per_week: 2, subject_type: 'THEORY', semester: 4 },
            { name: 'Career Development - II', code: '25CE441P', credits_per_week: 1, subject_type: 'PRACTICAL', semester: 4 },
            { name: 'Mini Project II', code: '25CE405P', credits_per_week: 1, subject_type: 'PRACTICAL', semester: 4 },
            { name: 'MDM-II (Indian Cyber Law)', code: '25CE431M', credits_per_week: 3, subject_type: 'THEORY', semester: 4 },
            
            // SEMESTER 5 (9 subjects)
            { name: 'Theory of Computation', code: '25CE501T', credits_per_week: 3, subject_type: 'THEORY', semester: 5 },
            { name: 'Operating System', code: '25CE502T', credits_per_week: 3, subject_type: 'THEORY', semester: 5 },
            { name: 'Operating System Lab', code: '25CE502P', credits_per_week: 1, subject_type: 'LAB', semester: 5 },
            { name: 'Professional Elective - I', code: '25CE503T', credits_per_week: 2, subject_type: 'THEORY', semester: 5 },
            { name: 'Professional Elective - II', code: '25CE504T', credits_per_week: 2, subject_type: 'THEORY', semester: 5 },
            { name: 'Technical Skill Development - I', code: '25CE505P', credits_per_week: 2, subject_type: 'PRACTICAL', semester: 5 },
            { name: 'English for Engineers', code: '25CE541P', credits_per_week: 2, subject_type: 'PRACTICAL', semester: 5 },
            { name: 'MDM-III (Introduction to Business Management)', code: '25CE531M', credits_per_week: 3, subject_type: 'THEORY', semester: 5 },
            { name: 'Open Elective - I', code: '25CE5610', credits_per_week: 2, subject_type: 'THEORY', semester: 5 },
            
            // SEMESTER 6 (8 subjects)
            { name: 'Design and Analysis of Algorithms', code: '25CE601T', credits_per_week: 3, subject_type: 'THEORY', semester: 6 },
            { name: 'Design and Analysis of Algorithms Lab', code: '25CE601P', credits_per_week: 1, subject_type: 'LAB', semester: 6 },
            { name: 'Professional Elective -III', code: '25CE602T', credits_per_week: 3, subject_type: 'THEORY', semester: 6 },
            { name: 'Professional Elective -IV', code: '25CE603T', credits_per_week: 3, subject_type: 'THEORY', semester: 6 },
            { name: 'Technical Skill Development - II', code: '25CE604P', credits_per_week: 2, subject_type: 'PRACTICAL', semester: 6 },
            { name: 'Project - 1', code: '25CE605P', credits_per_week: 2, subject_type: 'PRACTICAL', semester: 6 },
            { name: 'MDM-IV (Financial Accounting and Analysis)', code: '25CE631M', credits_per_week: 3, subject_type: 'THEORY', semester: 6 },
            { name: 'Open Elective -II', code: '25CE6610', credits_per_week: 3, subject_type: 'THEORY', semester: 6 },
            
            // SEMESTER 7 (8 subjects)
            { name: 'Compiler Construction', code: '25CE701T', credits_per_week: 3, subject_type: 'THEORY', semester: 7 },
            { name: 'Cryptography and Network Security', code: '25CE702T', credits_per_week: 2, subject_type: 'THEORY', semester: 7 },
            { name: 'Cryptography and Network Security Lab', code: '25CE702P', credits_per_week: 1, subject_type: 'LAB', semester: 7 },
            { name: 'Professional Elective-V', code: '25CE703T', credits_per_week: 3, subject_type: 'THEORY', semester: 7 },
            { name: 'Professional Elective-VI', code: '25CE704T', credits_per_week: 3, subject_type: 'THEORY', semester: 7 },
            { name: 'Project - II', code: '25CE705P', credits_per_week: 2, subject_type: 'PRACTICAL', semester: 7 },
            { name: 'MDM-V (Economics and Innovation)', code: '25CE731M', credits_per_week: 3, subject_type: 'THEORY', semester: 7 },
            { name: 'Open Elective- III', code: '25CE7610', credits_per_week: 3, subject_type: 'THEORY', semester: 7 },
            
            // SEMESTER 8 (6 subjects)
            { name: 'Research Methodology', code: '25ES801T', credits_per_week: 2, subject_type: 'THEORY', semester: 8 },
            { name: 'Research Methodology Lab', code: '25ES801P', credits_per_week: 2, subject_type: 'LAB', semester: 8 },
            { name: 'Professional Elective-VII', code: '25CE802T', credits_per_week: 3, subject_type: 'THEORY', semester: 8 },
            { name: 'Professional Elective-VII Lab', code: '25CE802P', credits_per_week: 1, subject_type: 'LAB', semester: 8 },
            { name: 'Industry/Research Internship', code: '25CE803P', credits_per_week: 12, subject_type: 'PRACTICAL', semester: 8 },
            { name: 'Institutional Internships & Project III', code: '25CE804P', credits_per_week: 12, subject_type: 'PRACTICAL', semester: 8 }
        ];
        
        // Add department and college info to each subject
        const subjectsWithDept = svpcetSubjects.map(subject => ({
            ...subject,
            department_id: department.id,
            college_id: department.college_id,
            is_active: true
        }));
        
        // Insert subjects in batches
        const batchSize = 20;
        const insertedSubjects = [];
        
        for (let i = 0; i < subjectsWithDept.length; i += batchSize) {
            const batch = subjectsWithDept.slice(i, i + batchSize);
            const { data, error } = await supabase
                .from('subjects')
                .insert(batch)
                .select('id, name, code, semester');
                
            if (error) {
                console.error('Error inserting batch:', error);
                throw error;
            }
            
            insertedSubjects.push(...data);
            console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(subjectsWithDept.length/batchSize)} (${batch.length} subjects)`);
        }
        
        console.log(`✅ Successfully inserted ${insertedSubjects.length} SVPCET CSE subjects`);
        
        // Step 4: Setup faculty qualifications for bramhe user
        console.log('👨‍🏫 Setting up faculty qualifications...');
        
        const { data: faculty, error: facultyError } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'bramhe@svpce.edu.in')
            .eq('role', 'faculty')
            .single();
            
        if (facultyError || !faculty) {
            console.warn('⚠️ Faculty bramhe@svpce.edu.in not found, skipping qualifications');
        } else {
            // Create qualifications for all subjects
            const qualifications = insertedSubjects.map(subject => ({
                faculty_id: faculty.id,
                subject_id: subject.id,
                proficiency_level: 8,
                preference_score: 7
            }));
            
            // Insert qualifications in batches
            for (let i = 0; i < qualifications.length; i += batchSize) {
                const batch = qualifications.slice(i, i + batchSize);
                const { error } = await supabase
                    .from('faculty_qualified_subjects')
                    .insert(batch);
                    
                if (error) {
                    console.error('Error inserting qualifications batch:', error);
                    throw error;
                }
                
                console.log(`✅ Added qualifications batch ${Math.floor(i/batchSize) + 1} (${batch.length} qualifications)`);
            }
            
            console.log(`✅ Successfully added ${qualifications.length} faculty qualifications`);
        }
        
        // Step 5: Verify the setup
        console.log('🔍 Verifying SVPCET CSE curriculum setup...');
        
        const { data: semesterStats } = await supabase
            .from('subjects')
            .select('semester')
            .eq('department_id', department.id)
            .eq('is_active', true);
            
        const semesterCounts = semesterStats.reduce((acc, subject) => {
            acc[subject.semester] = (acc[subject.semester] || 0) + 1;
            return acc;
        }, {});
        
        console.log('📊 Subjects per semester:');
        Object.entries(semesterCounts).forEach(([semester, count]) => {
            console.log(`   Semester ${semester}: ${count} subjects`);
        });
        
        const totalSubjects = semesterStats.length;
        console.log(`📚 Total SVPCET CSE subjects: ${totalSubjects}`);
        
        console.log('🎉 SVPCET CSE Curriculum Setup Complete!');
        console.log('✅ You can now test the manual scheduling with proper semester filtering');
        
    } catch (error) {
        console.error('❌ Error setting up SVPCET curriculum:', error);
        process.exit(1);
    }
}

// Run the setup
if (require.main === module) {
    setupSVPCETCurriculum();
}

module.exports = { setupSVPCETCurriculum };