import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Loader2, CheckCircle, AlertTriangle, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';

const documentTypes = [
  { value: 'id_card', label: 'תעודת זהות' },
  { value: 'salary_slip', label: 'תלוש משכורת' },
  { value: 'bank_statement', label: 'דף חשבון בנק' },
  { value: 'employment_letter', label: 'אישור העסקה' },
  { value: 'property_appraisal', label: 'שמאות נכס' },
  { value: 'purchase_agreement', label: 'חוזה רכישה' },
  { value: 'tax_return', label: 'דוח שנתי / 106' },
  { value: 'other', label: 'אחר' }
];

export default function DocumentUploader({ caseId, onUploadComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || file.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.type === 'application/pdf' || file.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!selectedType || files.length === 0) return;
    
    setUploading(true);
    
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await SecureEntities.Document.create({
        case_id: caseId,
        document_type: selectedType,
        file_url,
        file_name: file.name,
        status: 'pending'
      });
      
      await SecureEntities.AuditLog.create({
        case_id: caseId,
        action_type: 'document_upload',
        actor: 'user',
        description: `הועלה מסמך: ${file.name} (${documentTypes.find(t => t.value === selectedType)?.label})`
      });
    }
    
    setUploading(false);
    setFiles([]);
    setSelectedType('');
    onUploadComplete?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג מסמך</label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג מסמך" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        }`}
      >
        <input
          type="file"
          multiple
          accept=".pdf,image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-gray-600 font-medium">גרור קבצים לכאן או לחץ לבחירה</p>
        <p className="text-sm text-gray-400 mt-1">PDF או תמונות בלבד</p>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  {file.type.startsWith('image/') ? (
                    <Image className="w-5 h-5 text-purple-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </motion.div>
            ))}

            <Button
              onClick={uploadFiles}
              disabled={!selectedType || uploading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מעלה...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  העלה {files.length} קבצים
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}