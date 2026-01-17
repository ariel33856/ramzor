import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function IDUploader({ onDataExtracted }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [fileType, setFileType] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFileType(file.type);
    setPreview(URL.createObjectURL(file));

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data using AI
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `חלץ מידע מתעודת זהות ישראלית. החזר JSON בלבד עם השדות הבאים:
- first_name (שם פרטי)
- last_name (שם משפחה)
- id_number (מספר ת.ז - 9 ספרות)
- birth_date (תאריך לידה בפורמט DD-MM-YYYY)
- id_issue_date (תאריך הנפקה בפורמט DD-MM-YYYY)
- id_expiry_date (תוקף בפורמט DD-MM-YYYY)
- gender (male או female)
- address (כתובת מלאה)

אם שדה לא נמצא, השאר אותו ריק.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            id_number: { type: "string" },
            birth_date: { type: "string" },
            id_issue_date: { type: "string" },
            id_expiry_date: { type: "string" },
            gender: { type: "string" },
            address: { type: "string" }
          }
        }
      });

      console.log('✅ AI Result:', result);
      setExtractedData(result);
      onDataExtracted?.(result);
    } catch (error) {
      console.error('Error extracting ID data:', error);
    } finally {
      setUploading(false);
    }
  };

  const clearData = () => {
    setPreview(null);
    setExtractedData(null);
    setFileType(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50/50 hover:bg-blue-50 transition-colors">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="id-upload"
            disabled={uploading}
          />
          <label htmlFor="id-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 text-blue-600" />
              )}
              <p className="text-sm font-medium text-gray-700 text-center">
                {uploading ? 'מעלה ומחלץ מידע...' : 'לחץ להעלאת תעודת זהות'}
              </p>
            </div>
          </label>
        </div>

        {/* Preview Section */}
        <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50 relative">
          {preview ? (
            <>
              <Button
                onClick={clearData}
                className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 rounded-full w-7 h-7 p-0 z-10"
                size="icon"
              >
                <X className="w-4 h-4" />
              </Button>
              {fileType === 'application/pdf' ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <svg className="w-16 h-16 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"/>
                  </svg>
                  <p className="text-sm font-medium text-gray-700">PDF הועלה</p>
                </div>
              ) : (
                <img src={preview} alt="ID Preview" className="w-full h-full object-contain rounded" />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              תצוגה מקדימה
            </div>
          )}
        </div>
      </div>

      {/* Extracted Data Display */}
      {extractedData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <div>
            <Label className="text-xs text-gray-600">שם פרטי</Label>
            <Input value={extractedData.first_name || ''} readOnly className="bg-white" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">שם משפחה</Label>
            <Input value={extractedData.last_name || ''} readOnly className="bg-white" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">ת.ז</Label>
            <Input value={extractedData.id_number || ''} readOnly className="bg-white" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">תאריך לידה</Label>
            <Input value={extractedData.birth_date || ''} readOnly className="bg-white" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">תאריך הנפקה</Label>
            <Input value={extractedData.id_issue_date || ''} readOnly className="bg-white" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">תוקף</Label>
            <Input value={extractedData.id_expiry_date || ''} readOnly className="bg-white" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">מין</Label>
            <Input value={extractedData.gender === 'male' ? 'זכר' : extractedData.gender === 'female' ? 'נקבה' : ''} readOnly className="bg-white" />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs text-gray-600">כתובת</Label>
            <Input value={extractedData.address || ''} readOnly className="bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}