'use client';

import React, { useState, useEffect } from 'react';
import { 
  NEPSchedulerSolution, 
  ElectiveBucket, 
  ScheduledClass,
  BucketSummary 
} from '@/types/nep-scheduler';

interface NEPSchedulerPageProps {
  batchId: string;
}

export default function NEPSchedulerPage({ batchId }: NEPSchedulerPageProps) {
  const [loading, setLoading] = useState(false);
  const [buckets, setBuckets] = useState<ElectiveBucket[]>([]);
  const [solution, setSolution] = useState<NEPSchedulerSolution | null>(null);
  const [timeLimit, setTimeLimit] = useState(30);
  const [saveToDb, setSaveToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'buckets' | 'timeline'>('buckets');

  // Fetch existing buckets on mount
  useEffect(() => {
    fetchBuckets();
  }, [batchId]);

  const fetchBuckets = async () => {
    try {
      const response = await fetch(`/api/elective-buckets?batch_id=${batchId}`);
      const data = await response.json();
      if (data.success) {
        setBuckets(data.buckets);
      }
    } catch (err) {
      console.error('Error fetching buckets:', err);
    }
  };

  const generateTimetable = async () => {
    setLoading(true);
    setError(null);
    setSolution(null);

    try {
      const response = await fetch('/api/nep-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: batchId,
          time_limit: timeLimit,
          save_to_db: saveToDb
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSolution(data);
      } else {
        setError(data.error || 'Failed to generate timetable');
        setSolution(data); // Still show diagnostic info
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const renderBucketView = () => {
    if (!solution || !solution.bucket_summary) return null;

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-800">Schedule by Bucket</h3>
        
        {solution.bucket_summary.map((bucket: BucketSummary) => {
          const bucketClasses = solution.scheduled_classes?.filter(
            (sc: ScheduledClass) => 
              buckets.find(b => b.id === bucket.bucket_id)?.subjects?.some(s => s.id === sc.subject_id)
          ) || [];

          return (
            <div key={bucket.bucket_id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800">{bucket.bucket_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {bucket.subjects} subject{bucket.subjects !== 1 ? 's' : ''} • Choose 1
                  </p>
                </div>
                {bucket.time_slot && (
                  <div className="text-right">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {bucket.time_slot.day}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {bucket.time_slot.start_time} - {bucket.time_slot.end_time}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bucketClasses.map((cls: ScheduledClass) => (
                  <div key={cls.subject_id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-semibold text-gray-800">{cls.subject_code}</h5>
                      <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(cls.nep_category)}`}>
                        {cls.nep_category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{cls.subject_name}</p>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {cls.classroom_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimelineView = () => {
    if (!solution || !solution.scheduled_classes) return null;

    // Group by day
    const byDay: Record<string, ScheduledClass[]> = {};
    solution.scheduled_classes.forEach((cls: ScheduledClass) => {
      if (!byDay[cls.day]) byDay[cls.day] = [];
      byDay[cls.day].push(cls);
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-800">Weekly Timeline</h3>
        
        {days.map(day => {
          const dayClasses = byDay[day] || [];
          if (dayClasses.length === 0) return null;

          // Sort by start time
          const sorted = [...dayClasses].sort((a, b) => 
            a.start_time.localeCompare(b.start_time)
          );

          return (
            <div key={day} className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">{day}</h4>
              <div className="space-y-3">
                {sorted.map((cls: ScheduledClass) => (
                  <div key={cls.subject_id} className="flex items-center border-l-4 border-green-500 pl-4 py-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{cls.subject_code}</span>
                        <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(cls.nep_category)}`}>
                          {cls.nep_category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{cls.subject_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">
                        {cls.start_time} - {cls.end_time}
                      </div>
                      <div className="text-sm text-gray-600">{cls.classroom_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      MAJOR: 'bg-purple-100 text-purple-800',
      MINOR: 'bg-blue-100 text-blue-800',
      CORE: 'bg-green-100 text-green-800',
      AEC: 'bg-yellow-100 text-yellow-800',
      VAC: 'bg-pink-100 text-pink-800',
      PEDAGOGY: 'bg-indigo-100 text-indigo-800',
      MULTIDISCIPLINARY: 'bg-orange-100 text-orange-800',
      INTERNSHIP: 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                NEP 2020 Timetable Scheduler
              </h1>
              <p className="text-gray-600">
                Choice-Based Credit System (CBCS) with Elective Buckets
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800">Batch ID</p>
              <p className="text-xs text-blue-600 font-mono">{batchId}</p>
            </div>
          </div>

          {/* Current Buckets Info */}
          {buckets.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Configured Buckets</h3>
              <div className="flex flex-wrap gap-2">
                {buckets.map(bucket => (
                  <div key={bucket.id} className="bg-white border rounded px-3 py-1 text-sm">
                    <span className="font-medium text-gray-700">{bucket.bucket_name}</span>
                    {bucket.subjects && (
                      <span className="text-gray-500 ml-2">
                        ({bucket.subjects.length} subjects)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mt-6 flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (seconds)
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-lg w-32"
                min={10}
                max={300}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="saveToDb"
                checked={saveToDb}
                onChange={(e) => setSaveToDb(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="saveToDb" className="text-sm font-medium text-gray-700">
                Save to Database
              </label>
            </div>

            <button
              onClick={generateTimetable}
              disabled={loading || buckets.length === 0}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors ${
                loading || buckets.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                '🚀 Generate Timetable'
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-red-800">Generation Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                {solution?.suggestions && (
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {solution.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Solution Display */}
        {solution && solution.success && (
          <div className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold text-green-600">{solution.status}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-800">{solution.metrics?.total_subjects}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Time Slots Used</p>
                <p className="text-2xl font-bold text-gray-800">{solution.metrics?.time_slots_used}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Solver Time</p>
                <p className="text-2xl font-bold text-gray-800">
                  {solution.solver_stats?.wall_time.toFixed(2)}s
                </p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('buckets')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'buckets'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📚 Bucket View
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 Timeline View
                </button>
              </div>
            </div>

            {/* Schedule Display */}
            {viewMode === 'buckets' ? renderBucketView() : renderTimelineView()}
          </div>
        )}

        {/* No Buckets Warning */}
        {buckets.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-yellow-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Elective Buckets Configured</h3>
            <p className="text-yellow-700">
              Please configure elective buckets for this batch before generating the timetable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
