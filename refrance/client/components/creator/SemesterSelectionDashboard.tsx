import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from '@/lib/navigation';
import { 
  ArrowLeft,
  BookOpen,
  Users,
  Calendar,
  GraduationCap,
  Sun,
  Snowflake
} from 'lucide-react';

interface SemesterSelectionDashboardProps {
  sessionType: 'odd' | 'even';
  onSemesterSelect: (semester: string) => void;
  onBackToSessionSelection: () => void;
}

export const SemesterSelectionDashboard: React.FC<SemesterSelectionDashboardProps> = ({ 
  sessionType,
  onSemesterSelect,
  onBackToSessionSelection
}) => {
  const navigate = useNavigate();
  const isOddSession = sessionType === 'odd';
  
  const sessionInfo = {
    odd: {
      title: 'After Summer Session',
      subtitle: 'Odd Semesters',
      icon: Sun,
      color: 'orange',
      semesters: ['1', '3', '5', '7'],
      bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      iconColor: 'text-orange-600 dark:text-orange-400',
      textColor: 'text-orange-800 dark:text-orange-200'
    },
    even: {
      title: 'Winter/Spring Session',
      subtitle: 'Even Semesters',
      icon: Snowflake,
      color: 'blue',
      semesters: ['2', '4', '6', '8'],
      bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-800 dark:text-blue-200'
    }
  };

  const currentSession = sessionInfo[sessionType];
  const SessionIcon = currentSession.icon;

  const handleSemesterClick = (semester: string) => {
    if (semester === 'all') {
      // Navigate to the appropriate "all semesters" page
      navigate(`/timetables/all-${sessionType}`);
    } else {
      navigate(`/timetables/semester/${semester}`);
    }
  };

  const getSemesterButtonStyle = (semester: string) => {
    if (isOddSession) {
      return `
        bg-gradient-to-r from-orange-500 to-amber-500 
        hover:from-orange-600 hover:to-amber-600 
        text-white font-semibold 
        shadow-lg hover:shadow-xl 
        transform hover:scale-105 
        transition-all duration-300
        border-2 border-orange-300 hover:border-orange-400
      `;
    } else {
      return `
        bg-gradient-to-r from-blue-500 to-indigo-500 
        hover:from-blue-600 hover:to-indigo-600 
        text-white font-semibold 
        shadow-lg hover:shadow-xl 
        transform hover:scale-105 
        transition-all duration-300
        border-2 border-blue-300 hover:border-blue-400
      `;
    }
  };

  const getAllButtonStyle = () => {
    if (isOddSession) {
      return `
        bg-gradient-to-r from-orange-600 to-amber-600 
        hover:from-orange-700 hover:to-amber-700 
        text-white font-bold text-lg
        shadow-xl hover:shadow-2xl 
        transform hover:scale-110 
        transition-all duration-300
        border-3 border-orange-400 hover:border-orange-500
        ring-4 ring-orange-200 dark:ring-orange-800
      `;
    } else {
      return `
        bg-gradient-to-r from-blue-600 to-indigo-600 
        hover:from-blue-700 hover:to-indigo-700 
        text-white font-bold text-lg
        shadow-xl hover:shadow-2xl 
        transform hover:scale-110 
        transition-all duration-300
        border-3 border-blue-400 hover:border-blue-500
        ring-4 ring-blue-200 dark:ring-blue-800
      `;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={onBackToSessionSelection}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Button>
      </div>

      {/* Session Title */}
      <div className="text-center space-y-4">
        <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r ${currentSession.bgGradient} border-2 ${currentSession.borderColor}`}>
          <SessionIcon className={`h-8 w-8 ${currentSession.iconColor}`} />
          <div className="text-left">
            <h2 className={`text-2xl font-bold ${currentSession.textColor}`}>
              {currentSession.title}
            </h2>
            <Badge variant="secondary" className={`${currentSession.color === 'orange' ? 'bg-orange-200 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' : 'bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'}`}>
              {currentSession.subtitle}
            </Badge>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Select Semester
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose a specific semester or select "All" to create timetables for all {sessionType} semesters.
        </p>
      </div>

      {/* Semester Selection */}
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* All Semesters Button - Featured */}
        <div className="text-center">
          <Card className={`inline-block p-2 bg-gradient-to-r ${currentSession.bgGradient} border-2 ${currentSession.borderColor}`}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <BookOpen className={`h-8 w-8 ${currentSession.iconColor}`} />
                  <h3 className={`text-2xl font-bold ${currentSession.textColor}`}>
                    All {currentSession.subtitle}
                  </h3>
                </div>
                
                <p className={`text-lg ${currentSession.iconColor}`}>
                  Create comprehensive timetables for all {sessionType} semesters ({currentSession.semesters.map(s => `${s}${s === '1' || s === '21' || s === '31' ? 'st' : s === '2' || s === '22' ? 'nd' : s === '3' || s === '23' ? 'rd' : 'th'}`).join(', ')})
                </p>
                
                <Button 
                  onClick={() => handleSemesterClick('all')}
                  size="lg"
                  className={getAllButtonStyle()}
                >
                  <Users className="mr-3 h-6 w-6" />
                  All {currentSession.subtitle}
                  <Calendar className="ml-3 h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Individual Semester Buttons */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center text-muted-foreground">
            Or choose a specific semester:
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {currentSession.semesters.map((semester) => (
              <Card 
                key={semester}
                className={`cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 bg-gradient-to-br ${currentSession.bgGradient} ${currentSession.borderColor}`}
              >
                <CardContent className="p-6 text-center">
                  <div className="space-y-4">
                    <div className={`mx-auto w-16 h-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg border-2 ${currentSession.borderColor}`}>
                      <GraduationCap className={`h-8 w-8 ${currentSession.iconColor}`} />
                    </div>
                    
                    <div>
                      <h4 className={`text-2xl font-bold ${currentSession.textColor}`}>
                        {semester}{semester === '1' || semester === '21' || semester === '31' ? 'st' : semester === '2' || semester === '22' ? 'nd' : semester === '3' || semester === '23' ? 'rd' : 'th'}
                      </h4>
                      <p className={`text-sm ${currentSession.iconColor}`}>
                        Semester
                      </p>
                    </div>
                    
                    <Button 
                      onClick={() => handleSemesterClick(semester)}
                      className={getSemesterButtonStyle(semester)}
                      size="sm"
                    >
                      Select {semester}{semester === '1' || semester === '21' || semester === '31' ? 'st' : semester === '2' || semester === '22' ? 'nd' : semester === '3' || semester === '23' ? 'rd' : 'th'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          {isOddSession 
            ? 'After Summer Session typically runs from July to December, covering fresh academic starts and new course introductions.'
            : 'Winter/Spring Session typically runs from January to June, focusing on advanced coursework and continuing education.'
          }
        </p>
      </div>
    </div>
  );
};

export default SemesterSelectionDashboard;