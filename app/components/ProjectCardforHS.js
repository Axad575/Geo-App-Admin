"use client";
import { useRouter } from 'next/navigation';
import { useStrings } from "@/app/hooks/useStrings";

const ProjectCard = ({ project }) => {
    const { t, language } = useStrings();
    const router = useRouter();
    
    // Получаем локаль для форматирования даты в зависимости от языка
    const getLocale = () => {
        switch (language) {
            case 'ru': return 'ru-RU';
            case 'en': return 'en-GB';
            case 'uz': return 'uz-UZ';
            default: return 'en-GB';
        }
    };
    
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'border-black ';
            case 'completed':
                return 'border-green-400 ';
            case 'upcoming':
                return 'border-yellow-400 ';
            default:
                return 'border-gray-300 ';
        }
    };

    const formatDate = (date) => {
        if (!date) return '';
        try {
            return new Date(date).toLocaleDateString(getLocale(), {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return date; // Return original string if parsing fails
        }
    };

    return (
        <div 
            onClick={() => router.push(`/pages/projects/${project.id}`)}
            className={`p-6 rounded-lg border-2 ${getStatusColor(project.status)} bg-white shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer hover:border-blue-400`}
        >
            <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-gray-800">{project.title}</h3>
                {project.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{formatDate(project.startDate)}</span>
                    <span>-</span>
                    <span>{formatDate(project.endDate)}</span>
                </div>
                {project.ownerName && (
                    <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">{t('projects.owner')}:</span> {project.ownerName}
                    </div>
                )}
                {project.participantsNames && project.participantsNames.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">{t('projects.team')}:</span> {project.participantsNames.join(', ')}
                    </div>
                )}
                <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium
                        ${project.status?.toLowerCase() === 'active' ? 'bg-blue-100 text-blue-800' :
                        project.status?.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'}`}>
                        {project.status || t('meetings.noStatus')}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;