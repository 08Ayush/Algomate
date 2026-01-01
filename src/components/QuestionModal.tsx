'use client';

import { useState } from 'react';
import { X, Upload, Plus, Trash2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Add Question</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Question Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Question Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter question title"
            />
          </div>

          {/* Question Image (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Question Image (Optional)</label>
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-400 text-sm">
                  {imageFile ? imageFile.name : 'Click to upload image or drag and drop'}
                </p>
                <p className="text-gray-500 text-xs mt-1">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>
          </div>

          {/* Question Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Question Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Enter question description or instructions"
            />
          </div>

          {/* Answer Options (for MCQ/MSQ) */}
          {(type === 'MCQ' || type === 'MSQ') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Answer Options</label>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center space-x-3">
                    {/* Radio/Checkbox */}
                    <div className="flex-shrink-0">
                      {type === 'MCQ' ? (
                        <button
                          type="button"
                          onClick={() => handleCorrectChange(option.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            option.is_correct
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-slate-600 hover:border-blue-500'
                          }`}
                        >
                          {option.is_correct && (
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCorrectChange(option.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            option.is_correct
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-slate-600 hover:border-blue-500'
                          }`}
                        >
                          {option.is_correct && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Option Letter */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-300">
                        {String.fromCharCode(65 + index)}
                      </span>
                    </div>

                    {/* Option Input */}
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(option.id, e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={`Option ${index + 1}`}
                    />

                    {/* Remove Button */}
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(option.id)}
                        className="flex-shrink-0 p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400 hover:text-red-300"
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
                className="mt-3 flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 hover:bg-slate-700 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Option</span>
              </button>
            </div>
          )}

          {/* Points and Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Points</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                min="0"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Negative Marking (for MCQ/MSQ) */}
          {(type === 'MCQ' || type === 'MSQ') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Negative Marking</label>
              <input
                type="number"
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                min="0"
                step="0.25"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-6 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-800 transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
}
