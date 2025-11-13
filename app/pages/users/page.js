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
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Управление пользователями</h1>
                                <p className="text-gray-600">Создание, редактирование и удаление пользователей организации</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingUser(null);
                                    setFormData({ name: '', email: '', password: '', role: '', phone: '', organization: selectedOrg });
                                    setIsModalOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                                + Добавить пользователя
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
                                    onClick={() => setFilters({ name: '', email: '', role: '', phone: '' })}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg"
                                >
                                    Сбросить
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white border rounded-lg">
                        <div className="px-4 py-3 border-b">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-medium text-gray-900">
                                    Пользователи ({filteredUsers.length})
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
                                <div className="text-gray-500">Загрузка пользователей...</div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-8 text-center">
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
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
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
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                                                            {(user.name || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">{user.name || 'Без имени'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                                        user.role === 'admin' 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : user.role === 'manager'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        {user.role || 'user'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{user.phone || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ru-RU') : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => startEdit(user)}
                                                            className="text-blue-600 hover:text-blue-900 text-sm"
                                                        >
                                                            Редактировать
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
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

            {/* Modal for Create/Edit User */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
                                </h2>
                                <button
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Имя *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Введите имя пользователя"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Пароль *
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Минимум 6 символов"
                                        required={!editingUser}
                                        minLength="6"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Роль *
                                </label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Выберите роль</option>
                                    <option value="admin">Администратор</option>
                                    <option value="manager">Менеджер</option>
                                    <option value="user">Пользователь</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Организация *
                                </label>
                                <select
                                    name="organization"
                                    value={formData.organization || selectedOrg}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Телефон
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="+998 12 345 67 89"
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
                                    {isCreating ? 'Сохранение...' : (editingUser ? 'Обновить' : 'Создать')}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                                <input
                                    type="text"
                                    value={tempFilters.name}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Поиск по имени..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="text"
                                    value={tempFilters.email}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Поиск по email..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                                <input
                                    type="text"
                                    value={tempFilters.role}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Поиск по роли..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                <input
                                    type="text"
                                    value={tempFilters.phone}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Поиск по телефону..."
                                />
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
                                        const empty = { name: '', email: '', role: '', phone: '' };
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