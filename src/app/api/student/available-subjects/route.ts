import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch available subjects for a student considering their MAJOR lock
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const semester = searchParams.get('semester');
    const academicYear = searchParams.get('academicYear');
    const departmentId = searchParams.get('departmentId');
    const courseId = searchParams.get('courseId');

    if (!studentId || !semester) {
      return NextResponse.json({
        error: 'Student ID and semester are required'
      }, { status: 400 });
    }

    // Check if student has selected a MAJOR in Semester 3 or later (should be locked)
    const { data: existingMajorSelections } = await supabase
      .from('student_course_selections')
      .select(`
        id,
        semester,
        locked_at,
        is_locked,
        selection_type,
        subject_id,
        subjects!inner (
          subject_domain,
          name,
          nep_category
        )
      `)
      .eq('student_id', studentId)
      .gte('semester', 3) // Check from semester 3 onwards
      .order('semester', { ascending: true });

    // Find if student has any MAJOR selection from sem 3+
    const lockedMajor = existingMajorSelections?.find((selection: any) => {
      const subjectData = Array.isArray(selection.subjects) ? selection.subjects[0] : selection.subjects;
      const isMajor = selection.selection_type === 'MAJOR' ||
        ['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(subjectData?.nep_category || '');
      return isMajor && selection.semester >= 3;
    });

    const hasLockedMajor = !!lockedMajor;
    const subjectData = lockedMajor?.subjects ? (Array.isArray(lockedMajor.subjects) ? lockedMajor.subjects[0] : lockedMajor.subjects) : null;
    const lockedDomain = subjectData?.subject_domain;
    const lockedSemester = lockedMajor?.semester;

    // Get all subjects for the semester
    let query = supabase
      .from('subjects')
      .select(`
        id,
        code,
        name,
        credit_value,
        nep_category,
        subject_type,
        subject_domain,
        domain_sequence,
        description,
        semester,
        course_group_id,
        course_id,
        department_id
      `)
      .eq('semester', parseInt(semester))
      .eq('is_active', true);

    // Filter by department if provided
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    // Filter by course if provided
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data: subjects, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({
        error: 'Failed to fetch subjects'
      }, { status: 500 });
    }

    // Classify subjects based on student's locked MAJOR
    const classifiedSubjects = subjects?.map(subject => {
      const isMajorCategory = ['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(subject.nep_category || '');
      const isMinorCategory = ['MINOR', 'CORE MINOR'].includes(subject.nep_category || '');
      const isCoreCategory = ['CORE', 'CORE PARTIAL'].includes(subject.nep_category || '');
      const isElectiveCategory = ['OPEN ELECTIVE', 'MULTIDISCIPLINARY', 'AEC', 'VAC'].includes(subject.nep_category || '');

      let isSelectable = true;
      let selectionType = 'ELECTIVE';
      let reason = 'Can be selected';
      let isPriority = false;

      // Determine if selectable and type
      if (hasLockedMajor && isMajorCategory) {
        if (subject.subject_domain === lockedDomain) {
          isSelectable = true;
          selectionType = 'MAJOR';
          reason = `Continuation of your MAJOR in ${lockedDomain}`;
          isPriority = true;
        } else {
          isSelectable = false;
          selectionType = 'MAJOR';
          reason = `Cannot select. You have a locked MAJOR in ${lockedDomain} domain`;
        }
      } else if (isMajorCategory) {
        isSelectable = true;
        selectionType = 'MAJOR';
        reason = parseInt(semester) >= 3
          ? 'Will be locked after selection (cannot change in future semesters)'
          : 'Can be selected (will be locked from Semester 3)';
        isPriority = false;
      } else if (isMinorCategory) {
        isSelectable = true;
        selectionType = 'MINOR';
        reason = 'MINOR subjects can be changed in any semester';
      } else if (isCoreCategory) {
        isSelectable = true;
        selectionType = 'CORE';
        reason = 'Core subject - Mandatory for all students';
        isPriority = true;
      } else if (isElectiveCategory) {
        isSelectable = true;
        selectionType = 'ELECTIVE';
        reason = 'Elective - Can be selected or changed';
      }

      return {
        ...subject,
        is_selectable: isSelectable,
        selection_type: selectionType,
        reason,
        is_priority: isPriority
      };
    }) || [];

    // Sort: Priority subjects first, then selectable, then non-selectable
    classifiedSubjects.sort((a, b) => {
      if (a.is_priority && !b.is_priority) return -1;
      if (!a.is_priority && b.is_priority) return 1;
      if (a.is_selectable && !b.is_selectable) return -1;
      if (!a.is_selectable && b.is_selectable) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      subjects: classifiedSubjects,
      locked_major: lockedMajor ? {
        domain: lockedDomain,
        locked_semester: lockedSemester,
        locked_at: lockedMajor.locked_at,
        subject_name: subjectData?.name
      } : null,
      count: classifiedSubjects.length,
      selectable_count: classifiedSubjects.filter(s => s.is_selectable).length
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
