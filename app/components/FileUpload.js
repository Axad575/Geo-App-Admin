// Создайте app/components/FileUpload.js
"use client";
import { useState } from 'react';
import { useStrings } from '@/app/hooks/useStrings';
import { uploadFile } from '@/app/utils/fileStorage';

export default function FileUpload({ onFileUploaded, projectId, noteId }) {
  const { t } = useStrings();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Проверка размера файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('files.fileTooLarge'));
      return;
    }

    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      alert(t('files.fileTypeNotAllowed'));
      return;
    }

    setUploading(true);
    try {
      const path = `projects/${projectId}/notes/${noteId}/files/${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(file, path);
      
      const fileData = {
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString()
      };

      onFileUploaded(fileData);
      alert(t('files.uploadSuccess'));
    } catch (error) {
      console.error('Upload error:', error);
      alert(t('files.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files);
          if (files[0]) handleFileUpload(files[0]);
        }}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={(e) => {
            if (e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
          accept="image/*,application/pdf,text/plain"
        />
        
        <label htmlFor="file-upload" className="cursor-pointer">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">
            {uploading ? 'Загрузка...' : t('files.uploadFile')}
          </p>
          <p className="text-sm text-gray-500">
            {t('files.selectFile')} или перетащите сюда
          </p>
        </label>
      </div>
    </div>
  );
}