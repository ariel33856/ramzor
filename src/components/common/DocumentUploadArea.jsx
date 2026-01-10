import React, { useState } from 'react';
import { Upload, Loader2, X, File, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function DocumentUploadArea({ onDocumentUpload, onPreviewChange }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [aiDetectionStatus, setAiDetectionStatus] = useState({});
  const [error, setError] = useState(null);

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
    setError(null);
    try {
      for (const file of Array.from(files)) {
        try {
          console.log('Uploading file:', file.name);
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          console.log('File uploaded:', file_url);
          const fileId = Date.now() + Math.random();
          const newFile = {
            id: fileId,
            name: file.name,
            url: file_url,
            size: (file.size / 1024 / 1024).toFixed(2),
            type: file.type
          };
          setUploadedFiles(prev => [...prev, newFile]);
          
          if (onDocumentUpload) {
            onDocumentUpload(newFile);
          }
          
          // Run AI detection in background if it's an image
          if (file.type.startsWith('image/')) {
            setAiDetectionStatus(prev => ({ ...prev, [fileId]: 'detecting' }));
            const reader = new FileReader();
            reader.onload = (e) => {
              runHumanDetection(file_url, e.target.result, fileId);
            };
            reader.readAsDataURL(file);
          } else {
            setAiDetectionStatus(prev => ({ ...prev, [fileId]: 'not-image' }));
          }
        } catch (fileError) {
          console.error('Error uploading file:', file.name, fileError);
          setError(`שגיאה בהעלאת קובץ: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('שגיאה בהעלאת הקבצים');
    } finally {
      setIsUploading(false);
    }
  };

  const runHumanDetection = async (file_url, base64Image, fileId) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: "בדוק בעיון את התמונה. האם יש בה דמות אנושית אמיתית (אדם/בני אדם)? ענה רק בודק בעיון וודא שזו דמות אנושית בפועל ולא אובייקט, בעל חיים, או דיוקן. אם כן, תן קואורדינטות בפורמט JSON שמכסות את הדמות כולה בדיוק: {\"has_human\": true, \"x\": <starting x percent>, \"y\": <starting y percent>, \"width\": <width percent>, \"height\": <height percent>} אם אין דמות אנושית, החזר בדיוק {\"has_human\": false}",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            has_human: { type: "boolean" },
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" }
          }
        }
      });

      console.log('Detection result:', result);
      
      const hasHuman = result?.has_human === true;
      setAiDetectionStatus(prev => ({ 
        ...prev, 
        [fileId]: hasHuman ? 'detected' : 'not-detected' 
      }));

      if (hasHuman && onPreviewChange && result?.x !== undefined) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const x = (result.x / 100) * img.width;
          const y = (result.y / 100) * img.height;
          const width = (result.width / 100) * img.width;
          const height = (result.height / 100) * img.height;

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
          const croppedImage = canvas.toDataURL();

          onPreviewChange(croppedImage);
        };
        img.src = base64Image;
      } else if (hasHuman && onPreviewChange) {
        onPreviewChange(base64Image);
      }
    } catch (error) {
      console.error('AI detection error:', error);
      setAiDetectionStatus(prev => ({ ...prev, [fileId]: 'not-detected' }));
    }
  };




  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
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
                <div className="flex-1">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-blue-600"
                  >
                    <File className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{file.size} MB</p>
                    </div>
                  </a>
                  <div className="mt-1 ml-6">
                    {file.type.startsWith('image/') && !aiDetectionStatus[file.id] && (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin" /> בדיקת תמונה...
                      </span>
                    )}
                    {aiDetectionStatus[file.id] === 'detecting' && (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin" /> בדיקה...
                      </span>
                    )}
                    {aiDetectionStatus[file.id] === 'detected' && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> בנאדם זוהה
                      </span>
                    )}
                    {aiDetectionStatus[file.id] === 'not-detected' && (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        <AlertCircle className="w-3 h-3" /> לא זוהה בנאדם
                      </span>
                    )}
                    {aiDetectionStatus[file.id] === 'error' && (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        <AlertCircle className="w-3 h-3" /> שגיאה בבדיקה
                      </span>
                    )}
                  </div>
                </div>
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