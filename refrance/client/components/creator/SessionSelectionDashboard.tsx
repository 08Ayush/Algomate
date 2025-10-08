import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Snowflake, 
  Sun, 
  ArrowRight,
  BookOpen,
  GraduationCap
} from 'lucide-react';

interface SessionSelectionDashboardProps {
  onSessionSelect: (sessionType: 'odd' | 'even') => void;
}

export const SessionSelectionDashboard: React.FC<SessionSelectionDashboardProps> = ({ 
  onSessionSelect 
}) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Create Timetable
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the academic session to create your timetable. Select the appropriate semester type based on your academic calendar.
        </p>
      </div>

      {/* Session Selection Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* After Summer Session (Odd Semesters) Card */}
        <Card 
          className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 hover:border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30"
          onClick={() => onSessionSelect('odd')}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/50 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/70 transition-colors">
                <Sun className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <ArrowRight className="h-6 w-6 text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-orange-800 dark:text-orange-200 mt-4">
              After Summer Session
            </CardTitle>
            <Badge variant="secondary" className="w-fit bg-orange-200 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200">
              Odd Semesters
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-orange-700 dark:text-orange-300 text-lg leading-relaxed">
              Create timetables for odd semester courses following the summer break.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                <GraduationCap className="h-5 w-5" />
                <span className="font-medium">Semesters: 1st, 3rd, 5th, 7th</span>
              </div>
              
              <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                <Calendar className="h-5 w-5" />
                <span className="font-medium">Typically: July - December</span>
              </div>
              
              <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                <BookOpen className="h-5 w-5" />
                <span className="font-medium">Fresh academic start</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                Perfect for new students and fresh course introductions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Winter/Spring Session (Even Semesters) Card */}
        <Card 
          className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 hover:border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
          onClick={() => onSessionSelect('even')}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/70 transition-colors">
                <Snowflake className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <ArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-4">
              Winter/Spring Session
            </CardTitle>
            <Badge variant="secondary" className="w-fit bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
              Even Semesters
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-blue-700 dark:text-blue-300 text-lg leading-relaxed">
              Create timetables for even semester courses during winter and spring.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <GraduationCap className="h-5 w-5" />
                <span className="font-medium">Semesters: 2nd, 4th, 6th, 8th</span>
              </div>
              
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
                <span className="font-medium">Typically: January - June</span>
              </div>
              
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <BookOpen className="h-5 w-5" />
                <span className="font-medium">Advanced coursework</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Ideal for continuing education and advanced subjects
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          Select the session type that matches your current academic period. 
          You can always create timetables for both sessions as needed.
        </p>
      </div>
    </div>
  );
};

export default SessionSelectionDashboard;