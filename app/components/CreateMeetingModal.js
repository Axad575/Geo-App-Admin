"use client";
import { useState, useEffect } from 'react';
import { addDoc, collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app, db } from '@/app/api/firebase';
import { useStrings } from "@/app/hooks/useStrings";
import ParticipantSelector from './participantSelector';

const CreateMeetingModal = ({ isOpen, onClose, onSuccess, orgId, projectId = null }) => {
    const auth = getAuth(app);
    const { t } = useStrings();
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [orgName, setOrgName] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',
        createdBy: '',
        projectId: projectId || '',
        participants: [],
        description: '',
        status: 'scheduled',
        type: 'regular'
    });

    const fetchUsers = async () => {
        try {
            const usersRef = collection(db, `organizations/${orgId}/users`);
            const usersSnapshot = await getDocs(usersRef);
            const usersList = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchProjects = async () => {
        try {
            const projectsRef = collection(db, `organizations/${orgId}/projects`);
            const projectsSnapshot = await getDocs(projectsRef);
            const projectsList = projectsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProjects(projectsList);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const fetchOrganizationName = async () => {
        try {
            const orgDoc = await getDoc(doc(db, `organizations/${orgId}`));
            if (orgDoc.exists()) {
                setOrgName(orgDoc.data().name || 'Organization');
            }
        } catch (error) {
            console.error('Error fetching organization:', error);
        }
    };

    useEffect(() => {
        if (isOpen && orgId) {
            fetchUsers();
            fetchProjects();
            fetchOrganizationName();
            const currentUser = auth.currentUser;
            if (currentUser) {
                setFormData(prev => ({
                    ...prev,
                    createdBy: currentUser.uid,
                    projectId: projectId || ''
                }));
            }
        }
    }, [isOpen, orgId, projectId]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleParticipantsChange = (participants) => {
        setFormData(prev => ({
            ...prev,
            participants
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Структура данных согласно новой схеме БД
            const meetingData = {
                title: formData.title,
                datetime: new Date(formData.date).toISOString(),
                location: formData.location || '',
                owner: formData.createdBy,
                projectId: formData.projectId || null,
                participants: formData.participants,
                notes: formData.description || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Создание встречи в подколлекции организации
            const meetingsRef = collection(db, `organizations/${orgId}/meetings`);
            await addDoc(meetingsRef, meetingData);
            
            onSuccess();
            onClose();
            
            // Сброс формы
            setFormData({
                title: '',
                date: '',
                location: '',
                createdBy: auth.currentUser?.uid || '',
                projectId: projectId || '',
                participants: [],
                description: ''
            });
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Error creating meeting. Please try again.');
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={(e) => {
                // Close modal when clicking on backdrop
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div 
                className="bg-white rounded-lg p-6 w-full max-w-md max-h-full overflow-y-auto my-auto mx-auto shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 ">{t('meetings.scheduleMeeting')}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Организация - только для чтения */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('projects.organization')}
                        </label>
                        <input
                            type="text"
                            value={orgName}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('meetings.meetingTitle')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            placeholder={t('meetings.meetingTitle')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('meetings.startDate')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('projects.projectOptional')}
                        </label>
                        <select
                            value={formData.projectId || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        >
                            <option value="">{t('projects.noProject')}</option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>
                                    {project.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('meetings.location')}
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            placeholder={t('meetings.enterMeetingLocation')}
                        />
                    </div>

                    {/* Заменяем старый выбор участников на новый компонент */}
                    <ParticipantSelector
                        users={users}
                        selectedParticipants={formData.participants}
                        onParticipantsChange={handleParticipantsChange}
                        excludeUserIds={formData.createdBy ? [formData.createdBy] : []}
                        label={t('meetings.participants')}
                        placeholder="Поиск участников по имени, email или роли..."
                        maxHeight="200px"
                        showSelectedCount={true}
                        className="mb-4"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('meetings.notes')}
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            placeholder={t('meetings.addMeetingNotes')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            {t('meetings.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {t('meetings.createMeeting')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateMeetingModal;