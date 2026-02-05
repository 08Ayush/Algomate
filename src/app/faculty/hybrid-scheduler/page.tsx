'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { motion } from 'framer-motion';
import { Zap, Settings, Play, CheckCircle, AlertCircle, Clock, Save, Send, Eye, ChevronDown, ChevronUp } from 'lucide-react';

interface Batch {
  id: string;
  name: string;
  semester: number;
  department_id: string;
  college_id: string;
  academic_year: string;
  expected_strength: number;
}

interface HybridConfig {
  strategy: 'sequential' | 'parallel' | 'iterative';
  maxTimeMinutes: number;
  cpsatTimeout: number;
  cpsatMaxSolutions: number;
  gaPopulationSize: number;
  gaMaxGenerations: number;
  gaMutationRate: number;
  gaCrossoverRate: number;
}

interface Constraint {
  id: string;
  type: 'HARD' | 'SOFT';
  category: string;
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
}

interface GenerationTask {
  status: 'idle' | 'running' | 'completed' | 'failed';
  phase: string;
  progress: number;
  message: string;
  metrics?: any;
}

const DEFAULT_CONSTRAINTS: Constraint[] = [
  { id: 'HC001', type: 'HARD', category: 'FACULTY', name: 'No Faculty Double Booking', description: 'Faculty cannot teach multiple classes at the same time', weight: 10000, enabled: true },
  { id: 'HC002', type: 'HARD', category: 'CLASSROOM', name: 'No Classroom Conflicts', description: 'Classrooms cannot host multiple classes simultaneously', weight: 10000, enabled: true },
  { id: 'HC003', type: 'HARD', category: 'FACULTY', name: 'Faculty Qualification Requirements', description: 'Faculty must be qualified to teach assigned subjects', weight: 10000, enabled: true },
  { id: 'HC004', type: 'HARD', category: 'TIME', name: 'Faculty Availability Constraints', description: 'Classes can only be scheduled when faculty are available', weight: 10000, enabled: true },
  { id: 'HC005', type: 'HARD', category: 'CLASSROOM', name: 'Room Type Requirements', description: 'Lab subjects require labs, lectures require classrooms', weight: 10000, enabled: true },
  { id: 'SC001', type: 'SOFT', category: 'PREFERENCE', name: 'Faculty Subject Preferences', description: 'Assign subjects to faculty based on their preferences', weight: 50, enabled: true },
  { id: 'SC002', type: 'SOFT', category: 'TIME', name: 'Time Slot Preferences', description: 'Prefer faculty\'s preferred time slots', weight: 30, enabled: true },
  { id: 'SC003', type: 'SOFT', category: 'WORKLOAD', name: 'Balanced Faculty Workload', description: 'Distribute teaching hours evenly among faculty', weight: 40, enabled: true },
  { id: 'SC004', type: 'SOFT', category: 'CLASSROOM', name: 'Classroom Utilization', description: 'Optimize classroom usage efficiency', weight: 20, enabled: true },
  { id: 'SC005', type: 'SOFT', category: 'TIME', name: 'Consecutive Classes', description: 'Minimize gaps between classes for faculty', weight: 25, enabled: true },
];

export default function HybridSchedulerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [constraints, setConstraints] = useState<Constraint[]>(DEFAULT_CONSTRAINTS);
  const [constraintsLoading, setConstraintsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hard' | 'soft'>('hard');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generationTask, setGenerationTask] = useState<GenerationTask>({
    status: 'idle',
    phase: '',
    progress: 0,
    message: ''
  });
  const [generatedSchedule, setGeneratedSchedule] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [hybridConfig, setHybridConfig] = useState<HybridConfig>({
    strategy: 'sequential',
    maxTimeMinutes: 10,
    cpsatTimeout: 5,
    cpsatMaxSolutions: 10,
    gaPopulationSize: 50,
    gaMaxGenerations: 100,
    gaMutationRate: 0.1,
    gaCrossoverRate: 0.8,
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setLoading(false);
      fetchBatches(parsedUser.department_id, parsedUser);
      fetchConstraints(parsedUser.department_id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const fetchBatches = async (departmentId: string, userData?: any) => {
    try {
      const currentUser = userData || user;
      if (!currentUser) return;

      const authToken = Buffer.from(JSON.stringify(currentUser)).toString('base64');
      const response = await fetch(`/api/batches?department_id=${departmentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();

      if (data.success && data.data) {
        setBatches(data.data);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchConstraints = async (departmentId: string) => {
    try {
      setConstraintsLoading(true);
      const response = await fetch(`/api/constraints?department_id=${departmentId}`);
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const mappedConstraints: Constraint[] = data.data.map((rule: any) => ({
          id: rule.id,
          type: rule.rule_type,
          category: rule.rule_parameters?.category || 'GENERAL',
          name: rule.rule_name,
          description: rule.description,
          weight: rule.weight,
          enabled: rule.is_active
        }));
        setConstraints(mappedConstraints);
      } else {
        setConstraints(DEFAULT_CONSTRAINTS);
      }
    } catch (error) {
      setConstraints(DEFAULT_CONSTRAINTS);
    } finally {
      setConstraintsLoading(false);
    }
  };

  const toggleConstraint = (id: string) => {
    setConstraints(constraints.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  // Poll task status for real-time updates
  const pollTaskStatus = async (taskId: string) => {
    const maxPolls = 120; // 10 minutes max (5s interval)
    let pollCount = 0;

    const poll = async () => {
      try {
        const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
        const response = await fetch(`/api/scheduler/status/${taskId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get status');
        }

        // Update progress based on status
        let progress = 0;
        let phase = 'INITIALIZING';

        switch (data.status) {
          case 'pending':
            progress = 5;
            phase = 'PENDING';
            break;
          case 'running':
            progress = Math.min(50 + pollCount * 2, 90);
            phase = data.progressMessage?.includes('CP-SAT') ? 'CP-SAT SOLVER' :
              data.progressMessage?.includes('genetic') ? 'GENETIC OPTIMIZATION' : 'RUNNING';
            break;
          case 'completed':
            progress = 100;
            phase = 'COMPLETED';
            break;
          case 'failed':
            throw new Error(data.progressMessage || 'Generation failed');
        }

        setGenerationTask({
          status: data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'running',
          phase: phase,
          progress: progress,
          message: data.progressMessage || 'Processing...',
          metrics: data.status === 'completed' ? {
            strategy: hybridConfig.strategy,
            execution_time: ((Date.now() - pollCount * 5000) / 1000).toFixed(2),
            quality_score: data.fitnessScore ? (data.fitnessScore * 100).toFixed(1) : '0',
            violations: 0
          } : undefined
        });

        // If completed, fetch the generated timetable
        if (data.status === 'completed' && data.timetableId) {
          try {
            const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
            const timetableResponse = await fetch(`/api/timetables/${data.timetableId}`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (timetableResponse.ok) {
              const timetableData = await timetableResponse.json();
              setGeneratedSchedule({
                ...timetableData.data || timetableData,
                timetable_id: data.timetableId,
                id: data.timetableId,
                statistics: {
                  totalAssignments: timetableData.data?.scheduled_classes?.length || 0,
                  theoryAssignments: timetableData.data?.scheduled_classes?.filter((s: any) => !s.is_lab_session).length || 0,
                  labAssignments: timetableData.data?.scheduled_classes?.filter((s: any) => s.is_lab_session).length || 0
                }
              });
            } else {
              // Even if fetch fails, we have the timetableId
              setGeneratedSchedule({
                timetable_id: data.timetableId,
                id: data.timetableId
              });
            }
          } catch (fetchError) {
            console.error('Failed to fetch timetable details:', fetchError);
            setGeneratedSchedule({
              timetable_id: data.timetableId,
              id: data.timetableId
            });
          }
          return;
        }

        // If still running, continue polling
        if (data.status === 'running' || data.status === 'pending') {
          pollCount++;
          if (pollCount < maxPolls) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            throw new Error('Timeout: Generation took too long');
          }
        }
      } catch (error: any) {
        setGenerationTask({
          status: 'failed',
          phase: 'FAILED',
          progress: 0,
          message: error.message || 'Failed to generate timetable'
        });
      }
    };

    poll();
  };

  const startHybridGeneration = async () => {
    if (!selectedBatch) {
      alert('Please select a batch first');
      return;
    }

    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch) {
      alert('Batch not found');
      return;
    }

    if (!batch.semester || !batch.department_id || !user.id) {
      alert('Missing required information. Please ensure batch and user data is complete.');
      return;
    }

    setGenerationTask({
      status: 'running',
      phase: 'INITIALIZING',
      progress: 0,
      message: 'Starting hybrid CP-SAT + GA algorithm...'
    });

    try {
      // Use the Python-based scheduler API
      const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
      const response = await fetch('/api/scheduler/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          batchId: selectedBatch,
          collegeId: batch.college_id || user.college_id,
          config: {
            cpsatTimeLimit: hybridConfig.cpsatTimeout * 60, // Convert to seconds
            gaGenerations: hybridConfig.gaMaxGenerations,
            populationSize: hybridConfig.gaPopulationSize
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.taskId) {
        setGenerationTask({
          status: 'running',
          phase: 'STARTED',
          progress: 10,
          message: 'Hybrid scheduler process started...'
        });

        // Start polling for status
        pollTaskStatus(data.taskId);
      } else {
        throw new Error(data.error || 'Failed to start generation');
      }
    } catch (error: any) {
      setGenerationTask({
        status: 'failed',
        phase: 'FAILED',
        progress: 0,
        message: error.message || 'Failed to generate timetable'
      });
    }
  };

  const handleViewTimetable = async () => {
    if (!generatedSchedule) {
      alert('No timetable generated yet. Please generate a timetable first.');
      return;
    }

    // If timetable_id exists, it's already saved by Python scheduler
    if (generatedSchedule.timetable_id || generatedSchedule.id) {
      router.push(`/faculty/timetables/view/${generatedSchedule.timetable_id || generatedSchedule.id}`);
      return;
    }

    // Legacy flow: save first then view
    setIsSaving(true);
    try {
      const response = await fetch('/api/hybrid-timetable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generatedSchedule,
          status: 'draft',
          enabled_constraint_ids: constraints.filter(c => c.enabled).map(c => c.id)
        })
      });

      const data = await response.json();
      if (data.success) {
        router.push(`/faculty/timetables/view/${data.data.timetable_id}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      alert('Failed to save timetable: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!generatedSchedule) return;

    // If already saved by Python scheduler, show confirmation
    const timetableId = generatedSchedule.timetable_id || generatedSchedule.id;
    if (timetableId) {
      alert('Timetable already saved as draft!');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/hybrid-timetable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generatedSchedule,
          status: 'draft',
          enabled_constraint_ids: constraints.filter(c => c.enabled).map(c => c.id)
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Timetable saved successfully as draft!');
        setGeneratedSchedule({
          ...generatedSchedule,
          timetable_id: data.data.timetable_id
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      alert('Failed to save: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToPublisher = async () => {
    if (!generatedSchedule) return;

    const timetableId = generatedSchedule.timetable_id || generatedSchedule.id;

    setIsSaving(true);
    try {
      // If already saved by Python scheduler, just update status
      if (timetableId) {
        const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
        const response = await fetch(`/api/timetables/${timetableId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ status: 'pending_approval' })
        });

        if (response.ok) {
          alert('Timetable sent to publisher for review!');
          router.push('/faculty/timetables');
          return;
        }
      }

      // Legacy flow: save with status
      const response = await fetch('/api/hybrid-timetable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generatedSchedule,
          status: 'pending_approval',
          enabled_constraint_ids: constraints.filter(c => c.enabled).map(c => c.id)
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Timetable sent to publisher for review!');
        router.push('/faculty/timetables');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      alert('Failed to send: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2] flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-10 shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading Hybrid Scheduler...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hardConstraints = constraints.filter(c => c.type === 'HARD');
  const softConstraints = constraints.filter(c => c.type === 'SOFT');

  return (
    <FacultyCreatorLayout activeTab="hybrid-scheduler">
      <div className="space-y-6">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#4D869C] via-[#5a9aae] to-[#7AB2B2] rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <Zap size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Hybrid Scheduler</h1>
              <p className="text-white/80">Advanced timetable generation using CP-SAT + Genetic Algorithm hybrid approach</p>
            </div>
            <div className="ml-auto flex gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                🤖 CP-SAT + GA
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                ✨ Hybrid Engine
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Generation Configuration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Settings size={20} className="text-gray-700" />
                <h3 className="text-lg font-bold text-gray-900">Generation Config</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Batch
                    {batches.length > 0 && (
                      <span className="ml-2 text-xs text-gray-500">({batches.length} available)</span>
                    )}
                  </label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                    disabled={batches.length === 0}
                  >
                    <option value="">{batches.length === 0 ? 'No batches available' : 'Select Batch'}</option>
                    {batches.map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} - Semester {batch.semester}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hybrid Strategy</label>
                  <select
                    value={hybridConfig.strategy}
                    onChange={(e) => setHybridConfig({ ...hybridConfig, strategy: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                  >
                    <option value="sequential">Sequential (CP-SAT → GA)</option>
                    <option value="parallel">Parallel (Both simultaneously)</option>
                    <option value="iterative">Iterative (Multiple passes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Time (minutes)</label>
                  <input
                    type="number"
                    value={hybridConfig.maxTimeMinutes}
                    onChange={(e) => setHybridConfig({ ...hybridConfig, maxTimeMinutes: parseInt(e.target.value) })}
                    min="1"
                    max="60"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                  />
                </div>

                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-[#4D869C] hover:text-[#3d6b7c] font-medium"
                >
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Advanced Configuration
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pl-4 border-l-2 border-[#7AB2B2]">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CP-SAT Timeout (min)</label>
                      <input
                        type="number"
                        value={hybridConfig.cpsatTimeout}
                        onChange={(e) => setHybridConfig({ ...hybridConfig, cpsatTimeout: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">GA Population Size</label>
                      <input
                        type="number"
                        value={hybridConfig.gaPopulationSize}
                        onChange={(e) => setHybridConfig({ ...hybridConfig, gaPopulationSize: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">GA Max Generations</label>
                      <input
                        type="number"
                        value={hybridConfig.gaMaxGenerations}
                        onChange={(e) => setHybridConfig({ ...hybridConfig, gaMaxGenerations: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Constraints */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Scheduling Constraints</h3>
                {constraintsLoading && (
                  <span className="text-xs text-gray-500">Loading...</span>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('hard')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'hard' ? 'bg-[#4D869C]/20 text-[#4D869C]' : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  Hard ({hardConstraints.filter(c => c.enabled).length}/{hardConstraints.length})
                </button>
                <button
                  onClick={() => setActiveTab('soft')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'soft' ? 'bg-[#7AB2B2]/20 text-[#4D869C]' : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  Soft ({softConstraints.filter(c => c.enabled).length}/{softConstraints.length})
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(activeTab === 'hard' ? hardConstraints : softConstraints).map(constraint => (
                  <label
                    key={constraint.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={constraint.enabled}
                      onChange={() => toggleConstraint(constraint.id)}
                      className="mt-1 w-4 h-4 text-[#4D869C] rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{constraint.name}</div>
                      <div className="text-xs text-gray-500">{constraint.description}</div>
                      {constraint.type === 'SOFT' && (
                        <div className="text-xs text-blue-600 mt-1">Weight: {constraint.weight}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Execution */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Algorithm Execution</h3>
                <button
                  onClick={startHybridGeneration}
                  disabled={generationTask.status === 'running' || !selectedBatch}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  <Play size={20} /> Start Hybrid Generation
                </button>
              </div>

              {generationTask.status !== 'idle' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-bold text-gray-900">{generationTask.progress}%</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${generationTask.status === 'completed' ? 'bg-green-500' :
                        generationTask.status === 'failed' ? 'bg-red-500' :
                          'bg-gradient-to-r from-[#4D869C] to-[#7AB2B2]'
                        }`}
                      style={{ width: `${generationTask.progress}%` }}
                    />
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
                    {generationTask.status === 'completed' && <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />}
                    {generationTask.status === 'failed' && <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />}
                    {generationTask.status === 'running' && <Clock size={20} className="text-[#4D869C] flex-shrink-0 mt-0.5 animate-spin" />}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{generationTask.phase}</div>
                      <div className="text-xs text-gray-500">{generationTask.message}</div>
                    </div>
                  </div>

                  {generationTask.metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 font-medium">Strategy</div>
                        <div className="text-lg font-bold text-gray-900 capitalize">{generationTask.metrics.strategy}</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 font-medium">Execution Time</div>
                        <div className="text-lg font-bold text-gray-900">{generationTask.metrics.execution_time}s</div>
                      </div>
                      <div className="p-3 bg-[#4D869C]/10 rounded-lg">
                        <div className="text-xs text-[#4D869C] font-medium">Quality Score</div>
                        <div className="text-lg font-bold text-gray-900">{generationTask.metrics.quality_score}%</div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <div className="text-xs text-orange-600 font-medium">Violations</div>
                        <div className="text-lg font-bold text-gray-900">{generationTask.metrics.violations || 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {generationTask.status === 'completed' && generatedSchedule && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleViewTimetable}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    <Eye size={18} /> View Timetable
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 transition-all"
                  >
                    <Save size={18} /> Save Draft
                  </button>
                  <button
                    onClick={handleSendToPublisher}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-all"
                  >
                    <Send size={18} /> Send to Publisher
                  </button>
                </div>
              )}
            </motion.div>

            {generatedSchedule && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Generated Schedule Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-3xl font-bold text-gray-900">{generatedSchedule.statistics?.totalAssignments || 0}</div>
                    <div className="text-sm text-gray-600">Total Classes</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-3xl font-bold text-gray-900">{generatedSchedule.statistics?.theoryAssignments || 0}</div>
                    <div className="text-sm text-gray-600">Theory</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-3xl font-bold text-gray-900">{generatedSchedule.statistics?.labAssignments || 0}</div>
                    <div className="text-sm text-gray-600">Labs</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </FacultyCreatorLayout>
  );
}
