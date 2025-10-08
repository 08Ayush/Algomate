import React from 'react';
import { useParams, useNavigate } from '@/lib/navigation';
import { SemesterTimetablePage } from '../../pages/SemesterTimetablePage';

export const SemesterTimetableRoute: React.FC = () => {
  const { sessionType, semester } = useParams<{ sessionType: 'odd' | 'even'; semester: string }>();
  const navigate = useNavigate();

  // Validate sessionType and semester
  if (!sessionType || (sessionType !== 'odd' && sessionType !== 'even')) {
    navigate('/timetables');
    return null;
  }

  if (!semester) {
    navigate('/timetables');
    return null;
  }

  const handleBack = () => {
    navigate('/timetables');
  };

  return (
    <SemesterTimetablePage 
      sessionType={sessionType}
      semester={semester}
      onBack={handleBack}
    />
  );
};

export default SemesterTimetableRoute;