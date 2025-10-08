import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Bot, 
  Brain, 
  Zap, 
  Settings, 
  Play, 
  Pause, 
  StopCircle, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Users, 
  BookOpen, 
  Building, 
  Calendar,
  Send,
  Eye,
  BarChart3,
  Cpu,
  Layers,
  Workflow,
  Timer,
  Target
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TimetableStore, type GeneratedTimetable, type TimetableEntry } from '@shared/timetable-store';

// Types for Hybrid Algorithm Configuration
interface CPSATConfig {
  timeout_minutes: number;
  max_solutions: number;
  parallel_workers: number;
  use_prefiltering: boolean;
}

interface GAConfig {
  population_size: number;
  max_generations: number;
  mutation_rate: number;
  crossover_rate: number;
  elitism_rate: number;
  tournament_size: number;
}

interface HybridConfig {
  cpsat_config: CPSATConfig;
  ga_config: GAConfig;
  hybrid_strategy: 'sequential' | 'parallel' | 'iterative';
  max_total_time_minutes: number;
  quality_threshold: number;
}

interface SchedulingTask {
  id: string;
  batch_id: string;
  semester: number;
  academic_year: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  current_phase: 'INITIALIZING' | 'CP_SAT' | 'GA' | 'HYBRID' | 'FINALIZING' | 'COMPLETED';
  progress: number;
  current_message: string;
  created_at: string;
  updated_at: string;
  execution_metrics?: {
    strategy_used: string;
    total_execution_time_ms: number;
    cpsat_solutions_found: number;
    ga_generations_completed: number;
    best_fitness_score: number;
    constraint_violations: number;
    quality_score: number;
  };
}

interface Constraint {
  id: string;
  type: 'HARD' | 'SOFT';
  category: 'FACULTY' | 'CLASSROOM' | 'TIME' | 'WORKLOAD' | 'PREFERENCE';
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
  parameters?: Record<string, any>;
}

// Mock data for constraints
const availableConstraints: Constraint[] = [
  // Hard Constraints
  {
    id: 'HC001',
    type: 'HARD',
    category: 'FACULTY',
    name: 'No Faculty Double Booking',
    description: 'Faculty cannot teach multiple classes at the same time',
    weight: 10000,
    enabled: true
  },
  {
    id: 'HC002',
    type: 'HARD',
    category: 'CLASSROOM',
    name: 'No Classroom Conflicts',
    description: 'Classrooms cannot host multiple classes simultaneously',
    weight: 10000,
    enabled: true
  },
  {
    id: 'HC003',
    type: 'HARD',
    category: 'FACULTY',
    name: 'Faculty Qualification Requirements',
    description: 'Faculty must be qualified to teach assigned subjects',
    weight: 10000,
    enabled: true
  },
  {
    id: 'HC004',
    type: 'HARD',
    category: 'TIME',
    name: 'Faculty Availability Constraints',
    description: 'Classes can only be scheduled when faculty are available',
    weight: 10000,
    enabled: true
  },
  {
    id: 'HC005',
    type: 'HARD',
    category: 'CLASSROOM',
    name: 'Room Type Requirements',
    description: 'Lab subjects require labs, lectures require classrooms',
    weight: 10000,
    enabled: true
  },
  
  // Soft Constraints
  {
    id: 'SC001',
    type: 'SOFT',
    category: 'PREFERENCE',
    name: 'Faculty Subject Preferences',
    description: 'Assign subjects to faculty based on their preferences',
    weight: 50,
    enabled: true
  },
  {
    id: 'SC002',
    type: 'SOFT',
    category: 'TIME',
    name: 'Time Slot Preferences',
    description: 'Prefer faculty\'s preferred time slots',
    weight: 30,
    enabled: true
  },
  {
    id: 'SC003',
    type: 'SOFT',
    category: 'WORKLOAD',
    name: 'Balanced Faculty Workload',
    description: 'Distribute teaching hours evenly among faculty',
    weight: 40,
    enabled: true
  },
  {
    id: 'SC004',
    type: 'SOFT',
    category: 'CLASSROOM',
    name: 'Classroom Utilization',
    description: 'Optimize classroom usage efficiency',
    weight: 20,
    enabled: true
  },
  {
    id: 'SC005',
    type: 'SOFT',
    category: 'TIME',
    name: 'Consecutive Classes',
    description: 'Minimize gaps between classes for faculty',
    weight: 25,
    enabled: true
  }
];

// Mock batches data
const mockBatches = [
  { id: 'batch-1', name: 'CSE 2025 Batch', semester: 1, department: 'Computer Science', strength: 60 },
  { id: 'batch-2', name: 'CSE 2025 Batch', semester: 2, department: 'Computer Science', strength: 58 },
  { id: 'batch-3', name: 'CSE 2025 Batch', semester: 3, department: 'Computer Science', strength: 56 },
  { id: 'batch-4', name: 'CSE 2025 Batch', semester: 4, department: 'Computer Science', strength: 54 },
  { id: 'batch-5', name: 'CSE 2025 Batch', semester: 5, department: 'Computer Science', strength: 52 },
  { id: 'batch-6', name: 'CSE 2025 Batch', semester: 6, department: 'Computer Science', strength: 50 },
  { id: 'batch-7', name: 'CSE 2025 Batch', semester: 7, department: 'Computer Science', strength: 48 },
  { id: 'batch-8', name: 'CSE 2025 Batch', semester: 8, department: 'Computer Science', strength: 46 }
];

// Mock timetable data structure
// Real data from your application
const realSubjects = [
  // Semester III
  { id: 23, course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', semester: 3, credits: 3, course_category: 'PCC', faculty: 'Ms. Priti V. Bhagat', color: 'bg-blue-100 text-blue-800' },
  { id: 24, course_code: '25CE302T', course_title: 'Data Structure', semester: 3, credits: 3, course_category: 'PCC', faculty: 'Dr. Manoj V. Bramhe', color: 'bg-green-100 text-green-800' },
  { id: 25, course_code: '25CE302P', course_title: 'Data Structure Lab', semester: 3, credits: 1, course_category: 'PCC', faculty: 'Dr. Manoj V. Bramhe', color: 'bg-indigo-100 text-indigo-800' },
  { id: 26, course_code: '25CE303T', course_title: 'Digital Circuits', semester: 3, credits: 2, course_category: 'PCC', faculty: 'Mr. Roshan R. Kotkondawar', color: 'bg-purple-100 text-purple-800' },
  { id: 27, course_code: '25CE303P', course_title: 'Digital Circuits Lab', semester: 3, credits: 1, course_category: 'PCC', faculty: 'Mr. Roshan R. Kotkondawar', color: 'bg-teal-100 text-teal-800' },
  { id: 28, course_code: '25CE304T', course_title: 'Computer Architecture', semester: 3, credits: 2, course_category: 'PCC', faculty: 'Dr. Yogesh G. Golhar', color: 'bg-orange-100 text-orange-800' },
  { id: 29, course_code: '25CE305P', course_title: 'Computer Lab-I', semester: 3, credits: 1, course_category: 'PCC', faculty: 'Mr. Vaibhav V. Deshpande', color: 'bg-pink-100 text-pink-800' },
  { id: 30, course_code: '25ES301T', course_title: 'Constitution of India', semester: 3, credits: 2, course_category: 'VEC', faculty: 'Dr. Kapil O. Gupta', color: 'bg-yellow-100 text-yellow-800' },
  { id: 31, course_code: '25ES302T', course_title: 'Fundamentals of Entrepreneurship', semester: 3, credits: 2, course_category: 'HSSM', faculty: 'Mr. Dhiraj R. Gupta', color: 'bg-red-100 text-red-800' },
];

const realClassrooms = [
  { id: 1, name: 'BF-01', type: 'lecture', capacity: 60 },
  { id: 2, name: 'BF-02', type: 'lecture', capacity: 60 },
  { id: 3, name: 'LAB-A', type: 'lab', capacity: 30 },
  { id: 4, name: 'LAB-B', type: 'lab', capacity: 30 },
  { id: 5, name: 'LAB-C', type: 'lab', capacity: 30 }
];

const generateMockTimetable = (batchId: string) => {
  const timeSlots = [
    '9:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-1:15', 
    '2:15-3:15', '3:15-4:15', '4:30-5:30'
  ];
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Create a realistic schedule with proper distribution
  const lectureSubjects = realSubjects.filter(s => s.course_code.endsWith('T'));
  const labSubjects = realSubjects.filter(s => s.course_code.endsWith('P'));
  
  const timetable: any = {};
  
  // Schedule planning: 
  // - Lectures in BF-01, BF-02
  // - Labs in LAB-A, LAB-B, LAB-C
  // - Each subject should appear multiple times per week based on credits
  // - Labs should get 2-3 hour slots
  
  const weeklySchedule = [
    // Monday
    {
      '9:00-10:00': { ...lectureSubjects[0], room: 'BF-01' }, // Mathematics
      '10:00-11:00': { ...lectureSubjects[1], room: 'BF-01' }, // Data Structure
      '11:15-12:15': { ...lectureSubjects[2], room: 'BF-01' }, // Digital Circuits
      '12:15-1:15': { type: 'break', name: 'Lunch Break' },
      '2:15-3:15': { ...lectureSubjects[3], room: 'BF-02' }, // Computer Architecture
      '3:15-4:15': { ...lectureSubjects[4], room: 'BF-02' }, // Constitution of India
      '4:30-5:30': { ...labSubjects[0], room: 'LAB-A' }, // Data Structure Lab
    },
    // Tuesday
    {
      '9:00-10:00': { ...lectureSubjects[1], room: 'BF-02' }, // Data Structure
      '10:00-11:00': { ...lectureSubjects[0], room: 'BF-01' }, // Mathematics  
      '11:15-12:15': { ...labSubjects[1], room: 'LAB-B' }, // Digital Circuits Lab
      '12:15-1:15': { type: 'break', name: 'Lunch Break' },
      '2:15-3:15': { ...lectureSubjects[5], room: 'BF-01' }, // Entrepreneurship
      '3:15-4:15': { ...lectureSubjects[2], room: 'BF-02' }, // Digital Circuits
      '4:30-5:30': { ...labSubjects[2], room: 'LAB-C' }, // Computer Lab-I
    },
    // Wednesday
    {
      '9:00-10:00': { ...lectureSubjects[3], room: 'BF-01' }, // Computer Architecture
      '10:00-11:00': { ...labSubjects[0], room: 'LAB-A' }, // Data Structure Lab
      '11:15-12:15': { ...lectureSubjects[1], room: 'BF-02' }, // Data Structure
      '12:15-1:15': { type: 'break', name: 'Lunch Break' },
      '2:15-3:15': { ...lectureSubjects[0], room: 'BF-01' }, // Mathematics
      '3:15-4:15': { ...lectureSubjects[4], room: 'BF-02' }, // Constitution of India
      '4:30-5:30': { ...labSubjects[1], room: 'LAB-B' }, // Digital Circuits Lab
    },
    // Thursday
    {
      '9:00-10:00': { ...lectureSubjects[5], room: 'BF-02' }, // Entrepreneurship
      '10:00-11:00': { ...lectureSubjects[3], room: 'BF-01' }, // Computer Architecture
      '11:15-12:15': { ...lectureSubjects[2], room: 'BF-01' }, // Digital Circuits
      '12:15-1:15': { type: 'break', name: 'Lunch Break' },
      '2:15-3:15': { ...labSubjects[2], room: 'LAB-C' }, // Computer Lab-I
      '3:15-4:15': { ...lectureSubjects[1], room: 'BF-02' }, // Data Structure
      '4:30-5:30': { ...lectureSubjects[0], room: 'BF-01' }, // Mathematics
    },
    // Friday
    {
      '9:00-10:00': { ...lectureSubjects[4], room: 'BF-01' }, // Constitution of India
      '10:00-11:00': { ...lectureSubjects[5], room: 'BF-02' }, // Entrepreneurship
      '11:15-12:15': { ...labSubjects[0], room: 'LAB-A' }, // Data Structure Lab
      '12:15-1:15': { type: 'break', name: 'Lunch Break' },
      '2:15-3:15': { ...lectureSubjects[1], room: 'BF-01' }, // Data Structure
      '3:15-4:15': { ...lectureSubjects[3], room: 'BF-02' }, // Computer Architecture
      '4:30-5:30': { ...labSubjects[1], room: 'LAB-B' }, // Digital Circuits Lab
    },
    // Saturday (Full day with extra activities)
    {
      '9:00-10:00': { ...lectureSubjects[0], room: 'BF-01' }, // Mathematics
      '10:00-11:00': { ...lectureSubjects[2], room: 'BF-02' }, // Digital Circuits
      '11:15-12:15': { ...labSubjects[2], room: 'LAB-C' }, // Computer Lab-I
      '12:15-1:15': { type: 'break', name: 'Lunch Break' },
      '2:15-3:15': { ...lectureSubjects[1], room: 'BF-01' }, // Data Structure
      '3:15-4:15': { ...lectureSubjects[5], room: 'BF-02' }, // Entrepreneurship
      '4:30-5:30': { ...labSubjects[1], room: 'LAB-B' }, // Digital Circuits Lab
    }
  ];

  // Apply the schedule to the timetable object
  days.forEach((day, dayIndex) => {
    timetable[day] = {};
    const daySchedule = weeklySchedule[dayIndex];
    
    timeSlots.forEach((slot) => {
      timetable[day][slot] = daySchedule[slot] || null;
    });
  });

  console.log('🎯 Generated Timetable Debug:', {
    sampleSlot: timetable['Monday']['9:00-10:00'],
    fullTimetable: timetable
  });

  return { timeSlots, days, timetable };
};

const HybridScheduler: React.FC = () => {
  const { user } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2025-26');
  const [constraints, setConstraints] = useState<Constraint[]>(availableConstraints);
  const [hybridConfig, setHybridConfig] = useState<HybridConfig>({
    cpsat_config: {
      timeout_minutes: 5,
      max_solutions: 10,
      parallel_workers: 4,
      use_prefiltering: true
    },
    ga_config: {
      population_size: 50,
      max_generations: 100,
      mutation_rate: 0.1,
      crossover_rate: 0.8,
      elitism_rate: 0.1,
      tournament_size: 5
    },
    hybrid_strategy: 'sequential',
    max_total_time_minutes: 10,
    quality_threshold: 0.8
  });
  
  const [currentTask, setCurrentTask] = useState<SchedulingTask | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [generatedTimetable, setGeneratedTimetable] = useState<any>(null);

  // Simulate algorithm execution
  const simulateHybridAlgorithm = async () => {
    if (!selectedBatch) {
      alert('Please select a batch first');
      return;
    }

    setIsGenerating(true);
    setGenerationLogs([]);
    
    const taskId = `task-${Date.now()}`;
    const selectedBatchData = mockBatches.find(b => b.id === selectedBatch);
    
    const newTask: SchedulingTask = {
      id: taskId,
      batch_id: selectedBatch,
      semester: selectedBatchData?.semester || 3,
      academic_year: academicYear,
      status: 'RUNNING',
      current_phase: 'INITIALIZING',
      progress: 0,
      current_message: 'Initializing hybrid algorithm...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setCurrentTask(newTask);
    
    // Simulation phases
    const phases = [
      { 
        phase: 'INITIALIZING' as const, 
        message: 'Collecting algorithm data and initializing variables...', 
        duration: 1000, 
        progress: 10 
      },
      { 
        phase: 'CP_SAT' as const, 
        message: 'Running CP-SAT for constraint satisfaction...', 
        duration: 3000, 
        progress: 40 
      },
      { 
        phase: 'GA' as const, 
        message: 'Optimizing with Genetic Algorithm...', 
        duration: 4000, 
        progress: 80 
      },
      { 
        phase: 'FINALIZING' as const, 
        message: 'Finalizing solution and storing results...', 
        duration: 1000, 
        progress: 95 
      },
      { 
        phase: 'COMPLETED' as const, 
        message: 'Timetable generation completed successfully!', 
        duration: 500, 
        progress: 100 
      }
    ];

    for (const phaseData of phases) {
      await new Promise(resolve => setTimeout(resolve, phaseData.duration));
      
      setCurrentTask(prev => prev ? {
        ...prev,
        current_phase: phaseData.phase,
        current_message: phaseData.message,
        progress: phaseData.progress,
        updated_at: new Date().toISOString(),
        status: phaseData.phase === 'COMPLETED' ? 'COMPLETED' : 'RUNNING'
      } : null);
      
      setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${phaseData.message}`]);
    }

    // Add final metrics
    setCurrentTask(prev => prev ? {
      ...prev,
      execution_metrics: {
        strategy_used: hybridConfig.hybrid_strategy,
        total_execution_time_ms: 9500,
        cpsat_solutions_found: 8,
        ga_generations_completed: 45,
        best_fitness_score: 8750,
        constraint_violations: 0,
        quality_score: 94.2
      }
    } : null);

    // Generate mock timetable after successful completion
    const mockTimetable = generateMockTimetable(selectedBatch);
    setGeneratedTimetable(mockTimetable);

    setIsGenerating(false);
  };

  const toggleConstraint = (constraintId: string) => {
    setConstraints(prev => prev.map(c => 
      c.id === constraintId ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const updateConstraintWeight = (constraintId: string, weight: number) => {
    setConstraints(prev => prev.map(c => 
      c.id === constraintId ? { ...c, weight } : c
    ));
  };

  const resetToDefaults = () => {
    setConstraints(availableConstraints);
    setHybridConfig({
      cpsat_config: {
        timeout_minutes: 5,
        max_solutions: 10,
        parallel_workers: 4,
        use_prefiltering: true
      },
      ga_config: {
        population_size: 50,
        max_generations: 100,
        mutation_rate: 0.1,
        crossover_rate: 0.8,
        elitism_rate: 0.1,
        tournament_size: 5
      },
      hybrid_strategy: 'sequential',
      max_total_time_minutes: 10,
      quality_threshold: 0.8
    });
  };

  const publishTimetable = async () => {
    console.log('🚀 publishTimetable called with:', {
      currentTask: currentTask?.status,
      generatedTimetable: !!generatedTimetable,
      selectedBatch,
      user: user?.username || user?.email
    });
    
    if (!currentTask || currentTask.status !== 'COMPLETED' || !generatedTimetable) {
      console.warn('❌ publishTimetable early return:', {
        hasTask: !!currentTask,
        taskStatus: currentTask?.status,
        hasGeneratedTimetable: !!generatedTimetable
      });
      return;
    }
    
    const selectedBatchInfo = mockBatches.find(b => b.id === selectedBatch);
    if (!selectedBatchInfo || !user) {
      console.warn('❌ publishTimetable missing batch or user:', {
        selectedBatchInfo,
        user: !!user
      });
      return;
    }

    // Convert the generated timetable format to TimetableEntry format
    const convertedTimetableData: TimetableEntry[] = [];
    if (generatedTimetable && generatedTimetable.timetable) {
      generatedTimetable.days.forEach((day: string) => {
        generatedTimetable.timeSlots.forEach((timeSlot: string) => {
          const entry = generatedTimetable.timetable[day][timeSlot];
          if (entry && entry.type !== 'break' && (entry.name !== 'Lunch Break' && entry.course_title !== 'Lunch Break')) {
            convertedTimetableData.push({
              id: `${day}-${timeSlot}-${entry.course_code || entry.code || 'unknown'}`,
              day,
              time: timeSlot,
              subject: entry.course_title || entry.name,
              faculty: entry.faculty,
              room: entry.room,
              type: (entry.course_code || entry.code || '').includes('P') || (entry.course_code || entry.code || '').includes('LAB') ? 'lab' : 'lecture',
              duration: 60
            });
          }
        });
      });
    }

    console.log('🔄 Converted timetable data:', {
      originalFormat: !!generatedTimetable?.timetable,
      convertedEntries: convertedTimetableData.length,
      sampleEntry: convertedTimetableData[0]
    });

    // Create the timetable object for publisher review
    const timetableForReview: GeneratedTimetable = {
      id: `tt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      batchId: selectedBatch,
      batchName: `${selectedBatchInfo.name} Sem ${selectedBatchInfo.semester}`,
      creatorId: user.id,
      creatorName: user.username || user.email || 'Unknown',
      department: selectedBatchInfo.department,
      academicYear: academicYear,
      semester: selectedBatchInfo.semester.toString(),
      strategy: hybridConfig.hybrid_strategy,
      executionTime: currentTask.execution_metrics?.total_execution_time_ms || 0,
      qualityScore: (currentTask.execution_metrics?.quality_score || 0) / 100,
      generatedAt: currentTask.created_at || new Date().toISOString(),
      sentToPublishersAt: new Date().toISOString(),
      status: 'pending_review',
      timetableData: convertedTimetableData,
      hybridTimetableData: generatedTimetable, // Store the original rich format too
      metrics: {
        cpSatSolutions: currentTask.execution_metrics?.cpsat_solutions_found || 0,
        gaGenerations: currentTask.execution_metrics?.ga_generations_completed || 0,
        constraintsSatisfied: Math.floor((currentTask.execution_metrics?.quality_score || 0) * 0.95),
        totalConstraints: 100
      }
    };

    // Save to timetable store
    const store = TimetableStore.getInstance();
    store.addTimetableForReview(timetableForReview);
    
    console.log('✅ Timetable successfully saved to store:', {
      id: timetableForReview.id,
      batchName: timetableForReview.batchName,
      status: timetableForReview.status,
      totalInStore: store.getAllTimetables().length
    });

    // Show success message
    alert(`Timetable for ${selectedBatchInfo.name} Sem ${selectedBatchInfo.semester} has been successfully sent to Publishers for review and approval. Publishers can now view and approve this timetable from their dashboard.`);
    
    // Optionally redirect to HOD review page
    // navigate('/hod-review');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600">
                <Brain className="h-6 w-6 text-white" />
              </div>
              Hybrid Scheduler
            </h1>
            <p className="text-muted-foreground mt-2">
              Advanced timetable generation using CP-SAT + Genetic Algorithm hybrid approach
            </p>
          </div>
          
          <div className="flex gap-2">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <Cpu className="h-3 w-3 mr-1" />
              CP-SAT + GA
            </Badge>
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <Zap className="h-3 w-3 mr-1" />
              Hybrid Engine
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Generation Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batch">Target Batch</Label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch for timetable generation" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockBatches.map(batch => (
                          <SelectItem key={batch.id} value={batch.id}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{batch.name} Sem {batch.semester}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="academic-year">Academic Year</Label>
                    <Select value={academicYear} onValueChange={setAcademicYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025-26">2025-26</SelectItem>
                        <SelectItem value="2024-25">2024-25</SelectItem>
                        <SelectItem value="2026-27">2026-27</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="strategy">Hybrid Strategy</Label>
                    <Select 
                      value={hybridConfig.hybrid_strategy} 
                      onValueChange={(value: 'sequential' | 'parallel' | 'iterative') => 
                        setHybridConfig(prev => ({ ...prev, hybrid_strategy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Sequential (CP-SAT → GA)
                          </div>
                        </SelectItem>
                        <SelectItem value="parallel">
                          <div className="flex items-center gap-2">
                            <Workflow className="h-4 w-4" />
                            Parallel (CP-SAT ∥ GA)
                          </div>
                        </SelectItem>
                        <SelectItem value="iterative">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Iterative (Multi-round)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="max-time">Max Generation Time (minutes)</Label>
                    <Input
                      type="number"
                      value={hybridConfig.max_total_time_minutes}
                      onChange={(e) => setHybridConfig(prev => ({
                        ...prev,
                        max_total_time_minutes: parseInt(e.target.value) || 10
                      }))}
                      min={1}
                      max={60}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog open={showAdvancedConfig} onOpenChange={setShowAdvancedConfig}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Advanced Configuration
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Advanced Algorithm Configuration</DialogTitle>
                        <DialogDescription>
                          Fine-tune CP-SAT and Genetic Algorithm parameters
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Tabs defaultValue="cpsat" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="cpsat">CP-SAT Parameters</TabsTrigger>
                          <TabsTrigger value="ga">Genetic Algorithm</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="cpsat" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Timeout (minutes)</Label>
                              <Input
                                type="number"
                                value={hybridConfig.cpsat_config.timeout_minutes}
                                onChange={(e) => setHybridConfig(prev => ({
                                  ...prev,
                                  cpsat_config: {
                                    ...prev.cpsat_config,
                                    timeout_minutes: parseInt(e.target.value) || 5
                                  }
                                }))}
                              />
                            </div>
                            <div>
                              <Label>Max Solutions</Label>
                              <Input
                                type="number"
                                value={hybridConfig.cpsat_config.max_solutions}
                                onChange={(e) => setHybridConfig(prev => ({
                                  ...prev,
                                  cpsat_config: {
                                    ...prev.cpsat_config,
                                    max_solutions: parseInt(e.target.value) || 10
                                  }
                                }))}
                              />
                            </div>
                            <div>
                              <Label>Parallel Workers</Label>
                              <Input
                                type="number"
                                value={hybridConfig.cpsat_config.parallel_workers}
                                onChange={(e) => setHybridConfig(prev => ({
                                  ...prev,
                                  cpsat_config: {
                                    ...prev.cpsat_config,
                                    parallel_workers: parseInt(e.target.value) || 4
                                  }
                                }))}
                              />
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="ga" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Population Size</Label>
                              <Input
                                type="number"
                                value={hybridConfig.ga_config.population_size}
                                onChange={(e) => setHybridConfig(prev => ({
                                  ...prev,
                                  ga_config: {
                                    ...prev.ga_config,
                                    population_size: parseInt(e.target.value) || 50
                                  }
                                }))}
                              />
                            </div>
                            <div>
                              <Label>Max Generations</Label>
                              <Input
                                type="number"
                                value={hybridConfig.ga_config.max_generations}
                                onChange={(e) => setHybridConfig(prev => ({
                                  ...prev,
                                  ga_config: {
                                    ...prev.ga_config,
                                    max_generations: parseInt(e.target.value) || 100
                                  }
                                }))}
                              />
                            </div>
                            <div>
                              <Label>Mutation Rate</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={hybridConfig.ga_config.mutation_rate}
                                onChange={(e) => setHybridConfig(prev => ({
                                  ...prev,
                                  ga_config: {
                                    ...prev.ga_config,
                                    mutation_rate: parseFloat(e.target.value) || 0.1
                                  }
                                }))}
                              />
                            </div>
                            <div>
                              <Label>Crossover Rate</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={hybridConfig.ga_config.crossover_rate}
                                onChange={(e) => setHybridConfig(prev => ({
                                  ...prev,
                                  ga_config: {
                                    ...prev.ga_config,
                                    crossover_rate: parseFloat(e.target.value) || 0.8
                                  }
                                }))}
                              />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" onClick={resetToDefaults}>
                    Reset Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Constraints Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Scheduling Constraints
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure hard and soft constraints for timetable generation
                </p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="hard">
                  <TabsList>
                    <TabsTrigger value="hard">Hard Constraints</TabsTrigger>
                    <TabsTrigger value="soft">Soft Constraints</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="hard" className="space-y-3">
                    {constraints.filter(c => c.type === 'HARD').map(constraint => (
                      <div key={constraint.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={constraint.enabled}
                            onChange={() => toggleConstraint(constraint.id)}
                            className="rounded"
                          />
                          <div>
                            <div className="font-medium">{constraint.name}</div>
                            <div className="text-sm text-muted-foreground">{constraint.description}</div>
                          </div>
                        </div>
                        <Badge variant="destructive">HARD</Badge>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="soft" className="space-y-3">
                    {constraints.filter(c => c.type === 'SOFT').map(constraint => (
                      <div key={constraint.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={constraint.enabled}
                            onChange={() => toggleConstraint(constraint.id)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{constraint.name}</div>
                            <div className="text-sm text-muted-foreground">{constraint.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={constraint.weight}
                            onChange={(e) => updateConstraintWeight(constraint.id, parseInt(e.target.value) || 0)}
                            className="w-20 h-8"
                            min={0}
                            max={100}
                          />
                          <Badge variant="secondary">SOFT</Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Execution Panel */}
          <div className="space-y-6">
            
            {/* Generation Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Algorithm Execution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={simulateHybridAlgorithm}
                  disabled={isGenerating || !selectedBatch}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Bot className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Start Hybrid Generation
                    </>
                  )}
                </Button>

                {currentTask && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{currentTask.progress}%</span>
                    </div>
                    <Progress value={currentTask.progress} className="w-full" />
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge>{currentTask.current_phase}</Badge>
                        <span className="text-muted-foreground">{currentTask.current_message}</span>
                      </div>
                    </div>
                  </div>
                )}

                {currentTask && currentTask.status === 'COMPLETED' && (
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => setShowTimetableModal(true)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Timetable
                    </Button>
                    <Button 
                      onClick={publishTimetable}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send to Publishers
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Execution Metrics */}
            {currentTask?.execution_metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Execution Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Strategy</div>
                      <div className="font-medium">{currentTask.execution_metrics.strategy_used}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Execution Time</div>
                      <div className="font-medium">{(currentTask.execution_metrics.total_execution_time_ms / 1000).toFixed(1)}s</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">CP-SAT Solutions</div>
                      <div className="font-medium">{currentTask.execution_metrics.cpsat_solutions_found}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">GA Generations</div>
                      <div className="font-medium">{currentTask.execution_metrics.ga_generations_completed}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Quality Score</div>
                      <div className="font-medium text-green-600">{currentTask.execution_metrics.quality_score}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Violations</div>
                      <div className="font-medium">{currentTask.execution_metrics.constraint_violations}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Execution Logs */}
            {generationLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Execution Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-lg p-3 text-green-400 font-mono text-xs max-h-40 overflow-y-auto">
                    {generationLogs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Timetable View Modal */}
      <Dialog open={showTimetableModal} onOpenChange={setShowTimetableModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Generated Timetable - {mockBatches.find(b => b.id === selectedBatch)?.name} Sem {mockBatches.find(b => b.id === selectedBatch)?.semester}
            </DialogTitle>
            <DialogDescription>
              Timetable generated using hybrid CP-SAT + Genetic Algorithm approach
            </DialogDescription>
          </DialogHeader>
          
          {generatedTimetable && (
            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left font-medium min-w-[120px]">
                        Time / Day
                      </th>
                      {generatedTimetable.days.map((day: string) => (
                        <th key={day} className="border border-gray-300 px-4 py-2 text-center font-medium min-w-[160px]">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {generatedTimetable.timeSlots.map((timeSlot: string) => (
                      <tr key={timeSlot} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 font-medium bg-gray-50">
                          {timeSlot}
                        </td>
                        {generatedTimetable.days.map((day: string) => {
                          const slot = generatedTimetable.timetable[day][timeSlot];
                          return (
                            <td key={`${day}-${timeSlot}`} className="border border-gray-300 p-2">
                              {slot ? (
                                slot.type === 'break' ? (
                                  <div className="text-center py-2 text-gray-500 italic">
                                    {slot.name}
                                  </div>
                                ) : (
                                  <div className={`p-3 rounded-md text-center ${slot.color}`}>
                                    <div className="font-semibold text-sm">{slot.course_code || slot.code}</div>
                                    <div className="text-xs mt-1">{slot.course_title || slot.name}</div>
                                    <div className="text-xs mt-1 opacity-75">{slot.faculty}</div>
                                    <div className="text-xs mt-1 flex items-center justify-center gap-1">
                                      <Building className="h-3 w-3" />
                                      {slot.room}
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="text-center py-6 text-gray-400">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Timetable Statistics */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {generatedTimetable.days.length * generatedTimetable.timeSlots.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Slots</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">94.2%</div>
                    <div className="text-sm text-gray-600">Optimization Score</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">0</div>
                    <div className="text-sm text-gray-600">Conflicts</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">9.5s</div>
                    <div className="text-sm text-gray-600">Generation Time</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};

export default HybridScheduler;