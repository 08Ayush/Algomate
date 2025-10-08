import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users, Book, X, Move, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Faculty {
  id: string;
  name: string;
  department: string;
  email: string;
  specialization?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  department: string;
  type: 'Theory' | 'Lab' | 'Practical';
}

interface TimetableSlot {
  id: string;
  faculty?: Faculty;
  subject?: Subject;
  classroom?: string;
  batch?: string;
  conflicts?: string[];
}

interface AITimetableGridProps {
  timetableData: Map<string, TimetableSlot>;
  onSlotDrop: (slotId: string, faculty?: Faculty, subject?: Subject) => void;
  draggedItem?: { type: 'faculty' | 'subject'; data: Faculty | Subject } | null;
  selectedFaculty?: Faculty[];
  selectedSubject?: Subject[];
  onGridChange?: (slotId: string, action: 'add' | 'remove', type: 'faculty' | 'subject', item: Faculty | Subject) => void;
}

const AITimetableGrid: React.FC<AITimetableGridProps> = ({
  timetableData,
  onSlotDrop,
  draggedItem,
  selectedFaculty = [],
  selectedSubject = [],
  onGridChange
}) => {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<{ slotId: string; data: TimetableSlot } | null>(null);
  const [draggedComponent, setDraggedComponent] = useState<{
    type: 'faculty' | 'subject'; 
    data: Faculty | Subject; 
    sourceSlotId: string;
  } | null>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    { time: '9:00-10:00', type: 'lecture', label: 'Lecture 1' },
    { time: '10:00-11:00', type: 'lecture', label: 'Lecture 2' },
    { time: '11:00-11:20', type: 'break', label: 'Break' },
    { time: '11:20-12:20', type: 'lecture', label: 'Lecture 3' },
    { time: '12:20-1:20', type: 'lecture', label: 'Lecture 4' },
    { time: '1:20-2:20', type: 'break', label: 'Lunch Break' },
    { time: '2:20-3:20', type: 'lecture', label: 'Lecture 5' },
    { time: '3:20-4:20', type: 'lecture', label: 'Lecture 6' }
  ];

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDragOverSlot(slotId);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    // Handle moving individual components (faculty/subject)
    if (draggedComponent) {
      const { type, data, sourceSlotId } = draggedComponent;
      
      // Don't allow dropping on break slots
      const targetTimeSlot = timeSlots.find(ts => slotId.includes(ts.time));
      if (targetTimeSlot && isBreakSlot(targetTimeSlot)) {
        setDraggedComponent(null);
        return;
      }
      
      // Get source and target slot data
      const sourceSlot = timetableData.get(sourceSlotId);
      const targetSlot = timetableData.get(slotId);
      
      if (sourceSlot) {
        // Remove from source slot
        const updatedSourceSlot = { ...sourceSlot };
        if (type === 'faculty') {
          delete updatedSourceSlot.faculty;
        } else {
          delete updatedSourceSlot.subject;
        }
        onSlotDrop(sourceSlotId, updatedSourceSlot.faculty, updatedSourceSlot.subject);
        
        // Add to target slot
        if (type === 'faculty') {
          onSlotDrop(slotId, data as Faculty, targetSlot?.subject);
        } else {
          onSlotDrop(slotId, targetSlot?.faculty, data as Subject);
        }
        
        // Notify about the move
        onGridChange?.(sourceSlotId, 'remove', type, data);
        onGridChange?.(slotId, 'add', type, data);
      }
      
      setDraggedComponent(null);
      return;
    }
    
    // Handle moving entire slot assignments
    if (draggedSlot) {
      const sourceSlotId = draggedSlot.slotId;
      const sourceData = draggedSlot.data;
      
      // Don't allow dropping on break slots
      const targetTimeSlot = timeSlots.find(ts => slotId.includes(ts.time));
      if (targetTimeSlot && isBreakSlot(targetTimeSlot)) {
        setDraggedSlot(null);
        return;
      }
      
      // Handle regular single-slot movement
      const targetData = timetableData.get(slotId);
      
      // Clear source slot
      onSlotDrop(sourceSlotId, undefined, undefined);
      
      // Move to target slot (merge with existing data if any)
      onSlotDrop(slotId, 
        sourceData.faculty || targetData?.faculty, 
        sourceData.subject || targetData?.subject
      );
      
      // Notify about the move
      if (sourceData.faculty) {
        onGridChange?.(sourceSlotId, 'remove', 'faculty', sourceData.faculty);
        onGridChange?.(slotId, 'add', 'faculty', sourceData.faculty);
      }
      if (sourceData.subject) {
        onGridChange?.(sourceSlotId, 'remove', 'subject', sourceData.subject);
        onGridChange?.(slotId, 'add', 'subject', sourceData.subject);
      }
      
      setDraggedSlot(null);
      return;
    }
    
    // Handle external drops (from sidebar)
    if (draggedItem) {
      const currentSlot = timetableData.get(slotId) || { id: slotId };
      
      // Don't allow dropping on break slots
      const targetTimeSlot = timeSlots.find(ts => slotId.includes(ts.time));
      if (targetTimeSlot && isBreakSlot(targetTimeSlot)) {
        return;
      }
      
      if (draggedItem.type === 'faculty') {
        onSlotDrop(slotId, draggedItem.data as Faculty, currentSlot.subject);
        onGridChange?.(slotId, 'add', 'faculty', draggedItem.data);
      } else {
        onSlotDrop(slotId, currentSlot.faculty, draggedItem.data as Subject);
        onGridChange?.(slotId, 'add', 'subject', draggedItem.data);
      }
    }
  };

  const clearSlot = (slotId: string, type?: 'faculty' | 'subject') => {
    console.log('clearSlot called:', { slotId, type });
    const slotData = timetableData.get(slotId);
    console.log('Current slot data:', slotData);
    
    if (!slotData) return;
    
    const updatedSlot = { ...slotData };
    let removedItem: Faculty | Subject | undefined;
    
    if (type === 'faculty' && slotData.faculty) {
      console.log('Removing faculty:', slotData.faculty.name);
      removedItem = slotData.faculty;
      delete updatedSlot.faculty;
    } else if (type === 'subject' && slotData.subject) {
      console.log('Removing subject:', slotData.subject.name);
      removedItem = slotData.subject;
      delete updatedSlot.subject;
    } else if (!type) {
      // Clear entire slot
      if (slotData.faculty) {
        onGridChange?.(slotId, 'remove', 'faculty', slotData.faculty);
      }
      if (slotData.subject) {
        onGridChange?.(slotId, 'remove', 'subject', slotData.subject);
      }
      delete updatedSlot.faculty;
      delete updatedSlot.subject;
    }

    console.log('Updated slot after removal:', updatedSlot);
    onSlotDrop(slotId, updatedSlot.faculty, updatedSlot.subject);
    
    // Notify about the removal
    if (removedItem) {
      onGridChange?.(slotId, 'remove', type!, removedItem);
    }
  };

  const getSlotId = (day: string, time: string) => `${day}-${time}`;

  const isBreakSlot = (timeSlot: { time: string; type: string }) => {
    return timeSlot.type === 'break';
  };

  const handleSlotDragStart = (e: React.DragEvent, slotId: string) => {
    const slotData = timetableData.get(slotId);
    if (slotData && (slotData.faculty || slotData.subject)) {
      setDraggedSlot({ 
        slotId, 
        data: slotData
      });
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleSlotDragEnd = () => {
    setDraggedSlot(null);
  };

  const handleComponentDragStart = (e: React.DragEvent, type: 'faculty' | 'subject', data: Faculty | Subject, sourceSlotId: string) => {
    const sourceTimeSlot = timeSlots.find(ts => sourceSlotId.includes(ts.time));
    
    setDraggedComponent({
      type,
      data,
      sourceSlotId
    });
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); // Prevent slot drag from triggering
  };

  const handleComponentDragEnd = () => {
    setDraggedComponent(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Timetable Header */}
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Weekly Class Schedule
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Department of Computer Engineering • Academic Year 2024-25
        </p>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Header with time slots */}
          <div className="timetable-grid gap-0 border-b border-gray-200 dark:border-gray-700">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 font-bold text-center border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <div>
                <div className="text-sm font-bold">DAYS</div>
                <div className="text-xs text-muted-foreground">⏰ TIME</div>
              </div>
            </div>
            {timeSlots.map((timeSlot, index) => (
              <div 
                key={timeSlot.time}
                className={cn(
                  "p-3 text-center border-r border-gray-200 dark:border-gray-700 font-medium text-sm last:border-r-0",
                  isBreakSlot(timeSlot) 
                    ? "bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300"
                    : "bg-gray-50 dark:bg-gray-800"
                )}
              >
                <div className="font-semibold">{timeSlot.time}</div>
                <div className="text-xs text-muted-foreground mt-1">{timeSlot.label}</div>
              </div>
            ))}
          </div>

          {/* Days and slots */}
          {days.map((day) => (
            <div key={day} className="timetable-grid gap-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              {/* Day label */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 font-bold text-center border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <div>
                  <div className="text-sm font-bold">{day}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short' }) === day.slice(0, 3) ? 'Today' : ''}
                  </div>
                </div>
              </div>

              {/* Time slots for this day */}
              {timeSlots.map((timeSlot) => {
                const slotId = getSlotId(day, timeSlot.time);
                const slotData = timetableData.get(slotId);
                const isBreak = isBreakSlot(timeSlot);
                const isDragOver = dragOverSlot === slotId;
                const canAcceptComponent = draggedComponent && !isBreak;
                
                return (
                  <div
                    key={slotId}
                    className={cn(
                      "min-h-[120px] p-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0 relative transition-all duration-200",
                      isBreak && "bg-orange-50/30 dark:bg-orange-900/10",
                      isDragOver && !isBreak && "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600",
                      isDragOver && isBreak && "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600"
                    )}
                    onDragOver={(e) => !isBreak && handleDragOver(e, slotId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => !isBreak && handleDrop(e, slotId)}
                    draggable={!isBreak && Boolean(slotData?.faculty || slotData?.subject)}
                    onDragStart={(e) => !isBreak && handleSlotDragStart(e, slotId)}
                    onDragEnd={handleSlotDragEnd}
                  >
                    {isBreak ? (
                      <div className="h-full flex items-center justify-center text-orange-600 dark:text-orange-400 text-sm font-medium">
                        <Clock className="h-4 w-4 mr-2" />
                        {timeSlot.label}
                      </div>
                    ) : slotData && (slotData.faculty || slotData.subject) ? (
                      <div className="space-y-2 group relative">
                        {/* Drag handle */}
                        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <div className="bg-primary/20 dark:bg-primary/30 rounded-full p-1">
                            <Move className="h-3 w-3 text-primary" />
                          </div>
                        </div>

                        {/* Faculty assignment */}
                        {slotData.faculty && (
                          <div 
                            draggable
                            onDragStart={(e) => handleComponentDragStart(e, 'faculty', slotData.faculty!, slotId)}
                            onDragEnd={handleComponentDragEnd}
                            className="border rounded-lg p-2 relative group/faculty cursor-move transition-all hover:shadow-md bg-primary/10 dark:bg-primary/20 border-primary/30"
                            onClick={(e) => {
                              // Prevent drag when clicking on content
                              if (e.target !== e.currentTarget) {
                                e.stopPropagation();
                              }
                            }}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute -top-1 -right-1 h-6 w-6 p-0 opacity-60 group-hover/faculty:opacity-100 transition-opacity bg-white dark:bg-gray-800 shadow-sm hover:shadow-md z-20 border border-gray-200 dark:border-gray-600"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Faculty remove clicked for slot:', slotId);
                                clearSlot(slotId, 'faculty');
                              }}
                              style={{ pointerEvents: 'all' }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="flex items-center gap-1 mb-1">
                              <Users className="h-3 w-3 text-primary" />
                              <span className="text-xs font-medium text-primary">Faculty</span>
                            </div>
                            <div className="text-sm font-medium truncate">{slotData.faculty.name}</div>
                          </div>
                        )}

                        {/* Subject assignment */}
                        {slotData.subject && (
                          <div 
                            draggable
                            onDragStart={(e) => handleComponentDragStart(e, 'subject', slotData.subject!, slotId)}
                            onDragEnd={handleComponentDragEnd}
                            className="border rounded-lg p-2 relative group/subject cursor-move transition-all hover:shadow-md bg-secondary/50 dark:bg-secondary/20 border-secondary/50"
                            onClick={(e) => {
                              // Prevent drag when clicking on content
                              if (e.target !== e.currentTarget) {
                                e.stopPropagation();
                              }
                            }}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute -top-1 -right-1 h-6 w-6 p-0 opacity-60 group-hover/subject:opacity-100 transition-opacity bg-white dark:bg-gray-800 shadow-sm hover:shadow-md z-20 border border-gray-200 dark:border-gray-600"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Subject remove clicked for slot:', slotId);
                                clearSlot(slotId, 'subject');
                              }}
                              style={{ pointerEvents: 'all' }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="flex items-center gap-1 mb-1">
                              <Book className="h-3 w-3 text-secondary-foreground" />
                              <span className="text-xs font-medium text-secondary-foreground">Subject</span>
                              <Badge variant="outline" className="text-xs ml-auto">
                                {slotData.subject.credits}cr
                              </Badge>
                            </div>
                            <div className="text-sm font-medium truncate">{slotData.subject.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {slotData.subject.code} • {slotData.subject.type}
                            </div>
                          </div>
                        )}

                        {/* Conflicts indicator */}
                        {slotData.conflicts && slotData.conflicts.length > 0 && (
                          <div className="absolute top-1 left-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        {isDragOver ? (
                          <div className={`font-medium ${canAcceptComponent ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>
                            {draggedComponent 
                              ? `Drop ${draggedComponent.type}`
                              : draggedSlot 
                              ? 'Move here' 
                              : 'Drop here'
                            }
                          </div>
                        ) : (
                          <div className="text-center">
                            <div>Drop faculty/subject</div>
                            <div className="text-xs mt-1">or click to assign</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 dark:bg-primary/20 border-2 border-primary/30 rounded"></div>
            <span className="text-sm text-muted-foreground">Lecture Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-50/50 dark:bg-orange-900/10 border-2 border-orange-200 dark:border-orange-800/50 rounded"></div>
            <span className="text-sm text-muted-foreground">Break Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Conflict</span>
          </div>
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Drag to move</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AITimetableGrid;