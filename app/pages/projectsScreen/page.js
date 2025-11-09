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
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
                <p className="text-gray-600">Управление проектами организации</p>
              </div>
              <button
                onClick={() => {
                  setEditingProject(null);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                + Добавить проект
              </button>
            </div>
          </div>

          {/* Organization Selector & Filters */}
          <div className="bg-white border rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Организация
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTempFilters(filters);
                    setFilterModalOpen(true);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Фильтры
                </button>
                <button
                  onClick={() => setFilters({ title: '', status: '', owner: '', priority: '' })}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-white border rounded-lg">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Проекты ({filteredProjects.length})
                </h2>
                {selectedOrg && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {orgs.find(o => o.id === selectedOrg)?.name || selectedOrg}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">Загрузка проектов...</div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-8 text-center">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Приоритет</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Владелец</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Участники</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Срок</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{project.title}</div>
                            <div className="text-sm text-gray-500">
                              {project.description?.length > 50 
                                ? `${project.description.substring(0, 50)}...` 
                                : project.description || 'Без описания'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(project.status)}`}>
                            {project.status || 'Не указан'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(project.priority)}`}>
                            {project.priority || 'medium'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {usersList.find(u => u.id === project.owner)?.name || project.owner || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex -space-x-1">
                            {(project.participants || []).slice(0, 3).map((pid, index) => {
                              const user = usersList.find(u => u.id === pid);
                              return (
                                <div
                                  key={pid}
                                  className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white"
                                  title={user?.name || user?.email || pid}
                                >
                                  {(user?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                            {project.participants?.length > 3 && (
                              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs border-2 border-white">
                                +{project.participants.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {project.endDate ? new Date(project.endDate).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewProject(project)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Просмотр
                            </button>
                            <button
                              onClick={() => startEdit(project)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Изменить
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
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
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Просмотр проекта</h2>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Название</label>
                  <div className="text-gray-900 font-medium">{viewingProject.title}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Организация</label>
                  <div className="text-gray-900">{orgs.find(o => o.id === selectedOrg)?.name || selectedOrg}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(viewingProject.status)}`}>
                    {viewingProject.status || 'Не указан'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Приоритет</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(viewingProject.priority)}`}>
                    {viewingProject.priority || 'medium'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата начала</label>
                  <div className="text-gray-900">
                    {viewingProject.startDate ? new Date(viewingProject.startDate).toLocaleDateString('ru-RU') : 'Не указана'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата окончания</label>
                  <div className="text-gray-900">
                    {viewingProject.endDate ? new Date(viewingProject.endDate).toLocaleDateString('ru-RU') : 'Не указана'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Описание</label>
                <div className="bg-gray-50 p-3 rounded text-gray-900">
                  {viewingProject.description || 'Описание отсутствует'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Владелец проекта</label>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                    {(usersList.find(u => u.id === viewingProject.owner)?.name || 'U').charAt(0).toUpperCase()
                    }
                  </div>
                  <div>
                    <div className="text-gray-900">
                      {usersList.find(u => u.id === viewingProject.owner)?.name || viewingProject.owner || 'Не назначен'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {usersList.find(u => u.id === viewingProject.owner)?.email || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Участники ({(viewingProject.participants || []).length})
                </label>
                <div className="space-y-2">
                  {(viewingProject.participants || []).length > 0 ? (
                    viewingProject.participants.map((pid) => {
                      const user = usersList.find(u => u.id === pid);
                      return (
                        <div key={pid} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                            {(user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-gray-900">{user?.name || pid}</div>
                            <div className="text-sm text-gray-500">{user?.email || ''}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500">Участники не назначены</div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      startEdit(viewingProject);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      handleDeleteProject(viewingProject.id);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Удалить
                  </button>
                </div>
                
                <button
                  onClick={() => router.push(`/pages/projectsScreen/${viewingProject.id}?orgId=${selectedOrg}`)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Перейти к проекту →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingProject ? 'Редактировать проект' : 'Создать проект'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите название проекта"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Опишите цели и задачи проекта"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата начала
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Статус *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Приоритет *
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Владелец проекта *
                </label>
                <select
                  name="owner"
                  value={formData.owner}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.participants.map(pid => {
                    const user = usersList.find(u => u.id === pid);
                    return (
                      <div key={pid} className="flex items-center bg-blue-100 rounded px-2 py-1">
                        <span className="text-sm text-blue-800">{user?.name || user?.email || pid}</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            participants: prev.participants.filter(p => p !== pid)
                          }))}
                          className="ml-2 text-blue-600 hover:text-blue-800"
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
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                >
                  {isCreating ? 'Сохранение...' : (editingProject ? 'Обновить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Фильтры</h2>
                <button
                  onClick={() => setFilterModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFilters(tempFilters);
                setFilterModalOpen(false);
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={tempFilters.title}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Поиск по названию..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <input
                  type="text"
                  value={tempFilters.status}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Поиск по статусу..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <input
                  type="text"
                  value={tempFilters.priority}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Поиск по приоритету..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Владелец</label>
                <select
                  value={tempFilters.owner}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, owner: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const empty = { title: '', status: '', owner: '', priority: '' };
                    setTempFilters(empty);
                  }}
                  className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg"
                >
                  Сбросить
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
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

