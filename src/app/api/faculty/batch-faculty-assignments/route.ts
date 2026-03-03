'use server';

import { serviceDb } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

interface QualifiedFaculty {
    faculty_id: string;
    faculty_name: string;
    proficiency_level: number;
    is_primary_teacher: boolean;
}

interface LabRoom {
    id: string;
    name: string;
    building: string | null;
    capacity: number;
    lab_type: string | null;
    has_computers: boolean;
    has_lab_equipment: boolean;
}

interface BatchSubjectWithFaculty {
    batch_subject_id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    subject_type: string;
    required_hours: number;
    assigned_faculty_id: string | null;
    assigned_faculty_name: string | null;
    assigned_lab_id: string | null;
    assigned_lab_name: string | null;
    qualified_faculty: QualifiedFaculty[];
    is_lab_subject: boolean;
}

// GET - Fetch batch subjects with assignment info and qualified faculty
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batch_id');

        if (!batchId) {
            return NextResponse.json(
                { error: 'batch_id is required' },
                { status: 400 }
            );
        }

        const supabase = serviceDb;

        // Get batch info with department and course details
        const { data: batch, error: batchError } = await supabase
            .from('batches')
            .select('id, name, department_id, semester, academic_year, college_id, course_id')
            .eq('id', batchId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json(
                { error: 'Batch not found' },
                { status: 404 }
            );
        }

        // Get batch subjects with full subject details via raw SQL
        const pool = getPool();
        const bsResult = await pool.query(`
            SELECT
                bs.id,
                bs.subject_id,
                bs.required_hours_per_week,
                bs.assigned_faculty_id,
                bs.assigned_lab_id,
                bs.priority_level,
                bs.is_mandatory,
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'code', s.code,
                    'subject_type', s.subject_type,
                    'college_id', s.college_id,
                    'department_id', s.department_id,
                    'course_id', s.course_id,
                    'semester', s.semester,
                    'credits_per_week', s.credits_per_week,
                    'requires_lab', s.requires_lab,
                    'lecture_hours', s.lecture_hours,
                    'practical_hours', s.practical_hours,
                    'tutorial_hours', s.tutorial_hours
                ) AS subjects
            FROM batch_subjects bs
            LEFT JOIN subjects s ON s.id = bs.subject_id
            WHERE bs.batch_id = $1
        `, [batchId]);
        const batchSubjectsRaw = bsResult.rows;
        const bsError = null;

        if (bsError) {
            console.error('Error fetching batch subjects:', bsError);
            return NextResponse.json(
                { error: 'Failed to fetch batch subjects' },
                { status: 500 }
            );
        }

        // Filter subjects to only include those that belong to the batch's department
        // A subject belongs to the batch if:
        // 1. Subject's department_id matches batch's department_id, OR
        // 2. Subject's department_id is NULL (common/shared subjects across departments), OR
        // 3. Subject's semester matches batch's semester AND college matches
        const batchSubjects = (batchSubjectsRaw || []).filter(bs => {
            const subject = bs.subjects as any;
            if (!subject) return false;

            // Must be from the same college
            if (subject.college_id !== batch.college_id) return false;

            // Check department match
            const subjectDeptId = subject.department_id;
            const batchDeptId = batch.department_id;

            // Include if:
            // - Subject's department matches batch's department
            // - Subject has no department (shared/common subject)
            // Note: We intentionally exclude course_id match to prevent subjects from other departments (e.g. DS) 
            // that share the same course (e.g. B.Tech) from appearing in this department's view.
            if (subjectDeptId === batchDeptId) return true;
            if (subjectDeptId === null) return true;

            // Log skipped subjects for debugging
            // console.log(`Skipping subject ${subject.name} (${subject.code}) - Dept: ${subjectDeptId} vs Batch Dept: ${batchDeptId}`);

            return false;
        });

        console.log(`Batch ${batch.name}: Found ${batchSubjectsRaw?.length || 0} total subjects, filtered to ${batchSubjects.length} for department ${batch.department_id}`);

        // Fetch available lab rooms for the college
        const { data: labRooms } = await supabase
            .from('classrooms')
            .select('id, name, building, capacity, lab_type, has_computers, has_lab_equipment')
            .eq('college_id', batch.college_id)
            .eq('is_available', true)
            .or('type.eq.Lab,is_lab.eq.true')
            .order('name');

        // Get all qualified faculty for subjects in this batch from the same college
        const subjectIds = (batchSubjects || []).map(bs => bs.subject_id);

        // Fetch all qualified faculty in one query via raw SQL
        const qfResult = subjectIds.length > 0
            ? await pool.query(`
                SELECT
                    fqs.faculty_id,
                    fqs.subject_id,
                    fqs.proficiency_level,
                    fqs.is_primary_teacher,
                    fqs.can_handle_lab,
                    fqs.can_handle_tutorial,
                    u.id AS u_id,
                    u.first_name,
                    u.last_name,
                    u.college_id AS u_college_id,
                    u.department_id AS u_department_id,
                    u.is_active,
                    u.role AS u_role
                FROM faculty_qualified_subjects fqs
                INNER JOIN users u ON u.id = fqs.faculty_id
                WHERE fqs.subject_id = ANY($1)
            `, [subjectIds])
            : { rows: [] };
        const allQualifiedFaculty = qfResult.rows.map((r: any) => ({
            faculty_id: r.faculty_id,
            subject_id: r.subject_id,
            proficiency_level: r.proficiency_level,
            is_primary_teacher: r.is_primary_teacher,
            can_handle_lab: r.can_handle_lab,
            can_handle_tutorial: r.can_handle_tutorial,
            users: {
                id: r.u_id,
                first_name: r.first_name,
                last_name: r.last_name,
                college_id: r.u_college_id,
                department_id: r.u_department_id,
                is_active: r.is_active,
                role: r.u_role
            }
        }));

        // Filter qualified faculty to only include those from the same college
        const qualifiedFacultyBySubject = new Map<string, QualifiedFaculty[]>();

        for (const qf of allQualifiedFaculty || []) {
            const user = qf.users as any;

            // Only include faculty from the same college who are active
            if (user && user.college_id === batch.college_id && user.is_active && user.role === 'faculty') {
                const subjectId = qf.subject_id;

                if (!qualifiedFacultyBySubject.has(subjectId)) {
                    qualifiedFacultyBySubject.set(subjectId, []);
                }

                qualifiedFacultyBySubject.get(subjectId)!.push({
                    faculty_id: qf.faculty_id,
                    faculty_name: `${user.first_name} ${user.last_name}`,
                    proficiency_level: qf.proficiency_level,
                    is_primary_teacher: qf.is_primary_teacher
                });
            }
        }

        // Sort each subject's faculty by proficiency (primary teachers first, then by level)
        for (const [, facultyList] of qualifiedFacultyBySubject) {
            facultyList.sort((a, b) => {
                if (a.is_primary_teacher !== b.is_primary_teacher) {
                    return a.is_primary_teacher ? -1 : 1;
                }
                return b.proficiency_level - a.proficiency_level;
            });
        }

        // Get assigned faculty and lab names in bulk
        const assignedFacultyIds = (batchSubjects || [])
            .filter(bs => bs.assigned_faculty_id)
            .map(bs => bs.assigned_faculty_id);

        const assignedLabIds = (batchSubjects || [])
            .filter(bs => bs.assigned_lab_id)
            .map(bs => bs.assigned_lab_id);

        const { data: assignedFacultyData } = assignedFacultyIds.length > 0
            ? await supabase
                .from('users')
                .select('id, first_name, last_name')
                .in('id', assignedFacultyIds)
            : { data: [] };

        const { data: assignedLabData } = assignedLabIds.length > 0
            ? await supabase
                .from('classrooms')
                .select('id, name')
                .in('id', assignedLabIds)
            : { data: [] };

        const facultyNameMap = new Map(
            (assignedFacultyData || []).map((f: any) => [f.id, `${f.first_name} ${f.last_name}`])
        );
        const labNameMap = new Map(
            (assignedLabData || []).map((l: any) => [l.id, l.name])
        );

        // Build the response
        const subjectsWithFaculty: BatchSubjectWithFaculty[] = [];

        for (const bs of batchSubjects || []) {
            const subject = bs.subjects as any;
            const subjectType = subject?.subject_type || 'THEORY';
            const isLabSubject = ['LAB', 'PRACTICAL', 'LABORATORY'].includes(subjectType.toUpperCase())
                || subject?.requires_lab === true
                || (subject?.practical_hours && subject.practical_hours > 0);

            subjectsWithFaculty.push({
                batch_subject_id: bs.id,
                subject_id: bs.subject_id,
                subject_name: subject?.name || 'Unknown',
                subject_code: subject?.code || '',
                subject_type: subjectType,
                required_hours: bs.required_hours_per_week,
                assigned_faculty_id: bs.assigned_faculty_id,
                assigned_faculty_name: bs.assigned_faculty_id
                    ? (facultyNameMap.get(bs.assigned_faculty_id) as string | undefined) || null
                    : null,
                assigned_lab_id: bs.assigned_lab_id || null,
                assigned_lab_name: bs.assigned_lab_id
                    ? (labNameMap.get(bs.assigned_lab_id) as string | undefined) || null
                    : null,
                qualified_faculty: qualifiedFacultyBySubject.get(bs.subject_id) || [],
                is_lab_subject: isLabSubject
            });
        }

        // Sort subjects: unassigned first, then by name
        subjectsWithFaculty.sort((a, b) => {
            const aAssigned = !!a.assigned_faculty_id;
            const bAssigned = !!b.assigned_faculty_id;
            if (aAssigned !== bAssigned) {
                return aAssigned ? 1 : -1; // Unassigned first
            }
            return a.subject_name.localeCompare(b.subject_name);
        });

        // Format lab rooms for response
        const formattedLabRooms: LabRoom[] = (labRooms || []).map((room: any) => ({
            id: room.id,
            name: room.name,
            building: room.building,
            capacity: room.capacity,
            lab_type: room.lab_type,
            has_computers: room.has_computers || false,
            has_lab_equipment: room.has_lab_equipment || false
        }));

        return NextResponse.json({
            batch_id: batch.id,
            batch_name: batch.name,
            semester: batch.semester,
            academic_year: batch.academic_year,
            department_id: batch.department_id,
            college_id: batch.college_id,
            subjects: subjectsWithFaculty,
            lab_rooms: formattedLabRooms,
            total_subjects: subjectsWithFaculty.length,
            assigned_count: subjectsWithFaculty.filter(s => s.assigned_faculty_id).length,
            lab_subjects_count: subjectsWithFaculty.filter(s => s.is_lab_subject).length,
            lab_assigned_count: subjectsWithFaculty.filter(s => s.is_lab_subject && s.assigned_lab_id).length
        });

    } catch (error) {
        console.error('Error in batch-faculty-assignments GET:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT - Update faculty and lab assignments for batch subjects
export async function PUT(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const body = await request.json();
        const { assignments } = body;

        if (!assignments || !Array.isArray(assignments)) {
            return NextResponse.json(
                { error: 'assignments array is required' },
                { status: 400 }
            );
        }

        const supabase = serviceDb;
        const results = [];
        const errors = [];

        for (const assignment of assignments) {
            const { batch_subject_id, assigned_faculty_id, assigned_lab_id } = assignment;

            if (!batch_subject_id) {
                errors.push({ batch_subject_id, error: 'batch_subject_id is required' });
                continue;
            }

            // Build update object dynamically
            const updateData: Record<string, any> = {
                updated_at: new Date().toISOString()
            };

            // Only update fields that are explicitly provided
            if ('assigned_faculty_id' in assignment) {
                updateData.assigned_faculty_id = assigned_faculty_id || null;
            }
            if ('assigned_lab_id' in assignment) {
                updateData.assigned_lab_id = assigned_lab_id || null;
            }

            const { error } = await supabase
                .from('batch_subjects')
                .update(updateData)
                .eq('id', batch_subject_id);

            if (error) {
                errors.push({ batch_subject_id, error: error.message });
            } else {
                results.push({ batch_subject_id, success: true });
            }
        }

        return NextResponse.json({
            success: errors.length === 0,
            updated: results.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error in batch-faculty-assignments PUT:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

