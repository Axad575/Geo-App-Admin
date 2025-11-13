"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app, db, storage } from "@/app/api/firebase"; // Добавляем storage
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    orderBy, 
    where 
} from "firebase/firestore";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage"; // Импорты для работы с Storage
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";
import CreateNoteModal from "@/app/components/CreateNoteModal";
import EditNoteModal from "@/app/components/EditNoteModal";
import { useStrings } from "@/app/hooks/useStrings";

// Компонент для добавления документа в библиотеку - ОБНОВЛЕННЫЙ
const AddDocumentModal = ({ isOpen, onClose, onSubmit }) => {
    const [documentData, setDocumentData] = useState({
        title: '',
        description: '',
        type: 'article',
        url: '',
        tags: '',
        file: null
    });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Проверяем размер файла (максимум 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('Файл слишком большой. Максимальный размер: 10MB');
                return;
            }
            
            // Автоматически заполняем название, если оно пустое
            if (!documentData.title) {
                setDocumentData(prev => ({ 
                    ...prev, 
                    title: file.name.replace(/\.[^/.]+$/, ""), // убираем расширение
                    file: file
                }));
            } else {
                setDocumentData(prev => ({ ...prev, file: file }));
            }
        }
    };

    // НОВАЯ ФУНКЦИЯ - загрузка файла в Firebase Storage
    const uploadFileToStorage = async (file, userId) => {
        try {
            // Создаем уникальное имя файла
            const timestamp = new Date().getTime();
            const fileName = `${timestamp}_${file.name}`;
            const storageRef = ref(storage, `documents/${userId}/${fileName}`);
            
            setUploadProgress(25);
            
            // Загружаем файл
            const snapshot = await uploadBytes(storageRef, file);
            setUploadProgress(75);
            
            // Получаем ссылку для скачивания
            const downloadURL = await getDownloadURL(snapshot.ref);
            setUploadProgress(90);
            
            return {
                name: file.name,
                type: file.type,
                size: file.size,
                url: downloadURL,
                storagePath: snapshot.ref.fullPath, // Сохраняем путь для удаления
                lastModified: file.lastModified
            };
        } catch (error) {
            console.error('Error uploading file to storage:', error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!documentData.title.trim()) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            let fileData = null;
            
            if (documentData.file) {
                // Получаем ID текущего пользователя
                const auth = getAuth(app);
                const userId = auth.currentUser?.uid;
                
                if (!userId) {
                    throw new Error('Пользователь не авторизован');
                }
                
                // Загружаем файл в Storage
                fileData = await uploadFileToStorage(documentData.file, userId);
            }

            const submissionData = {
                title: documentData.title,
                description: documentData.description,
                type: documentData.type,
                url: documentData.url,
                tags: documentData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
                file: fileData // Теперь содержит ссылку на файл в Storage
            };

            setUploadProgress(100);
            await onSubmit(submissionData);
            
            // Сброс формы
            setDocumentData({
                title: '',
                description: '',
                type: 'article',
                url: '',
                tags: '',
                file: null
            });
        } catch (error) {
            console.error('Error submitting document:', error);
            alert('Ошибка при добавлении документа: ' + error.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const removeFile = () => {
        setDocumentData(prev => ({ ...prev, file: null }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Добавить в библиотеку</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Название *
                        </label>
                        <input
                            type="text"
                            required
                            value={documentData.title}
                            onChange={(e) => setDocumentData(prev => ({ ...prev, title: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Название документа или статьи"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Описание
                        </label>
                        <textarea
                            value={documentData.description}
                            onChange={(e) => setDocumentData(prev => ({ ...prev, description: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder="Краткое описание содержания"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Тип
                        </label>
                        <select
                            value={documentData.type}
                            onChange={(e) => setDocumentData(prev => ({ ...prev, type: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="article">Статья</option>
                            <option value="document">Документ</option>
                            <option value="book">Книга</option>
                            <option value="research">Исследование</option>
                            <option value="video">Видео</option>
                            <option value="pdf">PDF</option>
                            <option value="image">Изображение</option>
                            <option value="other">Другое</option>
                        </select>
                    </div>

                    {/* Выбор между файлом и ссылкой */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Выберите способ добавления:
                            </h4>
                            
                            {/* Загрузка файла */}
                            <div className="mb-3">
                                <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Загрузить файл
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip,.rar"
                                        disabled={uploading}
                                    />
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                    Максимум 10MB. Файл будет загружен в Firebase Storage
                                </p>
                            </div>

                            {/* Отображение выбранного файла */}
                            {documentData.file && (
                                <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-green-800">{documentData.file.name}</p>
                                                <p className="text-xs text-green-600">
                                                    {(documentData.file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeFile}
                                            disabled={uploading}
                                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="text-sm text-gray-500 mb-2">или</div>
                            
                            {/* URL ссылка */}
                            <input
                                type="url"
                                value={documentData.url}
                                onChange={(e) => setDocumentData(prev => ({ ...prev, url: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com - добавить ссылку"
                                disabled={!!documentData.file || uploading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Теги (через запятую)
                        </label>
                        <input
                            type="text"
                            value={documentData.tags}
                            onChange={(e) => setDocumentData(prev => ({ ...prev, tags: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="наука, технологии, исследование"
                            disabled={uploading}
                        />
                    </div>

                    {/* Progress bar */}
                    {uploading && (
                        <div className="w-full">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>
                                    {uploadProgress < 25 ? 'Подготовка файла...' :
                                     uploadProgress < 75 ? 'Загрузка в Storage...' :
                                     uploadProgress < 90 ? 'Получение ссылки...' :
                                     uploadProgress < 100 ? 'Сохранение в базу...' : 'Завершено!'}
                                </span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={!documentData.title.trim() || uploading}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploading ? 'Загружаем...' : 'Добавить'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={uploading}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Обновленный компонент DocumentCard для работы со Storage
const DocumentCard = ({ document, onDelete }) => {
    const getTypeIcon = (type) => {
        switch (type) {
            case 'article': return '📄';
            case 'book': return '📚';
            case 'video': return '🎥';
            case 'research': return '🔬';
            case 'document': return '📋';
            case 'pdf': return '📕';
            case 'image': return '🖼️';
            default: return '📄';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'article': return 'bg-blue-100 text-blue-800';
            case 'book': return 'bg-green-100 text-green-800';
            case 'video': return 'bg-purple-100 text-purple-800';
            case 'research': return 'bg-orange-100 text-orange-800';
            case 'document': return 'bg-gray-100 text-gray-800';
            case 'pdf': return 'bg-red-100 text-red-800';
            case 'image': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // ОБНОВЛЕННАЯ ФУНКЦИЯ - открытие файла из Storage
    const handleFileOpen = () => {
        if (document.file && document.file.url) {
            window.open(document.file.url, '_blank');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl">{getTypeIcon(document.type)}</div>
                    <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                            {document.url ? (
                                <a 
                                    href={document.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-600 transition-colors"
                                >
                                    {document.title}
                                </a>
                            ) : (
                                <span className="cursor-pointer hover:text-blue-600" onClick={handleFileOpen}>
                                    {document.title}
                                </span>
                            )}
                        </h3>
                        {document.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {document.description}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onDelete(document.id, document.file?.storagePath)}
                    className="text-gray-400 hover:text-red-500 p-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(document.type)}`}>
                        {document.type === 'article' ? 'Статья' :
                         document.type === 'book' ? 'Книга' :
                         document.type === 'video' ? 'Видео' :
                         document.type === 'research' ? 'Исследование' :
                         document.type === 'document' ? 'Документ' :
                         document.type === 'pdf' ? 'PDF' :
                         document.type === 'image' ? 'Изображение' : 'Другое'}
                    </span>
                    
                    {/* Кнопки действий */}
                    <div className="flex gap-2">
                        {document.url && (
                            <a 
                                href={document.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                                🔗 Открыть
                            </a>
                        )}
                        {document.file && document.file.url && (
                            <button
                                onClick={handleFileOpen}
                                className="text-green-600 hover:text-green-800 text-xs"
                            >
                                📂 Открыть файл
                            </button>
                        )}
                    </div>
                </div>
                
                {document.tags && document.tags.length > 0 && (
                    <div className="flex gap-1">
                        {document.tags.slice(0, 2).map((tag, index) => (
                            <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                #{tag}
                            </span>
                        ))}
                        {document.tags.length > 2 && (
                            <span className="text-gray-400 text-xs">+{document.tags.length - 2}</span>
                        )}
                    </div>
                )}
            </div>
            
            {/* Информация о файле */}
            {document.file && (
                <div className="text-xs text-gray-500 mt-2 flex justify-between">
                    <span>📎 {document.file.name}</span>
                    <span>{formatFileSize(document.file.size)}</span>
                </div>
            )}
            
            {document.createdAt && (
                <div className="text-xs text-gray-500 mt-1">
                    Добавлено: {new Date(document.createdAt).toLocaleDateString('ru-RU')}
                </div>
            )}
        </div>
    );
};

export default function Notes() {
    const auth = getAuth(app);
    const router = useRouter();
    const { t } = useStrings();
    
    // Существующие состояния для заметок
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterBy, setFilterBy] = useState("all");

    // Новые состояния для библиотеки
    const [documents, setDocuments] = useState([]);
    const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('notes'); // 'notes' или 'library'
    const [librarySearchTerm, setLibrarySearchTerm] = useState("");
    const [libraryFilterBy, setLibraryFilterBy] = useState("all");

    // Authentication check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                fetchNotes(user.uid);
                fetchDocuments(user.uid);
            } else {
                router.push('/');
            }
        });

        return () => unsubscribe();
    }, [auth, router]);

    // Существующие функции для заметок...
    const fetchNotes = async (userId) => {
        try {
            setLoading(true);
            const notesRef = collection(db, 'notes');
            const q = query(notesRef, where("userId", "==", userId));
            const notesSnapshot = await getDocs(q);
            
            const notesList = notesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            notesList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            setNotes(notesList);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    // Новые функции для библиотеки
    const fetchDocuments = async (userId) => {
        try {
            const documentsRef = collection(db, 'documents');
            const q = query(documentsRef, where("userId", "==", userId));
            const documentsSnapshot = await getDocs(q);
            
            const documentsList = documentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            documentsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setDocuments(documentsList);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const handleCreateDocument = async (documentData) => {
        try {
            const newDocument = {
                ...documentData,
                userId: currentUser.uid,
                createdAt: new Date().toISOString(),
            };

            await addDoc(collection(db, 'documents'), newDocument);
            await fetchDocuments(currentUser.uid);
            setIsAddDocumentModalOpen(false);
        } catch (error) {
            console.error('Error creating document:', error);
            alert('Ошибка при добавлении документа');
        }
    };

    // ОБНОВЛЕННАЯ ФУНКЦИЯ - удаление документа и файла из Storage
    const handleDeleteDocument = async (documentId, storagePath) => {
        if (window.confirm('Удалить этот документ из библиотеки?')) {
            try {
                // Удаляем файл из Storage, если он есть
                if (storagePath) {
                    try {
                        const fileRef = ref(storage, storagePath);
                        await deleteObject(fileRef);
                        console.log('File deleted from storage');
                    } catch (error) {
                        console.error('Error deleting file from storage:', error);
                        // Продолжаем удаление документа из базы, даже если файл не удалился
                    }
                }

                // Удаляем документ из Firestore
                await deleteDoc(doc(db, 'documents', documentId));
                await fetchDocuments(currentUser.uid);
            } catch (error) {
                console.error('Error deleting document:', error);
                alert('Ошибка при удалении документа');
            }
        }
    };

    // Существующие функции для заметок (сокращенно)...
    const handleCreateNote = async (noteData) => {
        try {
            const newNote = {
                ...noteData,
                userId: currentUser.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isFavorite: false
            };

            await addDoc(collection(db, 'notes'), newNote);
            await fetchNotes(currentUser.uid);
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Error creating note:', error);
        }
    };

    const handleUpdateNote = async (noteId, noteData) => {
        try {
            const noteRef = doc(db, 'notes', noteId);
            await updateDoc(noteRef, {
                ...noteData,
                updatedAt: new Date().toISOString()
            });
            
            fetchNotes(currentUser.uid);
            setIsEditModalOpen(false);
            setEditingNote(null);
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (window.confirm('Удалить эту заметку?')) {
            try {
                await deleteDoc(doc(db, 'notes', noteId));
                fetchNotes(currentUser.uid);
            } catch (error) {
                console.error('Error deleting note:', error);
            }
        }
    };

    const handleToggleFavorite = async (noteId, currentFavoriteStatus) => {
        try {
            const noteRef = doc(db, 'notes', noteId);
            await updateDoc(noteRef, {
                isFavorite: !currentFavoriteStatus,
                updatedAt: new Date().toISOString()
            });
            fetchNotes(currentUser.uid);
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleEditNote = (note) => {
        setEditingNote(note);
        setIsEditModalOpen(true);
    };

    // Фильтры
    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            note.content.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filterBy === "favorites") {
            return matchesSearch && note.isFavorite;
        }
        if (filterBy === "recent") {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return matchesSearch && new Date(note.updatedAt) > oneWeekAgo;
        }
        return matchesSearch;
    });

    const filteredDocuments = documents.filter(document => {
        const matchesSearch = document.title.toLowerCase().includes(librarySearchTerm.toLowerCase()) ||
                            (document.description && document.description.toLowerCase().includes(librarySearchTerm.toLowerCase())) ||
                            (document.tags && document.tags.some(tag => tag.toLowerCase().includes(librarySearchTerm.toLowerCase())));
        
        if (libraryFilterBy === "all") return matchesSearch;
        return matchesSearch && document.type === libraryFilterBy;
    });

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const truncateContent = (content, maxLength = 150) => {
        if (!content) return '';
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-100">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <Navbar />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Загрузка...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                
                <main className="flex-1 overflow-y-auto p-6">
                    {/* Header with Tabs */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-6">
                                <h1 className="text-3xl font-bold text-gray-900">Знания</h1>
                                
                                {/* Tab Navigation */}
                                <div className="flex bg-gray-200 rounded-lg p-1">
                                    <button
                                        onClick={() => setActiveTab('notes')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            activeTab === 'notes' 
                                                ? 'bg-white text-blue-600 shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        📝 Заметки ({notes.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('library')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            activeTab === 'library' 
                                                ? 'bg-white text-blue-600 shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        📚 Библиотека ({documents.length})
                                    </button>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => activeTab === 'notes' ? setIsCreateModalOpen(true) : setIsAddDocumentModalOpen(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                {activeTab === 'notes' ? 'Новая заметка' : 'Добавить в библиотеку'}
                            </button>
                        </div>

                        {/* Search and Filter - Notes */}
                        {activeTab === 'notes' && (
                            <>
                                <div className="flex gap-4 mb-4">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Поиск заметок..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <select
                                        value={filterBy}
                                        onChange={(e) => setFilterBy(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="all">Все заметки</option>
                                        <option value="recent">Недавние</option>
                                        <option value="favorites">Избранные</option>
                                    </select>
                                </div>

                                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                                    <span>{notes.length} заметок</span>
                                    <span>{notes.filter(n => n.isFavorite).length} избранных</span>
                                    <span>{filteredNotes.length} показано</span>
                                </div>
                            </>
                        )}

                        {/* Search and Filter - Library */}
                        {activeTab === 'library' && (
                            <>
                                <div className="flex gap-4 mb-4">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Поиск в библиотеке..."
                                            value={librarySearchTerm}
                                            onChange={(e) => setLibrarySearchTerm(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <select
                                        value={libraryFilterBy}
                                        onChange={(e) => setLibraryFilterBy(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="all">Все типы</option>
                                        <option value="article">Статьи</option>
                                        <option value="book">Книги</option>
                                        <option value="video">Видео</option>
                                        <option value="research">Исследования</option>
                                        <option value="document">Документы</option>
                                        <option value="pdf">PDF</option>
                                        <option value="image">Изображения</option>
                                        <option value="other">Другое</option>
                                    </select>
                                </div>

                                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                                    <span>{documents.length} документов</span>
                                    <span>{filteredDocuments.length} показано</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Content Area */}
                    {activeTab === 'notes' ? (
                        /* Notes Content */
                        filteredNotes.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {searchTerm || filterBy !== "all" ? 'Заметки не найдены' : 'Пока нет заметок'}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {searchTerm || filterBy !== "all" 
                                        ? 'Попробуйте изменить критерии поиска'
                                        : 'Создайте свою первую заметку'
                                    }
                                </p>
                                {!searchTerm && filterBy === "all" && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Создать первую заметку
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 
                                                className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1"
                                                onClick={() => handleEditNote(note)}
                                            >
                                                {note.title}
                                            </h3>
                                            <div className="flex gap-2 ml-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleFavorite(note.id, note.isFavorite);
                                                    }}
                                                    className={`p-1 rounded ${note.isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                                                >
                                                    <svg className="w-5 h-5" fill={note.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteNote(note.id);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div 
                                            className="text-gray-600 mb-4 whitespace-pre-wrap"
                                            onClick={() => handleEditNote(note)}
                                        >
                                            {truncateContent(note.content)}
                                        </div>

                                        <div className="flex justify-between items-center text-sm text-gray-500">
                                            <span>{formatDate(note.updatedAt)}</span>
                                            <div className="flex gap-2">
                                                {note.category && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                                        {note.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        /* Library Content */
                        filteredDocuments.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📚</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {librarySearchTerm || libraryFilterBy !== "all" ? 'Документы не найдены' : 'Библиотека пуста'}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {librarySearchTerm || libraryFilterBy !== "all" 
                                        ? 'Попробуйте изменить критерии поиска'
                                        : 'Добавьте первый документ в свою библиотеку'
                                    }
                                </p>
                                {!librarySearchTerm && libraryFilterBy === "all" && (
                                    <button
                                        onClick={() => setIsAddDocumentModalOpen(true)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Добавить первый документ
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDocuments.map((document) => (
                                    <DocumentCard
                                        key={document.id}
                                        document={document}
                                        onDelete={handleDeleteDocument}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </main>
            </div>

            {/* Modals */}
            <CreateNoteModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateNote}
            />

            <EditNoteModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingNote(null);
                }}
                onSubmit={handleUpdateNote}
                note={editingNote}
            />

            <AddDocumentModal
                isOpen={isAddDocumentModalOpen}
                onClose={() => setIsAddDocumentModalOpen(false)}
                onSubmit={handleCreateDocument}
            />
        </div>
    );
}
