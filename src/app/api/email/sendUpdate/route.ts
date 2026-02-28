import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import { emailService } from '@/services/email/emailService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/email/sendUpdate
 * Send timetable publication notification to all department users
 * 
 * Body: {
 *   timetableId: string,
 *   batchId?: string,
 *   departmentId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { timetableId, publishedBy } = body;

    if (!timetableId) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }

    // Fetch timetable details
    const { data: timetable, error: timetableError } = await supabase
      .from('generated_timetables')
      .select(`
        id,
        title,
        status,
        batch_id,
        academic_year,
        created_at,
        batches (
          id,
          name,
          section,
          semester,
          academic_year,
          course_id,
          department_id,
          courses (
            id,
            code,
            title,
            college_id
          )
        )
      `)
      .eq('id', timetableId)
      .single();

    if (timetableError || !timetable) {
      console.error('Error fetching timetable:', timetableError);
      return NextResponse.json(
        { error: 'Timetable not found', details: timetableError?.message },
        { status: 404 }
      );
    }

    // Get batch and course from timetable
    const batch = Array.isArray(timetable.batches) ? timetable.batches[0] : timetable.batches;
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found for this timetable' },
        { status: 400 }
      );
    }

    const course = Array.isArray(batch.courses) ? batch.courses[0] : batch.courses;
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found for this batch' },
        { status: 400 }
      );
    }

    // Get department from batch
    let department = null;
    if (batch.department_id) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('id', batch.department_id)
        .single();
      department = deptData;
    }

    if (!department) {
      // Fallback: use a default department name
      department = {
        id: batch.department_id || 'unknown',
        name: 'Academic Department',
        code: 'DEPT'
      };
    }

    // Fetch all students in the batch
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('role', 'student')
      .eq('course_id', course.id)
      .eq('current_semester', batch.semester)
      .not('email', 'is', null);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    // Fetch all faculty members in the department (if department exists)
    let faculty: any[] = [];
    if (batch.department_id) {
      const { data: facultyData, error: facultyError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .eq('role', 'faculty')
        .eq('department_id', batch.department_id)
        .not('email', 'is', null);

      if (facultyError) {
        console.error('Error fetching faculty:', facultyError);
      } else {
        faculty = facultyData || [];
      }
    }

    // Combine all recipients
    const allRecipients = [...(students || []), ...faculty];

    if (allRecipients.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'No recipients found for this timetable',
          sent: 0 
        },
        { status: 200 }
      );
    }

    // Prepare email data
    const emailData = {
      timetableTitle: timetable.title,
      batchName: batch.name,
      section: batch.section,
      semester: batch.semester,
      academicYear: batch.academic_year || timetable.academic_year,
      courseName: course.title,
      courseCode: course.code,
      departmentName: department.name,
      publishedDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      publishedTime: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      timetableUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/timetable?id=${timetableId}`,
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard`
    };

    // Send emails to all recipients
    const emailPromises = allRecipients.map(async (recipient) => {
      try {
        const personalizedData = {
          ...emailData,
          recipientName: `${recipient.first_name} ${recipient.last_name}`,
          recipientRole: recipient.role === 'student' ? 'Student' : 'Faculty Member'
        };

        await emailService.sendEmail({
          to: recipient.email,
          subject: `📅 New Timetable Published - ${batch.name}`,
          template: 'timetable/published',
          data: personalizedData
        });

        // Log notification in database
        await supabase
          .from('notifications')
          .insert({
            user_id: recipient.id,
            type: 'timetable_published',
            title: 'New Timetable Published',
            message: `Timetable for ${batch.name} has been published`,
            metadata: {
              timetable_id: timetableId,
              batch_id: batch.id,
              department_id: department.id,
              sent_via: 'email'
            },
            read: false
          });

        return { success: true, email: recipient.email };
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        return { success: false, email: recipient.email, error };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = results.length - successCount;

    console.log(`✅ Timetable published emails sent: ${successCount} successful, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Timetable published notification sent to ${successCount} recipients`,
      stats: {
        total: allRecipients.length,
        sent: successCount,
        failed: failureCount,
        students: students?.length || 0,
        faculty: faculty?.length || 0
      },
      timetable: {
        id: timetable.id,
        title: timetable.title,
        batch: batch.name,
        department: department.name
      }
    });

  } catch (error) {
    console.error('Error sending timetable update emails:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send timetable update emails',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
