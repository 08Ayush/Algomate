import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Calendar, Users, ArrowRight, Sparkles, MousePointer, Plus } from "lucide-react";
import { useAuth, useDepartmentAccess } from "@/contexts/AuthContext";
import TimetableChatbot from "@/components/timetable/TimetableChatbot";
import AITimetableGrid from "@/components/timetable/AITimetableGrid";
import { NewGenerationButton } from "@/components/creator/NewGenerationButton";
import { useNavigate } from "@/lib/navigation";

export default function CreateTimetablePage() {
  const { user, isCreatorMentor } = useAuth();
  const { getMentorDepartments } = useDepartmentAccess();
  const navigate = useNavigate();
  const [creationMode, setCreationMode] = useState<'select' | 'ai' | 'manual'>('select');

  const handleTimetableGenerated = (timetableId: number) => {
    // Navigate to the timetable editing page or show success message
    navigate(`/timetables/${timetableId}/edit`);
  };

  // Check if user has permission
  if (!user || !isCreatorMentor()) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              This feature is only available to Faculty Mentor 2 (Creator) users.
            </p>
            <Button onClick={() => navigate('/timetables')} variant="outline">
              View Existing Timetables
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mentorDepartments = getMentorDepartments();

  // Mode Selection Screen
  if (creationMode === 'select') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-500" />
                AI Timetable Creator
              </h1>
              <p className="text-muted-foreground mt-1">
                Create your perfect timetable with AI guidance. Drag and drop faculties and subjects, or let the AI assistant help you build an optimized schedule.
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Creator Mode
            </Badge>
          </div>
          <NewGenerationButton />
        </div>

        {/* Mode Selection Cards */}
        <div className="flex justify-center items-center py-8">
          <div className="flex gap-6">
            {/* AI Guided Button */}
            <Button
              onClick={() => setCreationMode('ai')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              <Sparkles className="h-5 w-5" />
              AI Guided
            </Button>

            {/* Manual Button */}
            <Button
              onClick={() => setCreationMode('manual')}
              variant="outline"
              className="flex items-center gap-2 border-2 px-6 py-3 rounded-lg hover:bg-gray-50"
            >
              <Calendar className="h-5 w-5" />
              Manual
            </Button>
          </div>
        </div>

        {/* Faculty Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Faculty
            </CardTitle>
            <CardDescription>
              Select Faculty
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                Prof. Aarav Sharma<br />
                Data Structures and Algorithms<br />
                <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded mt-2 inline-block">Computer Engineering</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timetable Grid Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Timetable Grid</CardTitle>
              <CardDescription>0 assignments</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Generation
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-16 text-muted-foreground">
              <h3 className="text-xl font-semibold mb-2">Weekly Class Schedule</h3>
              <p>Department of Computer Engineering • Academic Year 2024-25</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // AI Mode Screen
  if (creationMode === 'ai') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setCreationMode('select')}>
              ← Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Bot className="h-8 w-8 text-blue-500" />
                AI Timetable Creator
              </h1>
              <p className="text-muted-foreground mt-1">
                Use our AI assistant to generate optimized timetables through conversation
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Creator Mode
            </Badge>
          </div>
          <NewGenerationButton />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">AI-Powered Generation</h3>
                  <p className="text-sm text-muted-foreground">Conversational interface for easy input</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Conflict Detection</h3>
                  <p className="text-sm text-muted-foreground">Automatic resolution of scheduling conflicts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Workflow Integration</h3>
                  <p className="text-sm text-muted-foreground">Seamless approval process with Publisher</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chatbot Interface */}
        {mentorDepartments.length > 0 && (
          <TimetableChatbot
            departmentId={mentorDepartments[0].id}
            onTimetableGenerated={handleTimetableGenerated}
          />
        )}

        {/* Workflow Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workflow Steps</CardTitle>
            <CardDescription>
              How the timetable creation and approval process works
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h4 className="font-medium mb-2">Chat & Generate</h4>
                <p className="text-sm text-muted-foreground">
                  Describe your requirements through conversation with our AI
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h4 className="font-medium mb-2">Review & Edit</h4>
                <p className="text-sm text-muted-foreground">
                  Make manual adjustments to the generated timetable draft
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h4 className="font-medium mb-2">Finalize & Submit</h4>
                <p className="text-sm text-muted-foreground">
                  Send the completed draft to Faculty Mentor 1 for approval
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">4</span>
                </div>
                <h4 className="font-medium mb-2">Publication</h4>
                <p className="text-sm text-muted-foreground">
                  Publisher reviews, possibly edits, and publishes the final timetable
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manual Mode Screen - Redirect to existing AI Timetable Creator with manual mode
  if (creationMode === 'manual') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setCreationMode('select')}>
              ← Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <MousePointer className="h-8 w-8 text-blue-500" />
                Manual Timetable Creator
              </h1>
              <p className="text-muted-foreground mt-1">
                Drag and drop faculty and subjects to create your timetable manually
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Manual Mode
            </Badge>
          </div>
          <Button onClick={() => navigate('/ai-timetable-creator')}>
            Open Full Editor
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MousePointer className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Drag & Drop Interface</h3>
                  <p className="text-sm text-muted-foreground">Intuitive manual scheduling</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Real-time Validation</h3>
                  <p className="text-sm text-muted-foreground">Instant conflict detection</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Faculty Management</h3>
                  <p className="text-sm text-muted-foreground">Easy faculty assignment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Preview Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timetable Grid Preview</CardTitle>
            <CardDescription>
              This is a preview. Click "Open Full Editor" for complete drag & drop functionality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-muted text-left min-w-[80px]">Time</th>
                    <th className="border p-2 bg-muted text-center min-w-[120px]">Monday</th>
                    <th className="border p-2 bg-muted text-center min-w-[120px]">Tuesday</th>
                    <th className="border p-2 bg-muted text-center min-w-[120px]">Wednesday</th>
                    <th className="border p-2 bg-muted text-center min-w-[120px]">Thursday</th>
                    <th className="border p-2 bg-muted text-center min-w-[120px]">Friday</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { time: "9:00-10:00", label: "Lecture 1" },
                    { time: "10:00-11:00", label: "Lecture 2" },
                    { time: "11:00-11:20", label: "Break", isBreak: true },
                    { time: "11:20-12:20", label: "Lecture 3" },
                    { time: "12:20-1:20", label: "Lecture 4" },
                    { time: "1:20-", label: "Lunch", isBreak: true }
                  ].map((timeSlot, index) => (
                    <tr key={index}>
                      <td className="border p-2 font-medium bg-muted/50">
                        <div className="text-xs text-muted-foreground">{timeSlot.time}</div>
                        <div className="text-sm">{timeSlot.label}</div>
                      </td>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                        <td key={day} className="border p-2 h-16 relative group">
                          {timeSlot.isBreak ? (
                            <div className="text-center text-orange-600 font-medium">
                              {timeSlot.label === 'Break' ? '☕ Break' : '🍽️ Lunch'}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground hover:bg-accent/50 rounded cursor-pointer transition-colors">
                              <div className="text-center">
                                <div className="text-xs mb-1">Drop</div>
                                <div className="text-xs">faculty/subject</div>
                                <div className="text-xs">or click to assign</div>
                              </div>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Drag faculty and subjects from the sidebar to assign them to time slots
              </p>
              <Button 
                onClick={() => navigate('/ai-timetable-creator')} 
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Open Full Drag & Drop Editor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This shouldn't be reached, but fallback to selection mode
  return null;
}