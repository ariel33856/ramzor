import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';

export default function IDUploader({ onDataExtracted, initialData, gender, setGender }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(initialData || null);
  const [fileType, setFileType] = useState(initialData?.file_type_1 || null);
  const [error, setError] = useState(null);
  const [detectionResult, setDetectionResult] = useState(initialData?.document_type || null);
  const [idType, setIdType] = useState(initialData?.id_type || null); // biometric or regular
  const [preview2, setPreview2] = useState(null);
  const [fileType2, setFileType2] = useState(initialData?.file_type_2 || null);
  const [uploading2, setUploading2] = useState(false);
  const [preview3, setPreview3] = useState(null);
  const [fileType3, setFileType3] = useState(initialData?.file_type_3 || null);
  const [uploading3, setUploading3] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const [localFile2, setLocalFile2] = useState(null);
  const [localFile3, setLocalFile3] = useState(null);
  const fileInputRef = React.useRef(null);
  const fileInputRef2 = React.useRef(null);
  const fileInputRef3 = React.useRef(null);

  React.useEffect(() => {
    if (initialData?.file_url_1) {
      setPreview(initialData.file_url_1);
    }
    if (initialData?.file_url_2) {
      setPreview2(initialData.file_url_2);
    }
    if (initialData?.gender && setGender) {
      setGender(initialData.gender);
    }
  }, [initialData]);

  const convertImageToPdf = async (file) => {
    if (!file.type.includes('image')) return file;
    
    console.log('🖼️ Converting image to PDF...');
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width, img.height]
    });

    pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
    
    // Convert PDF to blob
    const blob = pdf.output('blob');
    return new File([blob], file.name.replace(/\.[^/.]+$/, '.pdf'), { type: 'application/pdf' });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📤 Starting upload:', file.name, file.type);
    setError(null);
    setUploading(true);
    setLocalFile(file);

    try {
      let uploadFile = file;
      if (file.type.includes('image')) {
        uploadFile = await convertImageToPdf(file);
        setFileType('application/pdf');
      } else {
        setFileType(file.type);
      }

      console.log('⬆️ Uploading file...');
      const uploadResult = await base44.integrations.Core.UploadFile({ file: uploadFile });
      console.log('✅ Upload result:', uploadResult);
      
      const file_url = uploadResult.file_url;
      console.log('🔗 File URL:', file_url);
      setPreview(file_url);

      console.log('🤖 Extracting data with AI...');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `נתח את המסמך וחלץ מידע:
      1. זהה האם זה תעודת זהות (יש בה תמונה, מספר ת.ז, שם) או ספח (יש בו רק נתונים טקסטואליים כמו כתובת, ילדים).
      2. אם זה תעודת זהות - זהה אם היא ביומטרית או רגילה:
         - ביומטרית: יש שבב זהוב (chip) בצד שמאל, עיצוב כחול בהיר, הולוגרמות, כוכבים, תמונה גדולה של החזית של הפנים, "ISRAEL" בחלק העליון, פס ספרות בתחתית הצד, שדה NFC/chip ברור
         - רגילה: אין שבב, עיצוב כחול כהה יותר, פחות הולוגרמות, עיצוב פשוט יותר
      3. החזר JSON עם:
      - document_type: "id_card" (תעודת זהות) או "appendix" (ספח) או "both" (שניהם)
      - id_type: "ביומטרית" או "רגילה" - זוהה מתעודת זהות בלבד
      - first_name (שם פרטי - מהתעודה או הספח)
      - last_name (שם משפחה - מהתעודה או הספח)
      - id_number (מספר ת.ז - 9 ספרות - מהתעודה או הספח)
      - birth_date (תאריך לידה בפורמט DD-MM-YYYY - מהספח)
      - id_issue_date (תאריך הנפקה בפורמט DD-MM-YYYY - מהתעודה)
      - id_expiry_date (תוקף בפורמט DD-MM-YYYY - מהתעודה)
      - gender (male או female - מהספח)
      - address (שם הרחוב בלבד - מהספח)
       - building_number (מספר בנין - מהספח)
       - city (ישוב/עיר מגורים - מהספח)
       - entrance (מס' כניסה - מהספח)
       - apartment_number (מס' דירה - מהספח)
      - num_children (מספר הילדים - מהספח)
      - children_birth_dates (מערך של תאריכי לידה של ילדים בפורמט DD-MM-YYYY - מהספח)
      - children_names (מערך של שמות הילדים - מהספח, שמור בדיוק כמו שכתוב)
      - israeli_status (מעמד ישראלי - זהה מהתעודה או הספח את המעמד: "אזרחות ישראלית", "תושבות קבע", "תושבות ארעית", "אשרת שהיה", או "ללא")

      אם שדה לא נמצא, השאר אותו ריק. אם לא נמצאו ילדים, החזר מערכים ריקים.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            id_type: { type: "string" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            id_number: { type: "string" },
            birth_date: { type: "string" },
            id_issue_date: { type: "string" },
            id_expiry_date: { type: "string" },
            gender: { type: "string" },
            address: { type: "string" },
            building_number: { type: "string" },
            city: { type: "string" },
            entrance: { type: "string" },
            apartment_number: { type: "string" },
            num_children: { type: "number" },
            children_birth_dates: { 
              type: "array",
              items: { type: "string" }
            },
            children_names: { 
              type: "array",
              items: { type: "string" }
            },
            israeli_status: { type: "string" }
          }
        }
      });

      console.log('✅ AI Result:', result);
      setDetectionResult(result.document_type);
      setIdType(result.id_type);
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
    setLocalFile2(file);

    try {
      let uploadFile = file;
      if (file.type.includes('image')) {
        uploadFile = await convertImageToPdf(file);
        setFileType2('application/pdf');
      } else {
        setFileType2(file.type);
      }

      const uploadResult = await base44.integrations.Core.UploadFile({ file: uploadFile });
      const file_url = uploadResult.file_url;
      setPreview2(file_url);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `חלץ מידע נוסף מהמסמך. החזר JSON עם:
      - document_type: "id_card" או "appendix" או "both"
      - first_name, last_name, id_number, birth_date, id_issue_date, id_expiry_date, gender, address, building_number, city, entrance, apartment_number
      - num_children (מספר הילדים - מהספח)
      - children_birth_dates (מערך של תאריכי לידה של ילדים בפורמט DD-MM-YYYY - מהספח)
      - children_names (מערך של שמות הילדים - מהספח, שמור בדיוק כמו שכתוב)
      - israeli_status (מעמד ישראלי - זהה מהתעודה או הספח את המעמד: "אזרחות ישראלית", "תושבות קבע", "תושבות ארעית", "אשרת שהיה", או "ללא")

      אם שדה לא נמצא, השאר אותו ריק. אם לא נמצאו ילדים, החזר מערכים ריקים.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            id_type: { type: "string" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            id_number: { type: "string" },
            birth_date: { type: "string" },
            id_issue_date: { type: "string" },
            id_expiry_date: { type: "string" },
            gender: { type: "string" },
            address: { type: "string" },
            building_number: { type: "string" },
            city: { type: "string" },
            entrance: { type: "string" },
            apartment_number: { type: "string" },
            num_children: { type: "number" },
            children_birth_dates: { 
              type: "array",
              items: { type: "string" }
            },
            children_names: { 
              type: "array",
              items: { type: "string" }
            },
            israeli_status: { type: "string" }
          }
        }
      });

      // Merge data
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
    setPreview3(null);
    setExtractedData(null);
    setFileType(null);
    setFileType2(null);
    setFileType3(null);
    setIdType(null);
    setDetectionResult(null);
    onDataExtracted?.(null);
  };

  const handleFileUpload3 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📤 Starting appendix upload:', file.name);
    setUploading3(true);
    setFileType3(file.type);
    setLocalFile3(file);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploadResult.file_url;
      setPreview3(file_url);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `חלץ מידע נוסף מהספח. החזר JSON עם:
      - first_name, last_name, id_number, birth_date, gender, address, building_number, city, entrance, apartment_number
      - num_children (מספר הילדים - מהספח)
      - children_birth_dates (מערך של תאריכי לידה של ילדים בפורמט DD-MM-YYYY - מהספח)
      - children_names (מערך של שמות הילדים - מהספח, שמור בדיוק כמו שכתוב)
      - israeli_status (מעמד ישראלי - זהה מהספח את המעמד: "אזרחות ישראלית", "תושבות קבע", "תושבות ארעית", "אשרת שהיה", או "ללא")

      אם שדה לא נמצא, השאר אותו ריק. אם לא נמצאו ילדים, החזר מערכים ריקים.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            id_number: { type: "string" },
            birth_date: { type: "string" },
            gender: { type: "string" },
            address: { type: "string" },
            building_number: { type: "string" },
            city: { type: "string" },
            entrance: { type: "string" },
            apartment_number: { type: "string" },
            num_children: { type: "number" },
            children_birth_dates: { 
              type: "array",
              items: { type: "string" }
            },
            children_names: { 
              type: "array",
              items: { type: "string" }
            },
            israeli_status: { type: "string" }
          }
        }
      });

      // Merge data
      const mergedData = { 
        ...extractedData, 
        ...result, 
        file_url_3: file_url, 
        file_type_3: file.type
      };
      setExtractedData(mergedData);
      onDataExtracted?.(mergedData);

      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 2000);
    } catch (error) {
      console.error('❌ Error:', error);
      setError(error.message || 'שגיאה בעיבוד הספח');
    } finally {
      setUploading3(false);
    }
  };

  const downloadAsPDF = async (fileUrl, fileType, fileName = 'document.pdf') => {
    try {
      if (fileType?.includes('pdf')) {
        // If it's already a PDF, just download it
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        link.click();
      } else {
        // If it's an image, convert to PDF
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = fileUrl;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height]
        });

        pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
        pdf.save(fileName);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('שגיאה בהורדת הקובץ');
    }
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
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadAsPDF(preview, fileType, 'תעודת-זהות.pdf');
                      }}
                      className="absolute top-5 -left-3 bg-blue-500 hover:bg-blue-600 rounded-full w-7 h-7 p-0 z-50"
                      size="icon"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>הורד כקובץ PDF</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
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

              {fileType?.includes('pdf') ? (
                <iframe 
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(preview)}&embedded=true`}
                  className="w-full h-full min-h-[280px] rounded-xl"
                  frameBorder="0"
                />
              ) : (
                <img 
                  src={preview} 
                  alt="תעודת זהות" 
                  className="w-full h-full object-contain rounded-xl"
                />
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

        {/* Upload Section 2 & 3 - For appendix or back side */}
        {detectionResult && detectionResult !== 'both' && idType !== 'ביומטרית' && (
          <>
            {/* Section 2 - Appendix or Back Side */}
            <div 
              className={`border-2 border-dashed rounded-xl p-0 transition-colors relative min-h-[300px] cursor-pointer overflow-visible ${
                idType === 'ביומטרית' 
                  ? 'border-purple-300 bg-purple-50/50 hover:bg-purple-50' 
                  : 'border-orange-300 bg-orange-50/50 hover:bg-orange-50'
              }`}
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
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAsPDF(preview2, fileType2, idType === 'ביומטרית' ? 'צד-שני-תעודה.pdf' : 'ספח-תעודת-זהות.pdf');
                        }}
                        className="absolute top-5 -left-3 bg-blue-500 hover:bg-blue-600 rounded-full w-7 h-7 p-0 z-50"
                        size="icon"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>הורד כקובץ PDF</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {uploading2 && (
                   <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
                     <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-2">
                       <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                       <p className="text-sm font-medium text-gray-700">מחלץ נתונים...</p>
                     </div>
                   </div>
                 )}

                 {fileType2?.includes('pdf') ? (
                   <iframe 
                     src={`https://docs.google.com/gview?url=${encodeURIComponent(preview2)}&embedded=true`}
                     className="w-full h-full min-h-[280px] rounded-xl"
                     frameBorder="0"
                   />
                 ) : (
                   <img 
                     src={preview2} 
                     alt="צד שני או ספח" 
                     className="w-full h-full object-contain rounded-xl"
                   />
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
                   <Upload className={`w-12 h-12 ${idType === 'ביומטרית' ? 'text-purple-600' : 'text-orange-600'}`} />
                   <p className="text-sm font-medium text-gray-700 text-center">
                      {idType === 'ביומטרית' 
                        ? 'העלה צילום של הצד השני + ספח' 
                        : detectionResult === 'id_card' ? 'העלה ספח' : 'העלה תעודת זהות'}
                    </p>
                   <p className="text-xs text-gray-500">תמונה או PDF</p>
                 </div>
              </>
            )}
            </div>

            {/* Section 3 - Appendix (only for biometric) */}
            {idType === 'ביומטרית' && (
              <div 
                className="border-2 border-dashed border-orange-300 rounded-xl p-0 bg-orange-50/50 hover:bg-orange-50 transition-colors relative min-h-[300px] cursor-pointer overflow-visible"
                onClick={() => !preview3 && fileInputRef3.current?.click()}
              >
                {preview3 ? (
                  <>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreview3(null);
                        setFileType3(null);
                      }}
                      className="absolute -top-3 -left-3 bg-red-500 hover:bg-red-600 rounded-full w-7 h-7 p-0 z-50"
                      size="icon"
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadAsPDF(preview3, fileType3, 'ספח-תעודת-זהות.pdf');
                            }}
                            className="absolute top-5 -left-3 bg-blue-500 hover:bg-blue-600 rounded-full w-7 h-7 p-0 z-50"
                            size="icon"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>הורד כקובץ PDF</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {uploading3 && (
                       <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
                         <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-2">
                           <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                           <p className="text-sm font-medium text-gray-700">מחלץ נתונים...</p>
                         </div>
                       </div>
                     )}

                     {fileType3?.includes('pdf') ? (
                       <iframe 
                         src={`https://docs.google.com/gview?url=${encodeURIComponent(preview3)}&embedded=true`}
                         className="w-full h-full min-h-[280px] rounded-xl"
                         frameBorder="0"
                       />
                     ) : (
                       <img 
                         src={preview3} 
                         alt="ספח" 
                         className="w-full h-full object-contain rounded-xl"
                       />
                     )}
                  </>
                ) : (
                  <>
                    <input
                      ref={fileInputRef3}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload3}
                      className="hidden"
                      disabled={uploading3}
                    />
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Upload className="w-12 h-12 text-orange-600" />
                      <p className="text-sm font-medium text-gray-700 text-center">העלה ספח</p>
                      <p className="text-xs text-gray-500">תמונה או PDF</p>
                    </div>
                  </>
                )}
              </div>
            )}
            </>
            )}
            </div>

            {/* Detection Result Message - Only for incomplete uploads */}
            {detectionResult && detectionResult !== 'both' && (
              <div className="p-3 rounded-lg text-sm font-medium text-center bg-orange-100 text-orange-800 border-2 border-orange-300">
                {detectionResult === 'id_card' && idType === 'ביומטרית' && `⚠ זוהתה תעודת זהות ביומטרית - נא להשלים צילום של הצד השני + ספח`}
                {detectionResult === 'id_card' && idType !== 'ביומטרית' && `⚠ זוהתה תעודת זהות - נא להשלים ספח`}
                {detectionResult === 'appendix' && '⚠ זוהה ספח - נא להשלים תעודת זהות'}
              </div>
            )}

      {/* Show ID Type Message for biometric ID cards */}
      {idType === 'ביומטרית' && detectionResult === 'id_card' && !preview2 && (
        <div className="p-3 rounded-lg text-sm font-medium text-center bg-blue-100 text-blue-800 border-2 border-blue-300">
          ℹ תעודה ביומטרית - אנא העלה גם צילום של הצד השני
        </div>
      )}

      {/* Extracted Data Display */}
      <div className={`grid grid-cols-4 md:grid-cols-8 gap-3 p-4 rounded-xl ${extractedData ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
        <div>
          <Label className="text-xs text-gray-600">ת.ז</Label>
          <Input value={extractedData?.id_number || ''} readOnly className="bg-white" />
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
          <Label className="text-xs text-gray-600">מעמד ישראלי</Label>
          <Select 
            value={extractedData?.israeli_status || ''} 
            onValueChange={(value) => {
              const updatedData = { ...extractedData, israeli_status: value };
              setExtractedData(updatedData);
              onDataExtracted?.(updatedData);
            }}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="בחר מעמד" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="אזרחות ישראלית">אזרחות ישראלית</SelectItem>
              <SelectItem value="תושבות קבע">תושבות קבע</SelectItem>
              <SelectItem value="תושבות ארעית">תושבות ארעית</SelectItem>
              <SelectItem value="אשרת שהיה">אשרת שהיה</SelectItem>
              <SelectItem value="ללא">ללא</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">אזרחות זרה</Label>
          <Input 
            value={extractedData?.foreign_citizenship || ''} 
            onChange={(e) => {
              const updatedData = { ...extractedData, foreign_citizenship: e.target.value };
              setExtractedData(updatedData);
              onDataExtracted?.(updatedData);
            }}
            className="bg-white" 
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">מס' דרכון</Label>
          <Input 
            value={extractedData?.passport_number || ''} 
            onChange={(e) => {
              const updatedData = { ...extractedData, passport_number: e.target.value };
              setExtractedData(updatedData);
              onDataExtracted?.(updatedData);
            }}
            className="bg-white" 
          />
        </div>
      </div>
    </div>
  );
}