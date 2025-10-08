import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Bot, Users, Book, Calendar, Sparkles, CheckCircle, Send, FileCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TimetableChatbot from '@/components/timetable/TimetableChatbot';
import AITimetableGrid from '../components/timetable/AITimetableGrid';
import { NewGenerationButton } from '@/components/creator/NewGenerationButton';
import useTheme from '@/hooks/use-theme';

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
      { id: '1', name: 'Prof. Aarav Sharma', department: 'Computer Engineering', email: 'aarav.sharma@example.com', specialization: 'Data Structures and Algorithms' },
      { id: '2', name: 'Prof. Kiara Singh', department: 'Computer Engineering', email: 'kiara.singh@example.com', specialization: 'Computer Networks' },
      { id: '3', name: 'Prof. Rohan Kumar', department: 'Computer Engineering', email: 'rohan.kumar@example.com', specialization: 'Software Engineering' },
      { id: '4', name: 'Prof. Aisha Gupta', department: 'Computer Engineering', email: 'aisha.gupta@example.com', specialization: 'Operating Systems' },
      { id: '5', name: 'Prof. Siddharth Patel', department: 'Computer Engineering', email: 'siddharth.patel@example.com', specialization: 'Database Management Systems' },
      { id: '6', name: 'Prof. Priya Desai', department: 'Computer Engineering', email: 'priya.desai@example.com', specialization: 'Computer Organization and Architecture' },
      { id: '7', name: 'Prof. Arjun Rao', department: 'Computer Engineering', email: 'arjun.rao@example.com', specialization: 'Artificial Intelligence' },
      { id: '8', name: 'Prof. Riya Jain', department: 'Computer Engineering', email: 'riya.jain@example.com', specialization: 'Microprocessors and Embedded Systems' },
      { id: '9', name: 'Prof. Kabir Kapoor', department: 'Computer Engineering', email: 'kabir.kapoor@example.com', specialization: 'Data Structures and Algorithms' },
      { id: '10', name: 'Prof. Ananya Reddy', department: 'Computer Engineering', email: 'ananya.reddy@example.com', specialization: 'Cultural and Technical Activities' },
    ];

    const mockSubjects: Subject[] = [
      { id: '1', name: 'Data Structures and Algorithms', code: 'CE401', credits: 4, department: 'Computer Engineering', type: 'Theory' },
      { id: '2', name: 'Computer Networks', code: 'CE402', credits: 3, department: 'Computer Engineering', type: 'Theory' },
      { id: '3', name: 'Operating Systems', code: 'CE403', credits: 4, department: 'Computer Engineering', type: 'Theory' },
      { id: '4', name: 'Database Management Systems', code: 'CE404', credits: 3, department: 'Computer Engineering', type: 'Theory' },
      { id: '5', name: 'Computer Organization and Architecture', code: 'CE405', credits: 3, department: 'Computer Engineering', type: 'Theory' },
      { id: '6', name: 'Software Engineering', code: 'CE406', credits: 4, department: 'Computer Engineering', type: 'Theory' },
      { id: '7', name: 'Artificial Intelligence', code: 'CE407', credits: 3, department: 'Computer Engineering', type: 'Theory' },
      { id: '8', name: 'Microprocessors and Embedded Systems', code: 'CE408', credits: 4, department: 'Computer Engineering', type: 'Theory' },
      { id: '9', name: 'Cultural and Technical Slot', code: 'CE409', credits: 1, department: 'Computer Engineering', type: 'Practical' },
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
      
      // Create timetable summary
      const filledSlots = Array.from(timetableData.values()).filter(slot => slot.faculty && slot.subject);
      const timetableSummary = {
        id: Date.now(),
        name: `AI Generated Timetable - ${new Date().toLocaleDateString()}`,
        status: 'Pending HOD Approval',
        totalSlots: filledSlots.length,
        facultyCount: new Set(filledSlots.map(slot => slot.faculty?.id)).size,
        subjectCount: new Set(filledSlots.map(slot => slot.subject?.id)).size,
        submittedAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
      };

      console.log('Timetable submitted to HOD:', timetableSummary);
      
      setPublishSuccess(true);
      setGridChangeMessage('✅ Timetable successfully submitted to HOD for approval!');
      
      setTimeout(() => {
        setGridChangeMessage('');
        setPublishSuccess(false);
      }, 5000);
      
    } catch (error) {
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
