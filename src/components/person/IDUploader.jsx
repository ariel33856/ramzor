import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function IDUploader({ onDataExtracted }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📤 Starting upload:', file.name, file.type);
    setError(null);
    setUploading(true);
    setFileType(file.type);
    setPreview(URL.createObjectURL(file));

    try {
      console.log('⬆️ Uploading file...');
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      console.log('✅ Upload result:', uploadResult);
      
      const file_url = uploadResult.file_url;
      console.log('🔗 File URL:', file_url);

      console.log('🤖 Extracting data with AI...');
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
      console.error('❌ Error:', error);
      setError(error.message || 'שגיאה בעיבוד הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const clearFileOnly = () => {
    setPreview(null);
    setFileType(null);
  };

  const clearAll = () => {
    setPreview(null);
    setExtractedData(null);
    setFileType(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        {/* Upload Section */}
        <div 
          className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50/50 hover:bg-blue-50 transition-colors relative min-h-[300px] cursor-pointer"
          onClick={() => !preview && fileInputRef.current?.click()}
        >
          {preview ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 rounded-full w-7 h-7 p-0 z-10"
                    size="icon"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">?ברצונך להסיר גם את הנתונים מהשדות</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex justify-center gap-3">
                    <AlertDialogCancel className="bg-green-500 hover:bg-green-600 text-white px-6">ביטול</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={clearFileOnly}
                      className="bg-orange-500 hover:bg-orange-600 px-6"
                    >
                      לא, מחק את הקובץ אך אל תמחק את הנתונים
                    </AlertDialogAction>
                    <AlertDialogAction 
                      onClick={clearAll}
                      className="bg-red-500 hover:bg-red-600 px-6"
                    >
                      כן
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
                  <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm font-medium text-gray-700">מחלץ נתונים...</p>
                  </div>
                </div>
              )}
              
              {fileType === 'application/pdf' ? (
                <iframe 
                  src={preview} 
                  className="w-full h-full min-h-[280px] rounded"
                  title="PDF Preview"
                />
              ) : (
                <img src={preview} alt="ID Preview" className="w-full h-full min-h-[280px] object-contain rounded" />
              )}
            </>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex flex-col items-center justify-center h-full gap-3">
                {uploading ? (
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                ) : (
                  <Upload className="w-12 h-12 text-blue-600" />
                )}
                <p className="text-sm font-medium text-gray-700 text-center">
                  {uploading ? 'מעלה ומחלץ מידע...' : 'לחץ להעלאת תעודת זהות'}
                </p>
                <p className="text-xs text-gray-500">תמונה או PDF</p>
              </div>
            </>
          )}
        </div>

        {/* Empty placeholder */}
        <div></div>
      </div>

      {/* Extracted Data Display */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl ${extractedData ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
        <div>
          <Label className="text-xs text-gray-600">שם פרטי</Label>
          <Input value={extractedData?.first_name || ''} readOnly className="bg-white" />
        </div>
        <div>
          <Label className="text-xs text-gray-600">שם משפחה</Label>
          <Input value={extractedData?.last_name || ''} readOnly className="bg-white" />
        </div>
        <div>
          <Label className="text-xs text-gray-600">ת.ז</Label>
          <Input value={extractedData?.id_number || ''} readOnly className="bg-white" />
        </div>
        <div>
          <Label className="text-xs text-gray-600">תאריך לידה</Label>
          <Input value={extractedData?.birth_date || ''} readOnly className="bg-white" />
        </div>
        <div>
          <Label className="text-xs text-gray-600">תאריך הנפקה</Label>
          <Input value={extractedData?.id_issue_date || ''} readOnly className="bg-white" />
        </div>
        <div>
          <Label className="text-xs text-gray-600">תוקף</Label>
          <Input value={extractedData?.id_expiry_date || ''} readOnly className="bg-white" />
        </div>
        <div>
          <Label className="text-xs text-gray-600">מין</Label>
          <Input value={extractedData?.gender === 'male' ? 'זכר' : extractedData?.gender === 'female' ? 'נקבה' : ''} readOnly className="bg-white" />
        </div>
        <div className="md:col-span-1">
          <Label className="text-xs text-gray-600">כתובת</Label>
          <Input value={extractedData?.address || ''} readOnly className="bg-white" />
        </div>
      </div>
    </div>
  );
}