/**
 * CourseMaterialsViewer Component
 * 
 * Display and manage course materials with category organization
 */

'use client';

import React, { useState } from 'react';
import { FileText, Download, Trash2, Folder, File, Presentation, Image as ImageIcon } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { useCourseMaterialUpload } from '@/hooks/useCourseMaterialUpload';
import { formatMaterialSize, type CourseMaterial } from '@/lib/storage/course-materials';

interface CourseMaterialsViewerProps {
  subjectId: string;
  subjectName: string;
  isFaculty?: boolean;
}

const categories = [
  { value: 'lectures', label: 'Lectures', icon: Presentation },
  { value: 'notes', label: 'Notes', icon: FileText },
  { value: 'assignments', label: 'Assignments', icon: File },
  { value: 'exams', label: 'Past Exams', icon: FileText },
  { value: 'misc', label: 'Miscellaneous', icon: Folder },
];

const getMaterialIcon = (type: CourseMaterial['type']) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />;
    case 'doc':
      return <FileText className="w-5 h-5 text-blue-600" />;
    case 'ppt':
      return <Presentation className= "w-5 h-5 text-orange-500" />;
    case 'image':
      return <ImageIcon className="w-5 h-5 text-green-500" />;
    default:
      return <File className="w-5 h-5 text-gray-500" />;
  }
};

export function CourseMaterialsViewer({
  subjectId,
  subjectName,
  isFaculty = false,
}: CourseMaterialsViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('lectures');
  
  const {
    upload,
    uploadMultiple,
    remove,
    uploading,
    loading,
    error,
    materials,
  } = useCourseMaterialUpload(subjectId, selectedCategory);

  const handleDownload = async (material: CourseMaterial) => {
    // Open in new tab for download
    window.open(material.url, '_blank');
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const results = await uploadMultiple(files);
    const successCount = results.filter(r => r.success).length;
    alert(`${successCount}/${results.length} files uploaded successfully`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{subjectName}</h2>
        <p className="text-sm text-gray-600 mt-1">Course Materials</p>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Categories">
          {categories.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedCategory(value)}
              className={`
                flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${selectedCategory === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Upload Zone (Faculty Only) */}
      {isFaculty && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            Upload to {categories.find(c => c.value === selectedCategory)?.label}
          </h3>
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            uploading={uploading}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.txt"
            maxSize={20}
            multiple={true}
            error={error}
          />
        </div>
      )}

      {/* Materials List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {categories.find(c => c.value === selectedCategory)?.label}
        </h3>

        {loading && (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            Loading materials...
          </div>
        )}

        {!loading && materials.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No materials uploaded yet</p>
            {isFaculty && (
              <p className="text-sm text-gray-500 mt-1">Upload files using the form above</p>
            )}
          </div>
        )}

        {!loading && materials.length > 0 && (
          <div className="grid gap-3">
            {materials.map((material, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {getMaterialIcon(material.type)}
                </div>

                {/* Material Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {material.name.replace(/^\d+_/, '')} {/* Remove timestamp prefix */}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatMaterialSize(material.size)} • Uploaded {new Date(material.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(material)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Delete Button (Faculty Only) */}
                  {isFaculty && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this material?')) {
                          remove(material.filePath);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
