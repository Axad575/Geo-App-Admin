"use client";
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { app } from "@/app/api/firebase";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";

export default function Meetings() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState(null);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    datetime: '',
    location: '',
    owner: '',
    participants: [],
    status: 'scheduled',
    notes: ''
  });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({ title: '', owner: '', status: '', location: '' });
  const [tempFilters, setTempFilters] = useState({ title: '', owner: '', status: '', location: '' });

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

  // Получаем встречи
  const fetchMeetings = async (orgId) => {
    try {
      setLoading(true);
      if (!orgId) {
        setMeetings([]);
        return;
      }
      const querySnapshot = await getDocs(collection(db, `organizations/${orgId}/meetings`));
      const list = [];
      querySnapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setMeetings(list);
    } catch (error) {
      console.error('Error fetching meetings:', error);
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
      fetchMeetings(selectedOrg);
      // Получаем пользователей для выбора владельца
      (async function fetchOrgUsers() {
        try {
          const q = await getDocs(collection(db, `organizations/${selectedOrg}/users`));
          const u = [];
          q.forEach(d => u.push({ id: d.id, ...d.data() }));
          setUsersList(u);
        } catch (err) {
          console.error('Error fetching users for meetings:', err);
        }
      })();
    }
  }, [selectedOrg]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      if (!selectedOrg) throw new Error('Organization not selected');
      await addDoc(collection(db, `organizations/${selectedOrg}/meetings`), {
        title: formData.title,
        datetime: formData.datetime ? new Date(formData.datetime).toISOString() : null,
        location: formData.location,
        owner: formData.owner,
        participants: formData.participants || [],
        status: formData.status,
        notes: formData.notes || '',
        organization: selectedOrg,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid
      });
      resetForm();
      fetchMeetings(selectedOrg);
      alert('Встреча успешно создана!');
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert(`Ошибка создания встречи: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateMeeting = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const meetingDoc = doc(db, `organizations/${selectedOrg}/meetings`, editingMeeting.id);
      await updateDoc(meetingDoc, {
        title: formData.title,
        datetime: formData.datetime ? new Date(formData.datetime).toISOString() : null,
        location: formData.location,
        owner: formData.owner,
        participants: formData.participants || [],
        status: formData.status,
        notes: formData.notes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.uid
      });
      resetForm();
      fetchMeetings(selectedOrg);
      alert('Встреча успешно обновлена!');
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert(`Ошибка обновления встречи: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту встречу?')) return;
    try {
      if (!selectedOrg) return;
      await deleteDoc(doc(db, `organizations/${selectedOrg}/meetings`, meetingId));
      fetchMeetings(selectedOrg);
      alert('Встреча успешно удалена!');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert(`Ошибка удаления встречи: ${error.message}`);
    }
  };

  const startEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title || '',
      datetime: meeting.datetime ? new Date(meeting.datetime).toISOString().slice(0,16) : '',
      location: meeting.location || '',
      owner: meeting.owner || '',
      participants: meeting.participants || [],
      status: meeting.status || 'scheduled',
      notes: meeting.notes || ''
    });
    setIsModalOpen(true);
  };

  const viewMeeting = (meeting) => {
    setViewingMeeting(meeting);
    setViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      title: '', 
      datetime: '', 
      location: '', 
      owner: '', 
      participants: [], 
      status: 'scheduled', 
      notes: '' 
    });
    setEditingMeeting(null);
    setIsModalOpen(false);
  };

  const filteredMeetings = meetings.filter(mt => {
    if (filters.title && !(mt.title || '').toLowerCase().includes(filters.title.toLowerCase())) return false;
    if (filters.status && !(mt.status || '').toLowerCase().includes(filters.status.toLowerCase())) return false;
    if (filters.location && !(mt.location || '').toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.owner && mt.owner !== filters.owner) return false;
    return true;
  });

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
                <h1 className="text-2xl font-bold text-gray-900">Встречи</h1>
                <p className="text-gray-600">Управление встречами организации</p>
              </div>
              <button
                onClick={() => {
                  setEditingMeeting(null);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                + Добавить встречу
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
                  onClick={() => setFilters({ title: '', owner: '', status: '', location: '' })}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>

          {/* Meetings Table */}
          <div className="bg-white border rounded-lg">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Встречи ({filteredMeetings.length})
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
                <div className="text-gray-500">Загрузка встреч...</div>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет встреч</h3>
                <p className="text-gray-500 mb-4">
                  {selectedOrg ? 'В выбранной организации пока нет запланированных встреч' : 'Выберите организацию для просмотра встреч'}
                </p>
                {selectedOrg && (
                  <button
                    onClick={() => {
                      setEditingMeeting(null);
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Запланировать первую встречу
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Встреча</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата и время</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Организатор</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Участники</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMeetings.map((meeting) => (
                      <tr key={meeting.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{meeting.title}</div>
                            <div className="text-sm text-gray-500">{meeting.location || 'Место не указано'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {meeting.datetime ? new Date(meeting.datetime).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {meeting.status || 'scheduled'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {usersList.find(u => u.id === meeting.owner)?.name || meeting.owner || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {(meeting.participants || []).length} чел.
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewMeeting(meeting)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Просмотр
                            </button>
                            <button
                              onClick={() => startEdit(meeting)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Изменить
                            </button>
                            <button
                              onClick={() => handleDeleteMeeting(meeting.id)}
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

      {/* View Meeting Modal */}
      {viewModalOpen && viewingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Просмотр встречи</h2>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Название встречи</label>
                <div className="text-gray-900">{viewingMeeting.title}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата и время</label>
                  <div className="text-gray-900">
                    {viewingMeeting.datetime ? new Date(viewingMeeting.datetime).toLocaleString('ru-RU') : 'Не указано'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {viewingMeeting.status || 'scheduled'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Место проведения</label>
                <div className="text-gray-900">{viewingMeeting.location || 'Не указано'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Организатор</label>
                <div className="text-gray-900">
                  {usersList.find(u => u.id === viewingMeeting.owner)?.name || viewingMeeting.owner || 'Не назначен'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Участники ({(viewingMeeting.participants || []).length})
                </label>
                <div className="space-y-2">
                  {(viewingMeeting.participants || []).length > 0 ? (
                    viewingMeeting.participants.map((pid) => {
                      const user = usersList.find(u => u.id === pid);
                      return (
                        <div key={pid} className="text-gray-900">
                          {user?.name || pid}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500">Участники не назначены</div>
                  )}
                </div>
              </div>

              {viewingMeeting.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Заметки</label>
                  <div className="bg-gray-50 p-3 rounded text-gray-900">
                    {viewingMeeting.notes}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      startEdit(viewingMeeting);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      handleDeleteMeeting(viewingMeeting.id);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Meeting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingMeeting ? 'Редактировать встречу' : 'Создать встречу'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={editingMeeting ? handleUpdateMeeting : handleCreateMeeting} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название встречи *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите название встречи"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата и время
                </label>
                <input
                  type="datetime-local"
                  name="datetime"
                  value={formData.datetime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Место проведения
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Офис, Zoom, адрес..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    <option value="scheduled">Запланирована</option>
                    <option value="in progress">В процессе</option>
                    <option value="completed">Завершена</option>
                    <option value="postponed">Отложена</option>
                    <option value="cancelled">Отменена</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Организатор *
                  </label>
                  <select
                    name="owner"
                    value={formData.owner}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">— Выберите —</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email || u.id}
                      </option>
                    ))}
                  </select>
                </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заметки
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Дополнительная информация о встрече..."
                  rows="3"
                />
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
                  {isCreating ? 'Сохранение...' : (editingMeeting ? 'Обновить' : 'Создать')}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Название встречи</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Место</label>
                <input
                  type="text"
                  value={tempFilters.location}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Поиск по месту..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Организатор</label>
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
                    const empty = { title: '', owner: '', status: '', location: '' };
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

