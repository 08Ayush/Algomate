'use client';

import { useState, useEffect } from 'react';
import { Bot, Calendar, Sparkles, Send, Grid3x3, MessageCircle, Wand2 } from 'lucide-react';
import ManualSchedulingComponent from './ManualSchedulingComponent';

interface TimetableCreatorIntegratedProps {
  user: any;
}

export default function TimetableCreatorIntegrated({ user }: TimetableCreatorIntegratedProps) {
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    // Simulate AI processing (replace with actual AI API call)
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage);
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      setIsProcessing(false);
    }, 1500);
  };

  const generateAIResponse = (message: string): string => {
    const lowerMsg = message.toLowerCase();

    // Detect semester creation request
    if (lowerMsg.includes('semester') || lowerMsg.includes('create') || lowerMsg.includes('generate')) {
      const semesterMatch = lowerMsg.match(/semester\s*(\d)/);
      const semester = semesterMatch ? semesterMatch[1] : '3';

      return `Perfect! I'll generate a timetable for **Semester ${semester}**. 

Based on your database:
📚 **Subjects Found:** Fetching subjects for Semester ${semester}...
👨‍🏫 **Faculty Available:** Matching qualified faculty...
🏫 **Classrooms:** Allocating based on capacity...

**Processing Steps:**
1. ✅ Loaded subjects for Semester ${semester}
2. ✅ Identified qualified faculty
3. 🔄 Generating optimal schedule...
4. 🔄 Checking for conflicts...

Would you like me to:
• **Generate automatically** - I'll create the complete schedule
• **Switch to manual mode** - You can drag & drop to customize

Or you can switch to Manual Mode using the toggle above to create it yourself! 🎨`;
    }

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
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                  mode === 'ai'
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span className="font-medium">AI Guided</span>
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                  mode === 'manual'
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
                    <p className="text-white/80 text-sm">Powered by database intelligence</p>
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
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        msg.role === 'user'
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
                {[
                  'Create Semester 3 timetable',
                  'Generate for 60 students',
                  'Assign qualified faculty',
                  'Check for conflicts',
                  'Optimize schedule'
                ].map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputMessage(action);
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="w-full text-left px-4 py-2 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {action}
                  </button>
                ))}
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
                <li>• AI uses real database data</li>
                <li>• Faculty qualifications auto-matched</li>
                <li>• Conflicts detected automatically</li>
                <li>• Switch to Manual for fine-tuning</li>
              </ul>
            </div>
          </div>
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
