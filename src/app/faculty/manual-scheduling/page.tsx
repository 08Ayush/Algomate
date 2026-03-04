'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { PageLoader } from '@/components/ui/PageLoader';
import ManualSchedulingComponent from '@/components/ManualSchedulingComponent';

export default function ManualSchedulingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'faculty') {
        router.push('/login');
        return;
      }
      
      setUser(parsedUser);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return <PageLoader message="Loading Manual Scheduler" subMessage="Preparing scheduling interface..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout 
      user={user} 
      facultyRole="creator"
      currentPath="/faculty/manual-scheduling"
      onLogout={handleLogout}
    >
      <ManualSchedulingComponent user={user} />
    </DashboardLayout>
  );
}