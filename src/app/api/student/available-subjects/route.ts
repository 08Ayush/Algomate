import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

// GET - Fetch available subjects for a student considering their MAJOR lock
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const semester = searchParams.get('semester');
    const departmentId = searchParams.get('departmentId');
    const courseId = searchParams.get('courseId');

    if (!studentId || !semester) {
      return NextResponse.json({ error: 'Student ID and semester are required' }, { status: 400 });
    }

    const pool = getPool();

    // Check if student has a locked MAJOR selection from Semester 3+
    const majorResult = await pool.query(`
      SELECT scs.id, scs.semester, scs.locked_at, scs.is_locked, scs.selection_type, scs.subject_id,
        s.subject_domain, s.name AS subject_name, s.nep_category
      FROM student_course_selections scs
      INNER JOIN subjects s ON s.id = scs.subject_id
      WHERE scs.student_id = $1 AND scs.semester >= 3
      ORDER BY scs.semester ASC
    `, [studentId]);

    const existingMajorSelections = majorResult.rows.map((row: any) => ({
      id: row.id,
      semester: row.semester,
      locked_at: row.locked_at,
      is_locked: row.is_locked,
      selection_type: row.selection_type,
      subject_id: row.subject_id,
      subjects: { subject_domain: row.subject_domain, name: row.subject_name, nep_category: row.nep_category }
    }));

    const lockedMajor = existingMajorSelections.find((selection: any) => {
      const sd = selection.subjects;
      const isMajor = selection.selection_type === 'MAJOR' ||
        ['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(sd?.nep_category || '');
      return isMajor && selection.semester >= 3;
    });

    const hasLockedMajor = !!lockedMajor;
    const lockedSubjectData = lockedMajor?.subjects || null;
    const lockedDomain = lockedSubjectData?.subject_domain;
    const lockedSemester = lockedMajor?.semester;

    // Build subjects query
    const subjectParams: any[] = [parseInt(semester)];
    let subjectSql = `
      SELECT id, code, name, credit_value, credits_per_week, nep_category, subject_type, subject_domain,
        domain_sequence, description, semester, course_group_id, course_id, department_id
      FROM subjects
      WHERE semester = $1 AND is_active = true
    `;

    if (departmentId) {
      subjectParams.push(departmentId);
      subjectSql += ` AND department_id = $${subjectParams.length}`;
    }
    if (courseId) {
      subjectParams.push(courseId);
      subjectSql += ` AND course_id = $${subjectParams.length}`;
    }

    const subjectsResult = await pool.query(subjectSql, subjectParams);
    const subjects = subjectsResult.rows;

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
        subject_name: lockedSubjectData?.name
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
