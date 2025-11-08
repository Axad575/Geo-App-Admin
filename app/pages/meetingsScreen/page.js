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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'postponed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
      case 'in progress': return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      case 'completed': return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      );
      case 'cancelled': return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
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
                <h1 className="text-3xl font-bold text-gray-900">Управление встречами</h1>
                <p className="text-gray-600 mt-2">Планирование и отслеживание встреч организации</p>
              </div>
              <button
                onClick={() => {
                  setEditingMeeting(null);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Добавить встречу
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
                  className="w-full md:w-80 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white shadow-sm appearance-none cursor-not-allowed"
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
                  onClick={() => setFilters({ title: '', owner: '', status: '', location: '' })}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>

          {/* Meetings Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Встречи ({filteredMeetings.length})
                </h2>
                {selectedOrg && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {orgs.find(o => o.id === selectedOrg)?.name || selectedOrg}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-green-500 bg-white transition ease-in-out duration-150 cursor-not-allowed">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Загрузка встреч...
                </div>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
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
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Встреча</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Дата и время</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Организатор</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Участники</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMeetings.map((meeting) => (
                      <tr key={meeting.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{meeting.title}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {meeting.location || 'Место не указано'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {meeting.datetime ? new Date(meeting.datetime).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                            {getStatusIcon(meeting.status)}
                            {meeting.status || 'scheduled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {usersList.find(u => u.id === meeting.owner)?.name || meeting.owner || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex -space-x-2">
                            {(meeting.participants || []).slice(0, 3).map((pid, index) => {
                              const user = usersList.find(u => u.id === pid);
                              return (
                                <div
                                  key={pid}
                                  className="w-8 h-8 bg-linear-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                                  title={user?.name || user?.email || pid}
                                >
                                  {(user?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                            {meeting.participants?.length > 3 && (
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                                +{meeting.participants.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewMeeting(meeting)}
                              className="text-green-600 hover:text-green-900 font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-green-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Просмотр
                            </button>
                            <button
                              onClick={() => startEdit(meeting)}
                              className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Изменить
                            </button>
                            <button
                              onClick={() => handleDeleteMeeting(meeting.id)}
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

      {/* View Meeting Modal */}
      {viewModalOpen && viewingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Просмотр встречи</h2>
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

            <div className="p-6 space-y-6">
              {/* Основная информация */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Название встречи</label>
                  <div className="text-lg font-medium text-gray-900">{viewingMeeting.title}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Дата и время</label>
                  <div className="text-gray-900">
                    {viewingMeeting.datetime ? new Date(viewingMeeting.datetime).toLocaleString('ru-RU') : 'Не указано'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Статус</label>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingMeeting.status)}`}>
                    {getStatusIcon(viewingMeeting.status)}
                    {viewingMeeting.status || 'scheduled'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Место проведения</label>
                  <div className="text-gray-900">{viewingMeeting.location || 'Не указано'}</div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Организация</label>
                  <div className="text-gray-900">{orgs.find(o => o.id === selectedOrg)?.name || selectedOrg}</div>
                </div>
              </div>

              {/* Заметки */}
              {viewingMeeting.notes && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Заметки</label>
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-900 whitespace-pre-wrap">
                    {viewingMeeting.notes}
                  </div>
                </div>
              )}

              {/* Организатор */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Организатор встречи</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(usersList.find(u => u.id === viewingMeeting.owner)?.name || 'U').charAt(0).toUpperCase()
                    }
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {usersList.find(u => u.id === viewingMeeting.owner)?.name || viewingMeeting.owner || 'Не назначен'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {usersList.find(u => u.id === viewingMeeting.owner)?.email || ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Участники */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Участники ({(viewingMeeting.participants || []).length})
                </label>
                <div className="space-y-2">
                  {(viewingMeeting.participants || []).length > 0 ? (
                    viewingMeeting.participants.map((pid) => {
                      const user = usersList.find(u => u.id === pid);
                      return (
                        <div key={pid} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-linear-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
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
                    <span className="font-medium">Создано:</span> {' '}
                    {viewingMeeting.createdAt ? new Date(viewingMeeting.createdAt).toLocaleString('ru-RU') : 'Неизвестно'}
                  </div>
                  {viewingMeeting.updatedAt && (
                    <div>
                      <span className="font-medium">Обновлено:</span> {' '}
                      {new Date(viewingMeeting.updatedAt).toLocaleString('ru-RU')}
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
                        startEdit(viewingMeeting);
                      }}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Редактировать
                    </button>
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        handleDeleteMeeting(viewingMeeting.id);
                      }}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
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
      )}

      {/* Create/Edit Meeting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingMeeting ? 'Редактировать встречу' : 'Создать встречу'}
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

            <form onSubmit={editingMeeting ? handleUpdateMeeting : handleCreateMeeting} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Название встречи <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Введите название встречи"
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
                {editingMeeting && (
                  <p className="text-xs text-gray-500 mt-1">Организацию нельзя изменить после создания</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата и время
                  </label>
                  <input
                    type="datetime-local"
                    name="datetime"
                    value={formData.datetime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Место проведения
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Офис, Zoom, адрес..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Статус <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Организатор <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="owner"
                    value={formData.owner}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">— Выберите организатора —</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email || u.id}
                      </option>
                    ))}
                  </select>
                </div>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                      <div key={pid} className="flex items-center bg-green-100 rounded-full px-3 py-1">
                        <span className="text-sm text-green-800">{user?.name || user?.email || pid}</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            participants: prev.participants.filter(p => p !== pid)
                          }))}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Заметки
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Дополнительная информация о встрече..."
                  rows="3"
                />
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
                  className="flex-1 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    editingMeeting ? 'Обновить' : 'Создать'
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Название встречи</label>
                <input
                  type="text"
                  value={tempFilters.title}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Поиск по названию..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <input
                  type="text"
                  value={tempFilters.status}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Поиск по статусу..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Место</label>
                <input
                  type="text"
                  value={tempFilters.location}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Поиск по месту..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Организатор</label>
                <select
                  value={tempFilters.owner}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, owner: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    const empty = { title: '', owner: '', status: '', location: '' };
                    setTempFilters(empty);
                  }}
                  className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Сбросить
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
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

