"use client";
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { app } from "@/app/api/firebase";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";

export default function Users() {
    const auth = getAuth(app);
    const db = getFirestore(app);
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [orgs, setOrgs] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: '',
        phone: '',
        organization: ''
    });
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState({ name: '', email: '', role: '', phone: '' });
    const [tempFilters, setTempFilters] = useState({ name: '', email: '', role: '', phone: '' });
    const [isCreating, setIsCreating] = useState(false);

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

    // Получаем пользователей
    const fetchUsers = async (orgId) => {
        try {
            setLoading(true);
            if (!orgId) {
                setUsers([]);
                return;
            }
            const querySnapshot = await getDocs(collection(db, `organizations/${orgId}/users`));
            const usersList = [];
            querySnapshot.forEach((d) => {
                usersList.push({ id: d.id, ...d.data() });
            });
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
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
        if (selectedOrg) fetchUsers(selectedOrg);
    }, [selectedOrg]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Create new user
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { email, password, name, role, phone } = formData;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            const orgId = formData.organization || selectedOrg;
            if (!orgId) throw new Error('Organization not selected');

            await setDoc(doc(db, `organizations/${orgId}/users`, uid), {
                uid,
                name,
                email,
                role,
                phone,
                joinedAt: new Date().toISOString(),
                organization: orgId
            });

            setFormData({ name: '', email: '', password: '', role: '', phone: '', organization: '' });
            setIsModalOpen(false);
            fetchUsers(orgId);
            
            alert('Пользователь успешно создан!');
        } catch (error) {
            console.error("Error creating user:", error);
            alert(`Ошибка создания пользователя: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    // Update user
    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const orgId = editingUser.organization || formData.organization || selectedOrg;
            const userDoc = doc(db, `organizations/${orgId}/users`, editingUser.id);
            const { password, organization, ...updateData } = formData;
            
            await updateDoc(userDoc, {
                ...updateData,
                updatedAt: new Date().toISOString()
            });

            setEditingUser(null);
            setFormData({ name: '', email: '', password: '', role: '', phone: '', organization: '' });
            fetchUsers(orgId);
            
            alert('Пользователь успешно обновлен!');
        } catch (error) {
            console.error("Error updating user:", error);
            alert(`Ошибка обновления пользователя: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    // Delete user
    const handleDeleteUser = async (userId) => {
        if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            try {
                const orgId = selectedOrg;
                if (!orgId) return;
                
                const userDoc = doc(db, `organizations/${orgId}/users`, userId);
                await deleteDoc(userDoc);
                
                // Также удаляем из корневой коллекции users
                try {
                    await deleteDoc(doc(db, 'users', userId));
                } catch (error) {
                    console.log('User not found in root collection, skipping...');
                }
                
                fetchUsers(orgId);
                alert('Пользователь успешно удален!');
            } catch (error) {
                console.error("Error deleting user:", error);
                alert(`Ошибка удаления пользователя: ${error.message}`);
            }
        }
    };

    // Start editing user
    const startEdit = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            phone: user.phone,
            organization: user.organization || selectedOrg
        });
        setIsModalOpen(true);
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        if (filters.name && !(user.name || '').toLowerCase().includes(filters.name.toLowerCase())) return false;
        if (filters.email && !(user.email || '').toLowerCase().includes(filters.email.toLowerCase())) return false;
        if (filters.role && !(user.role || '').toLowerCase().includes(filters.role.toLowerCase())) return false;
        if (filters.phone && !(user.phone || '').toLowerCase().includes(filters.phone.toLowerCase())) return false;
        return true;
    });

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', role: '', phone: '', organization: selectedOrg });
        setEditingUser(null);
        setIsModalOpen(false);
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
                                <h1 className="text-3xl font-bold text-gray-900">Управление пользователями</h1>
                                <p className="text-gray-600 mt-2">Создание, редактирование и удаление пользователей организации</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingUser(null);
                                    setFormData({ name: '', email: '', password: '', role: '', phone: '', organization: selectedOrg });
                                    setIsModalOpen(true);
                                }}
                                className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Добавить пользователя
                            </button>
                        </div>
                    </div>

                    {/* Organization Selector & Filters */}
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                            <div className="flex-1 align-middle">
                                <label className="block text-sm font-semibold  text-gray-700 mb-2">
                                    Организация
                                </label>
                                <select
                                    value={selectedOrg}
                                    onChange={(e) => setSelectedOrg(e.target.value)}
                                    className="w-full md:w-80 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm appearance-none cursor-not-allowed"
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
                                    onClick={() => setFilters({ name: '', email: '', role: '', phone: '' })}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Сбросить
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Пользователи ({filteredUsers.length})
                                </h2>
                                {selectedOrg && (
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {orgs.find(o => o.id === selectedOrg)?.name || selectedOrg}
                                    </span>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-white transition ease-in-out duration-150 cursor-not-allowed">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Загрузка пользователей...
                                </div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-12 text-center">
                                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет пользователей</h3>
                                <p className="text-gray-500 mb-4">
                                    {selectedOrg ? 'В выбранной организации пока нет пользователей' : 'Выберите организацию для просмотра пользователей'}
                                </p>
                                {selectedOrg && (
                                    <button
                                        onClick={() => {
                                            setEditingUser(null);
                                            setFormData({ name: '', email: '', password: '', role: '', phone: '', organization: selectedOrg });
                                            setIsModalOpen(true);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                                    >
                                        Добавить первого пользователя
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Имя</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Роль</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Телефон</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Дата</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 bg-linear-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                            {(user.name || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">{user.name || 'Без имени'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        user.role === 'admin' 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : user.role === 'manager'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        {user.role || 'user'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.phone || '—'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ru-RU') : '—'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => startEdit(user)}
                                                            className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Редактировать
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
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

            {/* Modal for Create/Edit User */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
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

                        <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Имя <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Введите имя пользователя"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="user@example.com"
                                    required
                                    disabled={!!editingUser}
                                />
                                {editingUser && (
                                    <p className="text-xs text-gray-500 mt-1">Email нельзя изменить после создания</p>
                                )}
                            </div>

                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Пароль <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Минимум 6 символов"
                                        required={!editingUser}
                                        minLength="6"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Роль <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Выберите роль</option>
                                    <option value="admin">Администратор</option>
                                    <option value="manager">Менеджер</option>
                                    <option value="user">Пользователь</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Организация <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="organization"
                                    value={formData.organization || selectedOrg}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
                                    required
                                    disabled     
                                                               >
                                    <option value="">— Выберите организацию —</option>
                                    {orgs.map(o => (
                                        <option key={o.id} value={o.id}>{o.name || o.id}</option>
                                    ))}
                                </select>
                                {editingUser && (
                                    <p className="text-xs text-gray-500 mt-1">Организацию нельзя изменить после создания</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Телефон
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="+998 12 345 67 89"
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
                                    className="flex-1 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                        editingUser ? 'Обновить' : 'Создать'
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                                <input
                                    type="text"
                                    value={tempFilters.name}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Поиск по имени..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="text"
                                    value={tempFilters.email}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Поиск по email..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                                <input
                                    type="text"
                                    value={tempFilters.role}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Поиск по роли..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                <input
                                    type="text"
                                    value={tempFilters.phone}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Поиск по телефону..."
                                />
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
                                        const empty = { name: '', email: '', role: '', phone: '' };
                                        setTempFilters(empty);
                                    }}
                                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Сбросить
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
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