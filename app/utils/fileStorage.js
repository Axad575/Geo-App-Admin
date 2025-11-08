// Создайте app/utils/fileStorage.js
import { storage } from '@/app/api/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const uploadNoteFile = async (file, projectId, noteId, userId) => {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `projects/${projectId}/notes/${noteId}/files/${timestamp}_${sanitizedName}`;
    
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: path,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const deleteNoteFile = async (filePath) => {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};