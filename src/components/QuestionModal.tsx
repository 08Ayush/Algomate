'use client';

import { useState } from 'react';
import { X, Upload, Plus, Trash2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  id: string;
  text: string;
  is_correct: boolean;
}

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: any) => void;
  questionType?: 'MCQ' | 'MSQ' | 'FILL_BLANK' | 'ESSAY' | 'CODING';
}

export default function QuestionModal({ isOpen, onClose, onSave, questionType = 'MCQ' }: QuestionModalProps) {
  const [type, setType] = useState(questionType);
  const [questionText, setQuestionText] = useState('');
  const [description, setDescription] = useState('');
  const [marks, setMarks] = useState('1');
  const [negativeMarking, setNegativeMarking] = useState('0');
  const [difficulty, setDifficulty] = useState('Medium');
  const [options, setOptions] = useState<Option[]>([
    { id: '1', text: '', is_correct: false },
    { id: '2', text: '', is_correct: false }
  ]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: '', is_correct: false }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(opt => opt.id !== id));
    }
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleCorrectChange = (id: string) => {
    if (type === 'MCQ') {
      // For MCQ, only one correct answer
      setOptions(options.map(opt => ({ ...opt, is_correct: opt.id === id })));
    } else {
      // For MSQ, multiple correct answers
      setOptions(options.map(opt => opt.id === id ? { ...opt, is_correct: !opt.is_correct } : opt));
    }
  };

  const handleSave = () => {
    if (!questionText.trim()) {
      alert('Please enter a question');
      return;
    }

    if ((type === 'MCQ' || type === 'MSQ') && options.every(opt => !opt.text.trim())) {
      alert('Please add at least one option');
      return;
    }

    if ((type === 'MCQ' || type === 'MSQ') && !options.some(opt => opt.is_correct)) {
      alert('Please mark at least one correct answer');
      return;
    }

    const questionData: any = {
      question_text: questionText,
      question_type: type,
      marks: parseFloat(marks),
      negative_marking: parseFloat(negativeMarking),
      question_data: {}
    };

    if (description) {
      questionData.question_data.description = description;
    }

    if (type === 'MCQ' || type === 'MSQ') {
      questionData.question_data.options = options.filter(opt => opt.text.trim());
    }

    if (difficulty) {
      questionData.question_data.difficulty = difficulty;
    }

    onSave(questionData);
    handleClose();
  };

  const handleClose = () => {
    setQuestionText('');
    setDescription('');
    setMarks('1');
    setNegativeMarking('0');
    setDifficulty('Medium');
    setOptions([
      { id: '1', text: '', is_correct: false },
      { id: '2', text: '', is_correct: false }
    ]);
    setImageFile(null);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4D869C]/10 rounded-lg">
              <HelpCircle className="w-5 h-5 text-[#4D869C]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Add Question</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
            >
              <option value="MCQ">Multiple Choice</option>
              <option value="MSQ">Multiple Select</option>
              <option value="FILL_BLANK">Fill in the Blank</option>
              <option value="ESSAY">Essay</option>
              <option value="CODING">Coding</option>
            </select>
          </div>

          {/* Question Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question Text <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
              placeholder="e.g. What is the capital of France?"
            />
          </div>

          {/* Question Image (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Question Image (Optional)</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#4D869C] hover:bg-[#4D869C]/5 transition-colors cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer w-full h-full block">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-gray-600 font-medium text-sm">
                  {imageFile ? imageFile.name : 'Click to upload image'}
                </p>
                <p className="text-gray-400 text-xs mt-1">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>
          </div>

          {/* Question Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description / Instructions</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all resize-none"
              placeholder="Add additional details or context..."
            />
          </div>

          {/* Answer Options (for MCQ/MSQ) */}
          {(type === 'MCQ' || type === 'MSQ') && (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-4">Answer Options</label>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-3">
                    {/* Radio/Checkbox */}
                    <div className="flex-shrink-0">
                      {type === 'MCQ' ? (
                        <button
                          type="button"
                          onClick={() => handleCorrectChange(option.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${option.is_correct
                              ? 'bg-[#4D869C] border-[#4D869C] shadow-sm'
                              : 'border-gray-300 hover:border-[#4D869C]'
                            }`}
                        >
                          {option.is_correct && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCorrectChange(option.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${option.is_correct
                              ? 'bg-[#4D869C] border-[#4D869C] shadow-sm'
                              : 'border-gray-300 hover:border-[#4D869C]'
                            }`}
                        >
                          {option.is_correct && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Option Letter */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-gray-500">
                        {String.fromCharCode(65 + index)}
                      </span>
                    </div>

                    {/* Option Input */}
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(option.id, e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all shadow-sm"
                      placeholder={`Option ${index + 1}`}
                    />

                    {/* Remove Button */}
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(option.id)}
                        className="flex-shrink-0 p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Option Button */}
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-[#4D869C] hover:bg-blue-50 hover:border-blue-100 transition-all text-sm font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Option</span>
              </button>
            </div>
          )}

          {/* Points and Difficulty */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Points</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                min="0"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
              <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all appearance-none"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Negative Marking (for MCQ/MSQ) */}
          {(type === 'MCQ' || type === 'MSQ') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Negative Marking</label>
              <input
                type="number"
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                min="0"
                step="0.25"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex justify-end gap-3 z-10 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2.5 rounded-xl bg-[#4D869C] hover:bg-[#3a6d80] text-white font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Add Question
          </button>
        </div>
      </motion.div>
    </div>
  );
}
