import { NextRequest, NextResponse } from 'next/server';
import { serviceDb } from '@/shared/database';
import { requireAuth } from '@/shared/middleware/auth';

export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const authResult = await requireAuth(['admin', 'college_admin', 'super_admin'])(request);
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        // Check DB configuration
        if (!serviceDb) {
            console.error('CRITICAL: serviceDb is not initialized in stats route. Check SUPABASE_SERVICE_ROLE_KEY.');
            return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const collegeId = searchParams.get('college_id');

        if (!collegeId) {
            return NextResponse.json({ error: 'College ID is required' }, { status: 400 });
        }

        // console.log(`[Stats API] Fetching stats for college: ${collegeId}`);

        // Parallel counting for efficiency
        const [
            { count: departmentsCount, error: deptError },
            { count: facultyCount, error: facultyError },
            { count: classroomsCount, error: classError },
            { count: batchesCount, error: batchError },
            { count: subjectsCount, error: subjectError },
            { count: coursesCount, error: courseError },
            { count: studentsCount, error: studentError },
            { count: constraintsCount, error: constraintError }
        ] = await Promise.all([
            serviceDb.from('departments').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
            serviceDb.from('users').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('role', 'faculty'),
            serviceDb.from('classrooms').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
            serviceDb.from('batches').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
            serviceDb.from('subjects').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
            serviceDb.from('courses').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
            serviceDb.from('users').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('role', 'student'),
            serviceDb.from('constraint_rules').select('*', { count: 'exact', head: true })
        ]);

        if (deptError || facultyError || classError) {
            console.error('Stats fetch error', { deptError, facultyError });
        }

        return NextResponse.json({
            departments: departmentsCount || 0,
            faculty: facultyCount || 0,
            classrooms: classroomsCount || 0,
            batches: batchesCount || 0,
            subjects: subjectsCount || 0,
            courses: coursesCount || 0,
            students: studentsCount || 0,
            constraints: constraintsCount || 0
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
