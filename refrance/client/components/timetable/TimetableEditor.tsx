import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, MapPin, User, BookOpen, AlertTriangle, Check, Edit, Save, X } from "lucide-react";
import { ScheduledClass, Faculty, Subject, Classroom, StudentBatch } from "@/store/api";
import { useAuth } from "@/contexts/AuthContext";

interface TimeSlot {
  id: string;
  day: string;
  time: string;
  startTime: string;
  endTime: string;
}

interface DraggedClass {
  class: ScheduledClass;
  sourceSlot: { day: string; time: string };
}

interface ConflictInfo {
  type: 'faculty' | 'classroom' | 'batch';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface TimetableEditorProps {
  classes: ScheduledClass[];
  faculty: Faculty[];
  subjects: Subject[];
  classrooms: Classroom[];
  batches: StudentBatch[];
  timetableId: number;
  isReadOnly?: boolean;
  onClassUpdated?: (classData: ScheduledClass) => void;
  onSave?: () => void;
}

export default function TimetableEditor({
  classes,
  faculty,
  subjects,
  classrooms,
  batches,
  timetableId,
  isReadOnly = false,
  onClassUpdated,
  onSave
}: TimetableEditorProps) {
  const { user, canEditTimetable } = useAuth();
  
  const [timetableGrid, setTimetableGrid] = useState<Map<string, ScheduledClass>>(new Map());
  const [draggedClass, setDraggedClass] = useState<DraggedClass | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Map<string, ConflictInfo[]>>(new Map());
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Time slots configuration - Complete for all 5 days
  const timeSlots: TimeSlot[] = [
    // Monday
    { id: '1', day: 'Monday', time: '9:00 AM', startTime: '09:00', endTime: '10:00' },
    { id: '2', day: 'Monday', time: '10:00 AM', startTime: '10:00', endTime: '11:00' },
    { id: '3', day: 'Monday', time: '11:00 AM', startTime: '11:00', endTime: '12:00' },
    { id: '4', day: 'Monday', time: '2:00 PM', startTime: '14:00', endTime: '15:00' },
    { id: '5', day: 'Monday', time: '3:00 PM', startTime: '15:00', endTime: '16:00' },
    
    // Tuesday
    { id: '6', day: 'Tuesday', time: '9:00 AM', startTime: '09:00', endTime: '10:00' },
    { id: '7', day: 'Tuesday', time: '10:00 AM', startTime: '10:00', endTime: '11:00' },
    { id: '8', day: 'Tuesday', time: '11:00 AM', startTime: '11:00', endTime: '12:00' },
    { id: '9', day: 'Tuesday', time: '2:00 PM', startTime: '14:00', endTime: '15:00' },
    { id: '10', day: 'Tuesday', time: '3:00 PM', startTime: '15:00', endTime: '16:00' },
    
    // Wednesday
    { id: '11', day: 'Wednesday', time: '9:00 AM', startTime: '09:00', endTime: '10:00' },
    { id: '12', day: 'Wednesday', time: '10:00 AM', startTime: '10:00', endTime: '11:00' },
    { id: '13', day: 'Wednesday', time: '11:00 AM', startTime: '11:00', endTime: '12:00' },
    { id: '14', day: 'Wednesday', time: '2:00 PM', startTime: '14:00', endTime: '15:00' },
    { id: '15', day: 'Wednesday', time: '3:00 PM', startTime: '15:00', endTime: '16:00' },
    
    // Thursday
    { id: '16', day: 'Thursday', time: '9:00 AM', startTime: '09:00', endTime: '10:00' },
    { id: '17', day: 'Thursday', time: '10:00 AM', startTime: '10:00', endTime: '11:00' },
    { id: '18', day: 'Thursday', time: '11:00 AM', startTime: '11:00', endTime: '12:00' },
    { id: '19', day: 'Thursday', time: '2:00 PM', startTime: '14:00', endTime: '15:00' },
    { id: '20', day: 'Thursday', time: '3:00 PM', startTime: '15:00', endTime: '16:00' },
    
    // Friday
    { id: '21', day: 'Friday', time: '9:00 AM', startTime: '09:00', endTime: '10:00' },
    { id: '22', day: 'Friday', time: '10:00 AM', startTime: '10:00', endTime: '11:00' },
    { id: '23', day: 'Friday', time: '11:00 AM', startTime: '11:00', endTime: '12:00' },
    { id: '24', day: 'Friday', time: '2:00 PM', startTime: '14:00', endTime: '15:00' },
    { id: '25', day: 'Friday', time: '3:00 PM', startTime: '15:00', endTime: '16:00' }
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'];

  // Initialize timetable grid
  React.useEffect(() => {
    const grid = new Map();
    classes.forEach(cls => {
      const slot = timeSlots.find(slot => slot.id === cls.time_slot_id.toString());
      if (slot) {
        const key = `${slot.day}-${slot.time}`;
        grid.set(key, cls);
      }
    });
    setTimetableGrid(grid);
    detectConflicts(grid);
  }, [classes]);

  const detectConflicts = useCallback((grid: Map<string, ScheduledClass>) => {
    const conflictMap = new Map<string, ConflictInfo[]>();
    const scheduleByTimeSlot = new Map<string, ScheduledClass[]>();

    // Group classes by time slots
    grid.forEach((cls, key) => {
      const timeSlot = key.split('-')[1];
      if (!scheduleByTimeSlot.has(timeSlot)) {
        scheduleByTimeSlot.set(timeSlot, []);
      }
      scheduleByTimeSlot.get(timeSlot)!.push(cls);
    });

    // Check for conflicts
    scheduleByTimeSlot.forEach((classesInSlot, timeSlot) => {
      const facultyMap = new Map();
      const classroomMap = new Map();
      const batchMap = new Map();

      classesInSlot.forEach(cls => {
        const key = `${cls.time_slot_id}`;
        
        // Faculty conflicts
        if (facultyMap.has(cls.faculty_id)) {
          const conflictKey = `faculty-${cls.faculty_id}-${timeSlot}`;
          const existing = conflictMap.get(conflictKey) || [];
          existing.push({
            type: 'faculty',
            description: `Faculty is scheduled for multiple classes at the same time`,
            severity: 'high'
          });
          conflictMap.set(conflictKey, existing);
        } else {
          facultyMap.set(cls.faculty_id, cls);
        }

        // Classroom conflicts
        if (classroomMap.has(cls.classroom_id)) {
          const conflictKey = `classroom-${cls.classroom_id}-${timeSlot}`;
          const existing = conflictMap.get(conflictKey) || [];
          existing.push({
            type: 'classroom',
            description: `Classroom is double-booked`,
            severity: 'high'
          });
          conflictMap.set(conflictKey, existing);
        } else {
          classroomMap.set(cls.classroom_id, cls);
        }

        // Batch conflicts
        if (batchMap.has(cls.batch_id)) {
          const conflictKey = `batch-${cls.batch_id}-${timeSlot}`;
          const existing = conflictMap.get(conflictKey) || [];
          existing.push({
            type: 'batch',
            description: `Student batch has conflicting classes`,
            severity: 'medium'
          });
          conflictMap.set(conflictKey, existing);
        } else {
          batchMap.set(cls.batch_id, cls);
        }
      });
    });

    setConflicts(conflictMap);
  }, []);

  const handleDragStart = (cls: ScheduledClass, day: string, time: string) => {
    if (isReadOnly) return;
    setDraggedClass({ class: cls, sourceSlot: { day, time } });
  };

  const handleDragOver = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    setDragOverSlot(`${day}-${time}`);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetTime: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedClass || isReadOnly) return;

    const sourceKey = `${draggedClass.sourceSlot.day}-${draggedClass.sourceSlot.time}`;
    const targetKey = `${targetDay}-${targetTime}`;

    if (sourceKey === targetKey) {
      setDraggedClass(null);
      return;
    }

    // Create updated class with new time slot
    const targetSlot = timeSlots.find(slot => slot.day === targetDay && slot.time === targetTime);
    if (!targetSlot) return;

    const updatedClass = {
      ...draggedClass.class,
      timeslot: parseInt(targetSlot.id)
    };

    // Update grid
    const newGrid = new Map(timetableGrid);
    newGrid.delete(sourceKey);
    
    // Check if target slot is occupied
    if (newGrid.has(targetKey)) {
      // Swap classes
      const existingClass = newGrid.get(targetKey)!;
      const sourceSlot = timeSlots.find(slot => slot.day === draggedClass.sourceSlot.day && slot.time === draggedClass.sourceSlot.time);
      if (sourceSlot) {
        const swappedClass = {
          ...existingClass,
          timeslot: parseInt(sourceSlot.id)
        };
        newGrid.set(sourceKey, swappedClass);
        if (onClassUpdated) onClassUpdated(swappedClass);
      }
    }
    
    newGrid.set(targetKey, updatedClass);
    setTimetableGrid(newGrid);
    detectConflicts(newGrid);
    setHasUnsavedChanges(true);
    
    if (onClassUpdated) onClassUpdated(updatedClass);
    setDraggedClass(null);
  };

  const handleClassClick = (cls: ScheduledClass) => {
    if (isReadOnly) return;
    setSelectedClass(cls);
    setIsEditDialogOpen(true);
  };

  const saveChanges = () => {
    setHasUnsavedChanges(false);
    if (onSave) onSave();
  };

  const getSubjectName = (subjectId: number) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
  };

  const getFacultyName = (facultyId: number) => {
    return faculty.find(f => f.id === facultyId)?.name || 'Unknown Faculty';
  };

  const getClassroomName = (classroomId: number) => {
    return classrooms.find(c => c.id === classroomId)?.room_number || 'Unknown Room';
  };

  const getBatchName = (batchId: number) => {
    return batches.find(b => b.id === batchId)?.name || 'Unknown Batch';
  };

  const getSlotConflicts = (day: string, time: string) => {
    const slot = timeSlots.find(s => s.day === day && s.time === time);
    if (!slot) return [];
    
    const conflictKeys = Array.from(conflicts.keys()).filter(key => 
      key.includes(slot.id) || key.includes(time.replace(/[:\s]/g, ''))
    );
    
    return conflictKeys.flatMap(key => conflicts.get(key) || []);
  };

  const canEdit = user && canEditTimetable(timetableId.toString(), '1'); // Assuming department ID 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Timetable Editor</h2>
          <p className="text-muted-foreground">
            {isReadOnly ? 'View-only mode' : 'Drag and drop classes to reschedule'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Alert className="w-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Unsaved changes</AlertDescription>
            </Alert>
          )}
          {!isReadOnly && canEdit && (
            <Button onClick={saveChanges} disabled={!hasUnsavedChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Conflict Summary */}
      {conflicts.size > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {conflicts.size} conflicts detected. Click on highlighted classes to view details.
          </AlertDescription>
        </Alert>
      )}

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {/* Header row */}
            <div className="font-semibold p-2 text-center">Time</div>
            {days.map(day => (
              <div key={day} className="font-semibold p-2 text-center">
                {day}
              </div>
            ))}

            {/* Time rows */}
            {times.map(time => (
              <React.Fragment key={time}>
                <div className="p-2 text-sm font-medium bg-muted text-center">
                  {time}
                </div>
                {days.map(day => {
                  const key = `${day}-${time}`;
                  const cls = timetableGrid.get(key);
                  const slotConflicts = getSlotConflicts(day, time);
                  const hasConflicts = slotConflicts.length > 0;

                  return (
                    <div
                      key={key}
                      className={`min-h-[80px] border-2 border-dashed transition-colors p-2 ${
                        dragOverSlot === key 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-muted'
                      } ${!isReadOnly ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                      onDragOver={(e) => handleDragOver(e, day, time)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, time)}
                    >
                      {cls ? (
                        <div
                          draggable={!isReadOnly && canEdit}
                          onDragStart={() => handleDragStart(cls, day, time)}
                          onClick={() => handleClassClick(cls)}
                          className={`h-full rounded-lg p-2 text-xs cursor-pointer transition-all hover:shadow-md ${
                            hasConflicts
                              ? 'bg-red-100 border-2 border-red-300 text-red-800'
                              : cls.class_type === 'lab'
                              ? 'bg-blue-100 border-2 border-blue-300 text-blue-800'
                              : 'bg-green-100 border-2 border-green-300 text-green-800'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="font-semibold truncate">
                              {getSubjectName(cls.subject_id)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">{getFacultyName(cls.faculty_id)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{getClassroomName(cls.classroom_id)}</span>
                            </div>
                            <Badge
                              variant={cls.class_type === 'lab' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {cls.class_type}
                            </Badge>
                            {hasConflicts && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className="h-3 w-3 text-red-600" />
                                <span className="text-xs text-red-600">Conflict</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                          {!isReadOnly && canEdit ? 'Drop here' : 'Free'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Select
                  value={selectedClass.subject_id.toString()}
                  onValueChange={(value) => {
                    setSelectedClass({ ...selectedClass, subject_id: parseInt(value) });
                    setHasUnsavedChanges(true);
                  }}
                  disabled={isReadOnly || !canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Faculty</Label>
                <Select
                  value={selectedClass.faculty_id.toString()}
                  onValueChange={(value) => {
                    setSelectedClass({ ...selectedClass, faculty_id: parseInt(value) });
                    setHasUnsavedChanges(true);
                  }}
                  disabled={isReadOnly || !canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {faculty.map(fac => (
                      <SelectItem key={fac.id} value={fac.id.toString()}>
                        {fac.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Classroom</Label>
                <Select
                  value={selectedClass.classroom_id.toString()}
                  onValueChange={(value) => {
                    setSelectedClass({ ...selectedClass, classroom_id: parseInt(value) });
                    setHasUnsavedChanges(true);
                  }}
                  disabled={isReadOnly || !canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map(room => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        {room.room_number} (Capacity: {room.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Class Type</Label>
                <Select
                  value={selectedClass.class_type}
                  onValueChange={(value: 'lecture' | 'lab') => {
                    setSelectedClass({ ...selectedClass, class_type: value });
                    setHasUnsavedChanges(true);
                  }}
                  disabled={isReadOnly || !canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Lecture</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                {!isReadOnly && canEdit && (
                  <Button
                    onClick={() => {
                      if (onClassUpdated) onClassUpdated(selectedClass);
                      // Update the grid
                      const slot = timeSlots.find(s => s.id === selectedClass.time_slot_id.toString());
                      if (slot) {
                        const key = `${slot.day}-${slot.time}`;
                        const newGrid = new Map(timetableGrid);
                        newGrid.set(key, selectedClass);
                        setTimetableGrid(newGrid);
                        detectConflicts(newGrid);
                      }
                      setIsEditDialogOpen(false);
                    }}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}