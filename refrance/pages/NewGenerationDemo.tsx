import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewGenerationButton } from '@/components/creator/NewGenerationButton';
import NewGenerationView from '@/components/creator/NewGenerationView';
import { Separator } from '@/components/ui/separator';
import { User, Users, BookOpen } from 'lucide-react';

const NewGenerationDemo: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          New Generation Feature Demo
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          This page demonstrates the complete New Generation feature where creators can share exam and assignment information with students and publishers.
        </p>
      </div>

      {/* Creator Section */}
      <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
              <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            Creator Interface
          </CardTitle>
          <p className="text-muted-foreground">
            Creators (mentors/teachers) use this button to share exam schedules and assignment deadlines with students and publishers.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/50 dark:bg-black/20 p-6 rounded-lg border border-purple-200 dark:border-purple-700">
            <h3 className="text-lg font-semibold mb-3">Click the button below to open the form:</h3>
            <div className="flex justify-center">
              <NewGenerationButton 
                creatorId="demo-creator-123" 
                departmentId="demo-department-456" 
              />
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">📝 Exam Information Form</h4>
              <ul className="space-y-1 text-red-700 dark:text-red-300">
                <li>• Exam type (Mid-term/End-term)</li>
                <li>• Subject name</li>
                <li>• Date and time</li>
                <li>• Duration</li>
                <li>• Topics/syllabus</li>
                <li>• Instructions</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📋 Assignment Form</h4>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Assignment title</li>
                <li>• Subject name</li>
                <li>• Due date and time</li>
                <li>• Description</li>
                <li>• Submission format</li>
                <li>• Maximum marks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Student/Publisher Section */}
      <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            Student & Publisher View
          </CardTitle>
          <p className="text-muted-foreground">
            Students and publishers can view all shared exam schedules and assignment deadlines in a beautiful, organized interface.
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-white/70 dark:bg-black/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <NewGenerationView 
              departmentId="demo-department-456"
              userRole="student"
            />
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
              <BookOpen className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold">Easy Creator Interface</h3>
              <p className="text-sm text-muted-foreground">
                Simple forms for creators to quickly share exam and assignment information
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold">Student-Friendly View</h3>
              <p className="text-sm text-muted-foreground">
                Beautiful cards showing upcoming deadlines with countdown timers
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold">Real-time Updates</h3>
              <p className="text-sm text-muted-foreground">
                Information is shared instantly with all students and publishers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewGenerationDemo;