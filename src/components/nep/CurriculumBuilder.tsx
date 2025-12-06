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
  useDroppable,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


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
      className="bg-white border border-gray-200 rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow hover:border-blue-300"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-bold text-sm text-gray-900 leading-tight">{subject.name}</p>
          <p className="text-xs text-gray-500 mt-1">{subject.code}</p>
        </div>
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded ml-2 whitespace-nowrap">
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
  const { setNodeRef, isOver } = useDroppable({ id: bucket.id });

  // Calculate total credits in bucket
  const totalCredits = bucket.subjects.reduce((sum, subject) => sum + subject.credit_value, 0);

  return (
    <div 
      ref={setNodeRef} 
      className={`border-2 border-dashed rounded-lg p-4 mb-4 transition-colors ${
        isOver 
          ? 'bg-blue-50 border-blue-400 border-solid' 
          : 'bg-gray-50 border-gray-300'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{bucket.bucket_name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {bucket.subjects.length} subjects • <span className="font-semibold text-blue-600">{totalCredits} total credits</span>
          </p>
        </div>
        <button
          onClick={() => onDeleteBucket(bucket.id)}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
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
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [selectedCredits, setSelectedCredits] = useState<number | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newBucketName, setNewBucketName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced from 8 for smoother drag start
      },
    })
  );



  // Fetch available subjects
  useEffect(() => {
    // Check if user is logged in before making API calls
    const userData = localStorage.getItem('user');
    if (!userData) {
      setLoading(false);
      console.error('No user data found in localStorage. Please login first.');
      return;
    }

    try {
      JSON.parse(userData);
    } catch (e) {
      setLoading(false);
      console.error('Invalid user data in localStorage:', e);
      return;
    }

    fetchSubjects();
    fetchBuckets();
  }, [collegeId, course, semester]);

  // Filter subjects by selected credits
  useEffect(() => {
    if (selectedCredits === null) {
      setFilteredSubjects(availableSubjects);
    } else {
      setFilteredSubjects(availableSubjects.filter(s => s.credit_value === selectedCredits));
    }
  }, [selectedCredits, availableSubjects]);

  // Get unique credit values from available subjects
  const uniqueCredits = Array.from(new Set(availableSubjects.map(s => s.credit_value))).sort((a, b) => a - b);

  async function fetchSubjects() {
    try {
      const userData = localStorage.getItem('user');
      console.log('User data from localStorage:', userData);
      if (!userData) {
        setError('Please log in to access subjects data');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      console.log('Auth token created:', authToken.substring(0, 20) + '...');
      const response = await fetch(`/api/nep/subjects?courseId=${encodeURIComponent(course)}&semester=${semester}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        
        if (response.status === 401) {
          if (errorData.code === 'AUTH_REQUIRED') {
            setError(errorData.message || 'Authentication required. Please log in again.');
          } else {
            setError('Your session has expired. Please log in again to access subjects.');
          }
          return;
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to fetch subjects');
      }

      const subjects = await response.json();
      console.log(`Found ${subjects.length} subjects for courseId ${course} semester ${semester}`);
      setAvailableSubjects(subjects);
      setFilteredSubjects(subjects);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setError(error instanceof Error ? error.message : 'Failed to load subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchBuckets() {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('Please log in to access buckets data');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch(`/api/nep/buckets?courseId=${encodeURIComponent(course)}&semester=${semester}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        
        if (response.status === 401) {
          if (errorData.code === 'AUTH_REQUIRED') {
            setError(errorData.message || 'Authentication required. Please log in again.');
          } else {
            setError('Your session has expired. Please log in again to access buckets.');
          }
          return;
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to fetch buckets');
      }

      const bucketsWithSubjects = await response.json();
      setBuckets(bucketsWithSubjects);
    } catch (error) {
      console.error('Error fetching buckets:', error);
      setError(error instanceof Error ? error.message : 'Failed to load buckets. Please try again.');
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

    // Find if dragging from available subjects or filtered subjects
    const draggedSubject = availableSubjects.find((s) => s.id === activeId);

    if (draggedSubject) {
      // Check if dropping directly on a bucket
      let targetBucket = buckets.find((b) => b.id === overId);

      // If not dropped on bucket, check if dropped on a subject within a bucket
      if (!targetBucket) {
        for (const bucket of buckets) {
          if (bucket.subjects.some((s) => s.id === overId)) {
            targetBucket = bucket;
            break;
          }
        }
      }

      if (targetBucket) {
        // Check if subject is already in this bucket
        const alreadyInBucket = targetBucket.subjects.some((s) => s.id === activeId);
        
        if (!alreadyInBucket) {
          // Move subject to bucket
          setBuckets((prev) =>
            prev.map((bucket) =>
              bucket.id === targetBucket!.id
                ? { ...bucket, subjects: [...bucket.subjects, draggedSubject] }
                : bucket
            )
          );
          setAvailableSubjects((prev) => prev.filter((s) => s.id !== activeId));
        }
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
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found');
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch('/api/nep/buckets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          buckets,
          availableSubjects,
          courseId: course,
          semester
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save curriculum');
      }

      const result = await response.json();
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

  // Display error if any
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-96 p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchSubjects();
              fetchBuckets();
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const userData = localStorage.getItem('user');
  if (!userData) {
    return (
      <div className="flex flex-col justify-center items-center h-96 p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Authentication Required</h3>
          <p className="text-red-600 mb-4">
            Please log in through the admin dashboard first.
          </p>
          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Go to Admin Dashboard
          </button>
        </div>
      </div>
    );
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
          
          {/* Credit Filter Buttons */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Credits:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCredits(null)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedCredits === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({availableSubjects.length})
              </button>
              {uniqueCredits.map((credit) => {
                const count = availableSubjects.filter(s => s.credit_value === credit).length;
                return (
                  <button
                    key={credit}
                    onClick={() => setSelectedCredits(credit)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedCredits === credit
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {credit} Credits ({count})
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <SortableContext items={filteredSubjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {filteredSubjects.map((subject) => (
                <DraggableSubject key={subject.id} subject={subject} />
              ))}
            </SortableContext>
            {filteredSubjects.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                {selectedCredits !== null 
                  ? `No subjects with ${selectedCredits} credits`
                  : 'No available subjects'
                }
              </p>
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
          <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-2xl opacity-90 transform rotate-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900">{activeSubject.name}</p>
                <p className="text-xs text-gray-500 mt-1">{activeSubject.code}</p>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded ml-2 whitespace-nowrap">
                {activeSubject.credit_value} credits
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              L: {activeSubject.lecture_hours} | T: {activeSubject.tutorial_hours} | P: {activeSubject.practical_hours}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
