"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app, db } from "@/app/api/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";
import ParticipantSelector from "@/app/components/participantSelector";
import { useStrings } from "@/app/hooks/useStrings";

// ИСПРАВЛЕНИЕ: Добавляем функцию formatDate
const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Некорректная дата';
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Ошибка даты';
    }
};

// Обновленный компонент модального окна для создания проекта с ParticipantSelector
const CreateProjectModal = ({ isOpen, onClose, onSubmit, orgId }) => {
    const [projectData, setProjectData] = useState({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'not started',
        priority: 'medium',
        category: '',
        budget: '',
        participants: []
    });

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (isOpen && orgId) {
            fetchUsers();
            const auth = getAuth();
            setCurrentUser(auth.currentUser);
        }
    }, [isOpen, orgId]);

    const fetchUsers = async () => {
        try {
            const usersSnapshot = await getDocs(collection(db, `organizations/${orgId}/users`));
            const usersList = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!projectData.title.trim()) return;

        setLoading(true);
        try {
            await onSubmit(projectData);
            setProjectData({
                title: '',
                description: '',
                startDate: '',
                endDate: '',
                status: 'not started',
                priority: 'medium',
                category: '',
                budget: '',
                participants: []
            });
            onClose();
        } catch (error) {
            console.error('Error creating project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleParticipantsChange = (participants) => {
        setProjectData(prev => ({
            ...prev,
            participants
        }));
    };

    const resetForm = () => {
        setProjectData({
            title: '',
            description: '',
            startDate: '',
            endDate: '',
            status: 'not started',
            priority: 'medium',
            category: '',
            budget: '',
            participants: []
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Создать новый проект</h2>
                    <button
                        onClick={resetForm}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Название проекта */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Название проекта *
                        </label>
                        <input
                            type="text"
                            required
                            value={projectData.title}
                            onChange={(e) => setProjectData(prev => ({ ...prev, title: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Введите название проекта"
                            disabled={loading}
                        />
                    </div>

                    {/* Описание */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Описание
                        </label>
                        <textarea
                            value={projectData.description}
                            onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder="Описание проекта и его целей"
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Дата начала */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Дата начала
                            </label>
                            <input
                                type="date"
                                value={projectData.startDate}
                                onChange={(e) => setProjectData(prev => ({ ...prev, startDate: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            />
                        </div>

                        {/* Дата окончания */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Дата окончания
                            </label>
                            <input
                                type="date"
                                value={projectData.endDate}
                                onChange={(e) => setProjectData(prev => ({ ...prev, endDate: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Приоритет */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Приоритет
                            </label>
                            <select
                                value={projectData.priority}
                                onChange={(e) => setProjectData(prev => ({ ...prev, priority: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                <option value="low">🟢 Низкий</option>
                                <option value="medium">🟡 Средний</option>
                                <option value="high">🔴 Высокий</option>
                                <option value="critical">🟣 Критический</option>
                            </select>
                        </div>

                        {/* Категория */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Категория
                            </label>
                            <input
                                type="text"
                                value={projectData.category}
                                onChange={(e) => setProjectData(prev => ({ ...prev, category: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Например: Разработка, Маркетинг"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Бюджет */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Бюджет (необязательно)
                        </label>
                        <input
                            type="text"
                            value={projectData.budget}
                            onChange={(e) => setProjectData(prev => ({ ...prev, budget: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Например: 100,000 руб"
                            disabled={loading}
                        />
                    </div>

                    {/* НОВЫЙ: Участники проекта с ParticipantSelector */}
                    <ParticipantSelector
                        users={users}
                        selectedParticipants={projectData.participants}
                        onParticipantsChange={handleParticipantsChange}
                        excludeUserIds={currentUser ? [currentUser.uid] : []}
                        label="Участники проекта"
                        placeholder="Поиск участников по имени, email или роли..."
                        maxHeight="200px"
                        showSelectedCount={true}
                        allowMultiple={true}
                        className="w-full"
                    />

                    <div className="text-xs text-gray-500">
                        Создатель проекта автоматически становится участником
                    </div>

                    {/* Кнопки */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={!projectData.title.trim() || loading}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Создаем...' : 'Создать проект'}
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={loading}
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

const ProjectCard = ({ project, onProjectUpdate }) => {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'critical': return 'bg-red-100 border-l-red-500';
            case 'high': return 'bg-orange-100 border-l-orange-500';
            case 'medium': return 'bg-yellow-100 border-l-yellow-500';
            case 'low': return 'bg-green-100 border-l-green-500';
            default: return 'bg-gray-100 border-l-gray-500';
        }
    };

    const handleStatusChange = async (newStatus) => {
        setIsUpdating(true);
        try {
            const updateData = { status: newStatus };
            
            if (newStatus === 'completed') {
                updateData.completedAt = new Date().toISOString();
                updateData.completedBy = project.currentUserId;
            }

            await updateDoc(doc(db, `organizations/${project.orgId}/projects/${project.id}`), updateData);
            
            if (onProjectUpdate) {
                onProjectUpdate();
            }
        } catch (error) {
            console.error('Error updating project status:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const isCompleted = project.status?.toLowerCase() === 'completed';
    const isNotStarted = project.status?.toLowerCase() === 'not started' || project.status?.toLowerCase() === 'upcoming';

    return (
        <div className={`bg-white border-l-4 rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow ${getPriorityColor(project.priority)}`}>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">{project.title}</h4>
                {project.priority && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        project.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                        {project.priority === 'critical' ? 'Критический' :
                         project.priority === 'high' ? 'Высокий' :
                         project.priority === 'medium' ? 'Средний' : 'Низкий'}
                    </span>
                )}
            </div>

            {project.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{project.description}</p>
            )}

            <div className="text-xs text-gray-500 mb-3">
                {formatDate(project.startDate)} - {formatDate(project.endDate)}
            </div>

            {project.category && (
                <div className="mb-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {project.category}
                    </span>
                </div>
            )}

            {project.participants && project.participants.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Участники:</p>
                    <div className="flex -space-x-2">
                        {project.participants.slice(0, 3).map((participantId, index) => (
                            <div
                                key={index}
                                className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs"
                                title={participantId}
                            >
                                {participantId.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {project.participants.length > 3 && (
                            <div className="w-6 h-6 bg-gray-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs">
                                +{project.participants.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <button 
                    onClick={() => router.push(`/pages/projects/${project.id}`)}
                    className="text-blue-600 text-xs hover:text-blue-800 transition-colors"
                >
                    Открыть проект
                </button>
                
                {isNotStarted ? (
                    <button
                        onClick={() => handleStatusChange('in progress')}
                        disabled={isUpdating}
                        className="text-xs px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                        {isUpdating ? '...' : 'Начать'}
                    </button>
                ) : !isCompleted ? (
                    <button
                        onClick={() => handleStatusChange('completed')}
                        disabled={isUpdating}
                        className="text-xs px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                        {isUpdating ? '...' : 'Завершить'}
                    </button>
                ) : (
                    <span className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded">
                        Завершен
                    </span>
                )}
            </div>
        </div>
    );
};

const KanbanColumn = ({ title, projects, count, onProjectUpdate }) => {
    return (
        <div className="flex-1 bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">{title}</h3>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
                    {count}
                </span>
            </div>
            
            <div className="min-h-[500px]">
                {projects.map((project) => (
                    <ProjectCard 
                        key={project.id} 
                        project={project}
                        onProjectUpdate={onProjectUpdate}
                    />
                ))}
                
                {projects.length === 0 && (
                    <div className="text-center text-gray-400 text-sm mt-12">
                        <div className="text-4xl mb-2">📋</div>
                        <p>Нет проектов</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function Projects() {
    const auth = getAuth(app);
    const router = useRouter();
    const { t } = useStrings();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [orgId, setOrgId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [viewMode, setViewMode] = useState('kanban');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Получение текущей организации пользователя
    const getCurrentUserOrg = async (userId) => {
        try {
            const organizationsSnapshot = await getDocs(collection(db, 'organizations'));
            
            for (const orgDoc of organizationsSnapshot.docs) {
                const userInOrgDoc = await getDoc(doc(db, `organizations/${orgDoc.id}/users/${userId}`));
                if (userInOrgDoc.exists()) {
                    console.log('User found in organization:', orgDoc.id);
                    return orgDoc.id;
                }
            }

            console.log('User not found in any organization');
            return null;
        } catch (error) {
            console.error('Error fetching user organization:', error);
            return null;
        }
    };

    const fetchProjects = async (organizationId, userId) => {
        try {
            const orgDoc = await getDoc(doc(db, `organizations/${organizationId}`));
            const orgName = orgDoc.exists() ? orgDoc.data().name : 'Organization';
            
            const querySnapshot = await getDocs(collection(db, `organizations/${organizationId}/projects`));
            
            const projectsList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    organization: orgName,
                    orgId: organizationId,
                    currentUserId: userId
                };
            });
            
            // Сортируем по дате создания (новые сначала)
            projectsList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            
            setProjects(projectsList);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (projectData) => {
        try {
            const newProject = {
                ...projectData,
                // Автоматически добавляем создателя в участники
                participants: projectData.participants.includes(currentUser.uid) 
                    ? projectData.participants 
                    : [...projectData.participants, currentUser.uid],
                createdAt: new Date().toISOString(),
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName || currentUser.email,
                updatedAt: new Date().toISOString(),
                tasks: [],
                locations: []
            };

            await addDoc(collection(db, `organizations/${orgId}/projects`), newProject);
            
            // Обновляем список проектов
            await fetchProjects(orgId, currentUser.uid);
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    };

    const handleProjectUpdate = () => {
        if (orgId && currentUser) {
            fetchProjects(orgId, currentUser.uid);
        }
    };

    // Группировка проектов
    const groupedProjects = {
        upcoming: projects.filter(p => p.status?.toLowerCase() === 'not started' || p.status?.toLowerCase() === 'upcoming'),
        'in progress': projects.filter(p => 
            p.status?.toLowerCase() === 'in progress' || 
            p.status?.toLowerCase() === 'active'
        ),
        completed: projects.filter(p => p.status?.toLowerCase() === 'completed')
    };

    const projectStats = {
        total: projects.length,
        upcoming: groupedProjects.upcoming.length,
        inProgress: groupedProjects['in progress'].length,
        completed: groupedProjects.completed.length
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const userOrgId = await getCurrentUserOrg(user.uid);
                
                if (userOrgId) {
                    setOrgId(userOrgId);
                    await fetchProjects(userOrgId, user.uid);
                } else {
                    console.error('User is not assigned to any organization');
                    setLoading(false);
                }
            } else {
                router.push('/auth/login');
            }
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar orgId={orgId} />
                <div className="flex-1">
                    <Navbar orgId={orgId} />
                    <div className="p-8">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Загрузка проектов...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar orgId={orgId} />
            <div className="flex-1 flex flex-col">
                <Navbar orgId={orgId} />
                <div className="flex-1 p-6 overflow-auto">
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-bold text-gray-900">Проекты</h1>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Новый проект
                                </button>

                                <div className="flex bg-gray-200 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('kanban')}
                                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            viewMode === 'kanban'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Kanban
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            viewMode === 'list'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Список
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Статистика */}
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-2xl font-bold text-gray-900">{projectStats.total}</div>
                                        <div className="text-sm text-gray-600">Всего проектов</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-gray-100 rounded-lg">
                                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-2xl font-bold text-gray-900">{projectStats.upcoming}</div>
                                        <div className="text-sm text-gray-600">Предстоящих</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-yellow-100 rounded-lg">
                                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-2xl font-bold text-gray-900">{projectStats.inProgress}</div>
                                        <div className="text-sm text-gray-600">В процессе</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-2xl font-bold text-gray-900">{projectStats.completed}</div>
                                        <div className="text-sm text-gray-600">Завершенных</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {projects.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📋</div>
                            <h3 className="text-xl font-medium text-gray-900 mb-2">Пока нет проектов</h3>
                            <p className="text-gray-600 mb-6">Создайте свой первый проект для начала работы</p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Создать первый проект
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Kanban доска */}
                            {viewMode === 'kanban' && (
                                <div className="grid grid-cols-3 gap-6">
                                    <KanbanColumn
                                        title="Предстоящие"
                                        projects={groupedProjects.upcoming}
                                        count={projectStats.upcoming}
                                        onProjectUpdate={handleProjectUpdate}
                                    />
                                    
                                    <KanbanColumn
                                        title="В процессе"
                                        projects={groupedProjects['in progress']}
                                        count={projectStats.inProgress}
                                        onProjectUpdate={handleProjectUpdate}
                                    />
                                    
                                    <KanbanColumn
                                        title="Завершенные"
                                        projects={groupedProjects.completed}
                                        count={projectStats.completed}
                                        onProjectUpdate={handleProjectUpdate}
                                    />
                                </div>
                            )}

                            {/* Вид списка */}
                            {viewMode === 'list' && (
                                <div className="space-y-4">
                                    {projects.map((project) => (
                                        <div key={project.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                                                        {project.priority && (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                project.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                                                project.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                                project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-green-100 text-green-800'
                                                            }`}>
                                                                {project.priority === 'critical' ? 'Критический' :
                                                                 project.priority === 'high' ? 'Высокий' :
                                                                 project.priority === 'medium' ? 'Средний' : 'Низкий'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-600 mb-3">{project.description || 'Описание не указано'}</p>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <span>Статус: <strong>{project.status}</strong></span>
                                                        <span>Создан: {formatDate(project.createdAt)}</span>
                                                        {project.startDate && <span>Начало: {formatDate(project.startDate)}</span>}
                                                        {project.endDate && <span>Конец: {formatDate(project.endDate)}</span>}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => router.push(`/pages/projects/${project.id}`)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    Открыть →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Модальное окно создания проекта */}
            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateProject}
                orgId={orgId}
            />
        </div>
    );
}
