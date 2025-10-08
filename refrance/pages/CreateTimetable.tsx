import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Calendar, Users, ArrowRight } from "lucide-react";
import { useAuth, useDepartmentAccess } from "@/contexts/AuthContext";
import TimetableChatbot from "@/components/timetable/TimetableChatbot";
import { NewGenerationButton } from "@/components/creator/NewGenerationButton";
import { useNavigate } from "react-router-dom";

export default function CreateTimetablePage() {
  const { user, isCreatorMentor } = useAuth();
  const { getMentorDepartments } = useDepartmentAccess();
  const navigate = useNavigate();

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Create New Timetable</h1>
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

      {/* Department Selection */}
      {mentorDepartments.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Department</CardTitle>
            <CardDescription>
              Choose the department for which you want to create a timetable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mentorDepartments.map((dept) => (
                <Card key={dept.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{dept.name}</h3>
                        <p className="text-sm text-muted-foreground">{dept.code}</p>
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

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