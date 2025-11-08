"use client";
import { useStrings } from "@/app/hooks/useStrings";

const MeetingCard = ({ meeting }) => {
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

    // Используем поле 'datetime' вместо 'date'
    const { datetime, time } = formatDateTime(meeting.datetime);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'scheduled':
                return 'bg-blue-100  text-blue-800 ';
            case 'completed':
                return 'bg-green-100  text-green-800 ';
            case 'cancelled':
                return 'bg-red-100  text-red-800 ';
            default:
                return 'bg-gray-100  text-gray-800 ';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">
                        {meeting.title}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{datetime}</span>
                        <span className="text-sm font-semibold text-blue-600">{time}</span>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                    {meeting.status || t('meetings.noStatus')}
                </span>
            </div>

            {meeting.location && (
                <div className="mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-gray-600">{meeting.location}</span>
                </div>
            )}

            {meeting.owner && (
                <div className="mb-3 text-sm text-gray-600">
                    <span className="font-medium">{t('meetings.organizer')}:</span> {meeting.ownerName || meeting.owner}
                </div>
            )}

            {meeting.participants && meeting.participants.length > 0 && (
                <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{t('meetings.participants')}:</h4>
                    <div className="flex flex-wrap gap-2">
                        {(meeting.participantsNames || meeting.participants).map((participant, index) => (
                            <span 
                                key={index}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                                {participant}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {meeting.notes && (
                <div className="mt-3 text-sm text-gray-600">
                    <p className="line-clamp-2">{meeting.notes}</p>
                </div>
            )}
        </div>
    );
};

export default MeetingCard;