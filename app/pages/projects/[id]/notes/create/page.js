"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { app, db, storage } from '@/app/api/firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useStrings } from "@/app/hooks/useStrings";
import GeologicalLogTool from '@/app/components/GeologicalLogTool';

const CreateNotePage = () => {
    const { t } = useStrings();
    const router = useRouter();
    const params = useParams();
    const auth = getAuth(app);
    
    const projectId = params.id;
    const [orgId, setOrgId] = useState(null);
    const [project, setProject] = useState(null);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [newNote, setNewNote] = useState({
        title: '',
        description: '',
        locationId: ''
    });
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [geologicalLog, setGeologicalLog] = useState(null);
    const [showLogTool, setShowLogTool] = useState(false);

    // Получение организации пользователя
    const getCurrentUserOrg = async (userId) => {
        try {
            const organizationsSnapshot = await getDocs(collection(db, 'organizations'));
            
            for (const orgDoc of organizationsSnapshot.docs) {
                const userInOrgDoc = await getDoc(doc(db, `organizations/${orgDoc.id}/users/${userId}`));
                if (userInOrgDoc.exists()) {
                    return orgDoc.id;
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching user organization:', error);
            return null;
        }
    };

    // Получение данных проекта
    const fetchProject = async (organizationId) => {
        try {
            const projectDoc = await getDoc(doc(db, `organizations/${organizationId}/projects/${projectId}`));
            if (projectDoc.exists()) {
                setProject({ id: projectDoc.id, ...projectDoc.data() });
            } else {
                console.error('Project not found');
                router.push('/pages/projects');
            }
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    // Получение пользователей организации
    const fetchUsers = async (organizationId) => {
        try {
            const usersSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users`));
            const usersMap = {};
            usersSnapshot.docs.forEach(doc => {
                usersMap[doc.id] = doc.data().name || doc.data().email;
            });
            setUsers(usersMap);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => {
        const initPage = async () => {
            const user = auth.currentUser;
            if (!user) {
                router.push('/auth/login');
                return;
            }

            const userOrgId = await getCurrentUserOrg(user.uid);
            if (userOrgId) {
                setOrgId(userOrgId);
                await fetchProject(userOrgId);
                await fetchUsers(userOrgId);
            }
            setLoading(false);
        };

        initPage();
    }, [projectId]);

    // Функция загрузки файла
    const uploadProjectFile = async (file, projectId, noteId) => {
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
                uploadedBy: auth.currentUser?.uid
            };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    };

    // Функция для обработки выбора файлов
    const handleFileSelect = async (files) => {
        if (!files || files.length === 0) return;
        
        setUploadingFiles(true);
        const uploadedFiles = [];
        
        try {
            for (const file of Array.from(files)) {
                // Проверка размера файла (максимум 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    alert(`Файл ${file.name} слишком большой. Максимум 10MB.`);
                    continue;
                }
                
                // Создаем временный ID для заметки
                const tempNoteId = Date.now().toString();
                
                const uploadedFile = await uploadProjectFile(
                    file, 
                    projectId, 
                    tempNoteId
                );
                
                uploadedFiles.push(uploadedFile);
            }
            
            setAttachedFiles(prev => [...prev, ...uploadedFiles]);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Ошибка загрузки файлов');
        } finally {
            setUploadingFiles(false);
        }
    };

    // Функция удаления файла
    const removeFile = (index) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Функция для добавления записи в историю действий
    const addToHistory = async (action, details) => {
        try {
            const historyEntry = {
                id: Date.now().toString(),
                action: action,
                details: details,
                author: auth.currentUser?.uid,
                authorName: users[auth.currentUser?.uid] || auth.currentUser?.email,
                timestamp: new Date().toISOString()
            };

            const projectRef = doc(db, `organizations/${orgId}/projects/${projectId}`);
            await updateDoc(projectRef, {
                history: arrayUnion(historyEntry)
            });
        } catch (error) {
            console.error('Error adding to history:', error);
        }
    };

    // Добавление новой заметки
    const handleAddNote = async () => {
        if (!newNote.title.trim()) {
            alert('Пожалуйста, введите название заметки');
            return;
        }

        setSaving(true);
        try {
            // Найти выбранную локацию
            const selectedLocation = newNote.locationId 
                ? project.locations?.find(loc => loc.id === newNote.locationId)
                : null;

            const noteData = {
                id: Date.now().toString(),
                title: newNote.title,
                description: newNote.description || '',
                author: auth.currentUser?.uid || '',
                authorName: users[auth.currentUser?.uid] || auth.currentUser?.email || 'Unknown',
                createdAt: new Date().toISOString(),
                location: selectedLocation ? {
                    id: selectedLocation.id,
                    name: selectedLocation.name,
                    latitude: selectedLocation.latitude || 0,
                    longitude: selectedLocation.longitude || 0
                } : null,
                attachments: attachedFiles || [],
                geologicalLog: geologicalLog || null
            };

            // Добавляем заметку в массив notes проекта
            const projectRef = doc(db, `organizations/${orgId}/projects/${projectId}`);
            await updateDoc(projectRef, {
                notes: arrayUnion(noteData)
            });

            // Добавляем в историю
            await addToHistory('note_added', {
                noteTitle: newNote.title,
                hasLocation: !!selectedLocation,
                locationName: selectedLocation?.name,
                hasAttachments: attachedFiles.length > 0,
                attachmentCount: attachedFiles.length,
                hasGeologicalLog: !!geologicalLog,
                geologicalLogLayers: geologicalLog?.layers?.length || 0
            });

            // Возвращаемся на страницу проекта
            router.push(`/pages/projects/${projectId}`);
        } catch (error) {
            console.error('Error adding note:', error);
            alert('Ошибка при создании заметки');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !project) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">{t('loading')}...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <button
                            onClick={() => router.push(`/pages/projects/${projectId}`)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                            </svg>
                            Назад к проекту
                        </button>
                        <h1 className="text-3xl font-bold">{t('notes.createNote')}</h1>
                        <p className="text-gray-600 mt-1">Проект: {project.title}</p>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="space-y-6">
                        {/* Note Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('notes.noteTitle')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={newNote.title}
                                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                                placeholder={t('notes.enterTitle')}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Note Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.description')}
                            </label>
                            <textarea
                                value={newNote.description}
                                onChange={(e) => setNewNote(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t('notes.enterDescription')}
                                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="6"
                            />
                        </div>

                        {/* Location Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('notes.linkToLocation')}
                            </label>
                            <select
                                value={newNote.locationId}
                                onChange={(e) => setNewNote(prev => ({ ...prev, locationId: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('notes.noLocation')}</option>
                                {project.locations && project.locations.map((location) => (
                                    <option key={location.id} value={location.id}>
                                        {location.name}
                                        {location.latitude && location.longitude && 
                                            ` (${location.latitude}, ${location.longitude})`
                                        }
                                    </option>
                                ))}
                            </select>
                            {(!project.locations || project.locations.length === 0) && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('notes.addLocationFirst')}
                                </p>
                            )}
                        </div>

                        {/* Geological Log Tool */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    🗺️ Геологический лог
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowLogTool(!showLogTool)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                >
                                    {showLogTool ? '➖ Скрыть' : '➕ Открыть редактор'}
                                </button>
                            </div>
                            
                            {showLogTool && (
                                <div className="mt-4">
                                    <GeologicalLogTool
                                        onSave={(logData) => {
                                            setGeologicalLog(logData);
                                            alert('Геологический лог сохранен и будет прикреплен к заметке');
                                        }}
                                        initialData={geologicalLog}
                                    />
                                </div>
                            )}
                            
                            {geologicalLog && !showLogTool && (
                                <div className="mt-2 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-purple-900">
                                                ✅ Геологический лог создан
                                            </p>
                                            <p className="text-xs text-purple-700 mt-1">
                                                Скважина: {geologicalLog.wellName || 'Не указана'} | 
                                                Слоев: {geologicalLog.layers?.length || 0}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowLogTool(true)}
                                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                        >
                                            Редактировать
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* File Upload Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                📎 Прикрепить файлы
                            </label>
                            
                            {/* File Drop Zone */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    id="file-upload"
                                    className="hidden"
                                    onChange={(e) => handleFileSelect(e.target.files)}
                                    accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.kml,.gpx"
                                />
                                
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <div className="space-y-3">
                                        <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <div>
                                            <p className="text-base text-gray-600 font-medium">
                                                {uploadingFiles ? 'Загрузка файлов...' : 'Нажмите или перетащите файлы сюда'}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Поддержка: изображения, PDF, документы, геоданные (максимум 10MB)
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Attached Files List */}
                            {attachedFiles.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <p className="text-sm font-medium text-gray-700">
                                        Прикрепленные файлы ({attachedFiles.length}):
                                    </p>
                                    {attachedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">
                                                    {file.type.startsWith('image/') ? '🖼️' : 
                                                     file.type.includes('pdf') ? '📄' : 
                                                     file.name.endsWith('.kml') ? '🗺️' : '📎'}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="text-red-500 hover:text-red-700 p-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-8 pt-6 border-t">
                        <button
                            onClick={handleAddNote}
                            disabled={!newNote.title.trim() || saving}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                            {saving ? 'Сохранение...' : t('notes.createNote')}
                        </button>
                        <button
                            onClick={() => router.push(`/pages/projects/${projectId}`)}
                            disabled={saving}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition-colors"
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateNotePage;
