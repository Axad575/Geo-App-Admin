"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/app/api/firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import Sidebar from '@/app/components/sidebar';
import Navbar from '@/app/components/navbar';

export default function AdminProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [orgId, setOrgId] = useState('');
    const [error, setError] = useState(null);

    // Получение orgId из localStorage или URL параметров
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const orgFromParams = urlParams.get('orgId');
        const orgFromStorage = localStorage.getItem('selectedOrg');
        
        if (orgFromParams) {
            setOrgId(orgFromParams);
            localStorage.setItem('selectedOrg', orgFromParams);
        } else if (orgFromStorage) {
            setOrgId(orgFromStorage);
        }
    }, []);

    // Проверка авторизации
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                router.push('/');
            }
        });

        return () => unsubscribe();
    }, [auth, router]);

    // Получение данных проекта
    useEffect(() => {
        const fetchProject = async () => {
            if (!orgId || !params.id) return;
            
            try {
                setLoading(true);
                const projectDoc = await getDoc(doc(db, `organizations/${orgId}/projects`, params.id));
                
                if (projectDoc.exists()) {
                    setProject({ id: projectDoc.id, ...projectDoc.data() });
                } else {
                    setError('Проект не найден');
                }
            } catch (error) {
                console.error('Error fetching project:', error);
                setError('Ошибка загрузки проекта');
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [orgId, params.id, db]);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1">
                    <Navbar />
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-purple-500 bg-white transition ease-in-out duration-150">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Загрузка проекта...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1">
                    <Navbar />
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
                            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                {error || 'Проект не найден'}
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Проект не существует или у вас нет доступа к нему
                            </p>
                            <button
                                onClick={() => router.push('/pages/projectsScreen')}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Вернуться к проектам
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'not started': return 'bg-gray-100 text-gray-800';
            case 'in progress': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'on hold': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'low': return 'bg-green-100 text-green-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'urgent': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1">
                <Navbar />
                <div className="p-8">
                    {/* Хлебные крошки */}
                    <nav className="flex mb-6" aria-label="Breadcrumb">
                        <ol className="inline-flex items-center space-x-1 md:space-x-3">
                            <li className="inline-flex items-center">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="text-gray-500 hover:text-purple-600 transition-colors"
                                >
                                    Главная
                                </button>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                                    </svg>
                                    <button
                                        onClick={() => router.push('/pages/projectsScreen')}
                                        className="text-gray-500 hover:text-purple-600 transition-colors ml-1 md:ml-2"
                                    >
                                        Проекты
                                    </button>
                                </div>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                                    </svg>
                                    <span className="text-gray-500 ml-1 md:ml-2" aria-current="page">
                                        {project.title}
                                    </span>
                                </div>
                            </li>
                        </ol>
                    </nav>

                    {/* Заголовок проекта */}
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
                                <p className="text-gray-600 mb-4">{project.description || 'Описание отсутствует'}</p>
                                <div className="flex gap-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                                        {project.status || 'Не указан'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(project.priority)}`}>
                                        {project.priority || 'medium'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/pages/projectsScreen')}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Назад к проектам
                            </button>
                        </div>
                    </div>

                    {/* Детали проекта */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Основная информация */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Основная информация</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">ID проекта</label>
                                    <p className="text-gray-900 font-mono text-sm">{project.id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Владелец</label>
                                    <p className="text-gray-900">{project.owner || 'Не назначен'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Дата начала</label>
                                    <p className="text-gray-900">
                                        {project.startDate ? new Date(project.startDate).toLocaleDateString('ru-RU') : 'Не указана'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Дата окончания</label>
                                    <p className="text-gray-900">
                                        {project.endDate ? new Date(project.endDate).toLocaleDateString('ru-RU') : 'Не указана'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Участники</label>
                                    <p className="text-gray-900">
                                        {project.participants?.length > 0 ? `${project.participants.length} участников` : 'Нет участников'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Метаданные */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Метаданные</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Создан</label>
                                    <p className="text-gray-900">
                                        {project.createdAt ? new Date(project.createdAt).toLocaleString('ru-RU') : 'Неизвестно'}
                                    </p>
                                </div>
                                {project.updatedAt && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Последнее обновление</label>
                                        <p className="text-gray-900">
                                            {new Date(project.updatedAt).toLocaleString('ru-RU')}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Создан пользователем</label>
                                    <p className="text-gray-900">{project.createdBy || 'Неизвестно'}</p>
                                </div>
                                {project.updatedBy && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Обновлен пользователем</label>
                                        <p className="text-gray-900">{project.updatedBy}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Заглушка для будущей функциональности */}
                    <div className="mt-6 bg-linear-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
                        <div className="flex items-center gap-3 mb-3">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-purple-900">Дополнительная функциональность</h3>
                        </div>
                        <p className="text-purple-700 mb-4">
                            Здесь в будущем будут отображаться детали проекта, такие как задачи, файлы, комментарии и другая проектная информация.
                        </p>
                        <div className="flex gap-3">
                            <button
                                disabled
                                className="bg-purple-200 text-purple-600 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                            >
                                Задачи (скоро)
                            </button>
                            <button
                                disabled
                                className="bg-purple-200 text-purple-600 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                            >
                                Файлы (скоро)
                            </button>
                            <button
                                disabled
                                className="bg-purple-200 text-purple-600 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                            >
                                Комментарии (скоро)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}