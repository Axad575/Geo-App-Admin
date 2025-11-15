"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app, db } from '@/app/api/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

const SubscriptionContext = createContext();

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within SubscriptionProvider');
    }
    return context;
};

export const SubscriptionProvider = ({ children }) => {
    const auth = getAuth(app);
    const [subscriptionActive, setSubscriptionActive] = useState(true);
    const [loading, setLoading] = useState(true);
    const [orgId, setOrgId] = useState(null);

    const checkSubscription = async (userId) => {
        try {
            const organizationsSnapshot = await getDocs(collection(db, 'organizations'));
            
            for (const orgDoc of organizationsSnapshot.docs) {
                const userInOrgDoc = await getDoc(doc(db, `organizations/${orgDoc.id}/users/${userId}`));
                if (userInOrgDoc.exists()) {
                    setOrgId(orgDoc.id);
                    
                    const subDoc = await getDoc(doc(db, `organizations/${orgDoc.id}/subscription/current`));
                    
                    if (!subDoc.exists()) {
                        setSubscriptionActive(false);
                        return false;
                    }
                    
                    const subscription = subDoc.data();
                    const now = new Date();
                    const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
                    const isExpired = endDate && endDate < now;
                    
                    const isActive = (subscription.status === 'active' || subscription.status === 'trial') && !isExpired;
                    setSubscriptionActive(isActive);
                    return isActive;
                }
            }
            
            setSubscriptionActive(false);
            return false;
        } catch (error) {
            console.error('Error checking subscription:', error);
            setSubscriptionActive(false);
            return false;
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                await checkSubscription(user.uid);
            } else {
                setSubscriptionActive(true);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        subscriptionActive,
        loading,
        orgId,
        recheckSubscription: () => {
            if (auth.currentUser) {
                return checkSubscription(auth.currentUser.uid);
            }
            return Promise.resolve(false);
        }
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};
