import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Bot, Users, Book, Calendar, Sparkles, CheckCircle, Send, FileCheck, Download, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TimetableChatbot from '@/components/timetable/TimetableChatbot';
import AITimetableGrid from '../components/timetable/AITimetableGrid';
import { NewGenerationButton } from '@/components/creator/NewGenerationButton';
import useTheme from '@/hooks/use-theme';
import { TimetableStore, type GeneratedTimetable, type TimetableEntry } from '@shared/timetable-store';

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

interface TimeSlot {
  id: string;
  day: string;
  time: string;
  period: number;
}

interface TimetableSlot {
  id: string;
  faculty?: Faculty;
  subject?: Subject;
  classroom?: string;
  batch?: string;
  conflicts?: string[];
}

const AITimetableCreator: React.FC = () => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [timetableData, setTimetableData] = useState<Map<string, TimetableSlot>>(new Map());
  const [draggedItem, setDraggedItem] = useState<{ type: 'faculty' | 'subject'; data: Faculty | Subject } | null>(null);
  const [user, setUser] = useState<{ username: string; first_name: string; last_name: string; email: string } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAIMode, setIsAIMode] = useState(true);
  const [gridChangeMessage, setGridChangeMessage] = useState<string>('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const { theme } = useTheme();

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockFaculties: Faculty[] = [
      { id: '1', name: 'Dr. Manoj V. Bramhe', department: 'Computer Science', email: 'manoj.bramhe@example.com', specialization: 'Data Structures and Algorithms' },
      { id: '2', name: 'Dr. Sunil M. Wanjari', department: 'Computer Science', email: 'sunil.wanjari@example.com', specialization: 'Database Management Systems' },
      { id: '3', name: 'Dr. Dipak W. Wajgi', department: 'Computer Science', email: 'dipak.wajgi@example.com', specialization: 'Computer Networks' },
      { id: '4', name: 'Dr. Komal K. Gehani', department: 'Computer Science', email: 'komal.gehani@example.com', specialization: 'Operating Systems' },
      { id: '5', name: 'Dr. Pallavi M. Wankhede', department: 'Computer Science', email: 'pallavi.wankhede@example.com', specialization: 'Software Engineering' },
      { id: '6', name: 'Mr. Vaibhav V. Deshpande', department: 'Computer Science', email: 'vaibhav.deshpande@example.com', specialization: 'Web Technologies' },
      { id: '7', name: 'Dr. Reema C. Roychaudhary', department: 'Computer Science', email: 'reema.roychaudhary@example.com', specialization: 'Machine Learning' },
      { id: '8', name: 'Dr. Yogesh G. Golhar', department: 'Computer Science', email: 'yogesh.golhar@example.com', specialization: 'Computer Architecture' },
      { id: '9', name: 'Mr. Roshan R. Kotkondawar', department: 'Computer Science', email: 'roshan.kotkondawar@example.com', specialization: 'Digital Circuits' },
      { id: '10', name: 'Dr. Kapil O. Gupta', department: 'Computer Science', email: 'kapil.gupta@example.com', specialization: 'Artificial Intelligence' },
      { id: '11', name: 'Mr. Dhiraj R. Gupta', department: 'Computer Science', email: 'dhiraj.gupta@example.com', specialization: 'Theory of Computation' },
      { id: '12', name: 'Ms. Yogita B. Nikhare', department: 'Computer Science', email: 'yogita.nikhare@example.com', specialization: 'Object Oriented Programming' },
      { id: '13', name: 'Mr. Ansar Shaikh', department: 'Computer Science', email: 'ansar.shaikh@example.com', specialization: 'Data Communication' },
      { id: '14', name: 'Ms. Priti V. Bhagat', department: 'Computer Science', email: 'priti.bhagat@example.com', specialization: 'Mathematics for Computer Engineering' },
      { id: '15', name: 'Mr. Nilesh S. Korde', department: 'Computer Science', email: 'nilesh.korde@example.com', specialization: 'Design and Analysis of Algorithms' }
    ];

    const mockSubjects: Subject[] = [
      // Semester I
      { id: '1', name: 'Engineering Chemistry', code: '25CE101T', credits: 2, department: 'Computer Science', type: 'Theory' },
      { id: '2', name: 'Engineering Chemistry Lab', code: '25CE101P', credits: 1, department: 'Computer Science', type: 'Lab' },
      { id: '3', name: 'Linear Algebra and Calculus', code: '25CE102T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '4', name: 'Logic building with C', code: '25CE103T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '5', name: 'Logic building with C Lab', code: '25CE103P', credits: 1, department: 'Computer Science', type: 'Lab' },
      
      // Semester II
      { id: '6', name: 'Engineering Physics and Materials Science', code: '25CE201T', credits: 2, department: 'Computer Science', type: 'Theory' },
      { id: '7', name: 'Statistics and Probability', code: '25CE202T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '8', name: 'Problem Solving with Python', code: '25CE203T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '9', name: 'Problem Solving with Python Lab', code: '25CE203P', credits: 1, department: 'Computer Science', type: 'Lab' },
      { id: '10', name: 'Modern Web Technologies', code: '25CE205T', credits: 2, department: 'Computer Science', type: 'Theory' },
      
      // Semester III
      { id: '11', name: 'Mathematics for Computer Engineering', code: '25CE301T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '12', name: 'Data Structure', code: '25CE302T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '13', name: 'Data Structure Lab', code: '25CE302P', credits: 1, department: 'Computer Science', type: 'Lab' },
      { id: '14', name: 'Digital Circuits', code: '25CE303T', credits: 2, department: 'Computer Science', type: 'Theory' },
      { id: '15', name: 'Computer Architecture', code: '25CE304T', credits: 2, department: 'Computer Science', type: 'Theory' },
      
      // Semester IV
      { id: '16', name: 'Data Communication', code: '25CE401T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '17', name: 'Database Management System', code: '25CE402T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '18', name: 'Database Management System Lab', code: '25CE402P', credits: 1, department: 'Computer Science', type: 'Lab' },
      { id: '19', name: 'Object Oriented Programming', code: '25CE403T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '20', name: 'Object Oriented Programming Lab', code: '25CE403P', credits: 1, department: 'Computer Science', type: 'Lab' },
      
      // Semester V
      { id: '21', name: 'Theory of Computation', code: '25CE501T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '22', name: 'Operating System', code: '25CE502T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '23', name: 'Operating System Lab', code: '25CE502P', credits: 1, department: 'Computer Science', type: 'Lab' },
      { id: '24', name: 'Professional Elective - I', code: '25CE503T', credits: 2, department: 'Computer Science', type: 'Theory' },
      { id: '25', name: 'Professional Elective - II', code: '25CE504T', credits: 2, department: 'Computer Science', type: 'Theory' },
      
      // Semester VI
      { id: '26', name: 'Design and Analysis of Algorithms', code: '25CE601T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '27', name: 'Design and Analysis of Algorithms Lab', code: '25CE601P', credits: 1, department: 'Computer Science', type: 'Lab' },
      { id: '28', name: 'Professional Elective -III', code: '25CE602T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '29', name: 'Professional Elective -IV', code: '25CE603T', credits: 3, department: 'Computer Science', type: 'Theory' },
      
      // Semester VII
      { id: '30', name: 'Machine Learning', code: '25CE701T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '31', name: 'Machine Learning Lab', code: '25CE701P', credits: 1, department: 'Computer Science', type: 'Lab' },
      { id: '32', name: 'Professional Elective -VI', code: '25CE702T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '33', name: 'Major Project - I', code: '25CE705P', credits: 3, department: 'Computer Science', type: 'Practical' },
      
      // Semester VIII
      { id: '34', name: 'Professional Elective -IX', code: '25CE801T', credits: 3, department: 'Computer Science', type: 'Theory' },
      { id: '35', name: 'Major Project - II', code: '25CE804P', credits: 6, department: 'Computer Science', type: 'Practical' },
      { id: '36', name: 'Industrial Training', code: '25CE805P', credits: 2, department: 'Computer Science', type: 'Practical' }
    ];

    setFaculties(mockFaculties);
    setSubjects(mockSubjects);
  }, []);

  const handleDragStart = (type: 'faculty' | 'subject', data: Faculty | Subject) => {
    setDraggedItem({ type, data });
  };

  const handleSlotDrop = (slotId: string, faculty?: Faculty, subject?: Subject) => {
    const newData = new Map(timetableData);
    const currentSlot = newData.get(slotId) || { id: slotId };
    
    // Update or remove faculty
    if (faculty) {
      currentSlot.faculty = faculty;
    } else {
      delete currentSlot.faculty;
    }
    
    // Update or remove subject
    if (subject) {
      currentSlot.subject = subject;
    } else {
      delete currentSlot.subject;
    }
    
    // If slot is empty, remove it entirely, otherwise update it
    if (!currentSlot.faculty && !currentSlot.subject && !currentSlot.classroom && !currentSlot.batch) {
      newData.delete(slotId);
    } else {
      newData.set(slotId, currentSlot);
    }
    
    setTimetableData(newData);
    setDraggedItem(null);
  };

  const handleAISuggestion = (suggestion: string) => {
    // Process AI suggestions and update timetable
    console.log('AI Suggestion:', suggestion);
    
    // Handle specific AI suggestions for timetable creation
    if (suggestion.toLowerCase().includes('assign faculty')) {
      setAiSuggestions(prev => [...prev, "Try dragging Dr. John Smith to Monday 9:00-10:00 slot"]);
    } else if (suggestion.toLowerCase().includes('schedule lab')) {
      setAiSuggestions(prev => [...prev, "Labs work best in afternoon slots (2:00-4:00 PM)"]);
    } else if (suggestion.toLowerCase().includes('morning')) {
      setAiSuggestions(prev => [...prev, "Heavy subjects like Data Structures perform better in morning slots"]);
    } else if (suggestion.toLowerCase().includes('conflict')) {
      setAiSuggestions(prev => [...prev, "Check faculty availability before assignment"]);
    }
  };

  // Handle updates from AI chatbot to timetable
  const handleTimetableUpdate = (updates: Map<string, TimetableSlot>) => {
    setIsAIProcessing(true);
    setTimetableData(updates);
    
    // Show AI processing feedback
    setGridChangeMessage('🤖 AI is updating your timetable...');
    
    // Clear the processing state after update
    setTimeout(() => {
      setIsAIProcessing(false);
      setGridChangeMessage('✨ AI has successfully updated your timetable!');
      setTimeout(() => setGridChangeMessage(''), 2000);
    }, 1000);
  };

  // Handle manual changes from grid and notify chatbot
  const handleGridChange = (slotId: string, action: 'add' | 'remove', type: 'faculty' | 'subject', item?: Faculty | Subject) => {
    let message = '';
    const [day, time] = slotId.split('-');
    
    if (action === 'add' && item) {
      if (type === 'faculty') {
        message = `✨ Added ${(item as Faculty).name} to ${day} at ${time}`;
      } else {
        message = `📚 Scheduled ${(item as Subject).name} for ${day} at ${time}`;
      }
    } else if (action === 'remove' && item) {
      if (type === 'faculty') {
        message = `🗑️ Removed ${(item as Faculty).name} from ${day} at ${time}`;
      } else {
        message = `❌ Unscheduled ${(item as Subject).name} from ${day} at ${time}`;
      }
    }
    
    setGridChangeMessage(message);
    
    // Clear the message after a delay
    setTimeout(() => setGridChangeMessage(''), 3000);
  };

  // Handle chatbot acknowledging grid changes
  const handleChatbotGridUpdate = (message: string) => {
    // This will be used to send grid change notifications to the chatbot
    setGridChangeMessage(message);
  };

  // Check if timetable is ready for publishing
  const isTimetableComplete = () => {
    const filledSlots = Array.from(timetableData.values()).filter(slot => slot.faculty && slot.subject);
    return filledSlots.length >= 5; // At least 5 complete assignments
  };

  // Handle publishing to HOD
  const handlePublishToHOD = async () => {
    if (!isTimetableComplete()) {
      setGridChangeMessage('⚠️ Please complete at least 5 faculty-subject assignments before publishing');
      setTimeout(() => setGridChangeMessage(''), 3000);
      return;
    }

    setIsPublishing(true);
    setGridChangeMessage('📤 Preparing timetable for HOD review...');

    try {
      // Simulate API call to submit timetable for HOD approval
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Convert timetableData to TimetableEntry format
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const timeSlots = [
        '9:00-10:00', '10:00-11:00', '11:00-11:20', '11:20-12:20', 
        '12:20-1:20', '1:20-2:20', '2:20-3:20', '3:20-4:20'
      ];
      
      const timetableEntries: TimetableEntry[] = [];
      const filledSlots = Array.from(timetableData.values()).filter(slot => slot.faculty && slot.subject);
      
      // Convert each filled slot to TimetableEntry
      timetableData.forEach((slotData, slotId) => {
        if (slotData.faculty && slotData.subject) {
          const [day, time] = slotId.split('-');
          
          // Skip break slots
          if (time === '11:00-11:20' || time === '1:20-2:20') return;
          
          const entry: TimetableEntry = {
            id: slotId,
            day: day,
            time: time,
            subject: slotData.subject.name,
            faculty: slotData.faculty.name,
            room: slotData.classroom || 'TBA',
            type: slotData.subject.type === 'Lab' || slotData.subject.name.includes('Lab') ? 'lab' : 
                  slotData.subject.type === 'Practical' ? 'tutorial' : 'lecture',
            duration: 60 // Default 1 hour duration
          };
          
          timetableEntries.push(entry);
        }
      });

      // Create the GeneratedTimetable object
      const generatedTimetable: GeneratedTimetable = {
        id: `ai-timetable-${Date.now()}`,
        batchId: 'batch-1', // You might want to get this from user selection
        batchName: `AI Generated Batch - ${new Date().toLocaleDateString()}`,
        creatorId: user?.email || 'ai-assistant',
        creatorName: user ? `${user.first_name} ${user.last_name}` : 'AI Assistant',
        department: 'Computer Science', // You might want to get this from user selection
        academicYear: '2024-25',
        semester: 'Current',
        strategy: 'AI-Generated',
        executionTime: 2000, // 2 seconds simulation
        qualityScore: 0.85, // You could calculate this based on constraints
        generatedAt: new Date().toISOString(),
        sentToPublishersAt: new Date().toISOString(),
        status: 'pending_review',
        timetableData: timetableEntries,
        metrics: {
          cpSatSolutions: 1,
          gaGenerations: 0,
          constraintsSatisfied: Math.floor(timetableEntries.length * 0.85), // 85% satisfaction
          totalConstraints: timetableEntries.length
        }
      };

      // Save to TimetableStore
      const store = TimetableStore.getInstance();
      store.addTimetableForReview(generatedTimetable);
      
      console.log('🎯 AI Timetable saved to publisher review queue:', {
        id: generatedTimetable.id,
        entriesCount: timetableEntries.length,
        batch: generatedTimetable.batchName,
        creator: generatedTimetable.creatorName
      });
      
      setPublishSuccess(true);
      setGridChangeMessage('✅ Timetable successfully submitted to Publisher Review Queue!');
      
      setTimeout(() => {
        setGridChangeMessage('');
        setPublishSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Failed to submit timetable:', error);
      setGridChangeMessage('❌ Failed to submit timetable. Please try again.');
      setTimeout(() => setGridChangeMessage(''), 3000);
    } finally {
      setIsPublishing(false);
    }
  };

  const generateAISuggestions = () => {
    const suggestions = [
      "Schedule Machine Learning lectures in the morning for better concentration",
      "Place practical sessions adjacent to theory classes for the same subject",
      "Avoid scheduling heavy subjects on consecutive periods",
      "Consider faculty availability and specialization matching"
    ];
    setAiSuggestions(suggestions);
  };

  // Export timetable to PDF
  const exportTimetableToPDF = () => {
    if (timetableData.size === 0) {
      alert('No timetable data to export. Please create a timetable first.');
      return;
    }

    // Define the days and time slots
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
      '9:00-10:00', '10:00-11:00', '11:00-11:20', '11:20-12:20', 
      '12:20-1:20', '1:20-2:20', '2:20-3:20', '3:20-4:20'
    ];

    // Get current date for filename
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AI Generated Timetable - ${currentDate}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 20px;
              background: #f8f9fa;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border-radius: 10px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .timetable {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .timetable th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 10px;
              text-align: center;
              font-weight: bold;
              border: 1px solid #dee2e6;
            }
            .timetable td {
              border: 1px solid #dee2e6;
              padding: 8px;
              text-align: center;
              vertical-align: top;
              min-height: 80px;
              position: relative;
            }
            .time-slot {
              background: #f8f9fa;
              font-weight: bold;
              color: #495057;
              font-size: 12px;
            }
            .break-slot {
              background: #fff3cd;
              color: #856404;
              font-style: italic;
              font-weight: bold;
            }
            .class-slot {
              padding: 5px;
              border-radius: 5px;
              margin: 2px;
              min-height: 70px;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .subject-code {
              font-weight: bold;
              font-size: 11px;
              color: #495057;
              margin-bottom: 2px;
            }
            .subject-name {
              font-size: 10px;
              color: #6c757d;
              margin-bottom: 3px;
              line-height: 1.2;
            }
            .faculty-name {
              font-size: 9px;
              color: #495057;
              margin-bottom: 2px;
            }
            .classroom {
              font-size: 8px;
              color: #6c757d;
              background: #e9ecef;
              padding: 1px 4px;
              border-radius: 3px;
              display: inline-block;
            }
            .theory-class {
              background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
              border-left: 4px solid #2196f3;
            }
            .lab-class {
              background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
              border-left: 4px solid #9c27b0;
            }
            .practical-class {
              background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
              border-left: 4px solid #4caf50;
            }
            .stats {
              display: flex;
              justify-content: space-around;
              margin: 20px 0;
              text-align: center;
            }
            .stat-item {
              background: white;
              padding: 15px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              min-width: 120px;
            }
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
            }
            .stat-label {
              font-size: 12px;
              color: #6c757d;
              margin-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding: 15px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              color: #6c757d;
              font-size: 12px;
            }
            @media print {
              body { background: white; }
              .header, .timetable, .stat-item, .footer { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🤖 AI Generated Timetable</h1>
            <p>Department of Computer Engineering • Academic Year 2024-25</p>
            <p>Generated on ${currentDate} • Created by AI Assistant</p>
          </div>
    `;

    // Add statistics
    const filledSlots = Array.from(timetableData.values()).filter(slot => slot.faculty && slot.subject);
    const uniqueFaculty = new Set(filledSlots.map(slot => slot.faculty?.name)).size;
    const uniqueSubjects = new Set(filledSlots.map(slot => slot.subject?.name)).size;
    const labClasses = filledSlots.filter(slot => slot.subject?.type === 'Lab' || slot.subject?.name.includes('Lab')).length;

    htmlContent += `
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">${filledSlots.length}</div>
              <div class="stat-label">Total Classes</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${uniqueFaculty}</div>
              <div class="stat-label">Faculty Assigned</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${uniqueSubjects}</div>
              <div class="stat-label">Subjects Scheduled</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${labClasses}</div>
              <div class="stat-label">Lab Sessions</div>
            </div>
          </div>

          <table class="timetable">
            <thead>
              <tr>
                <th style="width: 120px;">Time / Day</th>
    `;

    // Add day headers
    days.forEach(day => {
      htmlContent += `<th>${day}</th>`;
    });

    htmlContent += `</tr></thead><tbody>`;

    // Add time slot rows
    timeSlots.forEach(timeSlot => {
      htmlContent += `<tr><td class="time-slot">${timeSlot}</td>`;
      
      days.forEach(day => {
        const slotId = `${day}-${timeSlot}`;
        const slotData = timetableData.get(slotId);
        
        // Check if it's a break slot
        if (timeSlot === '11:00-11:20' || timeSlot === '1:20-2:20') {
          htmlContent += `<td class="break-slot">${timeSlot === '11:00-11:20' ? 'Break' : 'Lunch Break'}</td>`;
        } else if (slotData && slotData.faculty && slotData.subject) {
          // Determine class type for styling
          let classType = 'theory-class';
          if (slotData.subject.type === 'Lab' || slotData.subject.name.includes('Lab')) {
            classType = 'lab-class';
          } else if (slotData.subject.type === 'Practical') {
            classType = 'practical-class';
          }
          
          htmlContent += `
            <td>
              <div class="class-slot ${classType}">
                <div class="subject-code">${slotData.subject.code}</div>
                <div class="subject-name">${slotData.subject.name}</div>
                <div class="faculty-name">${slotData.faculty.name}</div>
                <div class="classroom">${slotData.classroom || 'TBA'}</div>
              </div>
            </td>
          `;
        } else {
          htmlContent += `<td style="background: #f8f9fa; color: #adb5bd;">Free</td>`;
        }
      });
      
      htmlContent += `</tr>`;
    });

    htmlContent += `
            </tbody>
          </table>
          
          <div class="footer">
            <p><strong>AI Generated Timetable</strong> • Created with PyGram 2025 Academic Compass</p>
            <p>This timetable was automatically generated using artificial intelligence algorithms</p>
            <p>For any conflicts or adjustments, please contact the academic office</p>
          </div>
        </body>
      </html>
    `;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI-Timetable-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success message
    setGridChangeMessage('📄 Timetable exported successfully! File saved to Downloads.');
    setTimeout(() => setGridChangeMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-r from-primary to-primary/80 rounded-xl shadow-lg dark:shadow-primary/20">
              <Bot className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              AI Timetable Creator
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create your perfect timetable with AI guidance. Drag and drop faculties and subjects, 
            or let the AI assistant help you build an optimized schedule.
          </p>
          
          {/* New Generation Button */}
          <div className="flex justify-center pt-4">
            <NewGenerationButton />
          </div>
        </div>

        {/* AI Mode Toggle */}
        <div className="flex justify-center">
          <div className="bg-card rounded-xl p-2 shadow-lg border border-border">
            <Button
              variant={isAIMode ? "default" : "ghost"}
              onClick={() => setIsAIMode(true)}
              className="rounded-lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Guided
            </Button>
            <Button
              variant={!isAIMode ? "default" : "ghost"}
              onClick={() => setIsAIMode(false)}
              className="rounded-lg"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Manual
            </Button>
          </div>
        </div>

        {/* Visual Feedback for Grid-AI Synchronization */}
        {gridChangeMessage && (
          <div className="flex justify-center">
            <Alert className={`max-w-md animate-in fade-in-0 slide-in-from-top-2 duration-300 ${
              gridChangeMessage.includes('✅') || gridChangeMessage.includes('successfully') 
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                : gridChangeMessage.includes('⚠️') || gridChangeMessage.includes('Failed')
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                : 'bg-primary/10 border-primary/20'
            }`}>
              <Bot className={`h-4 w-4 ${
                gridChangeMessage.includes('✅') || gridChangeMessage.includes('successfully') 
                  ? 'text-green-600 dark:text-green-400' 
                  : gridChangeMessage.includes('⚠️') || gridChangeMessage.includes('Failed')
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-primary'
              }`} />
              <AlertDescription className={
                gridChangeMessage.includes('✅') || gridChangeMessage.includes('successfully') 
                  ? 'text-green-700 dark:text-green-300' 
                  : gridChangeMessage.includes('⚠️') || gridChangeMessage.includes('Failed')
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-primary'
              }>
                {gridChangeMessage}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Timetable Completion Status */}
        {timetableData.size > 0 && (
          <div className="flex justify-center">
            <Card className={`max-w-md transition-all duration-300 ${
              isTimetableComplete() 
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isTimetableComplete() 
                        ? 'bg-green-100 dark:bg-green-900/50' 
                        : 'bg-blue-100 dark:bg-blue-900/50'
                    }`}>
                      {isTimetableComplete() ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className={`font-medium ${
                        isTimetableComplete() 
                          ? 'text-green-900 dark:text-green-100' 
                          : 'text-blue-900 dark:text-blue-100'
                      }`}>
                        {isTimetableComplete() ? 'Ready to Publish!' : 'In Progress'}
                      </h4>
                      <p className={`text-sm ${
                        isTimetableComplete() 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        {Array.from(timetableData.values()).filter(slot => slot.faculty && slot.subject).length} 
                        /{isTimetableComplete() ? 'Complete' : '5 minimum'} assignments
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Export PDF Button */}
                    <Button 
                      onClick={exportTimetableToPDF}
                      size="sm"
                      variant="outline"
                      className="border-blue-300 hover:bg-blue-50 dark:border-blue-600 dark:hover:bg-blue-900/50"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Export PDF
                    </Button>
                    
                    {isTimetableComplete() && (
                      <Button 
                        onClick={handlePublishToHOD}
                        disabled={isPublishing}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Faculty and Subject Selection */}
          <div className="lg:col-span-1 space-y-6">
            {/* Faculty Selection */}
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Faculty
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select onValueChange={(value) => {
                  const faculty = faculties.find(f => f.id === value);
                  setSelectedFaculty(faculty || null);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {faculties.map((faculty) => (
                    <div
                      key={faculty.id}
                      draggable
                      onDragStart={() => handleDragStart('faculty', faculty)}
                      className="p-3 border-2 border-dashed border-primary/30 rounded-lg cursor-move hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 group"
                    >
                      <div className="text-sm font-medium text-foreground group-hover:text-primary">
                        {faculty.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {faculty.specialization}
                      </div>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {faculty.department}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Subject Selection */}
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Book className="h-5 w-5 text-green-500 dark:text-green-400" />
                  Subjects
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select onValueChange={(value) => {
                  const subject = subjects.find(s => s.id === value);
                  setSelectedSubject(subject || null);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      draggable
                      onDragStart={() => handleDragStart('subject', subject)}
                      className="p-3 border-2 border-dashed border-green-300/50 dark:border-green-400/30 rounded-lg cursor-move hover:border-green-400 dark:hover:border-green-400/60 hover:bg-green-50/50 dark:hover:bg-green-900/20 transition-all duration-200 group"
                    >
                      <div className="text-sm font-medium text-foreground group-hover:text-green-700 dark:group-hover:text-green-400">
                        {subject.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {subject.code} • {subject.credits} Credits
                      </div>
                      <Badge 
                        variant={subject.type === 'Lab' ? 'destructive' : 'secondary'} 
                        className="mt-2 text-xs"
                      >
                        {subject.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Suggestions */}
            {isAIMode && (
              <Card className="border-0 shadow-xl bg-gradient-to-br from-muted/30 to-muted/50 dark:from-muted/20 dark:to-muted/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={generateAISuggestions}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    Get AI Recommendations
                  </Button>
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-2 bg-card rounded-lg text-xs border border-border">
                      {suggestion}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content - Timetable Grid (Priority) */}
          <div className="lg:col-span-3">
            {/* Timetable Grid */}
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm relative">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  Timetable Grid
                  {isAIProcessing && (
                    <div className="flex items-center gap-2 text-primary text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-b-transparent"></div>
                      AI Updating...
                    </div>
                  )}
                  <div className="ml-auto text-sm text-muted-foreground">
                    {Array.from(timetableData.values()).filter(slot => slot.faculty && slot.subject).length} assignments
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className={isAIProcessing ? 'opacity-70 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300'}>
                <AITimetableGrid
                  timetableData={timetableData}
                  onSlotDrop={handleSlotDrop}
                  draggedItem={draggedItem}
                  selectedFaculty={selectedFaculty ? [selectedFaculty] : []}
                  selectedSubject={selectedSubject ? [selectedSubject] : []}
                  onGridChange={handleGridChange}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Chatbot Section - Below the main content */}
        {isAIMode && (
          <div className="mt-8">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-muted/30 to-muted/50 dark:from-muted/20 dark:to-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Bot className="h-6 w-6 text-primary" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Check and Publish Buttons */}
                <div className="flex gap-3 p-4 bg-card/50 rounded-lg border border-border">
                  <Button
                    onClick={() => {
                      const filledSlots = Array.from(timetableData.values()).filter(slot => slot.faculty && slot.subject);
                      const message = `📊 **Timetable Check Complete!**\n\n• **Total Assignments**: ${filledSlots.length} slots\n• **Faculty Assigned**: ${new Set(filledSlots.map(slot => slot.faculty?.id)).size} professors\n• **Subjects Scheduled**: ${new Set(filledSlots.map(slot => slot.subject?.id)).size} courses\n• **Status**: ${filledSlots.length >= 5 ? '✅ Ready for HOD' : '⚠️ Needs more assignments'}`;
                      setGridChangeMessage(message);
                      setTimeout(() => setGridChangeMessage(''), 4000);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                    size="lg"
                  >
                    <FileCheck className="h-5 w-5 mr-2" />
                    Check Timetable
                  </Button>

                  <Button
                    onClick={handlePublishToHOD}
                    disabled={!isTimetableComplete() || isPublishing}
                    className={`flex-1 ${
                      isTimetableComplete() 
                        ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white' 
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                    size="lg"
                  >
                    {isPublishing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent mr-2"></div>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Publish to HOD
                      </>
                    )}
                  </Button>
                </div>

                <TimetableChatbot 
                  onSuggestion={handleAISuggestion}
                  timetableData={timetableData}
                  faculties={faculties}
                  subjects={subjects}
                  onTimetableUpdate={handleTimetableUpdate}
                  onGridChange={handleChatbotGridUpdate}
                  onPublishToHOD={handlePublishToHOD}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AITimetableCreator;
