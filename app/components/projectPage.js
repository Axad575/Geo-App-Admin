"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { app, db, storage } from '@/app/api/firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadNoteFile } from '@/app/utils/fileStorage';
import AddLocationModal from './AddLocationModal';
import InteractiveMap from './InteractiveMap';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useStrings } from "@/app/hooks/useStrings";

const ProjectPage = ({ projectId, orgId }) => {
    const { t, language } = useStrings();
    const auth = getAuth(app);

    // Получаем локаль для форматирования даты в зависимости от языка
    const getLocale = () => {
        switch (language) {
            case 'ru': return 'ru-RU';
            case 'en': return 'en-GB';
            case 'uz': return 'uz-UZ';
            default: return 'en-GB';
        }
    };
    const router = useRouter();
    const [project, setProject] = useState(null);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState({
        title: '',
        description: '',
        locationId: ''
    });
    const [showAddNote, setShowAddNote] = useState(false);
    const [showAddLocation, setShowAddLocation] = useState(false);
    const [selectedMapLocation, setSelectedMapLocation] = useState(null);
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);

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

            // Обновляем локальное состояние
            setProject(prev => ({
                ...prev,
                history: [...(prev.history || []), historyEntry]
            }));
        } catch (error) {
            console.error('Error adding to history:', error);
        }
    };

    // Получение данных проекта
    const fetchProject = async () => {
        try {
            const projectDoc = await getDoc(doc(db, `organizations/${orgId}/projects/${projectId}`));
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
    const fetchUsers = async () => {
        try {
            const usersSnapshot = await getDocs(collection(db, `organizations/${orgId}/users`));
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
        if (projectId && orgId) {
            fetchProject();
            fetchUsers();
            setLoading(false);
        }
    }, [projectId, orgId]);


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
        alert(`Загружено файлов: ${uploadedFiles.length}`);
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



    // Добавление новой заметки
    // Обновите функцию handleAddNote:
const handleAddNote = async () => {
    if (!newNote.title.trim()) return;

    try {
        // Найти выбранную локацию
        const selectedLocation = newNote.locationId 
            ? project.locations?.find(loc => loc.id === newNote.locationId)
            : null;

        const noteData = {
            id: Date.now().toString(),
            title: newNote.title,
            description: newNote.description,
            author: auth.currentUser?.uid,
            authorName: users[auth.currentUser?.uid] || auth.currentUser?.email,
            createdAt: new Date().toISOString(),
            location: selectedLocation ? {
                id: selectedLocation.id,
                name: selectedLocation.name,
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude
            } : null,
            attachments: attachedFiles // Добавляем прикрепленные файлы
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
            attachmentCount: attachedFiles.length
        });

        // Обновляем локальное состояние
        setProject(prev => ({
            ...prev,
            notes: [...(prev.notes || []), noteData]
        }));

        // Очищаем форму
        setNewNote({ title: '', description: '', locationId: '' });
        setAttachedFiles([]); // Очищаем прикрепленные файлы
        setShowAddNote(false);
    } catch (error) {
        console.error('Error adding note:', error);
    }
};

    // Добавление новой точки на карту
    const handleAddLocation = async (locationData) => {
        try {
            const locationPoint = {
                ...locationData,
                id: Date.now().toString(), // Уникальный ID
                author: auth.currentUser?.uid,
                authorName: users[auth.currentUser?.uid] || auth.currentUser?.email,
                createdAt: new Date().toISOString()
            };

            // Добавляем точку в массив locations проекта
            const projectRef = doc(db, `organizations/${orgId}/projects/${projectId}`);
            await updateDoc(projectRef, {
                locations: arrayUnion(locationPoint)
            });

            // Добавляем в историю
            await addToHistory('location_added', {
                locationName: locationData.name,
                coordinates: `${locationData.latitude}, ${locationData.longitude}`
            });

            // Обновляем локальное состояние
            setProject(prev => ({
                ...prev,
                locations: [...(prev.locations || []), locationPoint]
            }));
        } catch (error) {
            console.error('Error adding location:', error);
        }
    };

    // Обработка клика по карте для добавления новой точки
    const handleMapClick = (latlng) => {
        setSelectedMapLocation(latlng);
        setShowAddLocation(true);
    };

    // Обработка клика по существующей точке на карте
    const handleLocationClick = (location) => {
        // Можно добавить модальное окно с подробной информацией
        console.log('Location clicked:', location);
    };

    // Получение центра карты на основе существующих точек
    const getMapCenter = () => {
        if (!project.locations || project.locations.length === 0) {
            return [41.291111, 69.240556]; // Ташкент по умолчанию (41°17'28"N, 69°14'26"E)
        }
        
        const lats = project.locations.map(loc => Number(loc.latitude));
        const lngs = project.locations.map(loc => Number(loc.longitude));
        
        return [
            lats.reduce((a, b) => a + b) / lats.length,
            lngs.reduce((a, b) => a + b) / lngs.length
        ];
    };

    // Функции для работы с координатами в формате DMS
    const decimalToDMS = (decimal, isLatitude = true) => {
        const absolute = Math.abs(decimal);
        const degrees = Math.floor(absolute);
        const minutes = Math.floor((absolute - degrees) * 60);
        const seconds = Math.round(((absolute - degrees) * 60 - minutes) * 60);
        
        const direction = isLatitude 
            ? (decimal >= 0 ? 'N' : 'S')
            : (decimal >= 0 ? 'E' : 'W');
            
        return `${degrees}°${minutes}'${seconds}"${direction}`;
    };

    const dmsToDecimal = (dms) => {
        // Парсинг строки формата "41°17'28"N" или "41 17 28 N"
        const regex = /(\d+)[°\s]+(\d+)['\s]*(\d+)["\s]*([NSEW])/i;
        const match = dms.match(regex);
        
        if (!match) return null;
        
        const degrees = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        const direction = match[4].toUpperCase();
        
        let decimal = degrees + minutes/60 + seconds/3600;
        
        if (direction === 'S' || direction === 'W') {
            decimal = -decimal;
        }
        
        return decimal;
    };

    // Экспорт проекта в PDF
    const exportToPDF = async () => {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            let yPosition = margin;

            // Заголовок
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text(project.title || t('projects.projectReport'), margin, yPosition);
            yPosition += 15;

            // Дата создания отчета
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Generated on: ${new Date().toLocaleDateString(getLocale())}`, margin, yPosition);
            yPosition += 15;

            // Описание проекта
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(t('projects.description') + ':', margin, yPosition);
            yPosition += 8;
            
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            const description = project.description || t('projects.noDescription');
            const splitDescription = pdf.splitTextToSize(description, pageWidth - 2 * margin);
            pdf.text(splitDescription, margin, yPosition);
            yPosition += splitDescription.length * 5 + 10;

            // Даты проекта
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Project Period:', margin, yPosition);
            yPosition += 8;
            
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            const projectPeriod = project.startDate && project.endDate
                ? `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`
                : project.startDate
                    ? `From: ${formatDate(project.startDate)}`
                    : 'No dates specified';
            pdf.text(projectPeriod, margin, yPosition);
            yPosition += 15;

            // Статус
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(t('projects.status') + ':', margin, yPosition);
            yPosition += 8;
            
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.text(project.status || t('meetings.noStatus'), margin, yPosition);
            yPosition += 15;

            // Участники
            if (project.participants && project.participants.length > 0) {
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Participants:', margin, yPosition);
                yPosition += 8;
                
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'normal');
                project.participants.forEach((participantId) => {
                    pdf.text(`• ${users[participantId] || participantId}`, margin + 5, yPosition);
                    yPosition += 6;
                });
                yPosition += 10;
            }

            // Заметки
            if (project.notes && project.notes.length > 0) {
                // Проверка на новую страницу
                if (yPosition > pageHeight - 50) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Notes:', margin, yPosition);
                yPosition += 10;

                project.notes.forEach((note, index) => {
                    // Проверка на новую страницу
                    if (yPosition > pageHeight - 40) {
                        pdf.addPage();
                        yPosition = margin;
                    }

                    pdf.setFontSize(12);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`${index + 1}. ${note.title || note.text}`, margin, yPosition);
                    yPosition += 8;

                    if (note.description) {
                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'normal');
                        const splitNote = pdf.splitTextToSize(note.description, pageWidth - 2 * margin - 5);
                        pdf.text(splitNote, margin + 5, yPosition);
                        yPosition += splitNote.length * 4;
                    }

                    if (note.location) {
                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', 'italic');
                        pdf.text(`Location: ${note.location.name} (${note.location.latitude}, ${note.location.longitude})`, margin + 5, yPosition);
                        yPosition += 5;
                    }

                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(`By: ${note.authorName} on ${formatDate(note.createdAt)}`, margin + 5, yPosition);
                    yPosition += 10;
                });
            }

            // Локации
            if (project.locations && project.locations.length > 0) {
                // Проверка на новую страницу
                if (yPosition > pageHeight - 50) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Location Points:', margin, yPosition);
                yPosition += 10;

                project.locations.forEach((location, index) => {
                    // Проверка на новую страницу
                    if (yPosition > pageHeight - 30) {
                        pdf.addPage();
                        yPosition = margin;
                    }

                    pdf.setFontSize(11);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`${index + 1}. ${location.name}`, margin, yPosition);
                    yPosition += 6;

                    if (location.description) {
                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'normal');
                        const splitLocation = pdf.splitTextToSize(location.description, pageWidth - 2 * margin - 5);
                        pdf.text(splitLocation, margin + 5, yPosition);
                        yPosition += splitLocation.length * 4;
                    }

                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(`Coordinates: ${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`, margin + 5, yPosition);
                    yPosition += 5;

                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'italic');
                    pdf.text(`Added by: ${location.authorName} on ${formatDate(location.createdAt)}`, margin + 5, yPosition);
                    yPosition += 10;
                });

            }

            // Сохранение файла
            const fileName = `${project.title || 'project'}_report_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        }
    };

    const formatDate = (date) => {
        if (!date) return '';
        try {
            return new Date(date).toLocaleDateString(getLocale(), {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return date;
        }
    };

    const formatTime = (date) => {
        if (!date) return '';
        try {
            return new Date(date).toLocaleTimeString(getLocale(), {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return date;
        }
    };

    // Функция для получения иконки действия
    const getActionIcon = (action) => {
        switch (action) {
            case 'note_added': return '📝';
            case 'location_added': return '📍';
            case 'project_created': return '🚀';
            case 'status_changed': return '🔄';
            case 'file_uploaded': return '📎';
            default: return '📋';
        }
    };

    // Функция для получения описания действия
    const getActionDescription = (historyItem) => {
        switch (historyItem.action) {
            case 'note_added':
                return `Добавил заметку "${historyItem.details.noteTitle}"`;
            case 'location_added':
                return `Добавил точку "${historyItem.details.locationName}"`;
            case 'project_created':
                return 'Создал проект';
            case 'status_changed':
                return `Изменил статус на "${historyItem.details.newStatus}"`;
            case 'file_uploaded':
                return `Загрузил файл "${historyItem.details.fileName}"`;
            default:
                return historyItem.action;
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
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">{project.title || t('projects.projectTitle')}</h1>
                <div className="flex gap-3">
                    {/* НОВАЯ КНОПКА: Задачи */}
                    <button 
                        onClick={() => router.push(`/pages/projects/${projectId}/tasks`)}
                        className="p-2 bg-blue-600 text-white rounded-lg shadow hover:shadow-md hover:bg-blue-700 transition-colors"
                        title="Управление задачами"
                    >
                        Задачи
                    </button>
                    
                    {/* Export to PDF button */}
                    <button 
                        onClick={exportToPDF}
                        className="p-2 bg-white rounded-lg shadow hover:shadow-md border hover:bg-gray-50 transition-colors"
                        title={t('projects.exportToPdf')}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>
                    <button 
                        onClick={() => router.push('/pages/projects')}
                        className="p-2 bg-white rounded-lg shadow hover:shadow-md border hover:bg-gray-50 transition-colors"
                        title={t('projects.backToProjects')}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Левая колонка */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    <div className="bg-white  rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">{t('projects.description')}</h2>
                        <div className="bg-gray-100 p-4 rounded-lg min-h-[100px]">
                            {project.description || t('projects.noDescription')}
                        </div>
                    </div>

                    {/* Participants */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">{t('meetings.participants')}:</h2>
                        <div className="bg-gray-100 p-4 rounded-lg min-h-[100px]">
                            <div className="text-center text-gray-600">
                                {project.participants && project.participants.length > 0 ? (
                                    <div className="space-y-2">
                                        {project.participants.map((participantId, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                                                    {(users[participantId] || participantId).charAt(0).toUpperCase()}
                                                </div>
                                                <span>{users[participantId] || participantId}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    'list of members'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">{t('notes.title')}:</h2>
                            <button
                                onClick={() => setShowAddNote(true)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                                {t('notes.addNote')}
                            </button>
                        </div>

                        {/* Add Note Form */}
                        {showAddNote && (
                            <div className="mb-4 p-4 bg-blue-50  rounded-lg">
                                <div className="space-y-4">
                                    {/* Note Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('notes.noteTitle')} *
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('projects.description')}
                                        </label>
                                        <textarea
                                            value={newNote.description}
                                            onChange={(e) => setNewNote(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder={t('notes.enterDescription')}
                                            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                        />
                                    </div>

                                    {/* Location Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
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

                                    {/* File Upload Section */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            📎 Прикрепить файлы
                                        </label>
                                        
                                        {/* File Drop Zone */}
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                            <input
                                                type="file"
                                                multiple
                                                id="file-upload"
                                                className="hidden"
                                                onChange={(e) => handleFileSelect(e.target.files)}
                                                accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.kml,.gpx"
                                            />
                                            
                                            <label htmlFor="file-upload" className="cursor-pointer">
                                                <div className="space-y-2">
                                                    <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <p className="text-sm text-gray-500">
                                                        {uploadingFiles ? 'Загрузка файлов...' : 'Нажмите или перетащите файлы сюда'}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Поддержка: изображения, PDF, документы, геоданные (максимум 10MB)
                                                    </p>
                                                </div>
                                            </label>
                                        </div>

                                        {/* Attached Files List */}
                                        {attachedFiles.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <p className="text-sm font-medium text-gray-700">
                                                    Прикрепленные файлы ({attachedFiles.length}):
                                                </p>
                                                {attachedFiles.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm">
                                                                {file.type.startsWith('image/') ? '🖼️' : 
                                                                 file.type.includes('pdf') ? '📄' : 
                                                                 file.name.endsWith('.kml') ? '🗺️' : '📎'}
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-700">
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
                                                            className="text-red-500 hover:text-red-700 text-sm"
                                                        >
                                                            ✕
                                                        </button>
                                                        
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={handleAddNote}
                                        disabled={!newNote.title.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('notes.addNote')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddNote(false);
                                            setNewNote({ title: '', description: '', locationId: '' });
                                        }}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                    >
                                        {t('cancel')}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-100 p-4 rounded-lg min-h-[150px]">
                            {project.notes && project.notes.length > 0 ? (
                                <div className="space-y-3">
                                    {project.notes.map((note, index) => (
                                        <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-800 mb-2">
                                                        {note.title || note.text}
                                                    </h4>
                                                    {note.description && (
                                                        <p className="text-gray-600 mb-2">{note.description}</p>
                                                    )}
                                                    {note.location && (
                                                        <div className="mb-2 p-2 bg-blue-50 rounded-lg">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                <span className="text-blue-700 font-medium">
                                                                    {note.location.name}
                                                                </span>
                                                                {note.location.latitude && note.location.longitude && (
                                                                    <div className="text-blue-600 text-xs">
                                                                        <div>{t('map.decimal')}: {Number(note.location.latitude).toFixed(4)}, {Number(note.location.longitude).toFixed(4)}</div>
                                                                        <div>{t('map.dms')}: {decimalToDMS(Number(note.location.latitude), true)}, {decimalToDMS(Number(note.location.longitude), false)}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {note.attachments && note.attachments.length > 0 && (
                                                        <div className="mt-2 flex items-center space-x-2">
                                                            <span className="text-xs text-gray-500">📎</span>
                                                            <span className="text-xs text-gray-500">
                                                                {note.attachments.length} {t('files.filesAttached')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <span>{note.authorName}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(note.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Отображение прикрепленных файлов */}
                                            {note.attachments && note.attachments.length > 0 && (
                                                <div className="mt-2">
                                                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                                                        📎 Прикрепленные файлы ({note.attachments.length}):
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {note.attachments.map((file, fileIndex) => (
                                                            <div key={fileIndex} className="flex items-center justify-between p-2 bg-gray-100 rounded text-xs">
                                                                <div className="flex items-center space-x-2">
                                                                    <span>
                                                                        {file.type.startsWith('image/') ? '🖼️' : 
                                                                         file.type.includes('pdf') ? '📄' : 
                                                                         file.name.endsWith('.kml') ? '🗺️' : '📎'}
                                                                    </span>
                                                                    <span className="text-gray-700">{file.name}</span>
                                                                    <span className="text-gray-500">
                                                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                                    </span>
                                                                </div>
                                                                <a
                                                                    href={file.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                                                >
                                                                    Посмотреть
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-600">{t('notes.listOfNotes')}</div>
                            )}
                        </div>
                    </div>

                    {/* Map */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">{t('locations.map')}:</h2>
                            <button
                                onClick={() => setShowAddLocation(true)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + {t('locations.addPoint')}
                            </button>
                        </div>
                        
                        <div className="bg-gray-100 rounded-lg overflow-hidden">
                            <InteractiveMap
                                locations={project.locations || []}
                                onLocationClick={handleLocationClick}
                                onMapClick={handleMapClick}
                                center={getMapCenter()}
                                zoom={project.locations && project.locations.length > 0 ? 15 : 6}
                                height="450px"
                            />
                        </div>

                        {/* Location Points List */}
                        {project.locations && project.locations.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg font-medium mb-2">{t('locations.title')}:</h3>
                                <div className="space-y-2">
                                    {project.locations.map((location, index) => (
                                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-medium">{location.name}</h4>
                                                    {location.description && (
                                                        <p className="text-sm text-gray-600 mt-1">{location.description}</p>
                                                    )}
                                                    {location.latitude && location.longitude && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            <p>{t('map.decimal')}: {Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)}</p>
                                                            <p>{t('map.dms')}: {decimalToDMS(Number(location.latitude), true)}, {decimalToDMS(Number(location.longitude), false)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-gray-500">
                                                    <p>{location.authorName}</p>
                                                    <p>{formatDate(location.createdAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Правая колонка */}
                <div className="space-y-6">
                    {/* Date */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-3">{t('projects.date')}:</h3>
                        <div className="bg-gray-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-700">
                                {project.startDate && project.endDate
                                    ? `${formatDate(project.startDate)}-${formatDate(project.endDate)}`
                                    : project.startDate
                                        ? formatDate(project.startDate)
                                        : '15.02.2025-15.04.2025'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-3">{t('projects.status')}:</h3>
                        <div className="bg-gray-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-700">
                                {project.status || t('projects.notStarted')}
                            </p>
                        </div>
                    </div>

                    {/* НОВЫЙ БЛОК: История действий */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-3">История действий</h3>
                        <div className="bg-gray-100 p-4 rounded-lg max-h-[400px] overflow-y-auto">
                            {project.history && project.history.length > 0 ? (
                                <div className="space-y-3">
                                    {project.history
                                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                        .map((item, index) => (
                                            <div key={index} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-blue-500">
                                                <div className="flex items-start gap-3">
                                                    <div className="text-lg">
                                                        {getActionIcon(item.action)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-800 font-medium">
                                                            {getActionDescription(item)}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                            <span>{item.authorName}</span>
                                                            <span>•</span>
                                                            <span>{formatDate(item.timestamp)}</span>
                                                            <span>{formatTime(item.timestamp)}</span>
                                                        </div>
                                                        
                                                        {/* Дополнительные детали для определенных действий */}
                                                        {item.details && (
                                                            <div className="mt-1 text-xs text-gray-600">
                                                                {item.action === 'location_added' && (
                                                                    <span>📍 {item.details.coordinates}</span>
                                                                )}
                                                                {item.action === 'note_added' && item.details.hasAttachments && (
                                                                    <span>📎 {item.details.attachmentCount} файла(ов)</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            ) : (
                                <div className="text-center text-gray-600 text-sm">
                                    История действий пока пуста
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddLocationModal
                isOpen={showAddLocation}
                onClose={() => {
                    setShowAddLocation(false);
                    setSelectedMapLocation(null);
                }}
                onAdd={handleAddLocation}
                selectedLocation={selectedMapLocation}
            />
        </div>
    );
};

export default ProjectPage;