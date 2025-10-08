import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Check,
  BookOpen
} from "lucide-react";
import { useNavigate } from "@/lib/navigation";
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
  classroom?: string;
  batch?: string;
}

interface SemesterTimetableCreatorProps {
  semester: number;
  sessionType?: 'odd' | 'even';
}

// Faculty dummy data - synced with Faculty.tsx
const dummyFaculty = [
  { id: '1', name: 'Dr. Manoj V. Bramhe', department: 'Computer Science', email: 'manoj.bramhe@example.com', specialization: 'Data Structures and Algorithms', employee_id: 'FAC001' },
  { id: '2', name: 'Dr. Sunil M. Wanjari', department: 'Computer Science', email: 'sunil.wanjari@example.com', specialization: 'Database Management Systems', employee_id: 'FAC002' },
  { id: '3', name: 'Dr. Dipak W. Wajgi', department: 'Computer Science', email: 'dipak.wajgi@example.com', specialization: 'Computer Networks', employee_id: 'FAC003' },
  { id: '4', name: 'Dr. Komal K. Gehani', department: 'Computer Science', email: 'komal.gehani@example.com', specialization: 'Operating Systems', employee_id: 'FAC004' },
  { id: '5', name: 'Dr. Pallavi M. Wankhede', department: 'Computer Science', email: 'pallavi.wankhede@example.com', specialization: 'Software Engineering', employee_id: 'FAC005' },
  { id: '6', name: 'Mr. Vaibhav V. Deshpande', department: 'Computer Science', email: 'vaibhav.deshpande@example.com', specialization: 'Web Technologies', employee_id: 'FAC006' },
  { id: '7', name: 'Dr. Reema C. Roychaudhary', department: 'Computer Science', email: 'reema.roychaudhary@example.com', specialization: 'Machine Learning', employee_id: 'FAC007' },
  { id: '8', name: 'Dr. Yogesh G. Golhar', department: 'Computer Science', email: 'yogesh.golhar@example.com', specialization: 'Computer Architecture', employee_id: 'FAC008' },
  { id: '9', name: 'Mr. Roshan R. Kotkondawar', department: 'Computer Science', email: 'roshan.kotkondawar@example.com', specialization: 'Digital Circuits', employee_id: 'FAC009' },
  { id: '10', name: 'Dr. Kapil O. Gupta', department: 'Computer Science', email: 'kapil.gupta@example.com', specialization: 'Artificial Intelligence', employee_id: 'FAC010' },
  { id: '11', name: 'Mr. Dhiraj R. Gupta', department: 'Computer Science', email: 'dhiraj.gupta@example.com', specialization: 'Theory of Computation', employee_id: 'FAC011' },
  { id: '12', name: 'Ms. Yogita B. Nikhare', department: 'Computer Science', email: 'yogita.nikhare@example.com', specialization: 'Object Oriented Programming', employee_id: 'FAC012' },
  { id: '13', name: 'Mr. Ansar Shaikh', department: 'Computer Science', email: 'ansar.shaikh@example.com', specialization: 'Data Communication', employee_id: 'FAC013' },
  { id: '14', name: 'Ms. Priti V. Bhagat', department: 'Computer Science', email: 'priti.bhagat@example.com', specialization: 'Mathematics for Computer Engineering', employee_id: 'FAC014' },
  { id: '15', name: 'Mr. Nilesh S. Korde', department: 'Computer Science', email: 'nilesh.korde@example.com', specialization: 'Design and Analysis of Algorithms', employee_id: 'FAC015' }
];

// Subjects dummy data organized by semester
const dummySubjectsBySemester: Record<number, any[]> = {
  1: [
    { id: 1, course_code: '25CE101T', course_title: 'Engineering Chemistry', semester: 1, credits: 2, course_category: 'BSC' },
    { id: 2, course_code: '25CE101P', course_title: 'Engineering Chemistry Lab', semester: 1, credits: 1, course_category: 'BSC' },
    { id: 3, course_code: '25CE102T', course_title: 'Linear Algebra and Calculus', semester: 1, credits: 3, course_category: 'BSC' },
    { id: 4, course_code: '25CE102P', course_title: 'Linear Algebra and Calculus Lab', semester: 1, credits: 1, course_category: 'BSC' },
    { id: 5, course_code: '25CE103T', course_title: 'Logic building with C', semester: 1, credits: 3, course_category: 'ESC' },
    { id: 6, course_code: '25CE103P', course_title: 'Logic building with C Lab', semester: 1, credits: 1, course_category: 'ESC' },
    { id: 7, course_code: '25CE104T', course_title: 'Competitive Programming - I', semester: 1, credits: 2, course_category: 'ESC' },
    { id: 8, course_code: '25CE105T', course_title: 'Concept in Computer Engineering-I', semester: 1, credits: 2, course_category: 'PCC' },
  ],
  2: [
    { id: 12, course_code: '25CE201T', course_title: 'Engineering Physics and Materials Science', semester: 2, credits: 2, course_category: 'BSC' },
    { id: 13, course_code: '25CE201P', course_title: 'Engineering Physics and Materials Science Lab', semester: 2, credits: 1, course_category: 'BSC' },
    { id: 14, course_code: '25CE202T', course_title: 'Statistics and Probability', semester: 2, credits: 3, course_category: 'BSC' },
    { id: 15, course_code: '25CE202P', course_title: 'Statistics and Probability Lab', semester: 2, credits: 1, course_category: 'BSC' },
    { id: 16, course_code: '25CE203T', course_title: 'Problem Solving with Python', semester: 2, credits: 3, course_category: 'ESC' },
    { id: 17, course_code: '25CE203P', course_title: 'Problem Solving with Python Lab', semester: 2, credits: 1, course_category: 'ESC' },
    { id: 18, course_code: '25CE204T', course_title: 'Competitive Programming - II', semester: 2, credits: 2, course_category: 'ESC' },
    { id: 19, course_code: '25CE205T', course_title: 'Modern Web Technologies', semester: 2, credits: 2, course_category: 'PCC' },
  ],
  3: [
    { id: 23, course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', semester: 3, credits: 3, course_category: 'PCC' },
    { id: 24, course_code: '25CE302T', course_title: 'Data Structure', semester: 3, credits: 3, course_category: 'PCC' },
    { id: 25, course_code: '25CE302P', course_title: 'Data Structure Lab', semester: 3, credits: 1, course_category: 'PCC' },
    { id: 26, course_code: '25CE303T', course_title: 'Digital Circuits', semester: 3, credits: 2, course_category: 'PCC' },
    { id: 27, course_code: '25CE303P', course_title: 'Digital Circuits Lab', semester: 3, credits: 1, course_category: 'PCC' },
    { id: 28, course_code: '25CE304T', course_title: 'Computer Architecture', semester: 3, credits: 2, course_category: 'PCC' },
    { id: 29, course_code: '25CE305P', course_title: 'Computer Lab-I', semester: 3, credits: 1, course_category: 'PCC' },
    { id: 30, course_code: '25ES301T', course_title: 'Constitution of India', semester: 3, credits: 2, course_category: 'VEC' },
  ],
  4: [
    { id: 34, course_code: '25CE401T', course_title: 'Data Communication', semester: 4, credits: 3, course_category: 'PCC' },
    { id: 35, course_code: '25CE402T', course_title: 'Database Management System', semester: 4, credits: 3, course_category: 'PCC' },
    { id: 36, course_code: '25CE402P', course_title: 'Database Management System Lab', semester: 4, credits: 1, course_category: 'PCC' },
    { id: 37, course_code: '25CE403T', course_title: 'Object Oriented Programming', semester: 4, credits: 3, course_category: 'PCC' },
    { id: 38, course_code: '25CE403P', course_title: 'Object Oriented Programming Lab', semester: 4, credits: 1, course_category: 'PCC' },
    { id: 39, course_code: '25ES401T', course_title: 'Environmental Science', semester: 4, credits: 2, course_category: 'VEC' },
    { id: 40, course_code: '25ES402T', course_title: 'Fundamentals of Economics and Management', semester: 4, credits: 2, course_category: 'HSSM' },
    { id: 41, course_code: '25CE441P', course_title: 'Career Development - II', semester: 4, credits: 1, course_category: 'SEC' },
  ],
  5: [
    { id: 44, course_code: '25CE501T', course_title: 'Theory of Computation', semester: 5, credits: 3, course_category: 'PCC' },
    { id: 45, course_code: '25CE502T', course_title: 'Operating System', semester: 5, credits: 3, course_category: 'PCC' },
    { id: 46, course_code: '25CE502P', course_title: 'Operating System Lab', semester: 5, credits: 1, course_category: 'PCC' },
    { id: 47, course_code: '25CE503T', course_title: 'Professional Elective - I', semester: 5, credits: 2, course_category: 'PEC' },
    { id: 48, course_code: '25CE504T', course_title: 'Professional Elective - II', semester: 5, credits: 2, course_category: 'PEC' },
    { id: 49, course_code: '25CE505P', course_title: 'Technical Skill Development - I', semester: 5, credits: 2, course_category: 'VSC' },
    { id: 50, course_code: '25CE541P', course_title: 'English for Engineers', semester: 5, credits: 2, course_category: 'AEC' },
    { id: 51, course_code: '25CE531M', course_title: 'MDM-III (Introduction to Business Management)', semester: 5, credits: 3, course_category: 'MDM' },
  ],
  6: [
    { id: 53, course_code: '25CE601T', course_title: 'Design and Analysis of Algorithms', semester: 6, credits: 3, course_category: 'PCC' },
    { id: 54, course_code: '25CE601P', course_title: 'Design and Analysis of Algorithms Lab', semester: 6, credits: 1, course_category: 'PCC' },
    { id: 55, course_code: '25CE602T', course_title: 'Professional Elective -III', semester: 6, credits: 3, course_category: 'PEC' },
    { id: 56, course_code: '25CE603T', course_title: 'Professional Elective -IV', semester: 6, credits: 3, course_category: 'PEC' },
    { id: 57, course_code: '25CE604T', course_title: 'Professional Elective -V', semester: 6, credits: 3, course_category: 'PEC' },
    { id: 58, course_code: '25CE605P', course_title: 'Technical Skill Development - II', semester: 6, credits: 2, course_category: 'VSC' },
    { id: 59, course_code: '25CE631M', course_title: 'MDM-IV (Principles of Marketing)', semester: 6, credits: 3, course_category: 'MDM' },
    { id: 60, course_code: '25CE6610', course_title: 'Open Elective - II', semester: 6, credits: 2, course_category: 'OE' },
  ],
  7: [
    { id: 61, course_code: '25CE701T', course_title: 'Machine Learning', semester: 7, credits: 3, course_category: 'PCC' },
    { id: 62, course_code: '25CE701P', course_title: 'Machine Learning Lab', semester: 7, credits: 1, course_category: 'PCC' },
    { id: 63, course_code: '25CE702T', course_title: 'Professional Elective -VI', semester: 7, credits: 3, course_category: 'PEC' },
    { id: 64, course_code: '25CE703T', course_title: 'Professional Elective -VII', semester: 7, credits: 3, course_category: 'PEC' },
    { id: 65, course_code: '25CE704T', course_title: 'Professional Elective -VIII', semester: 7, credits: 3, course_category: 'PEC' },
    { id: 66, course_code: '25CE705P', course_title: 'Major Project - I', semester: 7, credits: 3, course_category: 'CEP' },
    { id: 67, course_code: '25CE731M', course_title: 'MDM-V (Project Management)', semester: 7, credits: 3, course_category: 'MDM' },
    { id: 68, course_code: '25CE7610', course_title: 'Open Elective - III', semester: 7, credits: 2, course_category: 'OE' },
  ],
  8: [
    { id: 69, course_code: '25CE801T', course_title: 'Professional Elective -IX', semester: 8, credits: 3, course_category: 'PEC' },
    { id: 70, course_code: '25CE802T', course_title: 'Professional Elective -X', semester: 8, credits: 3, course_category: 'PEC' },
    { id: 71, course_code: '25CE803T', course_title: 'Professional Elective -XI', semester: 8, credits: 3, course_category: 'PEC' },
    { id: 72, course_code: '25CE804P', course_title: 'Major Project - II', semester: 8, credits: 6, course_category: 'CEP' },
    { id: 73, course_code: '25CE805P', course_title: 'Industrial Training', semester: 8, credits: 2, course_category: 'CEP' },
    { id: 74, course_code: '25CE831M', course_title: 'MDM-VI (Financial Management)', semester: 8, credits: 3, course_category: 'MDM' },
    { id: 75, course_code: '25CE8610', course_title: 'Open Elective - IV', semester: 8, credits: 2, course_category: 'OE' },
  ]
};

// Time slots for the timetable
const timeSlots = [
  { time: '9:00-10:00', label: 'Lecture 1' },
  { time: '10:00-11:00', label: 'Lecture 2' },
  { time: '11:00-11:20', label: 'Break', isBreak: true },
  { time: '11:20-12:20', label: 'Lecture 3' },
  { time: '12:20-1:20', label: 'Lecture 4' },
  { time: '1:20-2:20', label: 'Lunch', isBreak: true },
  { time: '2:20-3:20', label: 'Lecture 5' },
  { time: '3:20-4:20', label: 'Lecture 6' }
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const SemesterTimetableCreator: React.FC<SemesterTimetableCreatorProps> = ({
  semester,
  sessionType
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

  const semesterSubjects = dummySubjectsBySemester[semester] || [];

  const getSemesterDisplay = () => {
    const ordinal = semester === 1 ? '1st' : semester === 2 ? '2nd' : semester === 3 ? '3rd' : `${semester}th`;
    return `${ordinal} Semester`;
  };

  const handleGoBack = () => {
    navigate('/timetables');
  };

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

  const handleSlotClick = (day: string, timeSlot: any, slotIndex: number) => {
    if (timeSlot.isBreak) return;
    
    if (selectedFaculty && selectedSubject) {
      const newAssignment: Assignment = {
        id: `${day}-${timeSlot.time}-${Date.now()}`,
        faculty: selectedFaculty,
        subject: selectedSubject,
        timeSlot: { day, time: timeSlot.time, slotIndex },
        classroom: 'BF-01', // Default classroom
        batch: 'A1' // Default batch
      };

      const conflictList = checkConflicts(newAssignment);
      if (conflictList.length > 0) {
        setConflicts(conflictList);
        toast({
          title: "Scheduling Conflict",
          description: conflictList[0],
          variant: "destructive",
        });
        return;
      }

      setAssignments(prev => [...prev, newAssignment]);
      setConflicts([]);
      
      toast({
        title: "Class Scheduled",
        description: `${selectedSubject.course_title} assigned to ${selectedFaculty.name}`,
      });
    } else {
      toast({
        title: "Selection Required",
        description: "Please select both faculty and subject first",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    toast({
      title: "Assignment Removed",
      description: "Class assignment has been removed",
    });
  };

  const getSlotAssignment = (day: string, time: string) => {
    return assignments.find(a => a.timeSlot.day === day && a.timeSlot.time === time);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {sessionType === 'odd' ? (
                <Sun className="h-8 w-8 text-orange-500" />
              ) : (
                <Snowflake className="h-8 w-8 text-blue-500" />
              )}
              <div>
                <h1 className="text-3xl font-bold">{getSemesterDisplay()} Timetable</h1>
                <p className="text-muted-foreground">After Summer Session • Academic Year 2024-25</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGoToHOD}>
              <Users className="h-4 w-4 mr-2" />
              Go to HOD Review
            </Button>
            <Button onClick={handleSaveTimetable} disabled={isSaving} className="bg-blue-500 hover:bg-blue-600">
              {isSaving ? (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Timetable
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex gap-4 items-center bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span>Faculty:</span>
            {selectedFaculty ? (
              <Badge variant="default">{selectedFaculty.name}</Badge>
            ) : (
              <span className="text-muted-foreground">Click to select faculty</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4" />
            <span>Subject:</span>
            {selectedSubject ? (
              <Badge variant="default">{selectedSubject.course_title}</Badge>
            ) : (
              <span className="text-muted-foreground">Click to select subject</span>
            )}
          </div>
          
          {conflicts.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Select both faculty and subject first</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Faculty Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Faculty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={(value) => setSelectedFaculty(dummyFaculty.find(f => f.id === value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Faculty" />
                </SelectTrigger>
                <SelectContent>
                  {dummyFaculty.map(faculty => (
                    <SelectItem key={faculty.id} value={faculty.id}>
                      <div>
                        <div className="font-medium">{faculty.name}</div>
                        <div className="text-sm text-muted-foreground">{faculty.specialization}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedFaculty && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="font-medium">{selectedFaculty.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedFaculty.specialization}</div>
                  <Badge variant="secondary" className="mt-2">{selectedFaculty.department}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subjects Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={(value) => setSelectedSubject(semesterSubjects.find(s => s.id.toString() === value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {semesterSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      <div>
                        <div className="font-medium">{subject.course_title}</div>
                        <div className="text-sm text-muted-foreground">{subject.course_code} • {subject.credits} credits</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedSubject && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="font-medium">{selectedSubject.course_title}</div>
                  <div className="text-sm text-muted-foreground">{selectedSubject.course_code}</div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{selectedSubject.credits} credits</Badge>
                    <Badge variant="outline">{selectedSubject.course_category}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timetable Grid */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Weekly Class Schedule</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Department of Computer Engineering • Academic Year 2024-25
                </p>
              </div>
              <Badge variant="secondary">{assignments.length} assignments</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-muted text-left min-w-[100px]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>TIME</span>
                        </div>
                      </th>
                      {days.map(day => (
                        <th key={day} className="border p-2 bg-muted text-center min-w-[120px]">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((timeSlot, index) => (
                      <tr key={index}>
                        <td className="border p-2 font-medium bg-muted/50">
                          <div className="text-xs text-muted-foreground">{timeSlot.time}</div>
                          <div className="text-sm">{timeSlot.label}</div>
                        </td>
                        {days.map((day) => {
                          const assignment = getSlotAssignment(day, timeSlot.time);
                          
                          return (
                            <td key={day} className="border p-2 h-20 relative group">
                              {timeSlot.isBreak ? (
                                <div className="text-center text-orange-600 font-medium">
                                  {timeSlot.label === 'Break' ? '☕ Break' : '🍽️ Lunch'}
                                </div>
                              ) : assignment ? (
                                <div className="bg-blue-50 border border-blue-200 rounded p-2 h-full relative group">
                                  <button
                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3 text-red-500" />
                                  </button>
                                  <div className="text-xs font-medium text-blue-900">{assignment.subject.course_code}</div>
                                  <div className="text-xs text-blue-700 mt-1">{assignment.faculty.name.split(' ').slice(-1)[0]}</div>
                                  <div className="text-xs text-blue-600 mt-1">{assignment.classroom || 'BF-01'}</div>
                                </div>
                              ) : (
                                <div 
                                  className="h-full flex items-center justify-center text-muted-foreground hover:bg-accent/50 rounded cursor-pointer transition-colors"
                                  onClick={() => handleSlotClick(day, timeSlot, index)}
                                >
                                  <div className="text-center">
                                    <div className="text-xs mb-1">Drop</div>
                                    <div className="text-xs">faculty/subject</div>
                                    <div className="text-xs">or click to assign</div>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SemesterTimetableCreator;
