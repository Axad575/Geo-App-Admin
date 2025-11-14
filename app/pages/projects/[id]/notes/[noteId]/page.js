"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { app, db } from '@/app/api/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useStrings } from "@/app/hooks/useStrings";
import InteractiveMap from '@/app/components/InteractiveMap';

const ViewNotePage = () => {
    const { t, language } = useStrings();
    const router = useRouter();
    const params = useParams();
    const auth = getAuth(app);
    
    const projectId = params.id;
    const noteId = params.noteId;
    const [orgId, setOrgId] = useState(null);
    const [project, setProject] = useState(null);
    const [note, setNote] = useState(null);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);

    // Получаем локаль для форматирования даты
    const getLocale = () => {
        switch (language) {
            case 'ru': return 'ru-RU';
            case 'en': return 'en-GB';
            case 'uz': return 'uz-UZ';
            default: return 'en-GB';
        }
    };

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
                const projectData = { id: projectDoc.id, ...projectDoc.data() };
                setProject(projectData);
                
                // Найти конкретную заметку
                const foundNote = projectData.notes?.find(n => n.id === noteId);
                if (foundNote) {
                    setNote(foundNote);
                } else {
                    console.error('Note not found');
                    router.push(`/pages/projects/${projectId}`);
                }
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
    }, [projectId, noteId]);

    const formatDate = (date) => {
        if (!date) return '';
        try {
            return new Date(date).toLocaleDateString(getLocale(), {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return date;
        }
    };

    // Функция для конвертации координат в DMS формат
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

    if (loading || !note || !project) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">{t('loading')}...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push(`/pages/projects/${projectId}`)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-3"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                        Назад к проекту
                    </button>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{note.title}</h1>
                            <p className="text-gray-600">Проект: {project.title}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Основной контент */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Описание */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold mb-4">Описание</h2>
                            <div className="prose max-w-none">
                                <p className="text-gray-700 whitespace-pre-wrap">
                                    {note.description || 'Описание отсутствует'}
                                </p>
                            </div>
                        </div>

                        {/* Прикрепленные файлы */}
                        {note.attachments && note.attachments.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold mb-4">
                                    📎 Прикрепленные файлы ({note.attachments.length})
                                </h2>
                                <div className="space-y-3">
                                    {note.attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-3xl">
                                                    {file.type.startsWith('image/') ? '🖼️' : 
                                                     file.type.includes('pdf') ? '📄' : 
                                                     file.name.endsWith('.kml') ? '🗺️' : 
                                                     file.name.endsWith('.gpx') ? '🗺️' : '📎'}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-800">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                Открыть
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Карта с локацией */}
                        {note.location && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold mb-4">📍 Местоположение</h2>
                                <div className="mb-4">
                                    <h3 className="font-semibold text-lg text-gray-800">{note.location.name}</h3>
                                    {note.location.latitude && note.location.longitude && (
                                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                                            <p>
                                                <span className="font-medium">Десятичные координаты:</span>{' '}
                                                {Number(note.location.latitude).toFixed(6)}, {Number(note.location.longitude).toFixed(6)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Градусы/минуты/секунды:</span>{' '}
                                                {decimalToDMS(Number(note.location.latitude), true)}, {decimalToDMS(Number(note.location.longitude), false)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-lg overflow-hidden border border-gray-200">
                                    <InteractiveMap
                                        locations={[note.location]}
                                        center={[Number(note.location.latitude), Number(note.location.longitude)]}
                                        zoom={15}
                                        height="400px"
                                        onMapClick={() => {}}
                                        onLocationClick={() => {}}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Геологический лог */}
                        {note.geologicalLog && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    🗺️ Геологический лог
                                </h3>
                                <div className="space-y-4">
                                    {/* Общая информация */}
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                        {note.geologicalLog.wellName && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Скважина</p>
                                                <p className="font-medium">{note.geologicalLog.wellName}</p>
                                            </div>
                                        )}
                                        {note.geologicalLog.location && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Локация</p>
                                                <p className="font-medium">{note.geologicalLog.location}</p>
                                            </div>
                                        )}
                                        {note.geologicalLog.elevation && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Высота</p>
                                                <p className="font-medium">{note.geologicalLog.elevation} м</p>
                                            </div>
                                        )}
                                        {note.geologicalLog.totalDepth && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Глубина</p>
                                                <p className="font-medium">{note.geologicalLog.totalDepth} м</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Canvas изображение */}
                                    {note.geologicalLog.canvas && (
                                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                                            <img 
                                                src={note.geologicalLog.canvas} 
                                                alt="Геологический лог"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                    )}

                                    {/* Слои */}
                                    {note.geologicalLog.layers && note.geologicalLog.layers.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-3">Слои ({note.geologicalLog.layers.length})</h4>
                                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                                {note.geologicalLog.layers.map((layer, index) => (
                                                    <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className="w-6 h-6 rounded border border-gray-300 shrink-0"
                                                                style={{ backgroundColor: layer.color }}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="font-medium text-sm">{layer.lithology}</p>
                                                                    <p className="text-xs text-gray-600">
                                                                        {layer.depthFrom}м - {layer.depthTo}м
                                                                    </p>
                                                                </div>
                                                                {layer.description && (
                                                                    <p className="text-xs text-gray-600 mt-1">
                                                                        {layer.description}
                                                                    </p>
                                                                )}
                                                                {layer.grain_size && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Зернистость: {layer.grain_size}
                                                                    </p>
                                                                )}
                                                                {layer.fossils && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Ископаемые: {layer.fossils}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Кнопка скачивания */}
                                    {note.geologicalLog.canvas && (
                                        <button
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = note.geologicalLog.canvas;
                                                link.download = `geological_log_${note.geologicalLog.wellName || 'export'}.png`;
                                                link.click();
                                            }}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                        >
                                            📥 Скачать лог (PNG)
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Боковая панель */}
                    <div className="space-y-6">
                        {/* Информация */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Информация</h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Автор</p>
                                    <p className="font-medium text-gray-800">{note.authorName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Дата создания</p>
                                    <p className="font-medium text-gray-800">{formatDate(note.createdAt)}</p>
                                </div>
                                {note.location && (
                                    <div>
                                        <p className="text-gray-500 mb-1">Локация</p>
                                        <p className="font-medium text-gray-800 flex items-center gap-1">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            </svg>
                                            {note.location.name}
                                        </p>
                                    </div>
                                )}
                                {note.attachments && note.attachments.length > 0 && (
                                    <div>
                                        <p className="text-gray-500 mb-1">Файлы</p>
                                        <p className="font-medium text-gray-800 flex items-center gap-1">
                                            📎 {note.attachments.length} файл(ов)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Действия */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Действия</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => router.push(`/pages/projects/${projectId}/notes/${noteId}/edit`)}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Редактировать
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Вы уверены, что хотите удалить эту заметку?')) {
                                            // TODO: Реализовать удаление
                                            alert('Функция удаления будет реализована');
                                        }
                                    }}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewNotePage;
