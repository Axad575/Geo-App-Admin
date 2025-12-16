"use client";
import { useState, useEffect, useMemo } from 'react';
import { useStrings } from "@/app/hooks/useStrings";

const ParticipantSelector = ({
    users = [],
    selectedParticipants = [],
    onParticipantsChange,
    excludeUserIds = [],
    maxHeight = "200px",
    placeholder = "",
    label = "",
    showSelectedCount = true,
    allowMultiple = true,
    className = ""
}) => {
    const { t } = useStrings();
    const [searchQuery, setSearchQuery] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    // Используем локализованные значения по умолчанию, если пропсы не переданы
    const effectivePlaceholder = placeholder || t('participantSelector.searchPlaceholder');
    const effectiveLabel = label || t('participantSelector.participants');

    // Фильтрация пользователей по поиску
    const filteredUsers = useMemo(() => {
        return users
            .filter(user => !excludeUserIds.includes(user.id))
            .filter(user => {
                if (!searchQuery.trim()) return true;
                
                const query = searchQuery.toLowerCase();
                const name = (user.name || '').toLowerCase();
                const email = (user.email || '').toLowerCase();
                const role = (user.role || '').toLowerCase();
                
                return name.includes(query) || 
                       email.includes(query) || 
                       role.includes(query);
            })
            .sort((a, b) => {
                // Сначала показываем выбранных участников
                const aSelected = selectedParticipants.includes(a.id);
                const bSelected = selectedParticipants.includes(b.id);
                
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                
                // Затем сортируем по имени
                const aName = a.name || a.email || '';
                const bName = b.name || b.email || '';
                return aName.localeCompare(bName);
            });
    }, [users, searchQuery, excludeUserIds, selectedParticipants]);

    const handleParticipantToggle = (userId) => {
        if (!allowMultiple) {
            // Режим одиночного выбора
            onParticipantsChange([userId]);
            setIsExpanded(false);
            return;
        }

        // Режим множественного выбора
        const newParticipants = selectedParticipants.includes(userId)
            ? selectedParticipants.filter(id => id !== userId)
            : [...selectedParticipants, userId];
        
        onParticipantsChange(newParticipants);
    };

    const handleRemoveParticipant = (userId) => {
        const newParticipants = selectedParticipants.filter(id => id !== userId);
        onParticipantsChange(newParticipants);
    };

    const clearSearch = () => {
        setSearchQuery('');
    };

    const clearAllParticipants = () => {
        onParticipantsChange([]);
    };

    // Получить информацию о выбранных участниках
    const selectedUsers = users.filter(user => selectedParticipants.includes(user.id));

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Заголовок и статистика */}
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    {effectiveLabel}
                    {showSelectedCount && selectedParticipants.length > 0 && (
                        <span className="ml-2 text-blue-600 font-normal">
                            ({selectedParticipants.length} {t('participantSelector.selected')})
                        </span>
                    )}
                </label>
                {selectedParticipants.length > 0 && (
                    <button
                        type="button"
                        onClick={clearAllParticipants}
                        className="text-sm text-red-600 hover:text-red-800"
                    >
                        {t('participantSelector.clearAll')}
                    </button>
                )}
            </div>

            {/* Поиск */}
            <div className="relative">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        placeholder={effectivePlaceholder}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Список выбранных участников (бейджи) */}
            {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                        <div
                            key={user.id}
                            className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                        >
                            <span className="mr-2">
                                {user.name || user.email}
                                {user.role && (
                                    <span className="text-xs text-blue-600 ml-1">({user.role})</span>
                                )}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleRemoveParticipant(user.id)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Выпадающий список участников */}
            {(isExpanded || searchQuery) && (
                <div className="relative">
                    <div 
                        className="absolute top-0 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10"
                        style={{ maxHeight }}
                    >
                        <div className="overflow-y-auto p-2" style={{ maxHeight }}>
                            {filteredUsers.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                    {searchQuery 
                                        ? t('participantSelector.noParticipantsFound')
                                        : t('participantSelector.noAvailableParticipants')
                                    }
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredUsers.map(user => {
                                        const isSelected = selectedParticipants.includes(user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                onClick={() => handleParticipantToggle(user.id)}
                                                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-blue-50 border border-blue-200' 
                                                        : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <input
                                                    type={allowMultiple ? "checkbox" : "radio"}
                                                    checked={isSelected}
                                                    onChange={() => {}} // Обработка в onClick
                                                    className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {user.name || user.email || user.id}
                                                            </p>
                                                            {user.email && user.name && (
                                                                <p className="text-xs text-gray-500 truncate">
                                                                    {user.email}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {user.role && (
                                                            <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                                                {user.role}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <svg className="ml-2 h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        
                        {/* Кнопка закрытия */}
                        <div className="border-t border-gray-200 p-2">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(false)}
                                className="w-full text-sm text-gray-600 hover:text-gray-800 py-1"
                            >
                                {t('participantSelector.collapse')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Статистика поиска */}
            {searchQuery && (
                <div className="text-xs text-gray-500">
                    {t('participantSelector.found')}: {filteredUsers.length} {t('participantSelector.of')} {users.filter(u => !excludeUserIds.includes(u.id)).length}
                </div>
            )}

            {/* Подсказка для клика вне области */}
            {(isExpanded || searchQuery) && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => {
                        setIsExpanded(false);
                        setSearchQuery('');
                    }}
                />
            )}
        </div>
    );
};

export default ParticipantSelector;