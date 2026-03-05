import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';


// PUT - Update subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can update subjects.' },
        { status: 403 }
      );
    }

    const { id: subjectId } = await params;
    const body = await request.json();
    const {
      code,
      name,
      credits_per_week,
      credit_value,
      semester,
      department_id,
      course_id,
      category,
      subject_type,
      is_active,
      batch_ids
    } = body;

    // Verify subject belongs to user's college
    const { data: existingSubject, error: fetchError } = await supabase
      .from('subjects')
      .select('id, college_id, department_id, semester, course_id, credits_per_week')
      .eq('id', subjectId)
      .eq('college_id', user.college_id)
      .single();

    if (fetchError || !existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found or access denied' },
        { status: 404 }
      );
    }

    // If department is being changed, verify it belongs to user's college
    if (department_id && department_id !== existingSubject.department_id) {
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('id', department_id)
        .eq('college_id', user.college_id)
        .single();

      if (deptError || !department) {
        return NextResponse.json(
          { error: 'Invalid department' },
          { status: 403 }
        );
      }
    }

    // Check for duplicate subject code (if code is being changed)
    if (code) {
      const { data: duplicate } = await supabase
        .from('subjects')
        .select('id')
        .eq('code', code)
        .eq('department_id', department_id || existingSubject.department_id)
        .eq('college_id', user.college_id)
        .neq('id', subjectId)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'Subject code already exists in this department' },
          { status: 409 }
        );
      }
    }

    // Update the subject
    const updateData: any = {};
    if (code) updateData.code = code;
    if (name) updateData.name = name;
    if (credits_per_week) updateData.credits_per_week = credits_per_week;
    if (credit_value !== undefined) updateData.credit_value = credit_value;
    if (semester) updateData.semester = semester;
    if (department_id) updateData.department_id = department_id;
    if (course_id !== undefined) updateData.course_id = course_id && course_id.trim() !== '' ? course_id : null;
    if (category !== undefined) updateData.category = category || null;  // MAJOR, MINOR, CORE (nep_category enum)
    if (subject_type) {
      updateData.subject_type = subject_type;  // THEORY, LAB, PRACTICAL, TUTORIAL
      updateData.requires_lab = subject_type === 'LAB';
      updateData.practical_hours = (subject_type === 'LAB' || subject_type === 'PRACTICAL') ? 2 : 0;
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedSubject, error: updateError } = await supabase
      .from('subjects')
      .update(updateData)
      .eq('id', subjectId)
      .select()
      .single();

    if (updateError) {
      console.error('Subject update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subject' },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------------
    // Sync batch_subjects: explicit batch_ids from frontend, or
    // auto-detect based on dept/semester when batch_ids is not sent.
    // ---------------------------------------------------------------
    try {
      const effectiveDeptId = department_id || existingSubject.department_id;
      const effectiveSemester = Number(semester || existingSubject.semester) || 1;
      const effectiveCourseId =
        course_id !== undefined
          ? course_id && course_id.trim() !== '' ? course_id : null
          : existingSubject.course_id;
      const effectiveCredits = credits_per_week || existingSubject.credits_per_week || 3;

      if (Array.isArray(batch_ids)) {
        // Explicit sync: use exactly the IDs chosen by the admin in the UI
        if (batch_ids.length === 0) {
          await supabase.from('batch_subjects').delete().eq('subject_id', subjectId);
        } else {
          await supabase
            .from('batch_subjects')
            .delete()
            .eq('subject_id', subjectId)
            .not('batch_id', 'in', `(${batch_ids.join(',')})`);

          const { data: existingRows } = await supabase
            .from('batch_subjects')
            .select('id, batch_id')
            .eq('subject_id', subjectId)
            .in('batch_id', batch_ids);

          const existingBatchSet = new Set(
            (existingRows || []).map((r: { batch_id: string }) => r.batch_id)
          );
          const newBatchIds = batch_ids.filter((id: string) => !existingBatchSet.has(id));
          if (newBatchIds.length > 0) {
            const insertRows = newBatchIds.map((bId: string) => ({
              id: crypto.randomUUID(),
              batch_id: bId,
              subject_id: subjectId,
              required_hours_per_week: effectiveCredits,
              is_mandatory: true,
            }));
            const { error: insertErr } = await supabase
              .from('batch_subjects')
              .insert(insertRows);
            if (insertErr) {
              console.error('batch_subjects insert error (explicit sync):', insertErr);
            }
          }
        }
      } else {
        // Auto-sync based on dept/semester (fallback when batch_ids not provided)
        let matchQuery = supabase
          .from('batches')
          .select('id')
          .eq('college_id', user.college_id)
          .eq('department_id', effectiveDeptId)
          .eq('semester', effectiveSemester)
          .eq('is_active', true);

        if (effectiveCourseId) {
          matchQuery = matchQuery.eq('course_id', effectiveCourseId);
        }

        const { data: matchingBatches, error: matchErr } = await matchQuery;

        if (!matchErr) {
          if (matchingBatches && matchingBatches.length > 0) {
            const matchingBatchIds = matchingBatches.map((b: { id: string }) => b.id);

            // Remove stale entries (subject moved to different dept/semester)
            await supabase
              .from('batch_subjects')
              .delete()
              .eq('subject_id', subjectId)
              .not('batch_id', 'in', `(${matchingBatchIds.join(',')})`);

            // Sync batch_subjects without overwriting existing PKs:
            // 1. Fetch which batches already have a row for this subject.
            const { data: existingRows } = await supabase
              .from('batch_subjects')
              .select('id, batch_id')
              .eq('subject_id', subjectId)
              .in('batch_id', matchingBatchIds);

            const existingByBatchId = new Map(
              (existingRows || []).map((r: { id: string; batch_id: string }) => [r.batch_id, r.id])
            );

            // 2. Update required_hours_per_week for already-existing rows.
            for (const [, rowId] of existingByBatchId) {
              await supabase
                .from('batch_subjects')
                .update({ required_hours_per_week: effectiveCredits })
                .eq('id', rowId);
            }

            // 3. Insert rows for batches that don't have this subject yet.
            const newBatchIds = matchingBatchIds.filter(
              (bId: string) => !existingByBatchId.has(bId)
            );
            if (newBatchIds.length > 0) {
              const insertRows = newBatchIds.map((bId: string) => ({
                id: crypto.randomUUID(),
                batch_id: bId,
                subject_id: subjectId,
                required_hours_per_week: effectiveCredits,
                is_mandatory: true,
              }));
              const { error: insertErr } = await supabase
                .from('batch_subjects')
                .insert(insertRows);
              if (insertErr) {
                console.error('batch_subjects insert error during subject update:', insertErr);
              }
            }
          } else {
            // No batches match anymore (e.g. no active batch for this dept/semester)
            // Remove all existing batch_subjects for this subject
            await supabase
              .from('batch_subjects')
              .delete()
              .eq('subject_id', subjectId);
          }
        } else {
          console.error('Error fetching batches for batch_subjects sync:', matchErr);
        }
      }
    } catch (syncErr) {
      // Non-fatal: log but still return success for the subject update
      console.error('batch_subjects sync error (non-fatal):', syncErr);
    }

    // Invalidate subjects list cache so UI reflects updated batch assignments immediately
    try {
      const { invalidateCache } = await import('@/shared/cache/cache-helper');
      const { redisCache } = await import('@/shared/cache/redis-cache');
      const cacheKey = redisCache.buildKey(user.college_id!, 'subjects', 'list-v2');
      await invalidateCache(cacheKey);
    } catch { /* non-fatal */ }

    return NextResponse.json({
      subject: updatedSubject,
      message: 'Subject updated successfully'
    });

  } catch (error: any) {
    console.error('Update subject error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete subjects.' },
        { status: 403 }
      );
    }

    const { id: subjectId } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Verify subject belongs to user's college
    const { data: existingSubject, error: fetchError } = await supabase
      .from('subjects')
      .select('id, college_id')
      .eq('id', subjectId)
      .eq('college_id', user.college_id)
      .single();

    if (fetchError || !existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found or access denied' },
        { status: 404 }
      );
    }

    // Check for locked MAJOR course selections
    const { data: lockedSelections } = await supabase
      .from('student_course_selections')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('is_locked', true)
      .limit(1);

    const hasLockedMajorRefs = lockedSelections && lockedSelections.length > 0;

    // Check for dependent records
    const [{ data: timetableEntries }, { data: scheduledClasses }, { data: batchSubjects }] = await Promise.all([
      supabase
        .from('timetable_entries')
        .select('id')
        .eq('subject_id', subjectId)
        .limit(1),
      supabase
        .from('scheduled_classes')
        .select('id')
        .eq('subject_id', subjectId)
        .limit(1),
      supabase
        .from('batch_subjects')
        .select('id')
        .eq('subject_id', subjectId)
        .limit(1),
    ]);

    const hasTimetableRefs = timetableEntries && timetableEntries.length > 0;
    const hasScheduledRefs = scheduledClasses && scheduledClasses.length > 0;
    const hasBatchSubjectRefs = batchSubjects && batchSubjects.length > 0;

    if (!force && (hasTimetableRefs || hasScheduledRefs || hasLockedMajorRefs || hasBatchSubjectRefs)) {
      const refs = [
        hasTimetableRefs && 'timetable entries',
        hasScheduledRefs && 'scheduled classes',
        hasBatchSubjectRefs && 'batch assignments',
        hasLockedMajorRefs && 'locked student MAJOR selections',
      ].filter(Boolean).join(', ');

      return NextResponse.json(
        {
          error: `Cannot delete subject. It is referenced by ${refs}. Use force delete to remove all related data.`,
          hasReferences: true,
          hasLockedMajor: hasLockedMajorRefs,
          references: {
            timetable_entries: hasTimetableRefs,
            scheduled_classes: hasScheduledRefs,
            batch_subjects: hasBatchSubjectRefs,
            locked_major_selections: hasLockedMajorRefs,
          },
        },
        { status: 409 }
      );
    }

    // Force delete: remove all dependent records first
    if (force) {
      // ---------------------------------------------------------------
      // Bypassing two DB triggers on student_course_selections:
      //   UPDATE trigger (enforce_major_lock): blocks when NEW.selection_type = 'MAJOR'
      //   DELETE trigger (prevent_major_deletion): blocks when OLD.selection_type = 'MAJOR' AND OLD.is_locked = TRUE
      //
      // Strategy:
      //   1. UPDATE selection_type to 'ELECTIVE' → UPDATE trigger exits immediately (NEW.selection_type != 'MAJOR')
      //   2. DELETE rows → DELETE trigger sees OLD.selection_type = 'ELECTIVE' != 'MAJOR' → no exception
      // ---------------------------------------------------------------
      if (hasLockedMajorRefs) {
        // Step 1a: Change selection_type away from 'MAJOR' — bypasses the UPDATE trigger
        const { error: reclassifyError } = await supabase
          .from('student_course_selections')
          .update({ selection_type: 'ELECTIVE' })
          .eq('subject_id', subjectId)
          .eq('selection_type', 'MAJOR');

        if (reclassifyError) {
          console.error('Error reclassifying MAJOR selections:', reclassifyError);
          return NextResponse.json(
            { error: 'Failed to reclassify locked MAJOR selections before deletion.' },
            { status: 500 }
          );
        }
      }

      // Step 1b: Now delete all student_course_selections for this subject
      // DELETE trigger checks OLD.selection_type = 'MAJOR' — now 'ELECTIVE' — so it passes
      const { error: selectionsError } = await supabase
        .from('student_course_selections')
        .delete()
        .eq('subject_id', subjectId);
      if (selectionsError) {
        console.error('Error deleting course selections:', selectionsError);
        return NextResponse.json({ error: 'Failed to remove student course selections.' }, { status: 500 });
      }

      // Step 3: Delete batch_subjects references
      if (hasBatchSubjectRefs) {
        const { error: batchError } = await supabase
          .from('batch_subjects')
          .delete()
          .eq('subject_id', subjectId);
        if (batchError) {
          console.error('Error deleting batch subjects:', batchError);
          return NextResponse.json({ error: 'Failed to remove batch subject assignments.' }, { status: 500 });
        }
      }

      // Step 4: Delete scheduled_classes
      if (hasScheduledRefs) {
        const { error: scheduledError } = await supabase
          .from('scheduled_classes')
          .delete()
          .eq('subject_id', subjectId);
        if (scheduledError) {
          console.error('Error deleting scheduled classes:', scheduledError);
          return NextResponse.json({ error: 'Failed to remove scheduled classes.' }, { status: 500 });
        }
      }

      // Step 5: Delete timetable_entries
      if (hasTimetableRefs) {
        const { error: timetableError } = await supabase
          .from('timetable_entries')
          .delete()
          .eq('subject_id', subjectId);
        if (timetableError) {
          console.error('Error deleting timetable entries:', timetableError);
          return NextResponse.json({ error: 'Failed to remove timetable entries.' }, { status: 500 });
        }
      }
    }

    // Delete the subject
    const { error: deleteError } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (deleteError) {
      console.error('Subject deletion error:', deleteError);
      // P0001 = custom trigger exception (e.g. locked MAJOR deletion blocked)
      if (deleteError.code === 'P0001') {
        return NextResponse.json(
          {
            error: deleteError.message,
            hasReferences: true,
            hasLockedMajor: true,
          },
          { status: 409 }
        );
      }
      if (deleteError.code === '23503') {
        return NextResponse.json(
          { error: 'Cannot delete subject. It is still referenced by other records. Please remove all dependent data first.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to delete subject' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Subject deleted successfully',
      force_deleted: force && (hasTimetableRefs || hasScheduledRefs || hasLockedMajorRefs || hasBatchSubjectRefs),
    });

  } catch (error: any) {
    console.error('Delete subject error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
