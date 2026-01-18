import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';

export default function IDUploader({ onDataExtracted, initialData }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(initialData || null);
  const [fileType, setFileType] = useState(initialData?.file_type_1 || null);
  const [error, setError] = useState(null);
  const [detectionResult, setDetectionResult] = useState(initialData?.document_type || null);
  const [preview2, setPreview2] = useState(null);
  const [fileType2, setFileType2] = useState(initialData?.file_type_2 || null);
  const [uploading2, setUploading2] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const [localFile2, setLocalFile2] = useState(null);
  const fileInputRef = React.useRef(null);
  const fileInputRef2 = React.useRef(null);

  React.useEffect(() => {
    if (initialData?.file_url_1) {
      setPreview(initialData.file_url_1 + '#toolbar=0');
    }
    if (initialData?.file_url_2) {
      setPreview2(initialData.file_url_2 + '#toolbar=0');
    }
  }, [initialData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📤 Starting upload:', file.name, file.type);
    setError(null);
    setUploading(true);
    setFileType(file.type);
    setLocalFile(file);
    setPreview(URL.createObjectURL(file));

    try {
      console.log('⬆️ Uploading file...');
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      console.log('✅ Upload result:', uploadResult);
      
      const file_url = uploadResult.file_url;
      console.log('🔗 File URL:', file_url);

      console.log('🤖 Extracting data with AI...');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `נתח את המסמך וחלץ מידע:
      1. זהה האם זה תעודת זהות (יש בה תמונה, מספר ת.ז, שם) או ספח (יש בו רק נתונים טקסטואליים כמו כתובת, ילדים).
      2. החזר JSON עם:
      - document_type: "id_card" (תעודת זהות) או "appendix" (ספח) או "both" (שניהם)
      - first_name (שם פרטי - מהתעודה או הספח)
      - last_name (שם משפחה - מהתעודה או הספח)
      - id_number (מספר ת.ז - 9 ספרות - מהתעודה או הספח)
      - birth_date (תאריך לידה בפורמט DD-MM-YYYY - מהספח)
      - id_issue_date (תאריך הנפקה בפורמט DD-MM-YYYY - מהתעודה)
      - id_expiry_date (תוקף בפורמט DD-MM-YYYY - מהתעודה)
      - gender (male או female - מהספח)
      - address (כתובת מלאה - מהספח)
      - num_children (מספר הילדים - מהספח)
      - children_birth_dates (מערך של תאריכי לידה של ילדים בפורמט DD-MM-YYYY - מהספח)

      אם שדה לא נמצא, השאר אותו ריק. אם לא נמצאו ילדים, החזר מערך ריק.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            id_number: { type: "string" },
            birth_date: { type: "string" },
            id_issue_date: { type: "string" },
            id_expiry_date: { type: "string" },
            gender: { type: "string" },
            address: { type: "string" },
            num_children: { type: "number" },
            children_birth_dates: { 
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      console.log('✅ AI Result:', result);
      setDetectionResult(result.document_type);
      setPreview(file_url + '#toolbar=0');
      const dataWithFiles = { 
        ...result, 
        file_url_1: file_url, 
        file_type_1: file.type 
      };
      setExtractedData(dataWithFiles);
      onDataExtracted?.(dataWithFiles);
      
      if (result.document_type === 'both') {
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 2000);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setError(error.message || 'שגיאה בעיבוד הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload2 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📤 Starting second upload:', file.name);
    setUploading2(true);
    setFileType2(file.type);
    setLocalFile2(file);
    setPreview2(URL.createObjectURL(file));

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploadResult.file_url;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `חלץ מידע נוסף מהמסמך. החזר JSON עם:
      - document_type: "id_card" או "appendix" או "both"
      - first_name, last_name, id_number, birth_date, id_issue_date, id_expiry_date, gender, address
      - num_children (מספר הילדים - מהספח)
      - children_birth_dates (מערך של תאריכי לידה של ילדים בפורמט DD-MM-YYYY - מהספח)

      אם שדה לא נמצא, השאר אותו ריק. אם לא נמצאו ילדים, החזר מערך ריק.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            id_number: { type: "string" },
            birth_date: { type: "string" },
            id_issue_date: { type: "string" },
            id_expiry_date: { type: "string" },
            gender: { type: "string" },
            address: { type: "string" },
            num_children: { type: "number" },
            children_birth_dates: { 
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      // Merge data
      setPreview2(file_url + '#toolbar=0');
      const mergedData = { 
        ...extractedData, 
        ...result, 
        file_url_2: file_url, 
        file_type_2: file.type,
        document_type: 'both'
      };
      setExtractedData(mergedData);
      setDetectionResult('both');
      onDataExtracted?.(mergedData);
      
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 2000);
    } catch (error) {
      console.error('❌ Error:', error);
      setError(error.message || 'שגיאה בעיבוד הקובץ השני');
    } finally {
      setUploading2(false);
    }
  };

  const clearFileOnly = () => {
    setPreview(null);
    setFileType(null);
    const updatedData = { ...extractedData };
    delete updatedData.file_url_1;
    delete updatedData.file_type_1;
    setExtractedData(updatedData);
    onDataExtracted?.(updatedData);
  };

  const clearAll = () => {
    setPreview(null);
    setPreview2(null);
    setExtractedData(null);
    setFileType(null);
    setFileType2(null);
    setDetectionResult(null);
    onDataExtracted?.(null);
  };



  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 overflow-visible">
        {/* Upload Section 1 */}
        <div 
          className="border-2 border-dashed border-blue-300 rounded-xl p-0 bg-blue-50/50 hover:bg-blue-50 transition-colors relative min-h-[300px] cursor-pointer overflow-visible"
          onClick={() => !preview && fileInputRef.current?.click()}
        >
          {preview ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="absolute -top-3 -left-3 bg-red-500 hover:bg-red-600 rounded-full w-7 h-7 p-0 z-50"
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
              
              {showMessage && detectionResult === 'both' && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
                  <div className="bg-green-500 rounded-lg p-4 flex items-center gap-2">
                    <p className="text-sm font-bold text-white">✓ זוהתה תעודת זהות וספח</p>
                  </div>
                </div>
              )}
              
              {fileType === 'application/pdf' ? (
                <iframe 
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(preview.replace('#toolbar=0', ''))}&embedded=true`}
                  className="w-full h-full min-h-[280px] rounded-xl"
                />
              ) : (
                <img src={preview} alt="ID Preview" className="w-full h-full min-h-[280px] object-contain rounded-xl" />
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

        {/* Upload Section 2 - Conditional */}
        {detectionResult && detectionResult !== 'both' && (
          <div 
            className="border-2 border-dashed border-orange-300 rounded-xl p-0 bg-orange-50/50 hover:bg-orange-50 transition-colors relative min-h-[300px] cursor-pointer overflow-visible"
            onClick={() => !preview2 && fileInputRef2.current?.click()}
          >
            {preview2 ? (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview2(null);
                    setFileType2(null);
                  }}
                  className="absolute -top-3 -left-3 bg-red-500 hover:bg-red-600 rounded-full w-7 h-7 p-0 z-50"
                  size="icon"
                >
                  <X className="w-4 h-4" />
                </Button>
                
                {uploading2 && (
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
                    <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                      <p className="text-sm font-medium text-gray-700">מחלץ נתונים...</p>
                    </div>
                  </div>
                )}
                
                {fileType2 === 'application/pdf' ? (
                  <iframe 
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(preview2.replace('#toolbar=0', ''))}&embedded=true`}
                    className="w-full h-full min-h-[280px] rounded-xl"
                  />
                ) : (
                  <img src={preview2} alt="Second Document" className="w-full h-full min-h-[280px] object-contain rounded-xl" />
                )}
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef2}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload2}
                  className="hidden"
                  disabled={uploading2}
                />
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Upload className="w-12 h-12 text-orange-600" />
                  <p className="text-sm font-medium text-gray-700 text-center">
                    {detectionResult === 'id_card' ? 'העלה ספח' : 'העלה תעודת זהות'}
                  </p>
                  <p className="text-xs text-gray-500">תמונה או PDF</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Detection Result Message - Only for incomplete uploads */}
      {detectionResult && detectionResult !== 'both' && (
        <div className="p-3 rounded-lg text-sm font-medium text-center bg-orange-100 text-orange-800 border-2 border-orange-300">
          {detectionResult === 'id_card' && '⚠ זוהתה תעודת זהות - נא להשלים ספח'}
          {detectionResult === 'appendix' && '⚠ זוהה ספח - נא להשלים תעודת זהות'}
        </div>
      )}

      {/* Extracted Data Display */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl ${extractedData ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
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