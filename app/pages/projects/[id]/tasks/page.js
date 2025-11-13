"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app, db } from '@/app/api/firebase';
import { doc, getDoc, updateDoc, arrayUnion, getDocs, collection } from 'firebase/firestore';
import Sidebar from '@/app/components/sidebar';
import Navbar from '@/app/components/navbar';
// ИСПРАВЛЕНИЕ: правильный импорт с заглавной буквы
import ParticipantSelector from '@/app/components/participantSelector';
import { useStrings } from "@/app/hooks/useStrings";

// Создадим также функцию formatDate для устранения ошибки
const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Некорректная дата';
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Ошибка даты';
    }
};

// Добавим функцию displayDate или заменим вызовы на formatDate
const displayDate = (dateString, label = '') => {
    if (!dateString) return null;
    
    const formattedDate = formatDate(dateString);
    return (
        <div className="flex flex-col items-center">
            {label && <span className="text-xs text-gray-500">{label}</span>}
            <span className="text-sm">{formattedDate}</span>
        </div>
    );
};

// Компонент Task Card для Timeline
const TaskCard = ({ task, users, onTaskUpdate, isSelected, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'border-l-red-500 bg-red-50';
            case 'medium': return 'border-l-yellow-500 bg-yellow-50';
            case 'low': return 'border-l-green-500 bg-green-50';
            case 'critical': return 'border-l-purple-500 bg-purple-50';
            default: return 'border-l-gray-500 bg-gray-50';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in progress': return 'bg-blue-100 text-blue-800';
            case 'not started': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const isOverdue = task.dueDate && task.status !== 'completed' && new Date(task.dueDate) < new Date();

    const handleStatusChange = async (newStatus) => {
        await onTaskUpdate(task.id, { status: newStatus });
    };

    return (
        <div 
            className={`bg-white rounded-lg shadow-sm border-l-4 p-4 hover:shadow-md transition-all cursor-pointer ${
                getPriorityColor(task.priority)
            } ${isSelected ? 'ring-2 ring-blue-400' : ''} ${isOverdue ? 'border-red-300' : ''}`}
            onClick={() => onSelect(task)}
        >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
                    {task.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                    )}
                </div>
                
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                >
                    {isExpanded ? '−' : '+'}
                </button>
            </div>

            {/* Card Info */}
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                    {/* Status */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status === 'completed' ? 'Завершена' :
                         task.status === 'in progress' ? 'В процессе' : 'Не начата'}
                    </span>

                    {/* Priority */}
                    <span className="text-xs text-gray-500">
                        {task.priority === 'low' ? '🟢 Низкий' :
                         task.priority === 'medium' ? '🟡 Средний' :
                         task.priority === 'high' ? '🔴 Высокий' :
                         task.priority === 'critical' ? '🟣 Критический' : '🟡 Средний'}
                    </span>
                </div>

                {/* Assignee - улучшенное отображение */}
                {task.assignee && (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {(users[task.assignee] || task.assignee).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-600">
                            {(users[task.assignee] || task.assignee).split(' ')[0]}
                        </span>
                    </div>
                )}
            </div>

            {/* Due Date */}
            {task.dueDate && (
                <div className={`mt-2 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    📅 {new Date(task.dueDate).toLocaleDateString('ru-RU', { 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                    })}
                    {isOverdue && ' (просрочено)'}
                </div>
            )}

            {/* Expanded Content */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {/* Full Description */}
                    {task.description && (
                        <div>
                            <label className="text-xs font-medium text-gray-700">Описание</label>
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        </div>
                    )}

                    {/* Assignee Info */}
                    {task.assignee && (
                        <div>
                            <label className="text-xs font-medium text-gray-700">Исполнитель</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {(users[task.assignee] || task.assignee).charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-900">
                                    {users[task.assignee] || task.assignee}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {task.status !== 'completed' && (
                            <>
                                {task.status !== 'in progress' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange('in progress');
                                        }}
                                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                    >
                                        Начать
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange('completed');
                                    }}
                                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                >
                                    Завершить
                                </button>
                            </>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 space-y-1">
                        {task.createdAt && (
                            <div>Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')}</div>
                        )}
                        {task.updatedAt && (
                            <div>Обновлено: {new Date(task.updatedAt).toLocaleDateString('ru-RU')}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Компонент Timeline
const Timeline = ({ tasks, users, onTaskUpdate, selectedTask, onTaskSelect, currentFilter, sortBy }) => {
    // Сортировка и фильтрация задач
    const getFilteredAndSortedTasks = () => {
        let filteredTasks = [...tasks];

        // Фильтрация
        if (currentFilter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === currentFilter);
        }

        // Сортировка
        filteredTasks.sort((a, b) => {
            switch (sortBy) {
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'priority':
                    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                    return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
                case 'createdAt':
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                default:
                    return 0;
            }
        });

        return filteredTasks;
    };

    const sortedTasks = getFilteredAndSortedTasks();

    // Группировка задач по датам
    const groupTasksByDate = () => {
        const groups = {};
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        sortedTasks.forEach(task => {
            if (!task.dueDate) {
                if (!groups['Без срока']) groups['Без срока'] = [];
                groups['Без срока'].push(task);
                return;
            }

            const dueDate = new Date(task.dueDate);
            let groupKey;

            if (dueDate.toDateString() === today.toDateString()) {
                groupKey = 'Сегодня';
            } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                groupKey = 'Завтра';
            } else if (dueDate.toDateString() === yesterday.toDateString()) {
                groupKey = 'Вчера';
            } else if (dueDate < today) {
                groupKey = 'Просрочено';
            } else {
                groupKey = dueDate.toLocaleDateString('ru-RU', { 
                    day: '2-digit', 
                    month: 'long',
                    year: dueDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                });
            }

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(task);
        });

        return groups;
    };

    const groupedTasks = groupTasksByDate();

    // Определяем цвет для группы
    const getGroupColor = (groupName) => {
        if (groupName === 'Просрочено') return 'text-red-600 border-red-200 bg-red-50';
        if (groupName === 'Сегодня') return 'text-blue-600 border-blue-200 bg-blue-50';
        if (groupName === 'Завтра') return 'text-green-600 border-green-200 bg-green-50';
        return 'text-gray-600 border-gray-200 bg-gray-50';
    };

    if (sortedTasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium mb-2">Задач не найдено</h3>
                <p className="text-sm">Создайте новую задачу или измените фильтры</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                <div key={groupName} className="relative">
                    {/* Group Header */}
                    <div className={`sticky top-0 z-10 px-4 py-2 rounded-lg border-l-4 font-medium ${getGroupColor(groupName)}`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">
                                {groupName}
                            </h3>
                            <span className="text-xs bg-white px-2 py-1 rounded-full">
                                {groupTasks.length}
                            </span>
                        </div>
                    </div>

                    {/* Timeline Line */}
                    <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-gray-200"></div>

                    {/* Task Cards */}
                    <div className="ml-12 mt-4 space-y-4">
                        {groupTasks.map((task, index) => (
                            <div key={task.id} className="relative">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-8 top-4 w-3 h-3 rounded-full border-2 bg-white ${
                                    task.status === 'completed' ? 'border-green-500' :
                                    task.status === 'in progress' ? 'border-blue-500' :
                                    'border-gray-300'
                                }`}></div>

                                {/* Task Card */}
                                <TaskCard
                                    task={task}
                                    users={users}
                                    onTaskUpdate={onTaskUpdate}
                                    isSelected={selectedTask?.id === task.id}
                                    onSelect={onTaskSelect}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Компонент Filters and Controls
const TaskControls = ({ currentFilter, onFilterChange, sortBy, onSortChange, taskStats }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Фильтры и сортировка</h3>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded-full">
                        Всего: {taskStats.total}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        В процессе: {taskStats.inProgress}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Завершено: {taskStats.completed}
                    </span>
                    {taskStats.overdue > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                            Просрочено: {taskStats.overdue}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Статус:</label>
                    <select
                        value={currentFilter}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Все задачи</option>
                        <option value="not started">Не начатые</option>
                        <option value="in progress">В процессе</option>
                        <option value="completed">Завершенные</option>
                    </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Сортировка:</label>
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="dueDate">По сроку выполнения</option>
                        <option value="priority">По приоритету</option>
                        <option value="createdAt">По дате создания</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

// Обновленный компонент Add Task Modal с ParticipantSelector
const AddTaskModal = ({ isOpen, onClose, onAdd, users, project }) => {
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        assignee: '',
        priority: 'medium',
        startDate: '',
        dueDate: '',
        status: 'not started',
        locationId: ''
    });
    const [loading, setLoading] = useState(false);

    // Преобразуем объект users в массив для ParticipantSelector
    const usersList = Object.entries(users).map(([id, name]) => ({
        id,
        name: name || id,
        email: id,
        role: 'member' // Базовая роль для совместимости
    }));

    // Фильтруем только участников проекта
    const projectParticipants = usersList.filter(user => 
        project?.participants?.includes(user.id)
    );

    const handleAssigneeChange = (selectedUsers) => {
        // Для исполнителя берем только первого выбранного пользователя
        setNewTask(prev => ({
            ...prev,
            assignee: selectedUsers.length > 0 ? selectedUsers[0] : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newTask.title.trim()) return;

        setLoading(true);
        try {
            await onAdd(newTask);
            setNewTask({
                title: '',
                description: '',
                assignee: '',
                priority: 'medium',
                startDate: '',
                dueDate: '',
                status: 'not started',
                locationId: ''
            });
            onClose();
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setNewTask({
            title: '',
            description: '',
            assignee: '',
            priority: 'medium',
            startDate: '',
            dueDate: '',
            status: 'not started',
            locationId: ''
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Новая задача</h3>
                    <button
                        onClick={resetForm}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Название задачи *
                        </label>
                        <input
                            type="text"
                            value={newTask.title}
                            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Введите название задачи"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Описание
                        </label>
                        <textarea
                            value={newTask.description}
                            onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder="Описание задачи"
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Assignee with ParticipantSelector */}
                        <div>
                            <ParticipantSelector
                                users={projectParticipants}
                                selectedParticipants={newTask.assignee ? [newTask.assignee] : []}
                                onParticipantsChange={handleAssigneeChange}
                                allowMultiple={false}
                                label="Исполнитель"
                                placeholder="Поиск исполнителя..."
                                maxHeight="150px"
                                showSelectedCount={false}
                                className="w-full"
                            />
                            
                            {projectParticipants.length === 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                    В проекте нет участников для назначения
                                </div>
                            )}
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Приоритет
                            </label>
                            <select
                                value={newTask.priority}
                                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                <option value="low">🟢 Низкий</option>
                                <option value="medium">🟡 Средний</option>
                                <option value="high">🔴 Высокий</option>
                                <option value="critical">🟣 Критический</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Дата начала
                            </label>
                            <input
                                type="date"
                                value={newTask.startDate}
                                onChange={(e) => setNewTask(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            />
                        </div>

                        {/* Due Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Срок выполнения
                            </label>
                            <input
                                type="date"
                                value={newTask.dueDate}
                                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Статус
                        </label>
                        <select
                            value={newTask.status}
                            onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loading}
                        >
                            <option value="not started">Не начата</option>
                            <option value="in progress">В процессе</option>
                            <option value="completed">Завершена</option>
                        </select>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Связанная локация
                        </label>
                        <select
                            value={newTask.locationId}
                            onChange={(e) => setNewTask(prev => ({ ...prev, locationId: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loading}
                        >
                            <option value="">Без локации</option>
                            {project?.locations?.map((location) => (
                                <option key={location.id} value={location.id}>
                                    📍 {location.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selected Assignee Display */}
                    {newTask.assignee && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {(users[newTask.assignee] || newTask.assignee).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-blue-900">
                                            Исполнитель: {users[newTask.assignee] || newTask.assignee}
                                        </div>
                                        <div className="text-xs text-blue-600">
                                            Задача будет назначена этому пользователю
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setNewTask(prev => ({ ...prev, assignee: '' }))}
                                    className="text-blue-400 hover:text-blue-600"
                                    disabled={loading}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={!newTask.title.trim() || loading}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Создается...' : 'Создать задачу'}
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Основной компонент страницы задач
export default function ProjectTasks() {
    const auth = getAuth(app);
    const router = useRouter();
    const params = useParams();
    const { t } = useStrings();
    const projectId = params.id;

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState({});
    const [orgId, setOrgId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [currentFilter, setCurrentFilter] = useState('all');
    const [sortBy, setSortBy] = useState('dueDate');

    // Диапазон дат для диаграммы Ганта
    const getDateRange = () => {
        if (tasks.length === 0) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
            return { start, end };
        }

        const dates = tasks.filter(task => task.dueDate).map(task => new Date(task.dueDate));
        if (dates.length === 0) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
            return { start, end };
        }

        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        // Добавляем отступы
        const start = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1);
        const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 0);
        
        return { start, end };
    };

    const dateRange = getDateRange();

    // Получение пользователя и организации
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

    // Получение данных проекта
    const fetchProject = async (organizationId) => {
        try {
            const projectDoc = await getDoc(doc(db, `organizations/${organizationId}/projects/${projectId}`));
            if (projectDoc.exists()) {
                const projectData = { id: projectDoc.id, ...projectDoc.data() };
                setProject(projectData);
                setTasks(projectData.tasks || []);
            } else {
                router.push('/pages/projects');
            }
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    // Получение пользователей организации
    const fetchUsers = async (organizationId) => {
        try {
            const usersSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users`));
            const usersMap = {};
            usersSnapshot.docs.forEach(doc => {
                usersMap[doc.id] = doc.data().name || doc.data().email;
            });
            setUsers(usersMap);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // Добавление новой задачи
    const handleAddTask = async (taskData) => {
        try {
            const newTask = {
                ...taskData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                createdBy: auth.currentUser?.uid,
                createdByName: users[auth.currentUser?.uid] || auth.currentUser?.email
            };

            const projectRef = doc(db, `organizations/${orgId}/projects/${projectId}`);
            await updateDoc(projectRef, {
                tasks: arrayUnion(newTask)
            });

            setTasks(prev => [...prev, newTask]);
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    // Обновление задачи
    const handleTaskUpdate = async (taskId, updates) => {
        try {
            const updatedTasks = tasks.map(task => 
                task.id === taskId 
                    ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                    : task
            );

            const projectRef = doc(db, `organizations/${orgId}/projects/${projectId}`);
            await updateDoc(projectRef, {
                tasks: updatedTasks
            });

            setTasks(updatedTasks);
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userOrgId = await getCurrentUserOrg(user.uid);
                if (userOrgId) {
                    setOrgId(userOrgId);
                    await fetchProject(userOrgId);
                    await fetchUsers(userOrgId);
                } else {
                    router.push('/auth/login');
                }
            } else {
                router.push('/auth/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar orgId={orgId} />
                <div className="flex-1">
                    <Navbar orgId={orgId} />
                    <div className="p-8">
                        <div className="text-center">Загрузка...</div>
                    </div>
                </div>
            </div>
        );
    }

    const taskStats = {
        total: tasks.length,
        notStarted: tasks.filter(t => t.status === 'not started').length,
        inProgress: tasks.filter(t => t.status === 'in progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => {
            if (!t.dueDate || t.status === 'completed') return false;
            return new Date(t.dueDate) < new Date();
        }).length
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar orgId={orgId} />
            <div className="flex-1 flex flex-col">
                <Navbar orgId={orgId} />
                <div className="flex-1 p-6 overflow-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold">Timeline задач</h1>
                            <div className="text-sm text-gray-600">
                                {project?.title}
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAddTask(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                + Новая задача
                            </button>
                            <button
                                onClick={() => router.push(`/pages/projects/${projectId}`)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                ← Назад к проекту
                            </button>
                        </div>
                    </div>

                    {/* Project Info */}
                    {project && (
                        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">{project.title}</h2>
                                    <p className="text-sm text-gray-600">{project.description}</p>
                                </div>
                                <div className="flex gap-4 text-sm text-gray-600">
                                    {project.createdAt && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs text-gray-500">Создан</span>
                                            <span className="text-sm">{formatDate(project.createdAt)}</span>
                                        </div>
                                    )}
                                    {project.startDate && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs text-gray-500">Начало</span>
                                            <span className="text-sm">{formatDate(project.startDate)}</span>
                                        </div>
                                    )}
                                    {project.endDate && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs text-gray-500">Конец</span>
                                            <span className="text-sm">{formatDate(project.endDate)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <TaskControls
                        currentFilter={currentFilter}
                        onFilterChange={setCurrentFilter}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        taskStats={taskStats}
                    />

                    {/* Timeline */}
                    <div className="max-w-4xl">
                        <Timeline
                            tasks={tasks}
                            users={users}
                            onTaskUpdate={handleTaskUpdate}
                            selectedTask={selectedTask}
                            onTaskSelect={setSelectedTask}
                            currentFilter={currentFilter}
                            sortBy={sortBy}
                        />
                    </div>
                </div>
            </div>

            {/* Add Task Modal */}
            <AddTaskModal
                isOpen={showAddTask}
                onClose={() => setShowAddTask(false)}
                onAdd={handleAddTask}
                users={users}
                project={project}
            />
        </div>
    );
}