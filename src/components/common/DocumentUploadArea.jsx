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
      // 1. Strict Object Detection for ID Cards / Portraits
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Analyze this image, which is likely an ID card, passport, or document.
          Locate the main human portrait (face and shoulders).
          Return the bounding box coordinates as STRICT PERCENTAGES (0-100) relative to the full image dimensions.
          
          Required Output JSON:
          {
            "has_human": true,
            "x": number,      // Left edge % (0-100)
            "y": number,      // Top edge % (0-100)
            "width": number,  // Width % (0-100)
            "height": number  // Height % (0-100)
          }

          Rules:
          1. Focus ONLY on the face and immediate shoulder area.
          2. Ignore the rest of the ID card or background.
          3. If multiple faces, pick the largest/central one (the ID photo).
          4. If no face is found, return {"has_human": false}.
        `,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            has_human: { type: "boolean" },
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" }
          },
          required: ["has_human"]
        }
      });

      console.log('AI Detection Result:', result);

      const hasHuman = result?.has_human === true;
      setAiDetectionStatus(prev => ({
        ...prev,
        [fileId]: hasHuman ? 'detected' : 'not-detected'
      }));

      // Validate coordinates existence
      if (hasHuman && onPreviewChange && 
          typeof result.x === 'number' && 
          typeof result.y === 'number' && 
          typeof result.width === 'number' && 
          typeof result.height === 'number') {

        const img = new Image();
        img.crossOrigin = "anonymous"; // Good practice, though usually base64
        
        img.onload = () => {
          // 2. Coordinate Normalization
          const actualWidth = img.naturalWidth || img.width;
          const actualHeight = img.naturalHeight || img.height;

          // Convert % to pixels
          const boxX = (result.x / 100) * actualWidth;
          const boxY = (result.y / 100) * actualHeight;
          const boxW = (result.width / 100) * actualWidth;
          const boxH = (result.height / 100) * actualHeight;

          // 3. Fixed Square Logic (Center + Padding)
          const centerX = boxX + (boxW / 2);
          const centerY = boxY + (boxH / 2);

          // Square size: largest dimension + 20% padding
          const maxDim = Math.max(boxW, boxH);
          const squareSize = maxDim * 1.2;
          
          // Initial top-left for the square (centered)
          let cropX = centerX - (squareSize / 2);
          let cropY = centerY - (squareSize / 2);

          // 4. Boundary Clamping (Shift, Don't Shrink if possible)
          // Shift horizontally
          if (cropX < 0) {
            cropX = 0;
          } else if (cropX + squareSize > actualWidth) {
            cropX = actualWidth - squareSize;
          }
          
          // Shift vertically
          if (cropY < 0) {
            cropY = 0;
          } else if (cropY + squareSize > actualHeight) {
            cropY = actualHeight - squareSize;
          }

          // 5. Final Safety: Ensure we don't go out of bounds (if square > image)
          // This technically shrinks if the image is too small for the requested padding,
          // but guarantees no empty space.
          const finalSquareSize = Math.min(squareSize, actualWidth, actualHeight);
          
          // Re-clamp in case size changed
          const finalCropX = Math.max(0, Math.min(cropX, actualWidth - finalSquareSize));
          const finalCropY = Math.max(0, Math.min(cropY, actualHeight - finalSquareSize));

          // 6. Rendering
          const canvas = document.createElement('canvas');
          canvas.width = finalSquareSize;
          canvas.height = finalSquareSize;
          const ctx = canvas.getContext('2d');

          // Draw the cropped portion
          ctx.drawImage(
            img,
            finalCropX, finalCropY,       // Source x, y
            finalSquareSize, finalSquareSize, // Source width, height
            0, 0,                         // Dest x, y
            finalSquareSize, finalSquareSize  // Dest width, height
          );

          const croppedImage = canvas.toDataURL('image/jpeg', 0.95);
          onPreviewChange(croppedImage);
        };

        img.src = base64Image;
      } else if (hasHuman && onPreviewChange) {
        // Fallback if coordinates missing
        onPreviewChange(base64Image);
      }
    } catch (error) {
      console.error('AI detection error:', error);
      setAiDetectionStatus(prev => ({ ...prev, [fileId]: 'error' }));
      // Optional: fallback to original image on error?
      // onPreviewChange(base64Image); 
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