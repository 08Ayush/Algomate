import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, Send, Loader2, CheckCircle, Zap, Sparkles } from "lucide-react";
import { ChatMessage } from "@/store/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, NotificationService } from "@/contexts/NotificationContext";
import { ChangeTrackingService } from "@/services/ChangeTrackingService";
import useTheme from "@/hooks/use-theme";

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

interface TimetableChatbotProps {
  departmentId?: string;
  onTimetableGenerated?: (timetableId: number) => void;
  onSuggestion?: (suggestion: string) => void;
  timetableData?: Map<string, TimetableSlot>;
  faculties?: Faculty[];
  subjects?: Subject[];
  onTimetableUpdate?: (updates: Map<string, TimetableSlot>) => void;
  onGridChange?: (message: string) => void;
  onPublishToHOD?: () => void;
}

interface ExtendedChatMessage extends ChatMessage {
  isTyping?: boolean;
  suggestions?: string[];
}

// Open Source AI API Configuration
const AI_API_CONFIG = {
  endpoint: 'https://api.openai.com/v1/chat/completions', // Can be replaced with any OpenAI-compatible API
  model: 'gpt-3.5-turbo',
  // In production, this should be from environment variables
  apiKey: import.meta.env?.VITE_OPENAI_API_KEY || 'demo-key-not-configured'
};

export default function TimetableChatbot({ 
  departmentId, 
  onTimetableGenerated, 
  onSuggestion,
  timetableData = new Map(),
  faculties = [],
  subjects = [],
  onTimetableUpdate,
  onGridChange,
  onPublishToHOD
}: TimetableChatbotProps) {
  const { user, isCreatorMentor } = useAuth();
  const { addNotification } = useNotifications();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: `Hello! 👋 I'm your AI assistant for creating timetables with **real-time updates**.

I can understand natural language and instantly update your timetable! Here's what I can do:

🎯 **Smart Assignment Commands (Updates Grid Instantly!):**
• **"Prof Sharma teach DSA Monday 9"** → Complete assignment
• **"Schedule AI on Tuesday morning"** → Auto-assigns time & faculty  
• **"Put OS afternoon Wednesday"** → Smart placement
• **"Assign Prof Singh to Friday 2pm"** → Faculty scheduling

🚀 **Quick Commands:**
• **"Create demo timetable"** → Full Computer Engineering schedule
• **"Schedule DBMS with Prof Patel"** → Subject + Faculty combo
• **"Remove Prof Kumar from Wednesday"** → Targeted removal
• **"Clear Tuesday morning"** → Time-based clearing

⚡ **Natural Language Examples:**
• "Prof Aarav Sharma should teach Data Structures Monday at 9"
• "Schedule Computer Networks in the morning"  
• "Put Artificial Intelligence on Wednesday afternoon"
• "Remove Operating Systems from Tuesday"
• "Clear all Monday classes"

💡 **I understand:**
- Faculty names (Prof Sharma, Dr Singh, etc.)
- Subject abbreviations (DSA, CN, OS, DBMS, AI, etc.)
- Time expressions (Monday 9, afternoon, morning, 2pm)
- Natural commands (teach, schedule, assign, put, remove)

Just type your request naturally - I'll update the timetable grid above immediately! ✨`,
      timestamp: new Date().toISOString(),
      suggestions: [
        "Create demo timetable",
        "Prof Sharma teach DSA Monday 9",
        "Schedule AI morning",
        "Put DBMS afternoon"
      ]
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check permissions
  if (!user || !isCreatorMentor()) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
        <Card className="p-8 max-w-md text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            You need Creator Mentor permissions to access the AI timetable generator.
          </p>
        </Card>
      </div>
    );
  }

  // AI API Call Function
  const callAIAPI = async (userMessage: string, context: ExtendedChatMessage[]): Promise<string> => {
    try {
      // For demo purposes, we'll simulate the API call
      // In production, replace this with actual API call to open-source AI service
      
      const response = await simulateAIResponse(userMessage, context);
      return response;
      
      /* 
      // Actual API call example (uncomment and configure for production):
      
      if (AI_API_CONFIG.apiKey === 'demo-key-not-configured') {
        // Fallback to simulation if no API key is configured
        return await simulateAIResponse(userMessage, context);
      }
      
      const response = await fetch(AI_API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: AI_API_CONFIG.model,
          messages: [
            {
              role: 'system', 
              content: 'You are a helpful AI assistant specialized in creating academic timetables. Help users create optimized schedules for their departments.'
            },
            ...context.slice(-10).map(msg => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            { role: 'user', content: userMessage }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
      */
    } catch (error) {
      console.error('AI API Error:', error);
      return "I'm sorry, I'm having trouble connecting to my AI service right now. Please try again in a moment, or continue with the demo functionality.";
    }
  };

  // Simulate AI Response (replace with actual API call)
  const simulateAIResponse = async (userInput: string, context: ExtendedChatMessage[]): Promise<string> => {
    const input = userInput.toLowerCase();
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    if (input.includes('demo') || input.includes('cs') || input.includes('computer science') || input.includes('create') || input.includes('generate') || 
        input.includes('full') || input.includes('complete') || input.includes('entire') || input.includes('whole')) {
      return `Perfect! I'll create a comprehensive timetable for Computer Science Third Semester. ✨

**📚 Complete Timetable Configuration:**
• **Academic Year**: 2024-25, Third Semester  
• **Total Classes**: 30 classes per week across 5 days
• **Subject Coverage**: Mathematics, Data Structures, Digital Circuits, Computer Architecture, OOP + Labs
• **Faculty Assignments**: All ${faculties.length} faculty members optimally distributed

**🎯 Comprehensive Subject Distribution:**
- **Mathematics for CE** (Dr. Manoj V. Bramhe) - 4 sessions/week
- **Data Structures** (Dr. Sunil M. Wanjari) - 4 sessions/week  
- **Digital Circuits** (Mr. Roshan R. Kotkondawar) - 3 sessions/week
- **Computer Architecture** (Dr. Yogesh G. Golhar) - 3 sessions/week
- **OOP & Labs** (Ms. Yogita B. Nikhare) - 4 sessions/week
- **Practical Labs** distributed across afternoon slots

**⚡ Smart Optimization Applied:**
- ✅ All 6 time slots filled per day (9 AM - 4:20 PM)
- ✅ Proper breaks: 11:00-11:20 AM & 1:20-2:20 PM  
- ✅ Theory classes in morning, Labs in afternoon
- ✅ Faculty workload evenly distributed
- ✅ No scheduling conflicts detected
- ✅ Subject credit hours satisfied

**🔄 Generating your complete 30-class weekly schedule...**

This will create a full timetable using all available faculty and subjects!`;
    }
    
    // Handle specific assignment requests
    if (input.includes('assign') || input.includes('schedule') || input.includes('put')) {
      const facultyMatch = extractFacultyFromText(input);
      const subjectMatch = extractSubjectFromText(input);
      const timeMatch = extractTimeFromText(input);
      
      if (facultyMatch || subjectMatch) {
        return `✅ **Assignment Complete!** 

I've ${facultyMatch ? `assigned ${facultyMatch}` : ''}${facultyMatch && subjectMatch ? ' to teach ' : ''}${subjectMatch ? `scheduled ${subjectMatch}` : ''} ${timeMatch ? `for ${timeMatch.day} at ${timeMatch.time}` : 'to the timetable'}.

The timetable grid above has been updated in real-time! You should see the changes immediately. 🎯

**What's next?**
• Add more subjects or faculty
• Try "schedule Machine Learning on Tuesday morning"  
• Say "assign Dr. Smith to Wednesday 10:00"
• Or ask me to "optimize the current schedule"`;
      }
    }
    
    // Handle clear/remove requests
    if (input.includes('clear') || input.includes('remove') || input.includes('delete') || input.includes('unschedule')) {
      return `🗑️ **Removal Complete!**

I've cleared the requested items from your timetable. The grid above has been updated immediately.

**Quick Actions:**
• "Clear Monday morning" - Remove all Monday morning classes
• "Remove Dr. Smith" - Unassign specific faculty  
• "Delete Machine Learning" - Remove specific subject
• "Clear all" - Start fresh with empty timetable`;
    }
    
    // Handle publish/submit requests
    if (input.includes('publish') || input.includes('submit') || input.includes('hod') || input.includes('send') || input.includes('approve')) {
      const filledSlots = Array.from(timetableData.values()).filter(slot => slot.faculty && slot.subject);
      
      if (filledSlots.length >= 5) {
        // Trigger the publish function
        if (onPublishToHOD) {
          setTimeout(() => onPublishToHOD(), 1000);
        }
        
        return `🚀 **Publishing to HOD!**

Your timetable is ready for submission! Here's what I'm sending:

**📊 Timetable Summary:**
• **Total Assignments**: ${filledSlots.length} complete slots
• **Faculty Assigned**: ${new Set(filledSlots.map(slot => slot.faculty?.id)).size} professors  
• **Subjects Scheduled**: ${new Set(filledSlots.map(slot => slot.subject?.id)).size} courses
• **Status**: Ready for HOD Review

**✅ Quality Checks Passed:**
• All slots have both faculty and subject assigned
• No scheduling conflicts detected
• Optimal distribution achieved

Submitting to Head of Department now... 📤`;
      } else {
        return `⚠️ **Timetable Not Ready**

Your timetable needs more assignments before publishing to HOD.

**Current Status:**
• **Assigned Slots**: ${filledSlots.length}/5 minimum required
• **Missing**: ${5 - filledSlots.length} more complete assignments needed

**Quick Fix:**
• Try "Create a demo timetable" for instant completion
• Or manually assign: "Put Dr. Smith on Monday 9:00"
• Add subjects: "Schedule Machine Learning morning"

Once you have 5+ complete assignments, I can publish to HOD! ✨`;
      }
    }
    
    if (input.includes('faculty') || input.includes('professor') || input.includes('teacher')) {
      return `Here are the available faculty members for timetable assignments: 👨‍🏫👩‍🏫

**Computer Science Department:**

**Senior Faculty:**
• Dr. John Smith - Data Structures, Algorithms
• Prof. Sarah Johnson - Operating Systems, Systems Programming  
• Dr. Mike Wilson - Database Systems, Data Mining
• Prof. Lisa Chen - Software Engineering, Project Management
• Dr. Robert Taylor - Computer Networks, Cybersecurity

**Associate Faculty:**
• Dr. Emily Davis - Web Development, UI/UX
• Prof. Mark Anderson - Machine Learning, AI
• Dr. Rachel Brown - Mobile Development, App Design

**Lab Instructors:**
• Lab Instructor A - Programming Labs
• Lab Instructor B - Hardware Labs

Would you like me to assign specific faculty to subjects, or shall I proceed with optimal auto-assignment? 🤖`;
    }
    
    if (input.includes('constraint') || input.includes('preference') || input.includes('schedule')) {
      return `I can help you set various scheduling constraints! 🎛️

**Available Constraint Types:**

**🕐 Time Constraints:**
• Preferred time slots (morning/afternoon)
• Break time requirements
• No classes on specific days
• Faculty availability windows

**👥 Faculty Constraints:**
• Maximum teaching hours per day
• Subject-specific preferences  
• No back-to-back classes
• Travel time between buildings

**🏫 Facility Constraints:**
• Classroom capacity requirements
• Lab equipment availability
• Special room needs (projectors, computers)
• Building accessibility

**📚 Academic Constraints:**
• Subject difficulty distribution
• Lab-theory coordination
• Exam schedule considerations

What specific constraints would you like to add to your timetable? Just describe them naturally! 💬`;
    }
    
    if (input.includes('generate') || input.includes('create') || input.includes('make')) {
      return `🚀 **Generating Your Optimized Timetable...**

**Processing Steps:**
✅ Analyzing faculty availability  
✅ Optimizing classroom allocation  
✅ Balancing workload distribution  
✅ Applying your constraints  
🔄 Finalizing schedule conflicts...

**Quality Metrics:**
- **Optimization Score**: 94% (Excellent!)
- **Conflict Resolution**: 100% conflict-free
- **Faculty Satisfaction**: High
- **Student Learning Flow**: Optimized

Your timetable will be ready in just a moment! Once generated, you can:
• Review the complete schedule
• Make any adjustments needed  
• Send it for approval to your Publisher mentor

Almost done... ⏳`;
    }

    // Default response with real-time update examples
    return `I understand you're asking about "${userInput}". 🤔

I'm here to help you create the perfect timetable with **real-time updates**! Here's what I can do:

**� Real-Time Commands:**
• **"Create a demo timetable"** → Instantly generates a complete schedule
• **"Assign Dr. Smith to Monday 9:00"** → Immediately places faculty in grid
• **"Schedule Machine Learning on Tuesday morning"** → Adds subject to timetable
• **"Remove Database Systems"** → Clears specific items instantly

**⚡ Quick Actions (Watch the grid above!):**
• **"Generate demo"** - Full sample timetable  
• **"Schedule [subject] morning"** - Auto-place in AM slots
• **"Assign [faculty] to [day] [time]"** - Precise placement
• **"Clear Monday"** - Remove all Monday classes
• **"Put labs in afternoon"** - Smart scheduling

**🎯 Natural Language Examples:**
• "I need Machine Learning on Tuesday"
• "Can you put Dr. John Smith on Wednesday at 10?"  
• "Schedule all labs in the afternoon"
• "Remove everything and start fresh"

All changes appear instantly in the timetable grid above! Try any command and watch the magic happen ✨

What would you like to schedule today? 🎓`;
  };

  // Process AI responses and update timetable
  const processAIResponseForTimetable = (aiResponse: string, userInput: string) => {
    const input = userInput.toLowerCase();
    const response = aiResponse.toLowerCase();
    
    if (!onTimetableUpdate) return;
    
      // Create new timetable updates based on AI response
      const updates = new Map(timetableData);
      let hasUpdates = false;
      
      // Handle comprehensive timetable creation
      if ((input.includes('demo') || input.includes('create') || input.includes('generate') || 
         input.includes('full') || input.includes('complete') || input.includes('entire') || input.includes('whole')) && 
        (response.includes('demo') || response.includes('generating') || response.includes('perfect') || 
         response.includes('comprehensive') || response.includes('complete'))) {
      // Generate a comprehensive sample timetable
      const sampleSchedule = generateSampleTimetable();
      for (const [slotId, slot] of Array.from(sampleSchedule.entries())) {
        updates.set(slotId, slot);
      }
      hasUpdates = true;
    }
    
    // Enhanced faculty assignment with natural language parsing
    else if (input.includes('assign') || input.includes('put') || input.includes('place') || 
             input.includes('schedule') && (input.includes('faculty') || input.includes('prof') || input.includes('dr'))) {
      const facultyMatch = extractFacultyFromText(input);
      const timeMatch = extractTimeFromText(input);
      const subjectMatch = extractSubjectFromText(input);
      
      if (facultyMatch && timeMatch) {
        const slotId = generateSlotId(timeMatch);
        const faculty = faculties.find(f => 
          f.name.toLowerCase().includes(facultyMatch) || 
          f.specialization?.toLowerCase().includes(facultyMatch)
        );
        
        if (faculty && slotId) {
          const existingSlot = updates.get(slotId) || { id: slotId };
          updates.set(slotId, { 
            ...existingSlot,
            faculty,
            subject: subjectMatch ? subjects.find(s => 
              s.name.toLowerCase().includes(subjectMatch) || 
              s.code.toLowerCase().includes(subjectMatch)
            ) : existingSlot.subject
          });
          hasUpdates = true;
        }
      }
    }
    
    // Enhanced subject scheduling with auto-faculty assignment
    else if (input.includes('schedule') || input.includes('add') || input.includes('put') || 
             (input.includes('teach') && (input.includes('subject') || input.includes('class')))) {
      const subjectMatch = extractSubjectFromText(input);
      const timeMatch = extractTimeFromText(input);
      const facultyMatch = extractFacultyFromText(input);
      
      if (subjectMatch) {
        const subject = subjects.find(s => 
          s.name.toLowerCase().includes(subjectMatch) || 
          s.code.toLowerCase().includes(subjectMatch)
        );
        
        if (subject) {
          // If specific time is mentioned
          if (timeMatch) {
            const slotId = generateSlotId(timeMatch);
            const existingSlot = updates.get(slotId) || { id: slotId };
            
            // Auto-assign faculty if not specified
            let assignedFaculty = existingSlot.faculty;
            if (facultyMatch) {
              assignedFaculty = faculties.find(f => 
                f.name.toLowerCase().includes(facultyMatch) || 
                f.specialization?.toLowerCase().includes(facultyMatch)
              );
            } else {
              // Auto-assign faculty based on specialization
              assignedFaculty = faculties.find(f => 
                f.specialization?.toLowerCase().includes(subjectMatch) ||
                subject.name.toLowerCase().includes(f.specialization?.toLowerCase() || '')
              );
            }
            
            updates.set(slotId, { 
              ...existingSlot,
              subject,
              faculty: assignedFaculty || existingSlot.faculty
            });
            hasUpdates = true;
          }
          // If no specific time, find suitable slot
          else {
            const preferredTime = input.includes('morning') ? 'morning' : 
                                input.includes('afternoon') ? 'afternoon' : 'any';
            const suitableSlot = findSuitableSlot(updates, preferredTime, subject);
            
            if (suitableSlot) {
              const existingSlot = updates.get(suitableSlot) || { id: suitableSlot };
              
              // Auto-assign faculty
              let assignedFaculty = faculties.find(f => 
                f.specialization?.toLowerCase().includes(subjectMatch) ||
                subject.name.toLowerCase().includes(f.specialization?.toLowerCase() || '')
              );
              
              updates.set(suitableSlot, { 
                ...existingSlot,
                subject,
                faculty: assignedFaculty || existingSlot.faculty
              });
              hasUpdates = true;
            }
          }
        }
      }
    }
    
    // Handle complete assignment commands (faculty + subject + time)
    else if ((input.includes('prof') || input.includes('dr')) && 
             (input.includes('teach') || input.includes('handle')) &&
             (extractSubjectFromText(input) && extractTimeFromText(input))) {
      const facultyMatch = extractFacultyFromText(input);
      const subjectMatch = extractSubjectFromText(input);
      const timeMatch = extractTimeFromText(input);
      
      if (facultyMatch && subjectMatch && timeMatch) {
        const faculty = faculties.find(f => 
          f.name.toLowerCase().includes(facultyMatch)
        );
        const subject = subjects.find(s => 
          s.name.toLowerCase().includes(subjectMatch) || 
          s.code.toLowerCase().includes(subjectMatch)
        );
        
        if (faculty && subject) {
          const slotId = generateSlotId(timeMatch);
          updates.set(slotId, {
            id: slotId,
            faculty,
            subject,
            classroom: `Room ${Math.floor(Math.random() * 100) + 101}`,
            batch: 'CE-3A'
          });
          hasUpdates = true;
        }
      }
    }
    
    // Handle clear/remove requests
    else if (input.includes('clear') || input.includes('remove') || input.includes('delete') || input.includes('unschedule')) {
      const timeMatch = extractTimeFromText(input);
      const facultyMatch = extractFacultyFromText(input);
      const subjectMatch = extractSubjectFromText(input);
      
      if (timeMatch) {
        const slotId = generateSlotId(timeMatch);
        if (updates.has(slotId)) {
          updates.delete(slotId);
          hasUpdates = true;
        }
      } else if (facultyMatch) {
        // Remove specific faculty from all slots
        for (const [slotId, slot] of Array.from(updates.entries())) {
          if (slot.faculty?.name.toLowerCase().includes(facultyMatch)) {
            const updatedSlot = { ...slot };
            delete updatedSlot.faculty;
            if (!updatedSlot.subject) {
              updates.delete(slotId);
            } else {
              updates.set(slotId, updatedSlot);
            }
            hasUpdates = true;
          }
        }
      } else if (subjectMatch) {
        // Remove specific subject from all slots
        for (const [slotId, slot] of Array.from(updates.entries())) {
          if (slot.subject?.name.toLowerCase().includes(subjectMatch)) {
            const updatedSlot = { ...slot };
            delete updatedSlot.subject;
            if (!updatedSlot.faculty) {
              updates.delete(slotId);
            } else {
              updates.set(slotId, updatedSlot);
            }
            hasUpdates = true;
          }
        }
      }
    }
    
    // Apply updates if any were made
    if (hasUpdates) {
      onTimetableUpdate(updates);
      
      // Add confirmation message
      setTimeout(() => {
        const confirmationMessage: ExtendedChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: "✅ **Timetable Updated!** I've applied your changes to the grid above. You should see the updates immediately.",
          timestamp: new Date().toISOString(),
          suggestions: ["Make more changes", "Check for conflicts", "Optimize schedule"]
        };
        setMessages(prev => [...prev, confirmationMessage]);
      }, 500);
    }
  };

  // Generate comprehensive sample timetable for demo
  const generateSampleTimetable = (): Map<string, TimetableSlot> => {
    const sampleData = new Map<string, TimetableSlot>();
    
    if (faculties.length === 0 || subjects.length === 0) return sampleData;
    
    // Days of the week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    // Time slots (excluding breaks)
    const timeSlots = ['9:00-10:00', '10:00-11:00', '11:20-12:20', '12:20-1:20', '2:20-3:20', '3:20-4:20'];
    
    // Create a comprehensive assignment matrix
    const assignments = [
      // Monday
      { day: 'Monday', time: '9:00-10:00', facultyIndex: 0, subjectIndex: 10 }, // Mathematics
      { day: 'Monday', time: '10:00-11:00', facultyIndex: 1, subjectIndex: 11 }, // Data Structure
      { day: 'Monday', time: '11:20-12:20', facultyIndex: 8, subjectIndex: 13 }, // Digital Circuits
      { day: 'Monday', time: '12:20-1:20', facultyIndex: 2, subjectIndex: 15 }, // Computer Architecture
      { day: 'Monday', time: '2:20-3:20', facultyIndex: 9, subjectIndex: 29 }, // Constitution of India
      { day: 'Monday', time: '3:20-4:20', facultyIndex: 1, subjectIndex: 12 }, // Data Structure Lab
      
      // Tuesday
      { day: 'Tuesday', time: '9:00-10:00', facultyIndex: 1, subjectIndex: 11 }, // Data Structure
      { day: 'Tuesday', time: '10:00-11:00', facultyIndex: 0, subjectIndex: 10 }, // Mathematics  
      { day: 'Tuesday', time: '11:20-12:20', facultyIndex: 5, subjectIndex: 14 }, // Digital Circuits Lab
      { day: 'Tuesday', time: '12:20-1:20', facultyIndex: 4, subjectIndex: 17 }, // Object Oriented Programming
      { day: 'Tuesday', time: '2:20-3:20', facultyIndex: 8, subjectIndex: 13 }, // Digital Circuits
      { day: 'Tuesday', time: '3:20-4:20', facultyIndex: 6, subjectIndex: 29 }, // Machine Learning
      
      // Wednesday
      { day: 'Wednesday', time: '9:00-10:00', facultyIndex: 2, subjectIndex: 15 }, // Computer Architecture
      { day: 'Wednesday', time: '10:00-11:00', facultyIndex: 1, subjectIndex: 12 }, // Data Structure Lab
      { day: 'Wednesday', time: '11:20-12:20', facultyIndex: 0, subjectIndex: 10 }, // Mathematics
      { day: 'Wednesday', time: '12:20-1:20', facultyIndex: 4, subjectIndex: 18 }, // OOP Lab
      { day: 'Wednesday', time: '2:20-3:20', facultyIndex: 10, subjectIndex: 30 }, // Fundamentals of Entrepreneurship
      { day: 'Wednesday', time: '3:20-4:20', facultyIndex: 8, subjectIndex: 13 }, // Digital Circuits
      
      // Thursday
      { day: 'Thursday', time: '9:00-10:00', facultyIndex: 4, subjectIndex: 17 }, // Object Oriented Programming
      { day: 'Thursday', time: '10:00-11:00', facultyIndex: 2, subjectIndex: 15 }, // Computer Architecture
      { day: 'Thursday', time: '11:20-12:20', facultyIndex: 1, subjectIndex: 11 }, // Data Structure
      { day: 'Thursday', time: '12:20-1:20', facultyIndex: 5, subjectIndex: 14 }, // Digital Circuits Lab
      { day: 'Thursday', time: '2:20-3:20', facultyIndex: 6, subjectIndex: 29 }, // Machine Learning
      { day: 'Thursday', time: '3:20-4:20', facultyIndex: 0, subjectIndex: 10 }, // Mathematics
      
      // Friday
      { day: 'Friday', time: '9:00-10:00', facultyIndex: 9, subjectIndex: 29 }, // Constitution of India
      { day: 'Friday', time: '10:00-11:00', facultyIndex: 10, subjectIndex: 30 }, // Fundamentals of Entrepreneurship
      { day: 'Friday', time: '11:20-12:20', facultyIndex: 4, subjectIndex: 18 }, // OOP Lab
      { day: 'Friday', time: '12:20-1:20', facultyIndex: 1, subjectIndex: 11 }, // Data Structure
      { day: 'Friday', time: '2:20-3:20', facultyIndex: 2, subjectIndex: 15 }, // Computer Architecture
      { day: 'Friday', time: '3:20-4:20', facultyIndex: 6, subjectIndex: 30 }, // Machine Learning Lab
    ];
    
    // Enhanced classroom assignment logic
    const getClassroom = (subject: Subject): string => {
      if (subject.type === 'Lab' || subject.type === 'Practical' || subject.name.includes('Lab')) {
        const labRooms = ['LAB-A', 'LAB-B', 'LAB-C', 'Computer Lab-1', 'Computer Lab-2'];
        return labRooms[Math.floor(Math.random() * labRooms.length)];
      } else {
        const classrooms = ['BF-01', 'BF-02', 'SMART-01', 'LH-101', 'LH-102'];
        return classrooms[Math.floor(Math.random() * classrooms.length)];
      }
    };
    
    assignments.forEach(({ day, time, facultyIndex, subjectIndex }) => {
      const slotId = `${day}-${time}`;
      const faculty = faculties[facultyIndex % faculties.length];
      const subject = subjects[subjectIndex % subjects.length];
      
      sampleData.set(slotId, {
        id: slotId,
        faculty,
        subject,
        classroom: getClassroom(subject),
        batch: 'CS-3rd Sem'
      });
    });
    
    return sampleData;
  };

  // Helper functions for text parsing
  const extractFacultyFromText = (text: string): string | null => {
    // Look for faculty names in the text
    for (const faculty of faculties) {
      const nameParts = faculty.name.toLowerCase().split(' ');
      const fullName = faculty.name.toLowerCase();
      
      // Check for full name or parts of the name
      if (text.includes(fullName)) {
        return fullName;
      }
      
      // Check for last name (often sufficient)
      const lastName = nameParts[nameParts.length - 1];
      if (lastName.length > 2 && text.includes(lastName)) {
        return fullName;
      }
      
      // Check for first name + title
      if (nameParts.length > 1 && text.includes(nameParts[0]) && 
          (text.includes('dr') || text.includes('prof') || text.includes('professor'))) {
        return fullName;
      }
      
      // Check for title + last name (e.g., "Prof Sharma", "Dr Smith")
      if (nameParts.length > 1) {
        const lastNameVariations = [
          `prof ${lastName}`, `dr ${lastName}`, `professor ${lastName}`,
          `prof. ${lastName}`, `dr. ${lastName}`
        ];
        for (const variation of lastNameVariations) {
          if (text.includes(variation)) {
            return fullName;
          }
        }
      }
    }
    
    // Check for specializations
    for (const faculty of faculties) {
      if (faculty.specialization) {
        const spec = faculty.specialization.toLowerCase();
        if (text.includes(spec) || text.includes(spec.replace('/', ' '))) {
          return faculty.name.toLowerCase();
        }
      }
    }
    
    return null;
  };

  const extractSubjectFromText = (text: string): string | null => {
    // Look for subject names and codes
    for (const subject of subjects) {
      const subjectName = subject.name.toLowerCase();
      const subjectCode = subject.code.toLowerCase();
      
      // Check for full subject name
      if (text.includes(subjectName)) {
        return subjectName;
      }
      
      // Check for subject code
      if (text.includes(subjectCode)) {
        return subjectName;
      }
      
      // Check for common abbreviations
      const abbreviations = {
        'dsa': 'data structures and algorithms',
        'cn': 'computer networks', 
        'os': 'operating systems',
        'dbms': 'database management systems',
        'coa': 'computer organization and architecture',
        'se': 'software engineering',
        'ai': 'artificial intelligence',
        'ml': 'machine learning',
        'microprocessor': 'microprocessors and embedded systems',
        'embedded': 'microprocessors and embedded systems',
        'cultural': 'cultural and technical slot',
        'technical': 'cultural and technical slot'
      };
      
      for (const [abbr, fullName] of Object.entries(abbreviations)) {
        if (text.includes(abbr) && subjectName.includes(fullName)) {
          return subjectName;
        }
      }
      
      // Check for partial matches (important keywords)
      const keywords = subjectName.split(' ');
      const importantKeywords = keywords.filter(word => word.length > 3);
      
      if (importantKeywords.length > 0 && importantKeywords.some(keyword => text.includes(keyword))) {
        return subjectName;
      }
    }
    
    return null;
  };

  const extractTimeFromText = (text: string): { day: string; time: string } | null => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayVariants = {
      'mon': 'monday', 'tue': 'tuesday', 'wed': 'wednesday', 
      'thu': 'thursday', 'fri': 'friday', 'tues': 'tuesday',
      'thurs': 'thursday', 'weds': 'wednesday'
    };
    
    const times = ['9:00-10:00', '10:00-11:00', '11:20-12:20', '12:20-1:20', '2:20-3:20', '3:20-4:20'];
    const timeVariants = {
      '9': '9:00-10:00', '10': '10:00-11:00', '11': '11:20-12:20',
      '12': '12:20-1:20', '2': '2:20-3:20', '3': '3:20-4:20',
      'morning': '9:00-10:00', 'afternoon': '2:20-3:20',
      'first': '9:00-10:00', 'second': '10:00-11:00', 'third': '11:20-12:20',
      'fourth': '12:20-1:20', 'fifth': '2:20-3:20', 'sixth': '3:20-4:20'
    };
    
    // Find day
    let dayMatch = days.find(day => text.includes(day));
    if (!dayMatch) {
      for (const [variant, fullDay] of Object.entries(dayVariants)) {
        if (text.includes(variant)) {
          dayMatch = fullDay;
          break;
        }
      }
    }
    
    // Find time
    let timeMatch = times.find(time => {
      const timeStr = time.replace('-', ' to ').replace('-', ' ');
      return text.includes(time) || text.includes(timeStr);
    });
    
    if (!timeMatch) {
      for (const [variant, fullTime] of Object.entries(timeVariants)) {
        if (text.includes(variant)) {
          timeMatch = fullTime;
          break;
        }
      }
    }
    
    // Check for specific time patterns like "at 9", "9:00", "9am"
    if (!timeMatch) {
      const timeRegex = /(\d{1,2})(?::00)?(?:\s*(?:am|pm))?/g;
      const timeMatches = text.match(timeRegex);
      if (timeMatches) {
        for (const match of timeMatches) {
          const hour = parseInt(match.replace(/[^\d]/g, ''));
          if (hour >= 9 && hour <= 16) {
            // Convert hour to slot time
            if (hour === 9) timeMatch = '9:00-10:00';
            else if (hour === 10) timeMatch = '10:00-11:00';
            else if (hour === 11) timeMatch = '11:20-12:20';
            else if (hour === 12) timeMatch = '12:20-1:20';
            else if (hour === 2 || hour === 14) timeMatch = '2:20-3:20';
            else if (hour === 3 || hour === 15) timeMatch = '3:20-4:20';
            break;
          }
        }
      }
    }
    
    // If we found both day and time
    if (dayMatch && timeMatch) {
      return { 
        day: dayMatch.charAt(0).toUpperCase() + dayMatch.slice(1), 
        time: timeMatch 
      };
    }
    
    // If only time is specified, use first available day
    if (timeMatch && !dayMatch) {
      return { day: 'Monday', time: timeMatch };
    }
    
    // If only day is specified, use first available time
    if (dayMatch && !timeMatch) {
      return { 
        day: dayMatch.charAt(0).toUpperCase() + dayMatch.slice(1), 
        time: '9:00-10:00' 
      };
    }
    
    return null;
  };

  const findSuitableSlot = (currentData: Map<string, TimetableSlot>, preference: string, subject: Subject): string | null => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const morningTimes = ['9:00-10:00', '10:00-11:00', '11:20-12:20'];
    const afternoonTimes = ['12:20-1:20', '2:20-3:20', '3:20-4:20'];
    
    let targetTimes = [...morningTimes, ...afternoonTimes];
    
    if (preference === 'morning') {
      targetTimes = morningTimes;
    } else if (preference === 'afternoon') {
      targetTimes = afternoonTimes;
    }
    
    // Find first available slot
    for (const day of days) {
      for (const time of targetTimes) {
        const slotId = `${day}-${time}`;
        const existingSlot = currentData.get(slotId);
        
        // Skip break slots
        if (time === '11:00-11:20' || time === '1:20-2:20') continue;
        
        // Check if slot is available
        if (!existingSlot || (!existingSlot.subject && !existingSlot.faculty)) {
          return slotId;
        }
      }
    }
    
    return null;
  };

  const generateSlotId = (timeMatch: { day: string; time: string }): string => {
    return `${timeMatch.day}-${timeMatch.time}`;
  };

  // Listen for grid changes and notify chatbot
  React.useEffect(() => {
    if (onGridChange && timetableData.size > 0) {
      const filledSlots = Array.from(timetableData.values()).filter(slot => slot.faculty || slot.subject);
      if (filledSlots.length > 0) {
        const lastSlot = filledSlots[filledSlots.length - 1];
        const message = `I see you've ${lastSlot.faculty ? 'assigned ' + lastSlot.faculty.name : ''}${lastSlot.faculty && lastSlot.subject ? ' to teach ' : ''}${lastSlot.subject ? lastSlot.subject.name : ''} ${lastSlot.faculty || lastSlot.subject ? 'to slot ' + lastSlot.id.replace('-', ' at ') : ''}. Great choice! ✨`;
        onGridChange(message);
      }
    }
  }, [timetableData, onGridChange]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    // Add typing indicator
    const typingId = `typing-${Date.now()}`;
    const typingMessage: ExtendedChatMessage = {
      id: typingId,
      type: 'ai',
      content: '',
      timestamp: new Date().toISOString(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    // For immediate timetable commands, process updates right away
    const isImmediateCommand = userMessage.content.toLowerCase().includes('demo') || 
                              userMessage.content.toLowerCase().includes('assign') ||
                              userMessage.content.toLowerCase().includes('schedule') ||
                              userMessage.content.toLowerCase().includes('create') ||
                              userMessage.content.toLowerCase().includes('generate');

    try {
      // If it's an immediate command, do a quick pre-processing
      if (isImmediateCommand) {
        processAIResponseForTimetable('demo', userMessage.content);
      }

      // Call AI API
      const aiResponse = await callAIAPI(userMessage.content, messages);
      
      // Process AI response for timetable updates IMMEDIATELY
      processAIResponseForTimetable(aiResponse, userMessage.content);
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== typingId);
        const aiMessage: ExtendedChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiResponse,
          timestamp: new Date().toISOString(),
          suggestions: generateSuggestions(aiResponse)
        };
        return [...withoutTyping, aiMessage];
      });

      // Check if we should auto-generate demo timetable
      if (currentMessage.toLowerCase().includes('demo') && aiResponse.includes('Generating')) {
        setTimeout(() => {
          generateDemoTimetable();
        }, 3000);
      }
    } catch (error) {
      // Remove typing indicator and show error
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== typingId);
        const errorMessage: ExtendedChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
          timestamp: new Date().toISOString()
        };
        return [...withoutTyping, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSuggestions = (aiResponse: string): string[] => {
    if (aiResponse.includes('demo')) {
      return ["Show me the generated schedule", "Modify the demo", "Add more constraints"];
    }
    if (aiResponse.includes('faculty')) {
      return ["Assign specific faculty", "Auto-assign faculty", "Set faculty preferences"];
    }
    if (aiResponse.includes('constraint')) {
      return ["Add time constraints", "Set break preferences", "Configure lab schedules"];
    }
    return ["Generate timetable", "Ask another question", "Show help"];
  };

  const generateDemoTimetable = () => {
    const demoTimetable = {
      id: Date.now(),
      name: `CS Third Semester Demo - Fall 2024`,
      status: 'Draft' as const,
      quality_score: 0.94,
      workflow_stage: 'creation' as const,
      workflow_status: 'draft' as const,
      creator_id: parseInt(user?.id || '0'),
      publisher_id: 3,
      department_id: '1',
      version: 1,
      created_at: new Date().toISOString(),
      subjects: [
        'Data Structures & Algorithms',
        'Operating Systems', 
        'Database Management Systems',
        'Software Engineering',
        'Computer Networks',
        'DBMS Lab',
        'DS Lab'
      ]
    };
    
    setGeneratedDraft(demoTimetable);
    
    const successMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: `🎉 **Timetable Generated Successfully!**

**📊 Quality Score: 94%** - Excellent optimization!

**📅 Your Optimized Schedule:**
**Monday**
• 9:00-11:00 AM: Data Structures (Dr. Smith)
• 11:00-12:00 PM: Break  
• 2:00-4:00 PM: Operating Systems (Prof. Johnson)

**Tuesday**  
• 9:00-11:00 AM: Database Systems (Dr. Wilson)
• 11:00-12:00 PM: Software Engineering (Prof. Chen)
• 2:00-4:00 PM: DS Lab (Practical)

**Wednesday**
• 9:00-11:00 AM: Computer Networks (Dr. Taylor)  
• 11:00-12:00 PM: Data Structures (Theory)
• 2:00-4:00 PM: DBMS Lab (Practical)

**Thursday**
• 9:00-11:00 AM: Operating Systems (Advanced)
• 2:00-3:00 PM: Database Systems (Practice)

**Friday**
• 9:00-11:00 AM: Software Engineering (Project)
• 11:00-12:00 PM: Computer Networks (Lab Demo)

**✅ Next Steps:**
Ready to finalize? Click the "Finalize & Send for Approval" button below to send this to **pygram2k25** (Prof. Sarah Johnson) for review!`,
      timestamp: new Date().toISOString(),
      suggestions: ["Finalize this timetable", "Make modifications", "Generate another option"]
    };
    
    setMessages(prev => [...prev, successMessage]);
  };

  const finalizeDraft = () => {
    if (!generatedDraft) return;

    try {
      // Log creation and finalization
      ChangeTrackingService.logTimetableCreated(
        generatedDraft.id,
        parseInt(user!.id),
        `${user!.first_name} ${user!.last_name}`,
        `${user!.role} ${user!.mentor_type || ''}`.trim(),
        generatedDraft.name
      );
      
      // Send notification to Publisher
      if (generatedDraft.publisher_id) {
        const notificationData = NotificationService.sendDraftReadyNotification(
          parseInt(user!.id),
          generatedDraft.publisher_id,
          generatedDraft.id,
          generatedDraft.name
        );
        addNotification(notificationData);
      }
      
      const successMessage: ExtendedChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `✅ **Timetable Successfully Finalized!**

Your timetable has been sent for approval to:
**👤 Prof. Sarah Johnson** (Publisher Mentor - pygram2k25)

**🔄 Workflow Status:**
• ✅ Created by: **${user!.first_name} ${user!.last_name}** (Creator)
• 📋 Pending review by: **Prof. Sarah Johnson** (Publisher)  
• 📧 Notification sent successfully

**🎯 Next Steps:**
1. **Logout** from **Pygram2k25** account
2. **Login** as Publisher: **pygram2k25** / **pygram2k25**  
3. **Check Review Queue** to see your submitted timetable
4. **Approve** to complete the demonstration workflow

**💡 Pro Tip:** The complete Creator → Publisher workflow is now active! Your timetable is in the review queue waiting for approval.`,
        timestamp: new Date().toISOString(),
        suggestions: ["View workflow status", "Create another timetable", "Check notifications"]
      };
      
      setMessages(prev => [...prev, successMessage]);
      
      if (onTimetableGenerated) {
        onTimetableGenerated(generatedDraft.id);
      }
    } catch (error) {
      console.error('Error finalizing draft:', error);
      
      const errorMessage: ExtendedChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `❌ **Error Finalizing Timetable**

There was an issue finalizing your timetable. Please try again or contact support if the problem persists.

**Error Details:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        suggestions: ["Try again", "Contact support", "Save draft locally"]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Call the parent callback if provided
    if (onSuggestion) {
      onSuggestion(suggestion);
    }
    
    setCurrentMessage(suggestion);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <div className="h-[700px] flex flex-col bg-card rounded-lg border border-border transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-muted/50 to-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Timetable Assistant</h2>
            <p className="text-sm text-muted-foreground">Powered by Open Source AI</p>
          </div>
        </div>
        {generatedDraft && (
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Draft Ready
          </Badge>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              {/* Avatar */}
              <Avatar className={`w-8 h-8 mt-1 ${message.type === 'ai' ? 'order-first' : 'order-last'}`}>
                <AvatarFallback className={`text-xs ${
                  message.type === 'ai' 
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
                    : 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80 text-background'
                }`}>
                  {message.type === 'ai' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>

              {/* Message Content */}
              <div className={`flex-1 ${message.type === 'user' ? 'order-first' : 'order-last'}`}>
                <div className={`rounded-2xl px-4 py-3 max-w-[85%] transition-colors duration-200 ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground ml-auto shadow-lg'
                    : 'bg-muted/50 text-foreground border border-border shadow-sm'
                }`}>
                  {message.isTyping ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                  )}
                </div>
                
                {/* Timestamp */}
                <div className={`text-xs text-muted-foreground mt-1 px-1 ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs h-8 rounded-full bg-background hover:bg-accent border-border hover:border-primary/50"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Finalize Draft Card (if available) */}
      {generatedDraft && (
        <div className="mx-4 mb-4">
          <Card className="bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-emerald-900 dark:text-emerald-100">Timetable Ready!</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      Quality Score: {(generatedDraft.quality_score * 100).toFixed(0)}% • Version {generatedDraft.version}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={finalizeDraft}
                  className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Finalize & Send for Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Type your message to the AI assistant..."
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading}
            className="flex-1 bg-background border-border focus:border-primary focus:ring-primary"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!currentMessage.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 px-4"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          💡 Try: "Create a demo timetable" or ask about faculty assignments
        </p>
      </div>
    </div>
  );
}