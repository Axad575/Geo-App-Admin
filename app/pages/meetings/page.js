"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app, db } from "@/app/api/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";
import CreateMeetingModal from "@/app/components/CreateMeetingModal";
import MeetingListItem from "@/app/components/MeetingListItem";
import ParticipantSelector from "@/app/components/participantSelector";
import { useStrings } from "@/app/hooks/useStrings";

// Функция для генерации ссылки на конференцию
const generateConferenceUrl = (meetingTitle, orgId, meetingId) => {
    const roomName = `${orgId}_${meetingTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${meetingId}`;
    return `https://meet.jit.si/${roomName}`;
};

// Функция для отправки уведомлений участникам
const sendMeetingNotifications = async (meeting, orgId, db) => {
    try {
        for (const participantId of meeting.participants || []) {
            await addDoc(collection(db, `organizations/${orgId}/users/${userId}/notifications`), {
                type: 'meeting_started',
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                conferenceUrl: meeting.conferenceUrl,
                createdAt: new Date().toISOString(),
                read: false,
                message: `Началась встреча: ${meeting.title}`
            });
        }
    } catch (error) {
        console.error('Error sending notifications:', error);
    }
};

// Обновленный компонент для мгновенной встречи
const QuickMeetingModal = ({ isOpen, onClose, onSubmit, orgId }) => {
    const [meetingData, setMeetingData] = useState({
        title: '',
        description: '',
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
        if (!meetingData.title.trim()) return;

        setLoading(true);
        try {
            await onSubmit(meetingData);
            setMeetingData({
                title: '',
                description: '',
                participants: []
            });
        } catch (error) {
            console.error('Error creating quick meeting:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleParticipantsChange = (participants) => {
        setMeetingData(prev => ({
            ...prev,
            participants
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Мгновенная встреча</h3>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Тема встречи *
                        </label>
                        <input
                            type="text"
                            required
                            value={meetingData.title}
                            onChange={(e) => setMeetingData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Введите тему встречи"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Описание
                        </label>
                        <textarea
                            value={meetingData.description}
                            onChange={(e) => setMeetingData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder="Краткое описание встречи"
                        />
                    </div>

                    {/* Новый компонент выбора участников */}
                    <ParticipantSelector
                        users={users}
                        selectedParticipants={meetingData.participants}
                        onParticipantsChange={handleParticipantsChange}
                        excludeUserIds={currentUser ? [currentUser.uid] : []}
                        label="Участники конференции"
                        placeholder="Поиск по имени, email или роли..."
                        maxHeight="250px"
                        showSelectedCount={true}
                    />

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={!meetingData.title.trim() || loading}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? 'Запускаем...' : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Начать конференцию
                                </>
                            )}
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

// Компонент для мгновенной встречи
const QuickMeetingModalOld = ({ isOpen, onClose, onSubmit, orgId }) => {
    const [meetingData, setMeetingData] = useState({
        title: '',
        description: '',
        participants: []
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && orgId) {
            fetchUsers();
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
        if (!meetingData.title.trim()) return;

        setLoading(true);
        try {
            await onSubmit(meetingData);
            setMeetingData({
                title: '',
                description: '',
                participants: []
            });
        } catch (error) {
            console.error('Error creating quick meeting:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleParticipantToggle = (userId) => {
        setMeetingData(prev => ({
            ...prev,
            participants: prev.participants.includes(userId)
                ? prev.participants.filter(id => id !== userId)
                : [...prev.participants, userId]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Мгновенная встреча</h3>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Тема встречи *
                        </label>
                        <input
                            type="text"
                            required
                            value={meetingData.title}
                            onChange={(e) => setMeetingData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Введите тему встречи"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Описание
                        </label>
                        <textarea
                            value={meetingData.description}
                            onChange={(e) => setMeetingData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder="Краткое описание встречи"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Участники
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                            {users.map((user) => (
                                <label key={user.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={meetingData.participants.includes(user.id)}
                                        onChange={() => handleParticipantToggle(user.id)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">
                                        {user.name || user.email}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={!meetingData.title.trim() || loading}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? 'Запускаем...' : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Начать конференцию
                                </>
                            )}
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

// Модальное окно для редактирования встречи
const EditMeetingModal = ({ isOpen, onClose, meeting, onSuccess, orgId }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        datetime: '',
        participants: []
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (isOpen && meeting) {
            // Преобразуем дату в формат datetime-local
            let dateValue = '';
            if (meeting.date || meeting.datetime) {
                try {
                    const timestamp = meeting.date || meeting.datetime;
                    let date;
                    if (timestamp.seconds) {
                        date = new Date(timestamp.seconds * 1000);
                    } else {
                        date = new Date(timestamp);
                    }
                    dateValue = date.toISOString().slice(0, 16);
                } catch (error) {
                    console.error('Error parsing date:', error);
                }
            }

            setFormData({
                title: meeting.title || '',
                description: meeting.description || '',
                location: meeting.location || '',
                datetime: dateValue,
                participants: meeting.participants || []
            });
        }
    }, [isOpen, meeting]);

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
        if (!formData.title.trim() || !formData.datetime) return;

        setLoading(true);
        try {
            const meetingRef = doc(db, `organizations/${orgId}/meetings/${meeting.id}`);
            await updateDoc(meetingRef, {
                title: formData.title,
                description: formData.description,
                location: formData.location,
                date: new Date(formData.datetime).toISOString(),
                datetime: new Date(formData.datetime).toISOString(),
                participants: formData.participants,
                updatedAt: new Date().toISOString()
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating meeting:', error);
            alert('Ошибка при обновлении встречи');
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
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Редактировать встречу</h3>
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
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Описание
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Дата и время *
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.datetime}
                            onChange={(e) => setFormData(prev => ({ ...prev, datetime: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Место проведения
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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

export default function Meetings() {
    const auth = getAuth(app);
    const router = useRouter();
    const { t } = useStrings();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQuickMeetingModalOpen, setIsQuickMeetingModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const [users, setUsers] = useState({});
    const [orgId, setOrgId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [filter, setFilter] = useState('all');

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

    const fetchMeetings = async (organizationId, userId) => {
        try {
            const meetingsRef = collection(db, `organizations/${organizationId}/meetings`);
            const querySnapshot = await getDocs(meetingsRef);
            
            console.log(`Found ${querySnapshot.docs.length} meetings in organization`);
            
            const meetingsList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                console.log('Meeting data:', doc.id, data);
                return {
                    id: doc.id,
                    orgId: organizationId,
                    ...data
                };
            });
            
            // Сортируем по дате (новые сначала)
            meetingsList.sort((a, b) => {
                const dateA = new Date(a.date?.seconds ? a.date.seconds * 1000 : a.date || 0);
                const dateB = new Date(b.date?.seconds ? b.date.seconds * 1000 : b.date || 0);
                return dateB - dateA;
            });
            
            setMeetings(meetingsList);
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMeetingUpdate = async (meetingId, updateData) => {
        try {
            const meetingRef = doc(db, `organizations/${orgId}/meetings/${meetingId}`);
            await updateDoc(meetingRef, {
                ...updateData,
                updatedAt: new Date().toISOString()
            });
            
            // Обновляем список встреч
            await fetchMeetings(orgId, currentUser.uid);
        } catch (error) {
            console.error('Error updating meeting:', error);
            throw error;
        }
    };

    const handleDeleteMeeting = async (meetingId) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту встречу?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, `organizations/${orgId}/meetings/${meetingId}`));
            await fetchMeetings(orgId, currentUser.uid);
        } catch (error) {
            console.error('Error deleting meeting:', error);
            alert('Ошибка при удалении встречи');
        }
    };

    const handleEditMeeting = (meeting) => {
        setEditingMeeting(meeting);
        setIsEditModalOpen(true);
    };

    const handleQuickMeeting = async (meetingData) => {
        try {
            // Создаем временный ID для генерации ссылки
            const tempId = Date.now().toString();
            const conferenceUrl = generateConferenceUrl(meetingData.title, orgId, tempId);
            
            const newMeeting = {
                ...meetingData,
                date: new Date().toISOString(),
                status: 'in_progress',
                type: 'instant',
                conferenceUrl: conferenceUrl,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.uid,
                startedAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, `organizations/${orgId}/meetings`), newMeeting);
            
            // Обновляем конференцию с реальным ID
            const finalConferenceUrl = generateConferenceUrl(meetingData.title, orgId, docRef.id);
            await updateDoc(docRef, { conferenceUrl: finalConferenceUrl });
            
            // Автоматически открываем конференцию для создателя
            window.open(finalConferenceUrl, '_blank');
            
            // Отправляем уведомления участникам
            await sendMeetingNotifications({
                ...newMeeting,
                id: docRef.id,
                conferenceUrl: finalConferenceUrl
            }, orgId, db);
            
            // Обновляем список встреч
            await fetchMeetings(orgId, currentUser.uid);
            setIsQuickMeetingModalOpen(false);
        } catch (error) {
            console.error('Error creating quick meeting:', error);
            throw error;
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
                    await fetchMeetings(userOrgId, user.uid);
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

    const handleSuccess = () => {
        if (orgId && currentUser) {
            fetchMeetings(orgId, currentUser.uid);
        }
    };

    // Фильтрация встреч с учетом нормализации статусов
    const filteredMeetings = meetings.filter(meeting => {
        if (filter === 'all') return true;
        
        const normalizedStatus = meeting.status?.toLowerCase() || 'scheduled';
        
        if (filter === 'scheduled') {
            return normalizedStatus === 'scheduled' || 
                   normalizedStatus === 'upcoming' || 
                   !meeting.status || 
                   normalizedStatus === null;
        }
        
        return normalizedStatus === filter;
    });

    // Статистика с учетом нормализации
    const stats = {
        total: meetings.length,
        scheduled: meetings.filter(m => {
            const status = m.status?.toLowerCase() || 'scheduled';
            return status === 'scheduled' || 
                   status === 'upcoming' || 
                   !m.status || 
                   status === null;
        }).length,
        in_progress: meetings.filter(m => m.status?.toLowerCase() === 'in_progress').length,
        completed: meetings.filter(m => m.status?.toLowerCase() === 'completed').length,
        cancelled: meetings.filter(m => m.status?.toLowerCase() === 'cancelled').length
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar orgId={orgId} />
            <div className="flex-1">
                <Navbar orgId={orgId} />
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">{t('meetings.title')}</h1>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsQuickMeetingModalOpen(true)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Мгновенная конференция
                            </button>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                {t('meetings.scheduleMeeting')}
                            </button>
                        </div>
                    </div>

                    {/* Статистика */}
                    <div className="grid grid-cols-5 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                            <div className="text-sm text-gray-600">Всего встреч</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-yellow-600">{stats.scheduled}</div>
                            <div className="text-sm text-gray-600">Запланировано</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
                            <div className="text-sm text-gray-600">В процессе</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                            <div className="text-sm text-gray-600">Проведено</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                            <div className="text-sm text-gray-600">Отменено</div>
                        </div>
                    </div>

                    {/* Фильтры */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'all' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Все ({stats.total})
                        </button>
                        <button
                            onClick={() => setFilter('scheduled')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'scheduled' 
                                    ? 'bg-yellow-600 text-white' 
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Запланированные ({stats.scheduled})
                        </button>
                        <button
                            onClick={() => setFilter('in_progress')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'in_progress' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            В процессе ({stats.in_progress})
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'completed' 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Проведенные ({stats.completed})
                        </button>
                        <button
                            onClick={() => setFilter('cancelled')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === 'cancelled' 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Отмененные ({stats.cancelled})
                        </button>
                    </div>

                    {/* Содержимое */}
                    {loading ? (
                        <div className="text-center text-gray-700">{t('loading')}...</div>
                    ) : filteredMeetings.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📹</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {filter === 'all' ? 'Пока нет встреч' : `Нет ${filter === 'scheduled' ? 'запланированных' : filter === 'in_progress' ? 'текущих' : filter === 'completed' ? 'проведенных' : 'отмененных'} встреч`}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {filter === 'all' 
                                    ? 'Запланируйте встречу или начните мгновенную видеоконференцию'
                                    : 'Попробуйте изменить фильтр для просмотра других встреч'
                                }
                            </p>
                            {filter === 'all' && (
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setIsQuickMeetingModalOpen(true)}
                                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Мгновенная конференция
                                    </button>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Запланировать встречу
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Название
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Дата и время
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Место
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Участники
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Статус
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Действия
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredMeetings.map((meeting) => {
                                        const formatDate = (timestamp) => {
                                            if (!timestamp) return '';
                                            try {
                                                let date;
                                                if (timestamp.seconds) {
                                                    date = new Date(timestamp.seconds * 1000);
                                                } else {
                                                    date = new Date(timestamp);
                                                }
                                                return date.toLocaleString('ru-RU', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });
                                            } catch (error) {
                                                return '';
                                            }
                                        };

                                        const getStatusBadge = (status) => {
                                            const normalizedStatus = status?.toLowerCase() || 'scheduled';
                                            const badges = {
                                                'completed': 'bg-green-100 text-green-800',
                                                'in_progress': 'bg-blue-100 text-blue-800',
                                                'scheduled': 'bg-yellow-100 text-yellow-800',
                                                'upcoming': 'bg-yellow-100 text-yellow-800',
                                                'cancelled': 'bg-red-100 text-red-800'
                                            };
                                            const statusTexts = {
                                                'completed': 'Проведена',
                                                'in_progress': 'В процессе',
                                                'scheduled': 'Запланирована',
                                                'upcoming': 'Запланирована',
                                                'cancelled': 'Отменена'
                                            };
                                            const badgeClass = badges[normalizedStatus] || 'bg-gray-100 text-gray-800';
                                            const statusText = statusTexts[normalizedStatus] || 'Запланирована';
                                            
                                            return (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
                                                    {statusText}
                                                </span>
                                            );
                                        };

                                        const normalizedStatus = meeting.status?.toLowerCase() || 'scheduled';
                                        const isCompleted = normalizedStatus === 'completed';
                                        const isCancelled = normalizedStatus === 'cancelled';
                                        const canEdit = !isCompleted && !isCancelled;

                                        return (
                                            <tr key={meeting.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {meeting.title}
                                                            </div>
                                                            {meeting.description && (
                                                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                                                    {meeting.description}
                                                                </div>
                                                            )}
                                                            {meeting.type === 'instant' && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                                                    Мгновенная
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{formatDate(meeting.date)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {meeting.location || '-'}
                                                    </div>
                                                    {meeting.conferenceUrl && (
                                                        <button
                                                            onClick={() => window.open(meeting.conferenceUrl, '_blank')}
                                                            className="text-xs text-purple-600 hover:text-purple-900 flex items-center gap-1 mt-1"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            Видео
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {meeting.participants && meeting.participants.length > 0 ? (
                                                            meeting.participants.slice(0, 3).map((participantId, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {users[participantId] || participantId}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-sm text-gray-500">-</span>
                                                        )}
                                                        {meeting.participants && meeting.participants.length > 3 && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                +{meeting.participants.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(meeting.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleEditMeeting(meeting)}
                                                                className="text-blue-600 hover:text-blue-900"
                                                                title="Редактировать"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteMeeting(meeting.id)}
                                                            className="text-red-600 hover:text-red-900"
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

                {orgId && (
                    <>
                        <CreateMeetingModal 
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSuccess={handleSuccess}
                            orgId={orgId}
                        />

                        <QuickMeetingModal
                            isOpen={isQuickMeetingModalOpen}
                            onClose={() => setIsQuickMeetingModalOpen(false)}
                            onSubmit={handleQuickMeeting}
                            orgId={orgId}
                        />

                        <EditMeetingModal
                            isOpen={isEditModalOpen}
                            onClose={() => {
                                setIsEditModalOpen(false);
                                setEditingMeeting(null);
                            }}
                            meeting={editingMeeting}
                            onSuccess={handleSuccess}
                            orgId={orgId}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
