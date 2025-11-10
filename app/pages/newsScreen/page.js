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

  // Добавить новые состояния
  const [newsStats, setNewsStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    archived: 0
  });

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
        setNewsStats({ total: 0, published: 0, drafts: 0, archived: 0 });
        return;
      }
      
      const q = query(
        collection(db, `organizations/${orgId}/news`),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      
      // Подсчет статистики
      const stats = {
        total: list.length,
        published: list.filter(n => n.published && !n.archived).length,
        drafts: list.filter(n => !n.published && !n.archived).length,
        archived: list.filter(n => n.archived).length
      };
      
      setNews(list);
      setNewsStats(stats);
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

  // Добавить функции для управления статусом
  const handlePublishNews = async (newsId) => {
    if (!confirm('Вы уверены, что хотите опубликовать эту новость?')) return;
    
    try {
      await updateDoc(doc(db, `organizations/${selectedOrg}/news`, newsId), {
        published: true,
        publishedAt: new Date().toISOString(),
        publishedBy: currentUser?.uid
      });
      fetchNews(selectedOrg);
      alert('Новость опубликована!');
    } catch (error) {
      console.error('Error publishing news:', error);
      alert(`Ошибка публикации: ${error.message}`);
    }
  };

  const handleArchiveNews = async (newsId) => {
    if (!confirm('Вы уверены, что хотите архивировать эту новость?')) return;
    
    try {
      await updateDoc(doc(db, `organizations/${selectedOrg}/news`, newsId), {
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: currentUser?.uid
      });
      fetchNews(selectedOrg);
      alert('Новость архивирована!');
    } catch (error) {
      console.error('Error archiving news:', error);
      alert(`Ошибка архивирования: ${error.message}`);
    }
  };

  const handleMarkAsRead = async (newsId) => {
    try {
      const newsRef = doc(db, `organizations/${selectedOrg}/news`, newsId);
      const newsDoc = await getDocs(newsRef);
      const newsData = newsDoc.data();
      
      const readBy = newsData.readBy || [];
      if (!readBy.includes(currentUser?.uid)) {
        readBy.push(currentUser.uid);
        
        await updateDoc(newsRef, {
          readBy: readBy,
          views: (newsData.views || 0) + 1
        });
        fetchNews(selectedOrg);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
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
                <h1 className="text-2xl font-bold text-gray-900">Новости</h1>
                <p className="text-gray-600">Управление новостями организации</p>
              </div>
              <button
                onClick={() => {
                  setEditingNews(null);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                + Добавить новость
              </button>
            </div>
          </div>

          {/* Добавить статистику новостей */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-gray-900">{newsStats.total}</div>
              <div className="text-sm text-gray-600">Всего новостей</div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-600">{newsStats.published}</div>
              <div className="text-sm text-gray-600">Опубликованных</div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-yellow-600">{newsStats.drafts}</div>
              <div className="text-sm text-gray-600">Черновиков</div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-gray-600">{newsStats.archived}</div>
              <div className="text-sm text-gray-600">Архивированных</div>
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
                  onClick={() => setFilters({ title: '', category: '', priority: '', author: '' })}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>

          {/* News List */}
          <div className="bg-white border rounded-lg">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Новости ({filteredNews.length})
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
                <div className="text-gray-500">Загрузка новостей...</div>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="p-8 text-center">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Создать первую новость
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredNews.map((newsItem) => (
                  <div key={newsItem.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(newsItem.category)}`}>
                            {newsItem.category || 'general'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(newsItem.priority)}`}>
                            {newsItem.priority || 'medium'}
                          </span>
                          
                          {/* Обновленные статусы */}
                          {newsItem.archived ? (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                              Архивировано
                            </span>
                          ) : !newsItem.published ? (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                              Черновик
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                              Опубликовано
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-medium text-gray-900 mb-2">{newsItem.title}</h3>
                        <p className="text-gray-600 mb-3">
                          {newsItem.content?.length > 150 
                            ? `${newsItem.content.substring(0, 150)}...` 
                            : newsItem.content}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                              {(usersList.find(u => u.id === newsItem.author)?.name || newsItem.authorName || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span>{usersList.find(u => u.id === newsItem.author)?.name || newsItem.authorName || 'Неизвестен'}</span>
                          </div>
                          <span>{newsItem.createdAt ? new Date(newsItem.createdAt).toLocaleDateString('ru-RU') : ''}</span>
                          {newsItem.views > 0 && (
                            <span>{newsItem.views} просмотров</span>
                          )}
                          {newsItem.readBy && (
                            <span>Прочитали: {newsItem.readBy.length} чел.</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => viewNewsItem(newsItem)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Просмотр
                        </button>
                        <button
                          onClick={() => startEdit(newsItem)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Изменить
                        </button>
                        
                        {/* Добавить новые действия */}
                        {!newsItem.published && !newsItem.archived && (
                          <button
                            onClick={() => handlePublishNews(newsItem.id)}
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Опубликовать
                          </button>
                        )}
                        
                        {newsItem.published && !newsItem.archived && (
                          <button
                            onClick={() => handleArchiveNews(newsItem.id)}
                            className="text-gray-600 hover:text-gray-900 text-sm"
                          >
                            Архивировать
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteNews(newsItem.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Удалить
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
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Просмотр новости</h2>
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
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(viewingNews.category)}`}>
                    {viewingNews.category || 'general'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(viewingNews.priority)}`}>
                    {viewingNews.priority || 'medium'}
                  </span>
                  {!viewingNews.published && (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                      Черновик
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{viewingNews.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {(usersList.find(u => u.id === viewingNews.author)?.name || viewingNews.authorName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <span>{usersList.find(u => u.id === viewingNews.author)?.name || viewingNews.authorName || 'Неизвестен'}</span>
                  </div>
                  <span>{viewingNews.createdAt ? new Date(viewingNews.createdAt).toLocaleDateString('ru-RU') : ''}</span>
                </div>
              </div>

              <div className="prose max-w-none">
                <div className="text-gray-700 whitespace-pre-wrap">
                  {viewingNews.content}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        startEdit(viewingNews);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        handleDeleteNews(viewingNews.id);
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
        </div>
      )}

      {/* Create/Edit News Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingNews ? 'Редактировать новость' : 'Создать новость'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={editingNews ? handleUpdateNews : handleCreateNews} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заголовок *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите заголовок новости"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Категория *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="published"
                      checked={formData.published}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Опубликовать</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Содержание *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите содержание новости..."
                  rows="6"
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
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                >
                  {isCreating ? 'Сохранение...' : (editingNews ? 'Обновить' : 'Создать')}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
                <input
                  type="text"
                  value={tempFilters.title}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Поиск по заголовку..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                <select
                  value={tempFilters.category}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    const empty = { title: '', category: '', priority: '', author: '' };
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