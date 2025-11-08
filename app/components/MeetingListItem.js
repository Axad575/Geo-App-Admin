"use client";
import { useStrings } from "../hooks/useStrings";
import CalendarDropdown from "./CalendarDropdown";

const MeetingListItem = ({ meeting, users }) => {
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

    const formatDateTime = (datetime) => {
        if (!datetime) return '';
        try {
            const date = new Date(datetime);
            return {
                datetime: date.toLocaleDateString(getLocale(), {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }),
                time: date.toLocaleTimeString(getLocale(), {
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
        } catch (error) {
            return { datetime: '', time: '' };
        }
    };

    const { datetime, time } = formatDateTime(meeting.datetime);

    return (
        <div className="bg-white  rounded-lg border-2 border-gray-300  mb-4 hover:shadow-md transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">{meeting.title}</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm text-gray-600">{datetime}</span>
                            <span className="text-sm font-semibold text-blue-600">{time}</span>
                        </div>
                    </div>
                    <CalendarDropdown meeting={meeting} />
                </div>

                {meeting.location && (
                    <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{meeting.location}</span>
                    </div>
                )}

                {meeting.owner && (
                    <div className="mb-2 text-sm text-gray-600">
                        <span className="font-medium">{t('meetings.organizer')}:</span> {users?.[meeting.owner] || meeting.owner}
                    </div>
                )}

                {meeting.participants && meeting.participants.length > 0 && (
                    <div className="mt-3">
                        <span className="text-sm font-medium text-gray-700">{t('meetings.participants')}: </span>
                        <span className="text-sm text-gray-600">
                            {meeting.participants.map(p => users?.[p] || p).join(', ')}
                        </span>
                    </div>
                )}

                {meeting.notes && (
                    <div className="mt-3 text-sm text-gray-600">
                        <p className="line-clamp-2">{meeting.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingListItem;