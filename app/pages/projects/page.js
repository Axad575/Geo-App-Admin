"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app, db } from "@/app/api/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";
import ParticipantSelector from "@/app/components/participantSelector";
import { useStrings } from "@/app/hooks/useStrings";

const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '-';
    }
};

// Модальное окно для создания проекта
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Создать новый проект</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                    />

                    <div className="text-xs text-gray-500">
                        Создатель проекта автоматически становится участником
                    </div>

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
                            onClick={onClose}
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

// Модальное окно для редактирования проекта
const EditProjectModal = ({ isOpen, onClose, project, onSuccess, orgId }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        priority: 'medium',
        category: '',
        budget: '',
        participants: []
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (isOpen && project) {
            setFormData({
                title: project.title || '',
                description: project.description || '',
                startDate: project.startDate || '',
                endDate: project.endDate || '',
                priority: project.priority || 'medium',
                category: project.category || '',
                budget: project.budget || '',
                participants: project.participants || []
            });
        }
    }, [isOpen, project]);

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
        if (!formData.title.trim()) return;

        setLoading(true);
        try {
            const projectRef = doc(db, `organizations/${orgId}/projects/${project.id}`);
            await updateDoc(projectRef, {
                ...formData,
                updatedAt: new Date().toISOString()
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating project:', error);
            alert('Ошибка при обновлении проекта');
        } finally {
            setLoading(false);
        }
    };

    const handleParticipantsChange = (participants) => {
        setFormData(prev => ({ ...prev, participants }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Редактировать проект</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Название *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Описание
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Дата начала
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Дата окончания
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Приоритет
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="low">🟢 Низкий</option>
                                <option value="medium">🟡 Средний</option>
                                <option value="high">🔴 Высокий</option>
                                <option value="critical">🟣 Критический</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Категория
                            </label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <ParticipantSelector
                        users={users}
                        selectedParticipants={formData.participants}
                        onParticipantsChange={handleParticipantsChange}
                        excludeUserIds={currentUser ? [currentUser.uid] : []}
                        label="Участники"
                        placeholder="Поиск участников..."
                        maxHeight="200px"
                        showSelectedCount={true}
                    />

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
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

export default function Projects() {
    const auth = getAuth(app);
    const router = useRouter();
    const { t } = useStrings();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [orgId, setOrgId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [filter, setFilter] = useState('all');
    const [users, setUsers] = useState({});

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

    const fetchProjects = async (organizationId, userId) => {
        try {
            const querySnapshot = await getDocs(collection(db, `organizations/${organizationId}/projects`));
            
            const projectsList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    orgId: organizationId,
                    currentUserId: userId
                };
            });
            
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
            await fetchProjects(orgId, currentUser.uid);
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот проект?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, `organizations/${orgId}/projects/${projectId}`));
            await fetchProjects(orgId, currentUser.uid);
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Ошибка при удалении проекта');
        }
    };

    const handleEditProject = (project) => {
        setEditingProject(project);
        setIsEditModalOpen(true);
    };

    const handleSuccess = () => {
        if (orgId && currentUser) {
            fetchProjects(orgId, currentUser.uid);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const userOrgId = await getCurrentUserOrg(user.uid);
                
                if (userOrgId) {
                    setOrgId(userOrgId);
                    await fetchUsers(userOrgId);
                    await fetchProjects(userOrgId, user.uid);
                } else {
                    setLoading(false);
                }
            } else {
                router.push('/auth/login');
            }
        });

        return () => unsubscribe();
    }, []);

    const filteredProjects = projects.filter(project => {
        if (filter === 'all') return true;
        const normalizedStatus = project.status?.toLowerCase() || 'not started';
        return normalizedStatus === filter;
    });

    const stats = {
        total: projects.length,
        notStarted: projects.filter(p => {
            const status = p.status?.toLowerCase() || 'not started';
            return status === 'not started' || status === 'upcoming';
        }).length,
        inProgress: projects.filter(p => p.status?.toLowerCase() === 'in progress' || p.status?.toLowerCase() === 'active').length,
        completed: projects.filter(p => p.status?.toLowerCase() === 'completed').length
    };

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
            <div className="flex-1 overflow-hidden">
                <Navbar orgId={orgId} />
                <div className="p-8 overflow-y-auto h-[calc(100vh-4rem)]">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Новый проект
                        </button>
                    </div>

                    {/* Статистика */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                            <div className="text-sm text-gray-600">Всего проектов</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
                            <div className="text-sm text-gray-600">Не начаты</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                            <div className="text-sm text-gray-600">В процессе</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                            <div className="text-sm text-gray-600">Завершено</div>
                        </div>
                    </div>

                    {/* Фильтры */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Все ({stats.total})
                        </button>
                        <button
                            onClick={() => setFilter('not started')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'not started' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Не начаты ({stats.notStarted})
                        </button>
                        <button
                            onClick={() => setFilter('in progress')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'in progress' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            В процессе ({stats.inProgress})
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'completed' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Завершенные ({stats.completed})
                        </button>
                    </div>

                    {/* Таблица проектов */}
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📋</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {filter === 'all' ? 'Пока нет проектов' : `Нет проектов со статусом "${filter}"`}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {filter === 'all' 
                                    ? 'Создайте свой первый проект для начала работы'
                                    : 'Попробуйте изменить фильтр для просмотра других проектов'
                                }
                            </p>
                            {filter === 'all' && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Создать первый проект
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Название
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Период
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Категория
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Участники
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Статус
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Действия
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredProjects.map((project) => {
                                        const getStatusBadge = (status) => {
                                            const normalizedStatus = status?.toLowerCase() || 'not started';
                                            const badges = {
                                                'completed': 'bg-green-100 text-green-800',
                                                'in progress': 'bg-yellow-100 text-yellow-800',
                                                'active': 'bg-yellow-100 text-yellow-800',
                                                'not started': 'bg-gray-100 text-gray-800',
                                                'upcoming': 'bg-gray-100 text-gray-800'
                                            };
                                            const statusTexts = {
                                                'completed': 'Завершен',
                                                'in progress': 'В процессе',
                                                'active': 'В процессе',
                                                'not started': 'Не начат',
                                                'upcoming': 'Не начат'
                                            };
                                            return (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badges[normalizedStatus] || 'bg-gray-100 text-gray-800'}`}>
                                                    {statusTexts[normalizedStatus] || 'Не начат'}
                                                </span>
                                            );
                                        };

                                        const getPriorityBadge = (priority) => {
                                            const badges = {
                                                'critical': 'bg-red-100 text-red-800',
                                                'high': 'bg-orange-100 text-orange-800',
                                                'medium': 'bg-yellow-100 text-yellow-800',
                                                'low': 'bg-green-100 text-green-800'
                                            };
                                            const texts = {
                                                'critical': 'Критический',
                                                'high': 'Высокий',
                                                'medium': 'Средний',
                                                'low': 'Низкий'
                                            };
                                            return (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[priority] || 'bg-gray-100 text-gray-800'}`}>
                                                    {texts[priority] || 'Средний'}
                                                </span>
                                            );
                                        };

                                        const normalizedStatus = project.status?.toLowerCase() || 'not started';
                                        const isCompleted = normalizedStatus === 'completed';
                                        const canEdit = !isCompleted;
                                        const participantCount = project.participants?.length || 0;

                                        return (
                                            <tr key={project.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <div className="max-w-xs">
                                                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                                                            <span className="truncate">{project.title}</span>
                                                            {project.priority && getPriorityBadge(project.priority)}
                                                        </div>
                                                        {project.description && (
                                                            <div className="text-xs text-gray-500 truncate mt-1">
                                                                {project.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="text-xs text-gray-900">
                                                        <div>{formatDate(project.startDate)}</div>
                                                        <div className="text-gray-500">{formatDate(project.endDate)}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {project.category ? (
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                                            {project.category}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <div className="flex items-center justify-center">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                                            {participantCount}
                                                        </span>
                                                        <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                        </svg>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {getStatusBadge(project.status)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => router.push(`/pages/projects/${project.id}`)}
                                                            className="text-blue-600 hover:text-blue-900 p-1"
                                                            title="Открыть"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleEditProject(project)}
                                                                className="text-blue-600 hover:text-blue-900 p-1"
                                                                title="Редактировать"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteProject(project.id)}
                                                            className="text-red-600 hover:text-red-900 p-1"
                                                            title="Удалить"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateProject}
                orgId={orgId}
            />

            <EditProjectModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingProject(null);
                }}
                project={editingProject}
                onSuccess={handleSuccess}
                orgId={orgId}
            />
        </div>
    );
}
