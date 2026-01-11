import React, { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SimpleFileUpload({ onFileUpload }) {
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (onFileUpload) {
        onFileUpload({ url: file_url, name: file.name, preview: preview });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('שגיאה בהעלאת הקובץ');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex gap-4">
      <div className="w-64">
        <label className="flex flex-col items-center justify-center w-full h-32 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer border-gray-300 bg-gray-50 hover:border-gray-400">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
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
                <span className="text-sm text-gray-600">העלה תעודת זהות</span>
              </>
            )}
          </div>
        </label>
      </div>

      <div className="w-48 h-32 border-2 border-blue-200 rounded-lg bg-blue-50 relative flex items-center justify-center overflow-hidden">
        {preview ? (
          <>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors z-10"
            >
              ✕
            </button>
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          </>
        ) : (
          <p className="text-gray-400 text-sm">תצוגה מקדימה</p>
        )}
      </div>
    </div>
  );
}