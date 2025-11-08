"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app, db } from "@/app/api/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";
import ProjectCard from "@/app/components/ProjectCardforHS";
import MeetingCard from "@/app/components/MeetingCard";
import { useStrings } from "@/app/hooks/useStrings";

export default function Home() {
    const auth = getAuth(app);
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [users, setUsers] = useState({});
    const [currentUser, setCurrentUser] = useState(null);
    const [orgId, setOrgId] = useState(null);
    const [orgName, setOrgName] = useState('');
    const [loading, setLoading] = useState(true);
    const { t, language } = useStrings();

    // Получаем локаль для форматирования даты в зависимости от языка
    const getLocale = () => {
        switch (language) {
            case 'ru': return 'ru-RU';
            case 'en': return 'en-GB';
            case 'uz': return 'uz-UZ';
            default: return 'en-GB';
        }
    };

    // Получение текущей организации пользователя
    const getCurrentUserOrg = async (userId) => {
        try {
            // Ищем пользователя в подколлекциях organizations/{orgId}/users
            const organizationsSnapshot = await getDocs(collection(db, 'organizations'));
            
            for (const orgDoc of organizationsSnapshot.docs) {
                const userInOrgDoc = await getDoc(doc(db, `organizations/${orgDoc.id}/users/${userId}`));
                if (userInOrgDoc.exists()) {
                    console.log('User found in organization:', orgDoc.id, orgDoc.data().name);
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

    // Получение данных организации
    const fetchOrganizationData = async (organizationId) => {
        try {
            const orgDoc = await getDoc(doc(db, `organizations/${organizationId}`));
            if (orgDoc.exists()) {
                setOrgName(orgDoc.data().name || 'Organization');
            }
        } catch (error) {
            console.error('Error fetching organization data:', error);
        }
    };

    // Получение пользователей организации
    const fetchUsers = async (organizationId) => {
        try {
            const usersRef = collection(db, `organizations/${organizationId}/users`);
            const usersSnapshot = await getDocs(usersRef);
            const usersMap = {};
            usersSnapshot.forEach(doc => {
                usersMap[doc.id] = doc.data().name || doc.data().email;
            });
            setUsers(usersMap);
            return usersMap;
        } catch (error) {
            console.error('Error fetching users:', error);
            return {};
        }
    };

    // Получение проектов и встреч
    const fetchData = async (organizationId, userId) => {
        try {
            const usersMap = await fetchUsers(organizationId);
            
            // Получаем название организации
            const orgDoc = await getDoc(doc(db, `organizations/${organizationId}`));
            const organizationName = orgDoc.exists() ? orgDoc.data().name : 'Organization';
            
            // Fetch projects
            const projectsRef = collection(db, `organizations/${organizationId}/projects`);
            const projectsSnapshot = await getDocs(projectsRef);
            
            console.log(`Found ${projectsSnapshot.docs.length} projects in organization`);
            
            const projectsList = projectsSnapshot.docs.map(doc => {
                const data = doc.data();
                console.log('Project data:', doc.id, data);
                return {
                    id: doc.id,
                    ...data,
                    organization: organizationName, // Добавляем название организации
                    ownerName: usersMap[data.createdBy || data.owner] || data.createdBy || data.owner,
                    participantsNames: data.members?.map(id => usersMap[id] || id) || []
                };
            });
            
            console.log(`Total projects: ${projectsList.length}`);
            console.log('Current user ID:', userId);
            
            // Показываем все проекты без фильтрации (временно для отладки)
            setProjects(projectsList);

            // Fetch meetings
            const meetingsRef = collection(db, `organizations/${organizationId}/meetings`);
            const meetingsSnapshot = await getDocs(meetingsRef);
            
            console.log(`Found ${meetingsSnapshot.docs.length} meetings in organization`);
            
            const meetingsList = meetingsSnapshot.docs.map(doc => {
                const data = doc.data();
                console.log('Meeting data:', doc.id, data);
                return {
                    id: doc.id,
                    ...data,
                    ownerName: usersMap[data.owner] || data.owner,
                    participantsNames: data.participants?.map(id => usersMap[id] || id) || []
                };
            });
            
            console.log(`Total meetings: ${meetingsList.length}`);
            
            // Показываем все встречи без фильтрации (временно для отладки)
            setMeetings(meetingsList);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const userOrgId = await getCurrentUserOrg(user.uid);
                
                if (userOrgId) {
                    setOrgId(userOrgId);
                    await fetchOrganizationData(userOrgId);
                    await fetchData(userOrgId, user.uid);
                } else {
                    console.error('User is not assigned to any organization');
                    setLoading(false);
                    // Пользователь не привязан к организации
                    alert('You are not assigned to any organization. Please contact your administrator.');
                    // Можно перенаправить на страницу создания организации
                    // router.push('/pages/admin/create-organization');
                }
            } else {
                router.push('/auth/login');
            }
        });

        return () => unsubscribe();
    }, []);

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(getLocale(), {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const today = new Date().toLocaleDateString(getLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        weekday: 'long'
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    // Если пользователь не привязан к организации
    if (!orgId) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                    <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Organization</h2>
                    <p className="text-gray-600 mb-6">
                        You are not assigned to any organization. Please contact your administrator to get access.
                    </p>
                    <button
                        onClick={() => auth.signOut()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex">
            <Sidebar orgId={orgId} />
            <div className="flex-1">
                <Navbar orgId={orgId} />
                <div className="p-6 bg-gray-50  min-h-screen">
                    {/* Welcome Section */}
                    <div className="bg-linear-to-br from-green-600 to-green-400  rounded-xl p-6 mb-6 text-white">
                        <h1 className="text-3xl font-bold mb-2">
                            {t('home.title')}, {users[currentUser?.uid] || currentUser?.displayName || 'User'}!
                        </h1>
                        <div className="flex items-center gap-2 text-blue-900">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <p className="text-lg font-medium">{orgName}</p>
                        </div>
                        <div className="mt-3">
                            <p className="text-sm text-blue-100">{t('home.today')}</p>
                            <p className="text-xl font-semibold text-white">{today}</p>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white  rounded-lg shadow-sm p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('home.totalProjects')}</p>
                                    <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
                                </div>
                                <div className="bg-blue-100 rounded-full p-3">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white  rounded-lg shadow-sm p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('home.upcomingMeetings')}</p>
                                    <p className="text-2xl font-bold text-gray-800">{meetings.length}</p>
                                </div>
                                <div className="bg-green-100 rounded-full p-3">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white  rounded-lg shadow-sm p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('home.teamMembers')}</p>
                                    <p className="text-2xl font-bold text-gray-800">{Object.keys(users).length}</p>
                                </div>
                                <div className="bg-purple-100 rounded-full p-3">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Projects Section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">{t('projects.title')}</h2>
                            {projects.length > 0 && (
                                <a href="/pages/projects" className="text-blue-600 hover:text-blue-800 text-sm">
                                    {t('home.viewAllProjects')}
                                </a>
                            )}
                        </div>
                        {projects.length === 0 ? (
                            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 mb-2">{t('projects.noProjects')}</p>
                                <p className="text-sm text-gray-400">{t('projects.createNew')}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto overflow-y-hidden">
                                <div className="grid grid-cols-3 gap-4 pb-2" style={{ width: 'max-content' }}>
                                    {projects.map((project) => (
                                        <div key={project.id} style={{ minWidth: '350px', maxWidth: '350px' }}>
                                            <ProjectCard project={project} orgId={orgId} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Meetings Section */}
                    <div className="bg-green-100  rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">{t('meetings.title')}</h2>
                            {meetings.length > 0 && (
                                <a href="/pages/meetings" className="text-blue-600 hover:text-blue-800 text-sm">
                                    {t('home.viewAllMeetings')}
                                </a>
                            )}
                        </div>
                        {meetings.length === 0 ? (
                            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-500 mb-2">{t('meetings.noMeetings')}</p>
                                <p className="text-sm text-gray-400">{t('meetings.scheduleFirst')}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto overflow-y-hidden">
                                <div className="grid grid-cols-3 gap-4 pb-2" style={{ width: 'max-content' }}>
                                    {meetings.map((meeting) => (
                                        <div key={meeting.id} style={{ minWidth: '320px', maxWidth: '320px' }}>
                                            <MeetingCard meeting={meeting} orgId={orgId} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
