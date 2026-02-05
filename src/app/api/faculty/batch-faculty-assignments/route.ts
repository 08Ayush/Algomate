'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
    return createClient(supabaseUrl, supabaseServiceKey);
}

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
        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batch_id');

        if (!batchId) {
            return NextResponse.json(
                { error: 'batch_id is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Get batch info
        const { data: batch, error: batchError } = await supabase
            .from('batches')
            .select('id, name, department_id, semester, academic_year, college_id')
            .eq('id', batchId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json(
                { error: 'Batch not found' },
                { status: 404 }
            );
        }

        // Get batch subjects with subject details, assigned faculty, and assigned lab
        const { data: batchSubjects, error: bsError } = await supabase
            .from('batch_subjects')
            .select(`
                id,
                subject_id,
                required_hours_per_week,
                assigned_faculty_id,
                assigned_lab_id,
                subjects (
                    id,
                    name,
                    code,
                    subject_type
                )
            `)
            .eq('batch_id', batchId);

        if (bsError) {
            console.error('Error fetching batch subjects:', bsError);
            return NextResponse.json(
                { error: 'Failed to fetch batch subjects' },
                { status: 500 }
            );
        }

        // Fetch available lab rooms for the college
        const { data: labRooms } = await supabase
            .from('classrooms')
            .select('id, name, building, capacity, lab_type, has_computers, has_lab_equipment')
            .eq('college_id', batch.college_id)
            .eq('is_available', true)
            .or('type.eq.Lab,is_lab.eq.true')
            .order('name');

        // For each subject, get qualified faculty
        const subjectsWithFaculty: BatchSubjectWithFaculty[] = [];

        for (const bs of batchSubjects || []) {
            const subject = bs.subjects as any;
            const subjectType = subject?.subject_type || 'THEORY';
            const isLabSubject = ['LAB', 'PRACTICAL', 'LABORATORY'].includes(subjectType.toUpperCase());

            // Get qualified faculty for this subject
            const { data: qualifiedData } = await supabase
                .from('faculty_qualified_subjects')
                .select(`
                    faculty_id,
                    proficiency_level,
                    is_primary_teacher,
                    users!faculty_id (
                        id,
                        first_name,
                        last_name
                    )
                `)
                .eq('subject_id', bs.subject_id);

            // Get assigned faculty name if exists
            let assignedFacultyName: string | null = null;
            if (bs.assigned_faculty_id) {
                const { data: assignedUser } = await supabase
                    .from('users')
                    .select('first_name, last_name')
                    .eq('id', bs.assigned_faculty_id)
                    .single();

                if (assignedUser) {
                    assignedFacultyName = `${assignedUser.first_name} ${assignedUser.last_name}`;
                }
            }

            // Get assigned lab name if exists
            let assignedLabName: string | null = null;
            if (bs.assigned_lab_id) {
                const { data: assignedLab } = await supabase
                    .from('classrooms')
                    .select('name')
                    .eq('id', bs.assigned_lab_id)
                    .single();

                if (assignedLab) {
                    assignedLabName = assignedLab.name;
                }
            }

            const qualifiedFaculty: QualifiedFaculty[] = (qualifiedData || []).map((q: any) => ({
                faculty_id: q.faculty_id,
                faculty_name: q.users ? `${q.users.first_name} ${q.users.last_name}` : 'Unknown',
                proficiency_level: q.proficiency_level,
                is_primary_teacher: q.is_primary_teacher
            }));

            subjectsWithFaculty.push({
                batch_subject_id: bs.id,
                subject_id: bs.subject_id,
                subject_name: subject?.name || 'Unknown',
                subject_code: subject?.code || '',
                subject_type: subjectType,
                required_hours: bs.required_hours_per_week,
                assigned_faculty_id: bs.assigned_faculty_id,
                assigned_faculty_name: assignedFacultyName,
                assigned_lab_id: bs.assigned_lab_id || null,
                assigned_lab_name: assignedLabName,
                qualified_faculty: qualifiedFaculty,
                is_lab_subject: isLabSubject
            });
        }

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
        const body = await request.json();
        const { assignments } = body;

        if (!assignments || !Array.isArray(assignments)) {
            return NextResponse.json(
                { error: 'assignments array is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();
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
