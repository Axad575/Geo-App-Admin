"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, updateProfile, updatePassword, signOut } from "firebase/auth";
import { app, db } from "@/app/api/firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import Sidebar from "@/app/components/sidebar";
import Navbar from "@/app/components/navbar";
import { useStrings, changeLanguage } from "@/app/hooks/useStrings";

export default function Settings() {
    const router = useRouter();
    const auth = getAuth(app);
    const { t, language } = useStrings();
    const [currentUser, setCurrentUser] = useState(null);
    const [orgId, setOrgId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState({
        name: '',
        email: '',
        organization: '',
        role: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [appSettings, setAppSettings] = useState({
        language: 'ru'
    });

    // Получение текущей организации пользователя
    const getCurrentUserOrg = async (userId) => {
        try {
            const organizationsSnapshot = await getDocs(collection(db, 'organizations'));
            
            for (const orgDoc of organizationsSnapshot.docs) {
                const userInOrgDoc = await getDoc(doc(db, `organizations/${orgDoc.id}/users/${userId}`));
                if (userInOrgDoc.exists()) {
                    return { 
                        orgId: orgDoc.id, 
                        orgData: orgDoc.data(),
                        userData: userInOrgDoc.data() 
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching user organization:', error);
            return null;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const orgInfo = await getCurrentUserOrg(user.uid);
                if (orgInfo) {
                    setOrgId(orgInfo.orgId);
                    setUserProfile({
                        name: user.displayName || orgInfo.userData.name || '',
                        email: user.email || '',
                        organization: orgInfo.orgData.name || 'Unknown Organization',
                        role: orgInfo.userData.role || 'member'
                    });
                }
                setLoading(false);
            } else {
                router.push('/auth/login');
            }
        });

        // Загружаем настройки приложения из localStorage
        const savedLanguage = localStorage.getItem('app-language') || 'ru';
        setAppSettings({
            language: savedLanguage
        });

        return () => unsubscribe();
    }, [router]);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const handleLanguageChange = (newLanguage) => {
        setAppSettings(prev => ({ ...prev, language: newLanguage }));
        changeLanguage(newLanguage);
        showMessage('success', t('settings.languageChanged'));
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Обновляем профиль в Firebase Auth
            if (currentUser.displayName !== userProfile.name) {
                await updateProfile(currentUser, {
                    displayName: userProfile.name
                });
            }

            // Обновляем данные пользователя в Firestore
            if (orgId) {
                const userRef = doc(db, `organizations/${orgId}/users/${currentUser.uid}`);
                await updateDoc(userRef, {
                    name: userProfile.name,
                    email: userProfile.email
                });
            }

            showMessage('success', 'Профиль успешно обновлен!');
        } catch (error) {
            console.error('Error updating profile:', error);
            showMessage('error', 'Ошибка при обновлении профиля');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showMessage('error', 'Новые пароли не совпадают');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            showMessage('error', 'Пароль должен содержать минимум 6 символов');
            return;
        }

        setSaving(true);

        try {
            await updatePassword(currentUser, passwordData.newPassword);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showMessage('success', 'Пароль успешно изменен!');
        } catch (error) {
            console.error('Error updating password:', error);
            showMessage('error', 'Ошибка при изменении пароля');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('loading')}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Navbar />
                <main className="flex-1 p-6">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('settings.title')}</h1>

                        {/* Message Alert */}
                        {message.text && (
                            <div className={`mb-6 p-4 rounded-lg ${
                                message.type === 'success' 
                                    ? 'bg-green-100 border border-green-400 text-green-700' 
                                    : 'bg-red-100 border border-red-400 text-red-700'
                            }`}>
                                {message.text}
                            </div>
                        )}

                        {/* Tab Navigation */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="border-b border-gray-200">
                                <nav className="flex space-x-8 px-6">
                                    <button
                                        onClick={() => setActiveTab('profile')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'profile'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {t('settings.profile')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('security')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'security'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {t('settings.security')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('organization')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'organization'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {t('settings.organization')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('appearance')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'appearance'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {t('settings.appearance')}
                                    </button>
                                </nav>
                            </div>

                            <div className="p-6">
                                {/* Profile Tab */}
                                {activeTab === 'profile' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                {t('settings.profileInfo')}
                                            </h3>
                                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {t('settings.name')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={userProfile.name}
                                                        onChange={(e) => setUserProfile(prev => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        placeholder={t('settings.enterName')}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {t('settings.email')}
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={userProfile.email}
                                                        disabled
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {t('settings.emailCantChange')}
                                                    </p>
                                                </div>
                                                <div className="flex justify-end">
                                                    <button
                                                        type="submit"
                                                        disabled={saving}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                                                    >
                                                        {saving ? t('settings.saving') : t('settings.saveChanges')}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {/* Security Tab */}
                                {activeTab === 'security' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                {t('settings.changePassword')}
                                            </h3>
                                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {t('settings.newPassword')}
                                                    </label>
                                                    <input
                                                        type="password"
                                                        value={passwordData.newPassword}
                                                        onChange={(e) => setPasswordData(prev => ({
                                                            ...prev,
                                                            newPassword: e.target.value
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        placeholder={t('settings.enterNewPassword')}
                                                        minLength="6"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {t('settings.confirmPassword')}
                                                    </label>
                                                    <input
                                                        type="password"
                                                        value={passwordData.confirmPassword}
                                                        onChange={(e) => setPasswordData(prev => ({
                                                            ...prev,
                                                            confirmPassword: e.target.value
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        placeholder={t('settings.confirmNewPassword')}
                                                        minLength="6"
                                                    />
                                                </div>
                                                <div className="flex justify-end">
                                                    <button
                                                        type="submit"
                                                        disabled={saving || !passwordData.newPassword || !passwordData.confirmPassword}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                                                    >
                                                        {saving ? t('settings.changing') : t('settings.changePasswordBtn')}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>

                                        <div className="border-t pt-6">
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                {t('settings.logout')}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-4">
                                                {t('settings.logoutDescription')}
                                            </p>
                                            <button
                                                onClick={handleLogout}
                                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                            >
                                                {t('settings.logoutBtn')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Organization Tab */}
                                {activeTab === 'organization' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                {t('settings.organizationInfo')}
                                            </h3>
                                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">{t('settings.organizationName')}:</span>
                                                    <p className="text-gray-900">{userProfile.organization}</p>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">{t('settings.yourRole')}:</span>
                                                    <p className="text-gray-900 capitalize">{userProfile.role}</p>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-500">{t('settings.organizationId')}:</span>
                                                    <p className="text-gray-900 font-mono text-sm">{orgId}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-6">
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                {t('settings.aboutApp')}
                                            </h3>
                                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">{t('settings.version')}:</span> 1.0.0
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">{t('settings.developer')}:</span> abdu1axad
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">{t('settings.year')}:</span> 2025
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Appearance Tab */}
                                {activeTab === 'appearance' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                {t('settings.interfaceLanguage')}
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        id="lang-ru"
                                                        name="language"
                                                        value="ru"
                                                        checked={appSettings.language === 'ru'}
                                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                                                    />
                                                    <label htmlFor="lang-ru" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
                                                        🇷🇺 Русский
                                                    </label>
                                                </div>
                                                <div className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        id="lang-en"
                                                        name="language"
                                                        value="en"
                                                        checked={appSettings.language === 'en'}
                                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                                                    />
                                                    <label htmlFor="lang-en" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
                                                        🇺🇸 English
                                                    </label>
                                                </div>
                                                <div className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        id="lang-uz"
                                                        name="language"
                                                        value="uz"
                                                        checked={appSettings.language === 'uz'}
                                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                                                    />
                                                    <label htmlFor="lang-uz" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
                                                        🇺🇿 O'zbekcha
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}