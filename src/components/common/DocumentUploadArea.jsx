import React, { useState } from 'react';
import { Upload, Loader2, X, File } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function DocumentUploadArea({ onDocumentUpload, onPreviewChange }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          url: file_url,
          size: (file.size / 1024 / 1024).toFixed(2),
          type: file.type
        };
        setUploadedFiles(prev => [...prev, newFile]);
        
        // Set preview if it's an image
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (onPreviewChange) {
              onPreviewChange(e.target.result);
            }
          };
          reader.readAsDataURL(file);
        }
        
        if (onDocumentUpload) {
          onDocumentUpload(newFile);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="w-full">
      <label
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center w-full h-32 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }
        `}
      >
        <input
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
          accept="*/*"
        />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="text-sm text-gray-600">מעלה...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-400" />
              <div className="text-center">
                <span className="text-sm text-gray-600">גרור קבצים לכאן או </span>
                <span className="text-sm font-semibold text-blue-600">לחץ לבחירה</span>
              </div>
            </>
          )}
        </div>
      </label>

      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">קבצים שהועלו:</h3>
          <div className="space-y-2">
            {uploadedFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 flex-1 hover:text-blue-600"
                >
                  <File className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{file.size} MB</p>
                  </div>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}