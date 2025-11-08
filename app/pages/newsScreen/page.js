"use client";
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query, limit } from 'firebase/firestore';
import { app } from "@/app/api/firebase";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";

export default function News() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingNews, setViewingNews] = useState(null);
  const [editingNews, setEditingNews] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    priority: 'medium',
    published: true
  });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({ title: '', category: '', priority: '', author: '' });
  const [tempFilters, setTempFilters] = useState({ title: '', category: '', priority: '', author: '' });

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

  // Получаем новости
  const fetchNews = async (orgId) => {
    try {
      setLoading(true);
      if (!orgId) {
        setNews([]);
        return;
      }
      const q = query(
        collection(db, `organizations/${orgId}/news`),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setNews(list);
    } catch (error) {
      console.error('Error fetching news:', error);
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
      fetchNews(selectedOrg);
      // Получаем пользователей для отображения авторов
      (async function fetchOrgUsers() {
        try {
          const q = await getDocs(collection(db, `organizations/${selectedOrg}/users`));
          const u = [];
          q.forEach(d => u.push({ id: d.id, ...d.data() }));
          setUsersList(u);
        } catch (err) {
          console.error('Error fetching users for news:', err);
        }
      })();
    }
  }, [selectedOrg]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      if (!selectedOrg) throw new Error('Organization not selected');
      await addDoc(collection(db, `organizations/${selectedOrg}/news`), {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        priority: formData.priority,
        published: formData.published,
        author: currentUser?.uid,
        authorName: currentUser?.displayName || currentUser?.email,
        organization: selectedOrg,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        likes: []
      });
      resetForm();
      fetchNews(selectedOrg);
      alert('Новость успешно создана!');
    } catch (error) {
      console.error('Error creating news:', error);
      alert(`Ошибка создания новости: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateNews = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newsDoc = doc(db, `organizations/${selectedOrg}/news`, editingNews.id);
      await updateDoc(newsDoc, {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        priority: formData.priority,
        published: formData.published,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.uid
      });
      resetForm();
      fetchNews(selectedOrg);
      alert('Новость успешно обновлена!');
    } catch (error) {
      console.error('Error updating news:', error);
      alert(`Ошибка обновления новости: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNews = async (newsId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту новость?')) return;
    try {
      if (!selectedOrg) return;
      await deleteDoc(doc(db, `organizations/${selectedOrg}/news`, newsId));
      fetchNews(selectedOrg);
      alert('Новость успешно удалена!');
    } catch (error) {
      console.error('Error deleting news:', error);
      alert(`Ошибка удаления новости: ${error.message}`);
    }
  };

  const startEdit = (newsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title || '',
      content: newsItem.content || '',
      category: newsItem.category || 'general',
      priority: newsItem.priority || 'medium',
      published: newsItem.published !== false
    });
    setIsModalOpen(true);
  };

  const viewNewsItem = (newsItem) => {
    setViewingNews(newsItem);
    setViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      title: '', 
      content: '', 
      category: 'general', 
      priority: 'medium',
      published: true
    });
    setEditingNews(null);
    setIsModalOpen(false);
  };

  const filteredNews = news.filter(n => {
    if (filters.title && !(n.title || '').toLowerCase().includes(filters.title.toLowerCase())) return false;
    if (filters.category && n.category !== filters.category) return false;
    if (filters.priority && n.priority !== filters.priority) return false;
    if (filters.author && n.author !== filters.author) return false;
    return true;
  });

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'general': return 'bg-blue-100 text-blue-800';
      case 'announcement': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'urgent': return 'bg-red-100 text-red-800';
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

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'announcement':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        );
      case 'event':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'update':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'urgent':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
          </svg>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Новости организации</h1>
                <p className="text-gray-600 mt-2 text-sm md:text-base">Создание и управление новостями для сотрудников</p>
              </div>
              <button
                onClick={() => {
                  setEditingNews(null);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="w-full lg:w-auto bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 md:px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Добавить новость
              </button>
            </div>
          </div>

          {/* Organization Selector & Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              <div className="w-full lg:flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Организация
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm appearance-none cursor-not-allowed"
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

              <div className="flex gap-3 w-full lg:w-auto">
                <button
                  onClick={() => {
                    setTempFilters(filters);
                    setFilterModalOpen(true);
                  }}
                  className="flex-1 lg:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                  </svg>
                  <span className="hidden sm:inline">Фильтры</span>
                </button>
                <button
                  onClick={() => setFilters({ title: '', category: '', priority: '', author: '' })}
                  className="flex-1 lg:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <span className="hidden sm:inline">Сбросить</span>
                  <span className="sm:hidden">✕</span>
                </button>
              </div>
            </div>
          </div>

          {/* News Feed */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Новости ({filteredNews.length})
                </h2>
                {selectedOrg && (
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                    {orgs.find(o => o.id === selectedOrg)?.name || selectedOrg}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-8 md:p-12 text-center">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-indigo-500 bg-white transition ease-in-out duration-150 cursor-not-allowed">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Загрузка новостей...
                </div>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="p-8 md:p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет новостей</h3>
                <p className="text-gray-500 mb-4">
                  {selectedOrg ? 'В выбранной организации пока нет новостей' : 'Выберите организацию для просмотра новостей'}
                </p>
                {selectedOrg && (
                  <button
                    onClick={() => {
                      setEditingNews(null);
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Создать первую новость
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNews.map((newsItem) => (
                  <div key={newsItem.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(newsItem.category)}`}>
                            {getCategoryIcon(newsItem.category)}
                            {newsItem.category || 'general'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(newsItem.priority)}`}>
                            {newsItem.priority || 'medium'}
                          </span>
                          {!newsItem.published && (
                            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
                              Черновик
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{newsItem.title}</h3>
                        <p className="text-gray-600 mb-3 line-clamp-3">
                          {newsItem.content?.length > 200 
                            ? `${newsItem.content.substring(0, 200)}...` 
                            : newsItem.content}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-linear-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {(usersList.find(u => u.id === newsItem.author)?.name || newsItem.authorName || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span>{usersList.find(u => u.id === newsItem.author)?.name || newsItem.authorName || 'Неизвестен'}</span>
                          </div>
                          <span>{newsItem.createdAt ? new Date(newsItem.createdAt).toLocaleDateString('ru-RU', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}</span>
                          {newsItem.views > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {newsItem.views}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 md:flex-col">
                        <button
                          onClick={() => viewNewsItem(newsItem)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium flex items-center gap-1 px-3 py-2 rounded-md hover:bg-indigo-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="hidden md:inline">Читать</span>
                        </button>
                        <button
                          onClick={() => startEdit(newsItem)}
                          className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="hidden md:inline">Изменить</span>
                        </button>
                        <button
                          onClick={() => handleDeleteNews(newsItem.id)}
                          className="text-red-600 hover:text-red-900 font-medium flex items-center gap-1 px-3 py-2 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="hidden md:inline">Удалить</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View News Modal */}
      {viewModalOpen && viewingNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Просмотр новости</h2>
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
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(viewingNews.category)}`}>
                    {getCategoryIcon(viewingNews.category)}
                    {viewingNews.category || 'general'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(viewingNews.priority)}`}>
                    {viewingNews.priority || 'medium'}
                  </span>
                  {!viewingNews.published && (
                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                      Черновик
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{viewingNews.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-linear-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {(usersList.find(u => u.id === viewingNews.author)?.name || viewingNews.authorName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <span>{usersList.find(u => u.id === viewingNews.author)?.name || viewingNews.authorName || 'Неизвестен'}</span>
                  </div>
                  <span>{viewingNews.createdAt ? new Date(viewingNews.createdAt).toLocaleDateString('ru-RU', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}</span>
                </div>
              </div>

              {/* Content */}
              <div className="prose max-w-none">
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">
                  {viewingNews.content}
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Создано:</span> {' '}
                    {viewingNews.createdAt ? new Date(viewingNews.createdAt).toLocaleString('ru-RU') : 'Неизвестно'}
                  </div>
                  {viewingNews.updatedAt && viewingNews.updatedAt !== viewingNews.createdAt && (
                    <div>
                      <span className="font-medium">Обновлено:</span> {' '}
                      {new Date(viewingNews.updatedAt).toLocaleString('ru-RU')}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Просмотров:</span> {viewingNews.views || 0}
                  </div>
                  <div>
                    <span className="font-medium">Статус:</span> {viewingNews.published ? 'Опубликовано' : 'Черновик'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        startEdit(viewingNews);
                      }}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Редактировать
                    </button>
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        handleDeleteNews(viewingNews.id);
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

      {/* Create/Edit News Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingNews ? 'Редактировать новость' : 'Создать новость'}
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

            <form onSubmit={editingNews ? handleUpdateNews : handleCreateNews} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Заголовок <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Введите заголовок новости"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Категория <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="general">Общие</option>
                    <option value="announcement">Объявления</option>
                    <option value="event">События</option>
                    <option value="update">Обновления</option>
                    <option value="urgent">Срочные</option>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="urgent">Срочный</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="published"
                      checked={formData.published}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Опубликовать</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Организация
                </label>
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {selectedOrg ? (orgs.find(o => o.id === selectedOrg)?.name || selectedOrg) : 'Организация не выбрана'}
                </div>
                {editingNews && (
                  <p className="text-xs text-gray-500 mt-1">Организацию нельзя изменить после создания</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Содержание <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Введите содержание новости..."
                  rows="8"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Символов: {formData.content.length}
                </p>
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
                  className="flex-1 bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    editingNews ? 'Обновить' : 'Создать'
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
                <input
                  type="text"
                  value={tempFilters.title}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Поиск по заголовку..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                <select
                  value={tempFilters.category}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Любая —</option>
                  <option value="general">Общие</option>
                  <option value="announcement">Объявления</option>
                  <option value="event">События</option>
                  <option value="update">Обновления</option>
                  <option value="urgent">Срочные</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <select
                  value={tempFilters.priority}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Любой —</option>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="urgent">Срочный</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Автор</label>
                <select
                  value={tempFilters.author}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    const empty = { title: '', category: '', priority: '', author: '' };
                    setTempFilters(empty);
                  }}
                  className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Сбросить
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
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