'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Zap, Settings, Play, CheckCircle, AlertCircle, Clock, Save, Send, Eye } from 'lucide-react';

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

// Default constraints
const DEFAULT_CONSTRAINTS: Constraint[] = [
  // Hard Constraints
  { id: 'HC001', type: 'HARD', category: 'FACULTY', name: 'No Faculty Double Booking', description: 'Faculty cannot teach multiple classes at the same time', weight: 10000, enabled: true },
  { id: 'HC002', type: 'HARD', category: 'CLASSROOM', name: 'No Classroom Conflicts', description: 'Classrooms cannot host multiple classes simultaneously', weight: 10000, enabled: true },
  { id: 'HC003', type: 'HARD', category: 'FACULTY', name: 'Faculty Qualification Requirements', description: 'Faculty must be qualified to teach assigned subjects', weight: 10000, enabled: true },
  { id: 'HC004', type: 'HARD', category: 'TIME', name: 'Faculty Availability Constraints', description: 'Classes can only be scheduled when faculty are available', weight: 10000, enabled: true },
  { id: 'HC005', type: 'HARD', category: 'CLASSROOM', name: 'Room Type Requirements', description: 'Lab subjects require labs, lectures require classrooms', weight: 10000, enabled: true },
  // Soft Constraints
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
      if (!currentUser) {
        console.error('❌ No user data available');
        return;
      }
      
      console.log('🔍 Fetching batches for department_id:', departmentId);
      const authToken = Buffer.from(JSON.stringify(currentUser)).toString('base64');
      const response = await fetch(`/api/batches?department_id=${departmentId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      console.log('📦 API Response:', data);
      
      if (data.success && data.data) {
        console.log(`✅ Loaded ${data.data.length} batches`);
        setBatches(data.data);
        
        if (data.data.length === 0) {
          console.warn('⚠️ No batches found for this department. Check:');
          console.warn('   1. Does your user have a valid department_id?');
          console.warn('   2. Do batches exist for this department in database?');
          console.warn('   3. Are batches marked as is_active = true?');
        }
      } else {
        console.error('❌ Failed to fetch batches:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching batches:', error);
    }
  };

  const fetchConstraints = async (departmentId: string) => {
    try {
      setConstraintsLoading(true);
      const response = await fetch(`/api/constraints?department_id=${departmentId}`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        // Map database constraints to UI format
        const mappedConstraints: Constraint[] = data.data.map((rule: any) => ({
          id: rule.id,
          type: rule.rule_type,
          category: rule.rule_parameters?.category || 'GENERAL',
          name: rule.rule_name,
          description: rule.description,
          weight: rule.weight,
          enabled: rule.is_active // Default to active state from DB
        }));
        setConstraints(mappedConstraints);
        console.log(`✅ Loaded ${mappedConstraints.length} constraints from database`);
      } else {
        // Fallback to default constraints if API fails
        console.warn('⚠️ Using default constraints (database fetch failed)');
        setConstraints(DEFAULT_CONSTRAINTS);
      }
    } catch (error) {
      console.error('Error fetching constraints:', error);
      // Fallback to default constraints
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

    // Validate required fields
    if (!batch.semester || !batch.department_id || !user.id) {
      alert('Missing required information. Please ensure batch and user data is complete.');
      console.error('Missing data:', { 
        semester: batch.semester, 
        department_id: batch.department_id, 
        user_id: user.id,
        college_id: batch.college_id || user.college_id 
      });
      return;
    }

    setGenerationTask({
      status: 'running',
      phase: 'INITIALIZING',
      progress: 0,
      message: 'Starting hybrid algorithm...'
    });

    try {
      const requestBody = {
        batch_id: selectedBatch,
        semester: batch.semester,
        department_id: batch.department_id || user.department_id,
        college_id: batch.college_id || user.college_id,
        academic_year: academicYear,
        created_by: user.id,
        hybrid_config: hybridConfig,
        constraints: constraints.filter(c => c.enabled),
        enabled_constraint_ids: constraints.filter(c => c.enabled).map(c => c.id)
      };

      console.log('🚀 Sending generation request:', requestBody);

      const response = await fetch('/api/hybrid-timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      console.log('📥 Generation response:', data);

      if (data.success) {
        setGenerationTask({
          status: 'completed',
          phase: 'COMPLETED',
          progress: 100,
          message: 'Timetable generated successfully!',
          metrics: data.metrics
        });
        setGeneratedSchedule(data.data);
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('❌ Generation error:', error);
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

    // Save as draft first, then view
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
        // Navigate to view page with the timetable ID
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
        // Update schedule with saved timetable ID for future operations
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
    
    setIsSaving(true);
    try {
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const hardConstraints = constraints.filter(c => c.type === 'HARD');
  const softConstraints = constraints.filter(c => c.type === 'SOFT');

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Hybrid Scheduler</h1>
              <p className="text-gray-600 dark:text-gray-300">Advanced timetable generation using CP-SAT + Genetic Algorithm hybrid approach</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                  🤖 CP-SAT + GA
                </span>
                <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
                  ✨ Hybrid Engine
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Configuration */}
              <div className="lg:col-span-1 space-y-6">
                {/* Generation Configuration */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generation Configuration</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Target Batch */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Batch
                        {batches.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({batches.length} batches available)
                          </span>
                        )}
                      </label>
                      <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
                        disabled={batches.length === 0}
                      >
                        <option value="">
                          {batches.length === 0 ? 'No batches available' : 'Select Batch'}
                        </option>
                        {batches.map(batch => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name} - Semester {batch.semester}
                          </option>
                        ))}
                      </select>
                      {batches.length === 0 && (
                        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                          ⚠️ No batches found for your department. Please check browser console (F12) for details.
                        </p>
                      )}
                    </div>

                    {/* Academic Year */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    {/* Hybrid Strategy */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hybrid Strategy
                      </label>
                      <select
                        value={hybridConfig.strategy}
                        onChange={(e) => setHybridConfig({ ...hybridConfig, strategy: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="sequential">Sequential (CP-SAT → GA)</option>
                        <option value="parallel">Parallel (Both simultaneously)</option>
                        <option value="iterative">Iterative (Multiple passes)</option>
                      </select>
                    </div>

                    {/* Max Generation Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Generation Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={hybridConfig.maxTimeMinutes}
                        onChange={(e) => setHybridConfig({ ...hybridConfig, maxTimeMinutes: parseInt(e.target.value) })}
                        min="1"
                        max="60"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    {/* Advanced Configuration Toggle */}
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {showAdvanced ? '▼' : '▶'} Advanced Configuration
                    </button>

                    {showAdvanced && (
                      <div className="space-y-3 pl-4 border-l-2 border-purple-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">CP-SAT Timeout (min)</label>
                          <input
                            type="number"
                            value={hybridConfig.cpsatTimeout}
                            onChange={(e) => setHybridConfig({ ...hybridConfig, cpsatTimeout: parseInt(e.target.value) })}
                            className="w-full px-3 py-1 text-sm border rounded dark:bg-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">GA Population Size</label>
                          <input
                            type="number"
                            value={hybridConfig.gaPopulationSize}
                            onChange={(e) => setHybridConfig({ ...hybridConfig, gaPopulationSize: parseInt(e.target.value) })}
                            className="w-full px-3 py-1 text-sm border rounded dark:bg-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">GA Max Generations</label>
                          <input
                            type="number"
                            value={hybridConfig.gaMaxGenerations}
                            onChange={(e) => setHybridConfig({ ...hybridConfig, gaMaxGenerations: parseInt(e.target.value) })}
                            className="w-full px-3 py-1 text-sm border rounded dark:bg-slate-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scheduling Constraints */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Scheduling Constraints</h3>
                    {constraintsLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Loading from database...</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setActiveTab('hard')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'hard'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-700'
                      }`}
                    >
                      Hard Constraints
                    </button>
                    <button
                      onClick={() => setActiveTab('soft')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'soft'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-700'
                      }`}
                    >
                      Soft Constraints
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(activeTab === 'hard' ? hardConstraints : softConstraints).map(constraint => (
                      <label
                        key={constraint.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={constraint.enabled}
                          onChange={() => toggleConstraint(constraint.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {constraint.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {constraint.description}
                          </div>
                          {constraint.type === 'SOFT' && (
                            <div className="text-xs text-blue-600 mt-1">Weight: {constraint.weight}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Execution & Results */}
              <div className="lg:col-span-2 space-y-6">
                {/* Algorithm Execution */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Algorithm Execution</h3>
                    <button
                      onClick={startHybridGeneration}
                      disabled={generationTask.status === 'running' || !selectedBatch}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      <Play className="w-5 h-5" />
                      Start Hybrid Generation
                    </button>
                  </div>

                  {/* Progress Section */}
                  {generationTask.status !== 'idle' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Progress
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {generationTask.progress}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            generationTask.status === 'completed' ? 'bg-green-500' :
                            generationTask.status === 'failed' ? 'bg-red-500' :
                            'bg-gradient-to-r from-purple-500 to-pink-500'
                          }`}
                          style={{ width: `${generationTask.progress}%` }}
                        />
                      </div>

                      <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-slate-700">
                        {generationTask.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
                        {generationTask.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                        {generationTask.status === 'running' && <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {generationTask.phase}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {generationTask.message}
                          </div>
                        </div>
                      </div>

                      {/* Execution Metrics */}
                      {generationTask.metrics && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Strategy Used</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                              {generationTask.metrics.strategy}
                            </div>
                          </div>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">Execution Time</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {generationTask.metrics.execution_time}s
                            </div>
                          </div>
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Quality Score</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {generationTask.metrics.quality_score}%
                            </div>
                          </div>
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Violations</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {generationTask.metrics.violations || 0}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {generationTask.status === 'completed' && generatedSchedule && (
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleViewTimetable}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Timetable
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save Draft
                      </button>
                      <button
                        onClick={handleSendToPublisher}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Send to Publisher
                      </button>
                    </div>
                  )}
                </div>

                {/* Generated Schedule Preview */}
                {generatedSchedule && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Generated Schedule Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {generatedSchedule.statistics?.totalAssignments || 0}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Classes</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {generatedSchedule.statistics?.theoryAssignments || 0}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Theory</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {generatedSchedule.statistics?.labAssignments || 0}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Labs</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
