"use client";
import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app, db } from '@/app/api/firebase';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import Navbar from '@/app/components/navbar';
import Sidebar from '@/app/components/sidebar';

const SubscriptionPage = () => {
    const auth = getAuth(app);
    
    const [loading, setLoading] = useState(true);
    const [orgId, setOrgId] = useState(null);
    const [organization, setOrganization] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);

    const enterprisePlan = {
        name: 'GeoNote Enterprise',
        features: [
            'Неограниченное количество проектов',
            'Неограниченное хранилище данных',
            'Расширенные геологические инструменты',
            'Геологические логи с экспортом',
            'Интерактивные карты с KML/GPX',
            'Управление встречами и задачами',
            'Система новостей и уведомлений',
            'Персональный менеджер поддержки',
            'Техническая поддержка 24/7',
            'SLA гарантии 99.9% uptime',
            'Резервное копирование данных',
            'API доступ для интеграций',
            'Индивидуальная настройка под компанию',
            'Обучение команды'
        ]
    };

    const getCurrentUserOrg = async (userId) => {
        try {
            const organizationsSnapshot = await getDocs(collection(db, 'organizations'));
            
            for (const orgDoc of organizationsSnapshot.docs) {
                const userInOrgDoc = await getDoc(doc(db, `organizations/${orgDoc.id}/users/${userId}`));
                if (userInOrgDoc.exists()) {
                    return orgDoc.id;
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching user organization:', error);
            return null;
        }
    };

    const fetchOrganization = async (organizationId) => {
        try {
            const orgDoc = await getDoc(doc(db, `organizations/${organizationId}`));
            if (orgDoc.exists()) {
                setOrganization({ id: orgDoc.id, ...orgDoc.data() });
            }
        } catch (error) {
            console.error('Error fetching organization:', error);
        }
    };

    const fetchSubscription = async (organizationId) => {
        try {
            const subDoc = await getDoc(doc(db, `organizations/${organizationId}/subscription/current`));
            if (subDoc.exists()) {
                setSubscription(subDoc.data());
            } else {
                const defaultSub = {
                    plan: 'enterprise',
                    status: 'trial',
                    startDate: new Date().toISOString(),
                    endDate: null
                };
                await setDoc(doc(db, `organizations/${organizationId}/subscription/current`), defaultSub);
                setSubscription(defaultSub);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        }
    };

    const fetchUsers = async (organizationId) => {
        try {
            const usersSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users`));
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchProjects = async (organizationId) => {
        try {
            const projectsSnapshot = await getDocs(collection(db, `organizations/${organizationId}/projects`));
            const projectsList = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(projectsList);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '/';
                return;
            }

            try {
                const userOrgId = await getCurrentUserOrg(user.uid);
                if (userOrgId) {
                    setOrgId(userOrgId);
                    await fetchOrganization(userOrgId);
                    await fetchSubscription(userOrgId);
                    await fetchUsers(userOrgId);
                    await fetchProjects(userOrgId);
                } else {
                    console.log('User not found in any organization');
                }
            } catch (error) {
                console.error('Error initializing page:', error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const getStatusBadge = () => {
        if (!subscription || !subscription.status) {
            return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">Не активна</span>;
        }
        
        const now = new Date();
        const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
        const isExpired = endDate && endDate < now;
        
        if (isExpired) {
            return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Истекла</span>;
        }
        
        if (subscription.status === 'active') {
            return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Активна</span>;
        }
        
        if (subscription.status === 'trial') {
            return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Пробная</span>;
        }
        
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">Не активна</span>;
    };

    const getDaysRemaining = () => {
        if (!subscription || !subscription.endDate) return null;
        const now = new Date();
        const endDate = new Date(subscription.endDate);
        const days = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Не указана';
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-xl">Загрузка...</div>
                </div>
            </div>
        );
    }

    const daysRemaining = getDaysRemaining();
    const now = new Date();
    const isExpired = subscription?.endDate && new Date(subscription.endDate) < now;
    const hasValidSubscription = subscription && (subscription.status === 'active' || subscription.status === 'trial') && !isExpired;

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Подписка</h1>
                            {organization && (
                                <p className="text-gray-600">Управление подпиской для {organization.name}</p>
                            )}
                        </div>

                        {/* Current Subscription Status */}
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <h2 className="text-xl font-bold mb-4">Текущий статус</h2>
                            
                            {hasValidSubscription ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-4 border-b">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-lg font-semibold">Корпоративный план</span>
                                            {getStatusBadge()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-600 mb-1">Дата начала</p>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {formatDate(subscription.startDate)}
                                            </p>
                                        </div>

                                        {subscription.endDate && (
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-600 mb-1">Дата окончания</p>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {formatDate(subscription.endDate)}
                                                </p>
                                                {daysRemaining !== null && (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Осталось {daysRemaining} {daysRemaining === 1 ? 'день' : daysRemaining < 5 ? 'дня' : 'дней'}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-600 mb-1">Активных пользователей</p>
                                            <p className="text-lg font-semibold text-gray-900">{users.length}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-600 mb-1">Активных проектов</p>
                                            <p className="text-lg font-semibold text-gray-900">{projects.length}</p>
                                        </div>

                                        {subscription.lastPaymentDate && (
                                            <div className="p-4 bg-blue-50 rounded-lg">
                                                <p className="text-sm text-gray-600 mb-1">Последнее обновление</p>
                                                <p className="text-sm text-gray-700">
                                                    {formatDate(subscription.lastPaymentDate)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Подписка не активна</h3>
                                    <p className="text-gray-600 mb-6">
                                        {subscription?.endDate && new Date(subscription.endDate) < new Date()
                                            ? 'Срок действия вашей подписки истек. Свяжитесь с отделом продаж для продления.'
                                            : subscription?.status === 'trial'
                                            ? 'Ваша организация использует пробную версию. Свяжитесь с отделом продаж для активации полной подписки.'
                                            : 'У вас нет активной подписки. Свяжитесь с отделом продаж для активации.'}
                                    </p>
                                    <a
                                        href="mailto:sales@geonote.com"
                                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        Связаться с отделом продаж
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Plan Features */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-bold mb-4">Возможности корпоративного плана</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {enterprisePlan.features.map((feature, index) => (
                                    <div key={index} className="flex items-start space-x-3">
                                        <svg className="w-5 h-5 text-green-500 flex shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-gray-700">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Примечание:</strong> Активация и продление подписки осуществляется отделом продаж. 
                                    Для изменения подписки свяжитесь с нами по адресу{' '}
                                    <a href="mailto:sales@geonote.com" className="underline font-semibold">
                                        sales@geonote.com
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
