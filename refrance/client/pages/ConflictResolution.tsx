import React from 'react';
import ConflictResolution from '@/components/events/ConflictResolution';
import { useAuth } from '@/contexts/AuthContext';

export default function ConflictResolutionPage() {
  const { hasPermission } = useAuth();

  if (!hasPermission('view_event_queue')) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view the event queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ConflictResolution />
    </div>
  );
}