"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app, db } from '@/app/api/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import ProjectPage from '@/app/components/projectPage';
import Sidebar from '@/app/components/sidebar';
import Navbar from '@/app/components/navbar';
import { useStrings } from '@/app/hooks/useStrings';


export default function ProjectDetail() {
    const { t } = useStrings();
    const params = useParams();
    const auth = getAuth(app);
    const [orgId, setOrgId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    // Получение текущей организации пользователя
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const userOrgId = await getCurrentUserOrg(user.uid);
                if (userOrgId) {
                    setOrgId(userOrgId);
                }
                setLoading(false);
            } else {
                // Redirect to login if no user
                window.location.href = '/auth/login';
            }
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">{t('loading')}</div>
            </div>
        );
    }

    if (!orgId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-xl mb-4">{t('noOrganization')}</p>
                    <button
                        onClick={() => auth.signOut()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md"
                    >
                        {t('signOut')}
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
                <ProjectPage projectId={params.id} orgId={orgId} />
            </div>
        </div>
    );
}