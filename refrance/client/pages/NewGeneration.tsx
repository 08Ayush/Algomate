import React from 'react';
import NewGenerationView from '@/components/creator/NewGenerationView';

const NewGenerationPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <NewGenerationView 
        departmentId="temp-department-id"
        userRole="student"
      />
    </div>
  );
};

export default NewGenerationPage;