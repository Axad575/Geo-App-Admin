"use client";
import { useState } from 'react';
import { useStrings } from '@/app/hooks/useStrings';
import { generateCalendarLinks, downloadICSFile } from '@/app/utils/calendarUtils';

export default function CalendarDropdown({ meeting }) {
    const { t } = useStrings();
    const [isOpen, setIsOpen] = useState(false);
    
    const handleCalendarAction = (type) => {
    // Добавляем отладочную информацию
    console.log('Meeting object:', meeting);
    console.log('Meeting date:', meeting.date);
    console.log('Date type:', typeof meeting.date);
    
    // Проверяем, есть ли валидная дата
    if (!meeting.date) {
        alert('Ошибка: дата встречи не указана');
        return;
    }
    
    try {
        const testDate = new Date(meeting.date);
        if (isNaN(testDate.getTime())) {
            alert('Ошибка: неверный формат даты встречи');
            return;
        }
        
        const links = generateCalendarLinks(meeting);
        
        switch (type) {
            case 'google':
                window.open(links.google, '_blank');
                break;
            case 'outlook':
                window.open(links.outlook, '_blank');
                break;
            case 'apple':
            case 'ics':
                downloadICSFile(meeting);
                break;
        }
        
        setIsOpen(false);
        
        // Показываем уведомление
        if (typeof window !== 'undefined') {
            alert(t('meetings.calendarAdded'));
        }
    } catch (error) {
        console.error('Calendar action error:', error);
        alert('Ошибка при добавлении в календарь');
    }
};
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center px-3 py-2 border border-gray-300  
                    rounded-md shadow-sm bg-white text-sm font-medium 
                    text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t('meetings.addToCalendar')}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1">
                        <button
                            onClick={() => handleCalendarAction('google')}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700
                                hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                            <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            {t('meetings.googleCalendar')}
                        </button>
                        
                        <button
                            onClick={() => handleCalendarAction('outlook')}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700
                                hover:bg-gray-100"
                        >
                            <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                                <path fill="#0078d4" d="M12 0C8.5 0 5.7 2.8 5.7 6.3v11.4C5.7 21.2 8.5 24 12 24s6.3-2.8 6.3-6.3V6.3C18.3 2.8 15.5 0 12 0zm3.6 13.8h-3.2v4.7c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-4.7H7.8c-.4 0-.7-.3-.7-.7s.3-.7.7-.7H11v-2.8H7.8c-.4 0-.7-.3-.7-.7s.3-.7.7-.7H11V5.5c0-.4.3-.7.7-.7s.7.3.7.7v2.8h3.2c.4 0 .7.3.7.7s-.3.7-.7.7h-3.2v2.8h3.2c.4 0 .7.3.7.7s-.3.7-.7.7z"/>
                            </svg>
                            {t('meetings.outlookCalendar')}
                        </button>
                        
                        <button
                            onClick={() => handleCalendarAction('apple')}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700
                                hover:bg-gray-100"
                        >
                            <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                            </svg>
                            {t('meetings.appleCalendar')}
                        </button>
                        
                        <div className="border-t border-gray-100"></div>
                        
                        <button
                            onClick={() => handleCalendarAction('ics')}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 
                                hover:bg-gray-100"
                        >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t('meetings.downloadICS')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}