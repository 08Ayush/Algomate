const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://lgftxatdmpfkxhnlwmhm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZnR4YXRkbXBma3hobmx3bWhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjI4NjQyNywiZXhwIjoyMDQ3ODYyNDI3fQ.l0vu8gMFfQJuNQJfuQwwGsOz_yL-P89ACAG7n-vFTB8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
    console.log('🔍 Checking database structure...');
    
    try {
        // Check colleges
        console.log('\n📚 Checking colleges:');
        const { data: colleges, error: collegeError } = await supabase
            .from('colleges')
            .select('*');
            
        if (collegeError) {
            console.error('❌ Error fetching colleges:', collegeError);
        } else {
            console.log(`Found ${colleges.length} colleges:`);
            colleges.forEach(college => {
                console.log(`  - ${college.name} (ID: ${college.id})`);
            });
        }
        
        // Check departments
        console.log('\n🏢 Checking departments:');
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('*');
            
        if (deptError) {
            console.error('❌ Error fetching departments:', deptError);
        } else {
            console.log(`Found ${departments.length} departments:`);
            departments.forEach(dept => {
                console.log(`  - ${dept.name} (${dept.code}) - College ID: ${dept.college_id}`);
            });
        }
        
        // Check if CSE department exists
        const { data: cseDept } = await supabase
            .from('departments')
            .select('*')
            .eq('code', 'CSE')
            .single();
            
        if (!cseDept) {
            console.log('\n⚠️ CSE department not found! Need to create it.');
            
            // Get the first college (or create SVPCET if needed)
            let college = colleges.find(c => c.name.includes('SVPCET') || c.name.includes('Vincent'));
            
            if (!college && colleges.length > 0) {
                college = colleges[0];
                console.log(`📍 Using existing college: ${college.name}`);
            } else if (!college) {
                console.log('🏫 Creating SVPCET college...');
                const { data: newCollege, error: createCollegeError } = await supabase
                    .from('colleges')
                    .insert({
                        name: 'St. Vincent Pallotti College of Engineering and Technology',
                        code: 'SVPCET',
                        address: 'Nagpur, Maharashtra',
                        is_active: true
                    })
                    .select()
                    .single();
                    
                if (createCollegeError) {
                    console.error('❌ Error creating college:', createCollegeError);
                    return;
                }
                
                college = newCollege;
                console.log(`✅ Created college: ${college.name}`);
            }
            
            // Create CSE department
            console.log('🏢 Creating CSE department...');
            const { data: newDept, error: createDeptError } = await supabase
                .from('departments')
                .insert({
                    name: 'Computer Science and Engineering',
                    code: 'CSE',
                    college_id: college.id,
                    is_active: true
                })
                .select()
                .single();
                
            if (createDeptError) {
                console.error('❌ Error creating CSE department:', createDeptError);
                return;
            }
            
            console.log(`✅ Created CSE department: ${newDept.name}`);
        } else {
            console.log('\n✅ CSE department exists:', cseDept);
        }
        
        console.log('\n🎉 Database check complete! Ready for curriculum setup.');
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
    }
}

// Run the check
if (require.main === module) {
    checkDatabase();
}

module.exports = { checkDatabase };