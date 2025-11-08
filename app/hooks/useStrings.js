"use client";
import { useState, useEffect } from 'react';
import { getString, getCurrentLanguage } from '../assets/strings';

// Функция для применения светлой темы
const applyLightTheme = () => {
    if (typeof window === 'undefined') return;
    
    // Убираем класс темной темы, оставляем только светлую
    document.documentElement.classList.remove('dark');
};

// Хук для использования локализованных строк
export const useStrings = () => {
    const [language, setLanguage] = useState('ru');
    
    useEffect(() => {
        // Получаем текущий язык при монтировании компонента
        const currentLang = getCurrentLanguage();
        setLanguage(currentLang);
        
        // Инициализируем светлую тему при загрузке
        applyLightTheme();
        
        // Слушаем изменения языка
        const handleLanguageChange = () => {
            const newLang = getCurrentLanguage();
            setLanguage(newLang);
        };
        
        // Добавляем слушатель языка
        window.addEventListener('language-changed', handleLanguageChange);
        
        return () => {
            window.removeEventListener('language-changed', handleLanguageChange);
        };
    }, []);
    
    // Функция для получения строки
    const t = (key) => {
        return getString(key, language);
    };
    
    return { t, language, setLanguage };
};

// Функция для изменения языка глобально
export const changeLanguage = (newLanguage) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('app-language', newLanguage);
        // Создаем кастомное событие для уведомления компонентов
        window.dispatchEvent(new Event('language-changed'));
    }
};