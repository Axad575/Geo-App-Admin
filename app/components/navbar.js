"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStrings, changeLanguage } from "@/app/hooks/useStrings";

export default function Navbar() {
  const { t, language } = useStrings();
  const [coords, setCoords] = useState(t('navbar.determining'));
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const router = useRouter();

  // Получаем координаты при загрузке
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoords(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        },
        (error) => {
          console.error(error);
          setCoords(t('navbar.geolocationError'));
        }
      );
    } else {
      setCoords(t('navbar.geolocationUnavailable'));
    }
  }, [t]);

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
    setShowLanguageMenu(false);
  };

  const getLanguageFlag = () => {
    switch (language) {
      case 'ru': return '🇷🇺';
      case 'en': return '🇺🇸';
      case 'uz': return '🇺🇿';
      default: return '🌐';
    }
  };

  const getLanguageName = () => {
    switch (language) {
      case 'ru': return 'RU';
      case 'en': return 'EN';
      case 'uz': return 'UZ';
      default: return 'EN';
    }
  };

  return (
    <div className="flex items-center justify-between bg-green-900 text-white p-6 rounded-xl shadow-md m-2">
      {/* Левая часть */}
      <div className="flex items-center space-x-2">
        <span className="material-symbols-outlined text-lg">location_on</span>
        <span className="text-sm">{coords}</span>
      </div>

      {/* Правая часть */}
      <div className="flex items-center space-x-6">
        <span
          className="material-symbols-outlined text-lg cursor-pointer hover:text-green-300 transition"
          onClick={() => router.push("/pages/homeScreen")}
        >
          home
        </span>
        <span
          className="material-symbols-outlined text-lg cursor-pointer hover:text-green-300 transition"
          onClick={() => router.push("/pages/settings")}
        >
          settings
        </span>
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center space-x-1 cursor-pointer hover:text-green-300 transition text-sm font-medium"
          >
            {/* <span className="text-lg">{getLanguageFlag()}</span> */}
            <span>{getLanguageName()}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showLanguageMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowLanguageMenu(false)}
              />
              
              {/* Language Menu */}
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => handleLanguageChange('ru')}
                  className={`w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center space-x-2 ${
                    language === 'ru' ? 'bg-green-50' : ''
                  }`}
                >
                  {/* <span className="text-xl">🇷🇺</span> */}
                  <span className="text-gray-800 font-medium">Русский</span>
                  {language === 'ru' && (
                    <svg className="w-4 h-4 text-green-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center space-x-2 ${
                    language === 'en' ? 'bg-green-50' : ''
                  }`}
                >
                  {/* <span className="text-xl">🇺🇸</span> */}
                  <span className="text-gray-800 font-medium">English</span>
                  {language === 'en' && (
                    <svg className="w-4 h-4 text-green-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleLanguageChange('uz')}
                  className={`w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center space-x-2 ${
                    language === 'uz' ? 'bg-green-50' : ''
                  }`}
                >
                  {/* <span className="text-xl">🇺🇿</span> */}
                  <span className="text-gray-800 font-medium">O'zbekcha</span>
                  {language === 'uz' && (
                    <svg className="w-4 h-4 text-green-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
