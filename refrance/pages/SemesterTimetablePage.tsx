import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Sun, 
  Snowflake, 
  GraduationCap, 
  ChevronDown,
  Users,
  Save,
  Plus,
  X,
  Clock,
  AlertTriangle,
  Check
} from "lucide-react";
import { TimetableGrid } from "@/features/timetable/TimetableGrid";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface TimeSlot {
  day: string;
  time: string;
  slotIndex: number;
}

interface Assignment {
  id: string;
  faculty: any;
  subject: any;
  timeSlot: TimeSlot;
}

interface SemesterTimetablePageProps {
  sessionType: 'odd' | 'even';
  semester: string;
  onBack: () => void;
}

export const SemesterTimetablePage: React.FC<SemesterTimetablePageProps> = ({
  sessionType,
  semester,
  onBack
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: 'faculty' | 'subject', item: any } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const handleGoToHOD = () => {
    navigate('/hod-review');
  };

  const handleSaveTimetable = async () => {
    setIsSaving(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Timetable Saved",
        description: `${getSemesterDisplay()} timetable has been saved successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save timetable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const checkConflicts = useCallback((newAssignment: Assignment) => {
    const newConflicts: string[] = [];
    
    assignments.forEach(assignment => {
      if (assignment.timeSlot.day === newAssignment.timeSlot.day && 
          assignment.timeSlot.time === newAssignment.timeSlot.time) {
        // Faculty conflict
        if (assignment.faculty.id === newAssignment.faculty.id) {
          newConflicts.push(`Faculty ${assignment.faculty.name} is already assigned at ${assignment.timeSlot.day} ${assignment.timeSlot.time}`);
        }
      }
    });
    
    return newConflicts;
  }, [assignments]);

  const handleAssignClass = useCallback((faculty: any, subject: any, timeSlot: TimeSlot) => {
    const newAssignment: Assignment = {
      id: `${faculty.id}-${subject.id}-${timeSlot.day}-${timeSlot.slotIndex}`,
      faculty,
      subject,
      timeSlot
    };

    const conflictMessages = checkConflicts(newAssignment);
    
    if (conflictMessages.length > 0) {
      toast({
        title: "Scheduling Conflict",
        description: conflictMessages[0],
        variant: "destructive",
      });
      return;
    }

    setAssignments(prev => [...prev, newAssignment]);
    toast({
      title: "Class Assigned",
      description: `${subject.name} with ${faculty.name} assigned to ${timeSlot.day} ${timeSlot.time}`,
    });
  }, [checkConflicts, toast]);

  const handleRemoveAssignment = useCallback((assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    toast({
      title: "Class Removed",
      description: "Assignment has been removed from the timetable.",
    });
  }, [toast]);

  const handleDragStart = (type: 'faculty' | 'subject', item: any) => {
    setDraggedItem({ type, item });
  };

  const handleDragOver = (e: React.DragEvent, timeSlot?: TimeSlot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (timeSlot) {
      setDragOverSlot(`${timeSlot.day}-${timeSlot.slotIndex}`);
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, timeSlot: TimeSlot) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    if (!draggedItem) {
      toast({
        title: "No Item Selected",
        description: "Please drag a faculty or subject to assign.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if the time slot is a break or lunch
    const isBreakSlot = timeSlot.slotIndex === 2; // 11:00-11:20 break
    const isLunchSlot = timeSlot.slotIndex === 5; // 1:20-2:20 lunch
    
    if (isBreakSlot || isLunchSlot) {
      toast({
        title: "Invalid Time Slot",
        description: "Cannot assign classes during break or lunch time.",
        variant: "destructive",
      });
      setDraggedItem(null);
      return;
    }
    
    if (draggedItem.type === 'faculty' && selectedSubject) {
      handleAssignClass(draggedItem.item, selectedSubject, timeSlot);
    } else if (draggedItem.type === 'subject' && selectedFaculty) {
      handleAssignClass(selectedFaculty, draggedItem.item, timeSlot);
    } else if (draggedItem.type === 'faculty' && !selectedSubject) {
      toast({
        title: "Select a Subject First",
        description: `You've dragged "${draggedItem.item.name}". Now please click on a subject from the Subjects panel, then try dragging again.`,
        variant: "destructive",
      });
    } else if (draggedItem.type === 'subject' && !selectedFaculty) {
      toast({
        title: "Select a Faculty First", 
        description: `You've dragged "${draggedItem.item.name}". Now please click on a faculty member from the Faculty panel, then try dragging again.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Selection Required",
        description: "Please select both a faculty member and a subject before dragging.",
        variant: "destructive",
      });
    }
    
    setDraggedItem(null);
  };

  const getAssignmentForSlot = (day: string, slotIndex: number) => {
    return assignments.find(a => a.timeSlot.day === day && a.timeSlot.slotIndex === slotIndex);
  };

  const isOddSession = sessionType === 'odd';
  const SessionIcon = isOddSession ? Sun : Snowflake;
  
  const sessionInfo = {
    title: isOddSession ? 'After Summer Session' : 'Winter/Spring Session',
    subtitle: isOddSession ? 'Odd Semesters' : 'Even Semesters',
  };

  const getSemesterDisplay = () => {
    if (semester === 'all') {
      return `All ${sessionInfo.subtitle}`;
    }
    return `${semester}${semester === '1' || semester === '21' || semester === '31' ? 'st' : semester === '2' || semester === '22' ? 'nd' : semester === '3' || semester === '23' ? 'rd' : 'th'} Semester`;
  };

  // Mock data for faculty and subjects (replace with actual API calls)
  const mockFaculty = [
    { id: 1, name: "Prof. Aarav Sharma", subject: "Data Structures and Algorithms", department: "Computer Engineering" },
    { id: 2, name: "Prof. Kiara Singh", subject: "Computer Networks", department: "Computer Engineering" },
    { id: 3, name: "Prof. Rohan Kumar", subject: "Database Management", department: "Computer Engineering" },
  ];

  const mockSubjects = [
    { id: 1, name: "Data Structures and Algorithms", code: "CE401", credits: 4, type: "Theory" },
    { id: 2, name: "Computer Networks", code: "CE402", credits: 3, type: "Theory" },
    { id: 3, name: "Database Management", code: "CE403", credits: 4, type: "Practical" },
  ];

  const mockClasses = []; // Empty for now

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-3">
              <SessionIcon className={`h-6 w-6 ${isOddSession ? 'text-orange-600' : 'text-blue-600'}`} />
              <div>
                <h1 className="text-2xl font-bold">{getSemesterDisplay()} Timetable</h1>
                <p className="text-sm text-muted-foreground">
                  {sessionInfo.title} • Academic Year 2024-25
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleGoToHOD}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Go to HOD Review
            </Button>
            <Button 
              onClick={handleSaveTimetable}
              disabled={isSaving || assignments.length === 0}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Timetable
                </>
              )}
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              {assignments.length} assignments
            </Badge>
          </div>
        </div>

        {/* Selection Status Indicator */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Faculty:</span>
                {selectedFaculty ? (
                  <Badge variant="default" className="bg-primary">
                    {selectedFaculty.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Click to select faculty</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Subject:</span>
                {selectedSubject ? (
                  <Badge variant="default" className="bg-green-600">
                    {selectedSubject.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Click to select subject</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {selectedFaculty && selectedSubject ? (
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <Check className="h-4 w-4" />
                  Ready to drag & drop!
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  Select both faculty and subject first
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Faculty and Subjects */}
          <div className="col-span-3 space-y-6">
            {/* Faculty Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Faculty
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-left h-auto p-2"
                    onClick={() => setSelectedFaculty(null)}
                  >
                    <div className="text-sm font-medium">Select Faculty</div>
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </Button>
                  
                  {mockFaculty.map((faculty) => (
                    <div 
                      key={faculty.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        handleDragStart('faculty', faculty);
                      }}
                      onDragEnd={() => setDraggedItem(null)}
                      className={`p-3 rounded-lg border-2 border-dashed cursor-move transition-colors hover:shadow-md ${
                        selectedFaculty?.id === faculty.id 
                          ? 'border-primary bg-primary/5' 
                          : draggedItem?.type === 'faculty' && draggedItem?.item?.id === faculty.id
                            ? 'border-primary bg-primary/10 opacity-50'
                            : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedFaculty(faculty)}
                    >
                      <div className="font-medium text-sm">{faculty.name}</div>
                      <div className="text-xs text-muted-foreground">{faculty.subject}</div>
                      <div className="text-xs text-muted-foreground">{faculty.department}</div>
                      {selectedFaculty?.id === faculty.id && (
                        <Badge variant="default" className="mt-2 text-xs">Selected</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Subjects Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-green-600" />
                  Subjects
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-left h-auto p-2"
                    onClick={() => setSelectedSubject(null)}
                  >
                    <div className="text-sm font-medium">Select Subject</div>
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </Button>
                  
                  {mockSubjects.map((subject) => (
                    <div 
                      key={subject.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        handleDragStart('subject', subject);
                      }}
                      onDragEnd={() => setDraggedItem(null)}
                      className={`p-3 rounded-lg border-2 border-dashed cursor-move transition-colors hover:shadow-md ${
                        selectedSubject?.id === subject.id 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                          : draggedItem?.type === 'subject' && draggedItem?.item?.id === subject.id
                            ? 'border-green-500 bg-green-50/50 opacity-50'
                            : 'border-muted hover:border-green-500/50'
                      }`}
                      onClick={() => setSelectedSubject(subject)}
                    >
                      <div className="font-medium text-sm">{subject.name}</div>
                      <div className="text-xs text-muted-foreground">{subject.code} • {subject.credits} Credits</div>
                      <div className="text-xs">
                        <Badge variant="outline" className="text-xs">{subject.type}</Badge>
                        {selectedSubject?.id === subject.id && (
                          <Badge variant="default" className="ml-2 text-xs">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Timetable Grid */}
          <div className="col-span-9">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    Weekly Class Schedule
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Department of Computer Engineering • Academic Year 2024-25
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Time Headers */}
                <div className="grid grid-cols-10 gap-1 mb-4">
                  <div className="p-2 bg-muted rounded text-center font-semibold text-sm">
                    DAYS<br />
                    <span className="text-xs text-red-500">⏰ TIME</span>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <div className="font-semibold text-sm">9:00-10:00</div>
                    <div className="text-xs text-muted-foreground">Lecture 1</div>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <div className="font-semibold text-sm">10:00-11:00</div>
                    <div className="text-xs text-muted-foreground">Lecture 2</div>
                  </div>
                  <div className="p-2 bg-orange-100 rounded text-center">
                    <div className="font-semibold text-sm text-orange-600">11:00-11:20</div>
                    <div className="text-xs text-orange-600">Break</div>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <div className="font-semibold text-sm">11:20-12:20</div>
                    <div className="text-xs text-muted-foreground">Lecture 3</div>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <div className="font-semibold text-sm">12:20-1:20</div>
                    <div className="text-xs text-muted-foreground">Lecture 4</div>
                  </div>
                  <div className="p-2 bg-orange-100 rounded text-center">
                    <div className="font-semibold text-sm text-orange-600">1:20-2:20</div>
                    <div className="text-xs text-orange-600">Lunch Break</div>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <div className="font-semibold text-sm">2:20-3:20</div>
                    <div className="text-xs text-muted-foreground">Lecture 5</div>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <div className="font-semibold text-sm">3:20-4:20</div>
                    <div className="text-xs text-muted-foreground">Lecture 6</div>
                  </div>
                </div>

                {/* Timetable Grid */}
                <div className="space-y-1">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                    <div key={day} className="grid grid-cols-10 gap-1">
                      <div className="p-4 bg-muted rounded flex flex-col justify-center">
                        <div className="font-semibold text-sm">{day}</div>
                        {day === 'Monday' && <div className="text-xs text-muted-foreground">Today</div>}
                      </div>
                      
                      {/* Time Slots */}
                      {[
                        { time: '9:00-10:00', slotIndex: 0 },
                        { time: '10:00-11:00', slotIndex: 1 },
                        { time: '11:00-11:20', slotIndex: 2, isBreak: true },
                        { time: '11:20-12:20', slotIndex: 3 },
                        { time: '12:20-1:20', slotIndex: 4 },
                        { time: '1:20-2:20', slotIndex: 5, isLunch: true },
                        { time: '2:20-3:20', slotIndex: 6 },
                        { time: '3:20-4:20', slotIndex: 7 }
                      ].map((slot) => {
                        const assignment = getAssignmentForSlot(day, slot.slotIndex);
                        const timeSlot: TimeSlot = { day, time: slot.time, slotIndex: slot.slotIndex };
                        
                        if (slot.isBreak || slot.isLunch) {
                          return (
                            <div key={slot.slotIndex} className="p-4 bg-orange-100 rounded-lg min-h-[80px] flex flex-col justify-center items-center text-center">
                              <div className="text-orange-500 text-sm font-medium">
                                {slot.isBreak ? '⏰ Break' : '🍽️ Lunch Break'}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={slot.slotIndex} 
                            className={`p-2 border-2 border-dashed rounded-lg min-h-[80px] flex flex-col justify-center items-center text-center transition-all ${
                              assignment 
                                ? 'border-solid border-primary bg-primary/5' 
                                : dragOverSlot === `${day}-${slot.slotIndex}`
                                  ? 'border-primary bg-primary/10 border-solid shadow-md'
                                  : 'border-muted hover:border-primary/50 cursor-pointer'
                            }`}
                            onDragOver={(e) => handleDragOver(e, timeSlot)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, timeSlot)}
                            onClick={() => {
                              if (selectedFaculty && selectedSubject && !assignment) {
                                handleAssignClass(selectedFaculty, selectedSubject, timeSlot);
                              }
                            }}
                          >
                            {assignment ? (
                              <div className="w-full">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-medium text-sm text-primary truncate">
                                    {assignment.subject.name}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveAssignment(assignment.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {assignment.faculty.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {assignment.subject.code}
                                </div>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {assignment.subject.type}
                                </Badge>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-sm">
                                {selectedFaculty && selectedSubject ? (
                                  <div>
                                    <Plus className="h-6 w-6 mx-auto mb-1" />
                                    <div className="text-xs">Click to assign</div>
                                    <div className="text-xs font-medium mt-1">
                                      {selectedSubject.code}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div>Drop faculty/</div>
                                    <div>subject</div>
                                    <div className="text-xs mt-1">or select both</div>
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

                {/* Assignment Summary */}
                {assignments.length > 0 && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Assignment Summary ({assignments.length} total)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="text-sm p-2 bg-background rounded border">
                          <div className="font-medium">{assignment.subject.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {assignment.faculty.name} • {assignment.timeSlot.day} {assignment.timeSlot.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicts Warning */}
                {conflicts.length > 0 && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-semibold">Scheduling Conflicts Detected</span>
                    </div>
                    <ul className="text-sm text-destructive/80 space-y-1">
                      {conflicts.map((conflict, index) => (
                        <li key={index}>• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* TimetableGrid Component (hidden for now since no data) */}
                <div className="hidden">
                  <TimetableGrid 
                    classes={mockClasses}
                    highlightConflicts={false}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemesterTimetablePage;