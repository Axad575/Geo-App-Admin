"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { app, db } from "./api/firebase";
import { useStrings } from "./hooks/useStrings";


export default function Home() {
  const router = useRouter();
  const auth = getAuth(app);
  
  const { t } = useStrings();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Проверяем, что мы в браузере
    if (typeof window !== "undefined") {
      import("firebase/analytics").then(({ getAnalytics }) => {
        const analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized:", analytics);
      });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      while (auth.currentUser) {
        if (!auth.currentUser.emailVerified) {
          await sendEmailVerification(auth.currentUser);
          window.alert(t('auth.emailVerification'));
          await auth.signOut();
          router.push('/');
        } else {
          router.push('/pages/homeScreen');
        }
        break;
      }
    } catch (error) {
      window.alert(t('auth.loginError') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
      window.alert(t('auth.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      window.alert(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    
    try {
      // Создаем пользователя
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Обновляем профиль пользователя
      await updateProfile(user, {
        displayName: name
      });

      // Сохраняем данные пользователя в Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        createdAt: new Date(),
        role: 'user',
        organizationId: null
      });

      // Отправляем письмо для подтверждения
      await sendEmailVerification(user);
      
      window.alert(t('auth.registerSuccess') + ' ' + t('auth.emailVerification'));
      await auth.signOut();
      setIsLogin(true); // Переключаем на форму входа
      
    } catch (error) {
      window.alert(t('auth.registerError') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24 bg-white">
      <div className="w-1/3 border-2 border-gray-300 rounded-xl shadow-lg bg-white">
      <h1 className="text-3xl font-semibold text-center rounded-t-xl p-4 bg-green-800 text-white  mb-10"> Geo-App</h1>
      <form onSubmit={handleLogin} className="flex flex-col space-y-4 p-4">
        <h2 className="text-lg font-medium text-gray-900">{t('auth.email')}:</h2>
        <input
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 placeholder-gray-500"
          id="email" name="email" required
        />
        <h2 className="text-lg font-medium text-gray-900">{t('auth.password')}:</h2>
        <input
          type="password"
          placeholder={t('auth.passwordPlaceholder')}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 placeholder-gray-500"
          id="password" name="password" required
        />
        <button
          type="submit"
          className="bg-green-800 text-white p-2 rounded hover:bg-green-700 mb-4"
        >
          {t('auth.login')}
        </button>
        <p className="text-sm text-center text-gray-600">{t('auth.termsText')}</p>
        <p className="text-sm text-center text-gray-600">abdu1axad © 2025</p>
      </form>
      </div>
    </div>
  );
}
