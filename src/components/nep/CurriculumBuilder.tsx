'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';

// Types
interface Subject {
  id: string;
  code: string;
  name: string;
  nep_category: string;
  lecture_hours: number;
  tutorial_hours: number;
  practical_hours: number;
  credit_value: number;
}

interface Bucket {
  id: string;
  bucket_name: string;
  is_common_slot: boolean;
  min_selection: number;
  max_selection: number;
  subjects: Subject[];
}

interface CurriculumBuilderProps {
  collegeId: string;
  course: string;
  semester: number;
}

// Draggable Subject Card Component
function DraggableSubject({ subject }: { subject: Subject }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subject.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-gray-200 rounded-lg p-3 mb-2 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-sm text-gray-900">{subject.code}</p>
          <p className="text-xs text-gray-600">{subject.name}</p>
        </div>
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
          {subject.credit_value} credits
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        L: {subject.lecture_hours} | T: {subject.tutorial_hours} | P: {subject.practical_hours}
      </div>
    </div>
  );
}

// Droppable Bucket Component
function DroppableBucket({
  bucket,
  onRemoveSubject,
  onToggleCommonSlot,
  onUpdateSelection,
  onDeleteBucket,
}: {
  bucket: Bucket;
  onRemoveSubject: (bucketId: string, subjectId: string) => void;
  onToggleCommonSlot: (bucketId: string) => void;
  onUpdateSelection: (bucketId: string, min: number, max: number) => void;
  onDeleteBucket: (bucketId: string) => void;
}) {
  const { setNodeRef } = useSortable({ id: bucket.id });

  return (
    <div ref={setNodeRef} className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg text-gray-900">{bucket.bucket_name}</h3>
        <button
          onClick={() => onDeleteBucket(bucket.id)}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={bucket.is_common_slot}
              onChange={() => onToggleCommonSlot(bucket.id)}
              className="rounded"
            />
            <span>Common Time Slot</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            All subjects run simultaneously (students choose one)
          </p>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="text-xs text-gray-600">Min:</label>
            <input
              type="number"
              min="1"
              value={bucket.min_selection}
              onChange={(e) => onUpdateSelection(bucket.id, parseInt(e.target.value), bucket.max_selection)}
              className="w-16 px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Max:</label>
            <input
              type="number"
              min="1"
              value={bucket.max_selection}
              onChange={(e) => onUpdateSelection(bucket.id, bucket.min_selection, parseInt(e.target.value))}
              className="w-16 px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      <div className="min-h-[100px]">
        {bucket.subjects.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            Drag subjects here
          </div>
        ) : (
          <SortableContext items={bucket.subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {bucket.subjects.map((subject) => (
              <div key={subject.id} className="relative group">
                <DraggableSubject subject={subject} />
                <button
                  onClick={() => onRemoveSubject(bucket.id, subject.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// Main Curriculum Builder Component
export default function CurriculumBuilder({
  collegeId,
  course,
  semester,
}: CurriculumBuilderProps) {
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newBucketName, setNewBucketName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const supabase = createClient();

  // Fetch available subjects
  useEffect(() => {
    fetchSubjects();
    fetchBuckets();
  }, [collegeId, course, semester]);

  async function fetchSubjects() {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('college_id', collegeId)
        .eq('semester', semester)
        .eq('is_active', true)
        .is('course_group_id', null) // Only subjects not in buckets
        .order('code');

      if (error) throw error;
      
      // Filter by program column first, then fallback to code/name matching
      const filtered = (data || []).filter((subject: any) => {
        // Primary filter: Use program column if available
        if (subject.program) {
          return subject.program === course;
        }
        // Fallback: Check if course name appears in code or name
        return subject.code?.includes(course) || subject.name?.includes(course);
      });
      
      console.log(`Found ${filtered.length} subjects for ${course} semester ${semester}`);
      setAvailableSubjects(filtered);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBuckets() {
    try {
      // Fetch buckets by college, course, and semester
      const { data: bucketsData, error: bucketsError } = await supabase
        .from('elective_buckets')
        .select('*')
        .eq('college_id', collegeId)
        .eq('course', course)
        .eq('semester', semester);

      if (bucketsError) throw bucketsError;

      // Fetch subjects for each bucket
      const bucketsWithSubjects = await Promise.all(
        (bucketsData || []).map(async (bucket: any) => {
          const { data: subjects } = await supabase
            .from('subjects')
            .select('*')
            .eq('course_group_id', bucket.id);

          return {
            ...bucket,
            subjects: subjects || [],
          };
        })
      );

      setBuckets(bucketsWithSubjects);
    } catch (error) {
      console.error('Error fetching buckets:', error);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find if dragging from available subjects
    const draggedSubject = availableSubjects.find((s) => s.id === activeId);

    if (draggedSubject) {
      // Find target bucket
      const targetBucket = buckets.find((b) => b.id === overId);

      if (targetBucket) {
        // Move subject to bucket
        setBuckets((prev) =>
          prev.map((bucket) =>
            bucket.id === overId
              ? { ...bucket, subjects: [...bucket.subjects, draggedSubject] }
              : bucket
          )
        );
        setAvailableSubjects((prev) => prev.filter((s) => s.id !== activeId));
      }
    }

    setActiveId(null);
  }

  function handleRemoveSubject(bucketId: string, subjectId: string) {
    const bucket = buckets.find((b) => b.id === bucketId);
    const subject = bucket?.subjects.find((s) => s.id === subjectId);

    if (subject) {
      setBuckets((prev) =>
        prev.map((b) =>
          b.id === bucketId ? { ...b, subjects: b.subjects.filter((s) => s.id !== subjectId) } : b
        )
      );
      setAvailableSubjects((prev) => [...prev, subject]);
    }
  }

  function handleToggleCommonSlot(bucketId: string) {
    setBuckets((prev) =>
      prev.map((b) => (b.id === bucketId ? { ...b, is_common_slot: !b.is_common_slot } : b))
    );
  }

  function handleUpdateSelection(bucketId: string, min: number, max: number) {
    setBuckets((prev) =>
      prev.map((b) => (b.id === bucketId ? { ...b, min_selection: min, max_selection: max } : b))
    );
  }

  function handleDeleteBucket(bucketId: string) {
    const bucket = buckets.find((b) => b.id === bucketId);
    if (bucket) {
      setAvailableSubjects((prev) => [...prev, ...bucket.subjects]);
      setBuckets((prev) => prev.filter((b) => b.id !== bucketId));
    }
  }

  async function handleCreateBucket() {
    if (!newBucketName.trim()) return;

    const newBucket: Bucket = {
      id: `temp-${Date.now()}`,
      bucket_name: newBucketName,
      is_common_slot: true,
      min_selection: 1,
      max_selection: 1,
      subjects: [],
    };

    setBuckets((prev) => [...prev, newBucket]);
    setNewBucketName('');
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Delete all existing buckets for this college, course, and semester
      const { error: deleteError } = await supabase
        .from('elective_buckets')
        .delete()
        .eq('college_id', collegeId)
        .eq('course', course)
        .eq('semester', semester);

      if (deleteError) throw deleteError;

      // Insert new buckets
      for (const bucket of buckets) {
        const { data: bucketData, error: bucketError } = await supabase
          .from('elective_buckets')
          .insert({
            college_id: collegeId,
            course: course,
            semester: semester,
            bucket_name: bucket.bucket_name,
            is_common_slot: bucket.is_common_slot,
            min_selection: bucket.min_selection,
            max_selection: bucket.max_selection,
          } as any)
          .select()
          .single();

        if (bucketError) throw bucketError;

        // Update subjects to link to bucket
        if (bucket.subjects.length > 0 && bucketData) {
          const { error: updateError } = await (supabase as any)
            .from('subjects')
            .update({ course_group_id: (bucketData as any).id })
            .in('id', bucket.subjects.map((s) => s.id));

          if (updateError) throw updateError;
        }
      }

      // Reset course_group_id for available subjects
      if (availableSubjects.length > 0) {
        await (supabase as any)
          .from('subjects')
          .update({ course_group_id: null })
          .in('id', availableSubjects.map((s) => s.id));
      }

      alert('Curriculum saved successfully!');
      await fetchBuckets();
    } catch (error) {
      console.error('Error saving curriculum:', error);
      alert('Failed to save curriculum. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }

  const activeSubject = availableSubjects.find((s) => s.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 gap-6 p-6">
        {/* Left: Available Subjects */}
        <div className="col-span-1">
          <h2 className="text-2xl font-bold mb-4">Available Subjects</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <SortableContext items={availableSubjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {availableSubjects.map((subject) => (
                <DraggableSubject key={subject.id} subject={subject} />
              ))}
            </SortableContext>
            {availableSubjects.length === 0 && (
              <p className="text-center text-gray-400 py-8">No available subjects</p>
            )}
          </div>
        </div>

        {/* Right: Buckets */}
        <div className="col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Elective Buckets</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Curriculum'}
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              placeholder="New bucket name (e.g., Sem 1 Major Pool)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleCreateBucket}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Bucket
            </button>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            <SortableContext items={buckets.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {buckets.map((bucket) => (
                <DroppableBucket
                  key={bucket.id}
                  bucket={bucket}
                  onRemoveSubject={handleRemoveSubject}
                  onToggleCommonSlot={handleToggleCommonSlot}
                  onUpdateSelection={handleUpdateSelection}
                  onDeleteBucket={handleDeleteBucket}
                />
              ))}
            </SortableContext>
            {buckets.length === 0 && (
              <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-300 rounded-lg">
                Create a bucket to get started
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeSubject ? (
          <div className="bg-white border border-blue-500 rounded-lg p-3 shadow-lg">
            <p className="font-semibold text-sm">{activeSubject.code}</p>
            <p className="text-xs text-gray-600">{activeSubject.name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
