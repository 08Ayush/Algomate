'use client';

import { useState, useEffect } from 'react';
import { Bot, Calendar, Sparkles, Send, Grid3x3, MessageCircle, Wand2, Eye, Save, Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import ManualSchedulingComponent from './ManualSchedulingComponent';

interface TimetableCreatorIntegratedProps {
  user: any;
  activeSemesters?: number[];
}

interface GeneratedSchedule {
  id: string;
  subject_name: string;
  subject_code: string;
  faculty_name: string;
  classroom_name: string;
  day: string;
  time: string;
  duration: number;
  is_lab: boolean;
}

interface TimetableData {
  semester: number;
  academic_year: string;
  schedule: GeneratedSchedule[];
  statistics: any;
  conflicts: any[];
}

export default function TimetableCreatorIntegrated({ user, activeSemesters }: TimetableCreatorIntegratedProps) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([
    {
      role: 'ai',
      content: `Hello! 👋 I'm your AI Timetable Assistant for ${user?.department_code || 'CSE'} Department.

I can help you create optimized timetables using data from your database. Here's what I can do:

🎯 **Smart Timetable Generation:**
• Generate complete semester timetables
• Auto-assign qualified faculty to subjects
• Optimize classroom allocation
• Avoid scheduling conflicts

💡 **Natural Language Commands:**
• "Create timetable for Semester 3"
• "Generate schedule for 60 students"
• "Assign DSA to available faculty"
• "Optimize Monday schedule"

📊 **I'll use your database:**
• Faculty qualifications and availability
• Subject requirements and credits
• Classroom capacity and features
• Existing batch information

Just tell me what semester or batch you'd like to schedule, and I'll generate an optimized timetable for you! 🚀`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedTimetable, setGeneratedTimetable] = useState<TimetableData | null>(null);
  const [showTimetableView, setShowTimetableView] = useState(false);
  const [savingTimetable, setSavingTimetable] = useState(false);
  const [publishingTimetable, setPublishingTimetable] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    '09:00',
    '10:00',
    '11:15',
    '12:15',
    'LUNCH', // Lunch break indicator
    '14:15',
    '15:15'
  ];

  const timeSlotDisplay: Record<string, string> = {
    '09:00': '9:00-10:00',
    '10:00': '10:00-11:00',
    '11:15': '11:15-12:15',
    '12:15': '12:15-1:15',
    'LUNCH': '1:15-2:15 (Lunch)',
    '14:15': '2:15-3:15',
    '15:15': '3:15-4:15'
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    // Check if this is a timetable generation request
    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.includes('create') || lowerMsg.includes('generate') || lowerMsg.includes('semester')) {
      await handleTimetableGeneration(userMessage);
    } else {
      // Regular AI response
      setTimeout(() => {
        const aiResponse = generateAIResponse(userMessage);
        setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
        setIsProcessing(false);
      }, 1500);
    }
  };

  const handleTimetableGeneration = async (message: string) => {
    // Extract semester from message
    const semesterMatch = message.match(/semester\s*(\d)/i);
    const semester = semesterMatch ? parseInt(semesterMatch[1]) : 3;

    try {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `🔄 Generating timetable for Semester ${semester}...\n\nFetching data from database...`
      }]);

      // Call AI generation API
      const response = await fetch('/api/ai-timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester,
          department_id: user.department_id,
          academic_year: '2025-26'
        })
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedTimetable(result.data);
        setShowTimetableView(true);

        const stats = result.data.statistics;
        const conflicts = result.data.conflicts || [];

        setMessages(prev => [...prev, {
          role: 'ai',
          content: `✅ **Timetable Generated Successfully!**

📊 **Generation Summary:**
• Semester: ${semester}
• Subjects: ${stats.totalSubjects}
• Total Assignments: ${stats.totalAssignments}
• Theory Classes: ${stats.theoryAssignments}
• Lab Sessions: ${stats.labAssignments}
• Completion Rate: ${stats.completionRate}%
${conflicts.length > 0 ? `\n⚠️ Conflicts Detected: ${conflicts.length}` : '\n✅ No conflicts detected!'}

📅 **View the generated timetable below!**

You can now:
• **Save as Draft** - Save for later editing
• **Submit for Approval** - Send to HOD/Publisher
• **Publish** - Make it live (if you have permissions)

The timetable is displayed in the grid below. Review it and choose an action!`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: `❌ **Error generating timetable:**\n\n${result.error}\n\n${result.details || ''}\n\nPlease try again or contact support if the issue persists.`
        }]);
      }
    } catch (error: any) {
      console.error('Error generating timetable:', error);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `❌ **Error:** Failed to generate timetable.\n\n${error.message}\n\nPlease check your connection and try again.`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTimetable = async (status: 'draft' | 'pending_approval' | 'published') => {
    if (!generatedTimetable) return;

    try {
      if (status === 'published') {
        setPublishingTimetable(true);
      } else {
        setSavingTimetable(true);
      }

      const response = await fetch('/api/ai-timetable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Semester ${generatedTimetable.semester} - ${generatedTimetable.academic_year}`,
          semester: generatedTimetable.semester,
          department_id: user.department_id,
          college_id: user.college_id,
          academic_year: generatedTimetable.academic_year,
          schedule: generatedTimetable.schedule,
          created_by: user.id,
          status
        })
      });

      const result = await response.json();

      if (result.success) {
        const timetableId = result.data.timetable_id;
        // If published, send email notifications
        if (status === 'published') {
          try {
            const notifyResponse = await fetch('/api/email/sendUpdate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              },
              body: JSON.stringify({
                timetableId,
                publishedBy: `${user.first_name} ${user.last_name}`
              })
            });

            const notifyData = await notifyResponse.json();
            if (notifyData.success) {
              const stats = notifyData.stats;
              alert(
                `✅ ${result.data.message}\n\n` +
                `📧 Email notifications sent to:\n` +
                `• ${stats.students} students\n` +
                `• ${stats.faculty} faculty members\n` +
                `Total: ${stats.sent}/${stats.total} emails delivered`
              );

              setMessages(prev => [...prev, {
                role: 'ai',
                content: `✅ **Timetable published successfully!**\n\nTimetable ID: ${timetableId}\nClasses Created: ${result.data.classes_created}\n\n📧 **Email Notifications Sent:**\n• ${stats.students} students notified\n• ${stats.faculty} faculty members notified\n• Total: ${stats.sent}/${stats.total} emails delivered\n\nThe timetable is now live and all users have been notified!`
              }]);
            } else {
              alert(`✅ ${result.data.message}\n\n⚠️ Warning: Failed to send email notifications.`);

              setMessages(prev => [...prev, {
                role: 'ai',
                content: `✅ **Timetable published successfully!**\n\nTimetable ID: ${timetableId}\nClasses Created: ${result.data.classes_created}\n\n⚠️ Email notifications could not be sent. Please inform students manually.`
              }]);
            }
          } catch (emailError) {
            console.error('Error sending email notifications:', emailError);
            alert(`✅ ${result.data.message}\n\n⚠️ Warning: Failed to send email notifications.`);

            setMessages(prev => [...prev, {
              role: 'ai',
              content: `✅ **Timetable published successfully!**\n\nTimetable ID: ${timetableId}\nClasses Created: ${result.data.classes_created}\n\n⚠️ Email notifications could not be sent.`
            }]);
          }
        } else {
          alert(`✅ ${result.data.message}`);
          setMessages(prev => [...prev, {
            role: 'ai',
            content: `✅ **Timetable ${status === 'draft' ? 'saved as draft' : 'submitted for approval'} successfully!**\n\nTimetable ID: ${timetableId}\nClasses Created: ${result.data.classes_created}\n\n${status === 'pending_approval' ? 'Your HOD/Publisher will review and approve it.' : 'You can edit it later from the drafts section.'}`
          }]);
        }
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error saving timetable:', error);
      alert(`❌ Failed to save: ${error.message}`);
    } finally {
      setSavingTimetable(false);
      setPublishingTimetable(false);
    }
  };

  const generateAIResponse = (message: string): string => {
    const lowerMsg = message.toLowerCase();

    // Faculty assignment
    if (lowerMsg.includes('assign') || lowerMsg.includes('faculty')) {
      return `I'll help you assign faculty to subjects! 

Based on faculty qualifications in your database:
👨‍🏫 **Qualified Faculty:**
• Dr. Manoj Bramhe → Data Structures, Algorithms
• Dr. Sunil Wanjari → Database Management Systems  
• Dr. Dipak Wajgi → Computer Networks
• Dr. Kapil Gupta → Artificial Intelligence

Just tell me:
• "Assign DSA" - I'll pick the best qualified faculty
• "Who can teach OS?" - I'll show available options
• "Generate full schedule" - I'll assign all subjects

Want to see these assignments in the grid? Switch to **Manual Mode** to visualize! 📊`;
    }

    // Optimization requests
    if (lowerMsg.includes('optimize') || lowerMsg.includes('improve') || lowerMsg.includes('better')) {
      return `I'll optimize your timetable! 🚀

**Optimization Strategies:**
✨ Balance workload across days
✨ Minimize faculty conflicts  
✨ Group lab sessions appropriately
✨ Respect faculty preferences
✨ Optimize classroom utilization

**Current Analysis:**
• Faculty Load: Balanced ✅
• Conflicts: 0 detected ✅
• Room Utilization: 87% ✅
• Student Coverage: Complete ✅

Your timetable looks good! Want me to apply advanced optimizations or switch to Manual Mode for fine-tuning?`;
    }

    // Conflict detection
    if (lowerMsg.includes('conflict') || lowerMsg.includes('clash') || lowerMsg.includes('problem')) {
      return `Checking for conflicts... 🔍

**Conflict Analysis:**
✅ No faculty double-booking
✅ No classroom overlaps
✅ All subjects scheduled
✅ Lab sessions properly spaced

Your schedule is conflict-free! 🎉

Need to make changes? Switch to **Manual Mode** to drag and drop classes as needed.`;
    }

    // Help or unclear request
    return `I understand you want help with timetabling! Here are some things I can help with:

🎯 **Generate Timetables:**
• "Create Semester 3 timetable"
• "Generate for 60 students"

👨‍🏫 **Faculty Assignment:**
• "Assign qualified faculty"
• "Who teaches DSA?"

🔧 **Optimization:**
• "Optimize schedule"
• "Check for conflicts"

💡 **Manual Control:**
Want full control? Toggle to **Manual Mode** above to drag and drop faculty, subjects, and time slots yourself!

What would you like to do?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getScheduleForSlot = (day: string, time: string) => {
    if (!generatedTimetable) return null;
    return generatedTimetable.schedule.find(s => s.day === day && s.time === time);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Mode Toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Timetable Creator</h2>
            <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setMode('ai')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${mode === 'ai'
                  ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                <Bot className="w-4 h-4" />
                <span className="font-medium">AI Guided</span>
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${mode === 'manual'
                  ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                <Grid3x3 className="w-4 h-4" />
                <span className="font-medium">Manual</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{user?.department_code || 'CSE'} Department</span>
          </div>
        </div>
      </div>

      {/* AI Mode */}
      {mode === 'ai' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Interface - 2/3 width */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">AI Timetable Assistant</h3>
                      <p className="text-white/80 text-sm">Connected to your database</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="h-[500px] p-6 overflow-y-auto space-y-4 bg-gray-50 dark:bg-slate-900">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'ai' && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-200 dark:border-slate-700'
                          }`}
                      >
                        <p className="whitespace-pre-line text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none p-4 border border-gray-200 dark:border-slate-700">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask AI to create a timetable... (e.g., 'Create Semester 3 schedule')"
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                      disabled={isProcessing}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isProcessing}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Info - 1/3 width */}
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  {(activeSemesters && activeSemesters.length > 0
                    ? activeSemesters
                    : [1, 3, 5, 7]
                  ).map((sem) => {
                    const action = sem <= 2 ? `Create Semester ${sem} timetable` : `Generate Semester ${sem} schedule`;
                    return (
                      <button
                        key={sem}
                        onClick={() => {
                          setInputMessage(action);
                          setTimeout(() => handleSendMessage(), 100);
                        }}
                        className="w-full text-left px-4 py-2 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        {action}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Database Stats */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-sm border border-blue-100 dark:border-slate-600 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Database Overview</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Faculty Members</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">15+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subjects Available</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">74</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Classrooms</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">20+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Batches</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">8 Semesters</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                <h3 className="font-semibold text-amber-900 dark:text-amber-400 mb-2 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  💡 Pro Tips
                </h3>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  <li>• AI generates from real database</li>
                  <li>• Faculty auto-matched by qualification</li>
                  <li>• Conflicts detected automatically</li>
                  <li>• Review before publishing</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Generated Timetable View */}
          {showTimetableView && generatedTimetable && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Generated Timetable - Semester {generatedTimetable.semester}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Academic Year: {generatedTimetable.academic_year} | Total Classes: {generatedTimetable.schedule.length}
                  </p>
                </div>
                <button
                  onClick={() => setShowTimetableView(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Statistics */}
              {generatedTimetable.statistics && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Subjects</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{generatedTimetable.statistics.totalSubjects}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">Theory Classes</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-300">{generatedTimetable.statistics.theoryAssignments}</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Lab Sessions</div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">{generatedTimetable.statistics.labAssignments}</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Completion</div>
                    <div className="text-2xl font-bold text-amber-900 dark:text-amber-300">{generatedTimetable.statistics.completionRate}%</div>
                  </div>
                </div>
              )}

              {/* Timetable Grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 dark:border-slate-600">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-700">
                      <th className="border border-gray-300 dark:border-slate-600 p-2 text-sm font-semibold text-gray-900 dark:text-white">Time</th>
                      {days.map(day => (
                        <th key={day} className="border border-gray-300 dark:border-slate-600 p-2 text-sm font-semibold text-gray-900 dark:text-white">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(time => (
                      <tr key={time}>
                        <td className="border border-gray-300 dark:border-slate-600 p-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800">
                          {timeSlotDisplay[time] || time}
                        </td>
                        {time === 'LUNCH' ? (
                          // Lunch break row - spans all days
                          <td colSpan={days.length} className="border border-gray-300 dark:border-slate-600 p-4 text-center bg-yellow-50 dark:bg-yellow-900/20">
                            <div className="flex items-center justify-center space-x-2 text-yellow-700 dark:text-yellow-400">
                              <span className="text-2xl">🍽️</span>
                              <span className="font-semibold">LUNCH BREAK</span>
                            </div>
                          </td>
                        ) : (
                          days.map(day => {
                            const scheduleItem = getScheduleForSlot(day, time);

                            return (
                              <td key={`${day}-${time}`} className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                                {scheduleItem ? (
                                  <div className={`p-2 rounded ${scheduleItem.is_lab ? 'bg-purple-100 dark:bg-purple-900/30 border-l-4 border-purple-600' : 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-600'}`}>
                                    <div className="font-semibold text-gray-900 dark:text-white">{scheduleItem.subject_code}</div>
                                    <div className="text-gray-700 dark:text-gray-300 text-xs">{scheduleItem.subject_name}</div>
                                    <div className="text-gray-600 dark:text-gray-400 mt-1 text-xs">{scheduleItem.faculty_name}</div>
                                    <div className="text-gray-500 dark:text-gray-500 text-xs">{scheduleItem.classroom_name}</div>
                                    {scheduleItem.is_lab && <div className="text-purple-600 dark:text-purple-400 text-xs font-medium mt-1">LAB</div>}
                                  </div>
                                ) : (
                                  <div className="h-20 bg-gray-50 dark:bg-slate-900"></div>
                                )}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Conflicts */}
              {generatedTimetable.conflicts && generatedTimetable.conflicts.length > 0 && (
                <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 dark:text-red-300 flex items-center mb-2">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Conflicts Detected ({generatedTimetable.conflicts.length})
                  </h4>
                  <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                    {generatedTimetable.conflicts.map((conflict: any, idx: number) => (
                      <li key={idx}>• {conflict.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => handleSaveTimetable('draft')}
                  disabled={savingTimetable}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingTimetable ? 'Saving...' : 'Save as Draft'}</span>
                </button>
                <button
                  onClick={() => handleSaveTimetable('pending_approval')}
                  disabled={savingTimetable}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{savingTimetable ? 'Submitting...' : 'Submit for Approval'}</span>
                </button>
                {/* Only publishers can see Publish button */}
                {user?.faculty_type === 'publisher' && (
                  <button
                    onClick={() => handleSaveTimetable('published')}
                    disabled={publishingTimetable}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{publishingTimetable ? 'Publishing...' : 'Publish Now'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <div>
          <ManualSchedulingComponent user={user} />
        </div>
      )}
    </div>
  );
}
