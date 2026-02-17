'use client';

import { useState } from 'react';
import {
  generateMockStudents,
  deleteMockStudents,
  getStudentSelectionStats,
} from '@/lib/nep/mockStudentGenerator';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface MockStudentGeneratorProps {
  batchId: string;
  bucketIds: string[];
}

export default function MockStudentGenerator({ batchId, bucketIds }: MockStudentGeneratorProps) {
  const { showConfirm } = useConfirm();
  const [count, setCount] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [message, setMessage] = useState('');

  async function handleGenerate() {
    if (bucketIds.length === 0) {
      setMessage('Please create and save at least one elective bucket first');
      return;
    }

    setGenerating(true);
    setMessage('');

    try {
      const result = await generateMockStudents({
        batchId,
        count,
        bucketIds,
      });

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        await loadStats();
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    showConfirm({
      title: 'Delete All Mock Students',
      message: 'Are you sure you want to delete all mock students? This action cannot be undone.',
      confirmText: 'Delete All',
      onConfirm: async () => {
        setDeleting(true);
        setMessage('');

        try {
          const result = await deleteMockStudents(batchId);
          setMessage(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
          
          if (result.success) {
            setStats(null);
          }
        } catch (error) {
          setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setDeleting(false);
        }
      }
    });
  }

  async function loadStats() {
    const statsData = await getStudentSelectionStats(batchId);
    setStats(statsData);
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
      <h3 className="text-xl font-bold text-purple-900 mb-4">Mock Student Generator</h3>
      
      <p className="text-sm text-purple-700 mb-4">
        Generate test students with random Major/Minor selections to test the scheduler.
        Each student will randomly choose subjects from each elective bucket.
      </p>

      <div className="flex gap-4 items-end mb-4">
        <div>
          <label className="block text-sm font-medium text-purple-800 mb-2">
            Number of Students
          </label>
          <input
            type="number"
            min="1"
            max="200"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 50)}
            className="w-32 px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || bucketIds.length === 0}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating...' : 'Generate Students'}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete All Mock Students'}
        </button>

        {stats && (
          <button
            onClick={loadStats}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Stats
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {stats && stats.totalStudents > 0 && (
        <div className="bg-white rounded-lg p-4 border border-purple-200 mt-4">
          <h4 className="font-bold text-purple-900 mb-3">
            Student Selection Statistics ({stats.totalStudents} students)
          </h4>
          
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-100 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Subject Code</th>
                  <th className="text-left px-3 py-2">Subject Name</th>
                  <th className="text-right px-3 py-2">Students Enrolled</th>
                  <th className="text-right px-3 py-2">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {stats.selections.map((selection: any, index: number) => (
                  <tr key={index} className="border-t border-purple-100">
                    <td className="px-3 py-2 font-mono text-xs">{selection.code}</td>
                    <td className="px-3 py-2">{selection.name}</td>
                    <td className="px-3 py-2 text-right font-bold">{selection.count}</td>
                    <td className="px-3 py-2 text-right text-purple-700">
                      {((selection.count / stats.totalStudents) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bucketIds.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-yellow-800 text-sm">
          ⚠️ Please create and save elective buckets before generating students
        </div>
      )}
    </div>
  );
}
