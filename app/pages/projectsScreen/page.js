"use client";
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { app } from "@/app/api/firebase";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";

export default function Projects() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '',
    owner: '',
    participants: [],
    startDate: '',
    endDate: '',
    priority: 'medium'
  });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({ title: '', status: '', owner: '', priority: '' });
  const [tempFilters, setTempFilters] = useState({ title: '', status: '', owner: '', priority: '' });

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

  // Получаем проекты
  const fetchProjects = async () => {
    try {
      setLoading(true);
      if (!selectedOrg) {
        setProjects([]);
        return;
      }
      const querySnapshot = await getDocs(collection(db, `organizations/${selectedOrg}/projects`));
      const list = [];
      querySnapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setProjects(list);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Получаем организации
  const fetchOrgs = async () => {
    try {
      const q = await getDocs(collection(db, 'organizations'));
      const list = [];
      q.forEach(d => list.push({ id: d.id, ...d.data() }));
      setOrgs(list);
      if (list.length && !selectedOrg) {
        setSelectedOrg(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchProjects();
      // Получаем пользователей для выбора владельца
      (async function fetchOrgUsers() {
        try {
          const q = await getDocs(collection(db, `organizations/${selectedOrg}/users`));
          const u = [];
          q.forEach(d => u.push({ id: d.id, ...d.data() }));
          setUsersList(u);
        } catch (err) {
          console.error('Error fetching users for owner dropdown:', err);
        }
      })();
    }
  }, [selectedOrg]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      if (!selectedOrg) throw new Error('Organization not selected');
      await addDoc(collection(db, `organizations/${selectedOrg}/projects`), {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        owner: formData.owner,
        participants: formData.participants || [],
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        priority: formData.priority,
        organization: selectedOrg,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid
      });
      resetForm();
      fetchProjects();
      alert('Проект успешно создан!');
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Ошибка создания проекта: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const projectDoc = doc(db, `organizations/${selectedOrg}/projects`, editingProject.id);
      await updateDoc(projectDoc, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        owner: formData.owner,
        participants: formData.participants || [],
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        priority: formData.priority,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.uid
      });
      resetForm();
      fetchProjects();
      alert('Проект успешно обновлен!');
    } catch (error) {
      console.error('Error updating project:', error);
      alert(`Ошибка обновления проекта: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот проект?')) return;
    try {
      if (!selectedOrg) return;
      await deleteDoc(doc(db, `organizations/${selectedOrg}/projects`, projectId));
      fetchProjects();
      alert('Проект успешно удален!');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert(`Ошибка удаления проекта: ${error.message}`);
    }
  };

  const startEdit = (project) => {
    setEditingProject(project);
    setFormData({
      title: project.title || '',
      description: project.description || '',
      status: project.status || '',
      owner: project.owner || '',
      participants: project.participants || [],
      startDate: project.startDate ? new Date(project.startDate).toISOString().slice(0,10) : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().slice(0,10) : '',
      priority: project.priority || 'medium'
    });
    setIsModalOpen(true);
  };

  const viewProject = (project) => {
    setViewingProject(project);
    setViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      title: '', 
      description: '', 
      status: '', 
      owner: '', 
      participants: [], 
      startDate: '', 
      endDate: '',
      priority: 'medium'
    });
    setEditingProject(null);
    setIsModalOpen(false);
  };

  const filteredProjects = projects.filter(p => {
    if (filters.title && !(p.title || '').toLowerCase().includes(filters.title.toLowerCase())) return false;
    if (filters.status && !(p.status || '').toLowerCase().includes(filters.status.toLowerCase())) return false;
    if (filters.owner && p.owner !== filters.owner) return false;
    if (filters.priority && !(p.priority || '').toLowerCase().includes(filters.priority.toLowerCase())) return false;
    return true;
  });

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
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Управление проектами</h1>
                <p className="text-gray-600 mt-2">Создание, редактирование и отслеживание проектов организации</p>
              </div>
              <button
                onClick={() => {
                  setEditingProject(null);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Добавить проект
              </button>
            </div>
          </div>

          {/* Organization Selector & Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Организация
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full md:w-80 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm appearance-none cursor-not-allowed"
                  disabled
                >
                  <option value="">— Выберите организацию —</option>
                  {orgs.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name || o.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setTempFilters(filters);
                    setFilterModalOpen(true);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                  </svg>
                  Фильтры
                </button>
                <button
                  onClick={() => setFilters({ title: '', status: '', owner: '', priority: '' })}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Проекты ({filteredProjects.length})
                </h2>
                {selectedOrg && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    {orgs.find(o => o.id === selectedOrg)?.name || selectedOrg}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-purple-500 bg-white transition ease-in-out duration-150 cursor-not-allowed">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Загрузка проектов...
                </div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет проектов</h3>
                <p className="text-gray-500 mb-4">
                  {selectedOrg ? 'В выбранной организации пока нет проектов' : 'Выберите организацию для просмотра проектов'}
                </p>
                {selectedOrg && (
                  <button
                    onClick={() => {
                      setEditingProject(null);
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Создать первый проект
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Название</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Приоритет</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Владелец</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Участники</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Срок</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{project.title}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {project.description || 'Без описания'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {project.status || 'Не указан'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                            {project.priority || 'medium'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {usersList.find(u => u.id === project.owner)?.name || project.owner || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex -space-x-2">
                            {(project.participants || []).slice(0, 3).map((pid, index) => {
                              const user = usersList.find(u => u.id === pid);
                              return (
                                <div
                                  key={pid}
                                  className="w-8 h-8 bg-linear-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                                  title={user?.name || user?.email || pid}
                                >
                                  {(user?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                            {project.participants?.length > 3 && (
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                                +{project.participants.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.endDate ? new Date(project.endDate).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewProject(project)}
                              className="text-purple-600 hover:text-purple-900 font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-purple-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Просмотр
                            </button>
                            <button
                              onClick={() => startEdit(project)}
                              className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Изменить
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-red-600 hover:text-red-900 font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Project Modal */}
      {viewModalOpen && viewingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Просмотр проекта</h2>
                <div className="flex items-center gap-3">
                  
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Основная информация */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Название</label>
                  <div className="text-lg font-medium text-gray-900">{viewingProject.title}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Организация</label>
                  <div className="text-gray-900">{orgs.find(o => o.id === selectedOrg)?.name || selectedOrg}</div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Статус</label>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingProject.status)}`}>
                    {viewingProject.status || 'Не указан'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Приоритет</label>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(viewingProject.priority)}`}>
                    {viewingProject.priority || 'medium'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Дата начала</label>
                  <div className="text-gray-900">
                    {viewingProject.startDate ? new Date(viewingProject.startDate).toLocaleDateString('ru-RU') : 'Не указана'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Дата окончания</label>
                  <div className="text-gray-900">
                    {viewingProject.endDate ? new Date(viewingProject.endDate).toLocaleDateString('ru-RU') : 'Не указана'}
                  </div>
                </div>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Описание</label>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-900">
                  {viewingProject.description || 'Описание отсутствует'}
                </div>
              </div>

              {/* Владелец */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Владелец проекта</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(usersList.find(u => u.id === viewingProject.owner)?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {usersList.find(u => u.id === viewingProject.owner)?.name || viewingProject.owner || 'Не назначен'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {usersList.find(u => u.id === viewingProject.owner)?.email || ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Участники */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Участники ({(viewingProject.participants || []).length})
                </label>
                <div className="space-y-2">
                  {(viewingProject.participants || []).length > 0 ? (
                    viewingProject.participants.map((pid) => {
                      const user = usersList.find(u => u.id === pid);
                      return (
                        <div key={pid} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-linear-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {(user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user?.name || pid}</div>
                            <div className="text-sm text-gray-500">{user?.email || ''}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500 italic">Участники не назначены</div>
                  )}
                </div>
              </div>

              {/* Метаданные */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Создан:</span> {' '}
                    {viewingProject.createdAt ? new Date(viewingProject.createdAt).toLocaleString('ru-RU') : 'Неизвестно'}
                  </div>
                  {viewingProject.updatedAt && (
                    <div>
                      <span className="font-medium">Обновлен:</span> {' '}
                      {new Date(viewingProject.updatedAt).toLocaleString('ru-RU')}
                    </div>
                  )}
                </div>
              </div>

              {/* Действия */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        startEdit(viewingProject);
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Редактировать
                    </button>
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        handleDeleteProject(viewingProject.id);
                      }}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Удалить
                    </button>
                  </div>
                  
                 <button
                    onClick={() => router.push(`/pages/projects/${viewingProject.id}?orgId=${selectedOrg}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Перейти к проекту
                    <span>&gt;&gt;</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingProject ? 'Редактировать проект' : 'Создать проект'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Введите название проекта"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Организация
                </label>
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {selectedOrg ? (orgs.find(o => o.id === selectedOrg)?.name || selectedOrg) : 'Организация не выбрана'}
                </div>
                {editingProject && (
                  <p className="text-xs text-gray-500 mt-1">Организацию нельзя изменить после создания</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Опишите цели и задачи проекта"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата начала
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Статус <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">Выберите статус</option>
                    <option value="Not started">Не начат</option>
                    <option value="In progress">В процессе</option>
                    <option value="On hold">Приостановлен</option>
                    <option value="Completed">Завершен</option>
                    <option value="Cancelled">Отменен</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Приоритет <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="urgent">Срочный</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Владелец проекта <span className="text-red-500">*</span>
                </label>
                <select
                  name="owner"
                  value={formData.owner}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">— Выберите владельца —</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email || u.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Участники
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !formData.participants.includes(e.target.value)) {
                      setFormData(prev => ({
                        ...prev,
                        participants: [...prev.participants, e.target.value]
                      }));
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">— Добавить участника —</option>
                  {usersList
                    .filter(u => !formData.participants.includes(u.id) && u.id !== formData.owner)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email || u.id}
                      </option>
                    ))
                  }
                </select>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.participants.map(pid => {
                    const user = usersList.find(u => u.id === pid);
                    return (
                      <div key={pid} className="flex items-center bg-purple-100 rounded-full px-3 py-1">
                        <span className="text-sm text-purple-800">{user?.name || user?.email || pid}</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            participants: prev.participants.filter(p => p !== pid)
                          }))}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Сохранение...
                    </>
                  ) : (
                    editingProject ? 'Обновить' : 'Создать'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Фильтры</h2>
                <button
                  onClick={() => setFilterModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFilters(tempFilters);
                setFilterModalOpen(false);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={tempFilters.title}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Поиск по названию..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <input
                  type="text"
                  value={tempFilters.status}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Поиск по статусу..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <input
                  type="text"
                  value={tempFilters.priority}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Поиск по приоритету..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Владелец</label>
                <select
                  value={tempFilters.owner}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, owner: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">— Любой —</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const empty = { title: '', status: '', owner: '', priority: '' };
                    setTempFilters(empty);
                  }}
                  className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Сбросить
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Применить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

