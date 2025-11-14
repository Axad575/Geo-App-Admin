"use client";
import { useState, useRef, useEffect } from 'react';
import { useStrings } from "@/app/hooks/useStrings";

const GeologicalLogTool = ({ onSave, initialData = null }) => {
    const { t } = useStrings();
    const canvasRef = useRef(null);
    const [logData, setLogData] = useState({
        wellName: '',
        location: '',
        elevation: '',
        totalDepth: '',
        scale: 100, // пикселей на метр
        layers: initialData?.layers || []
    });

    const [currentLayer, setCurrentLayer] = useState({
        depthFrom: '',
        depthTo: '',
        lithology: 'sandstone',
        color: '#F4D03F',
        description: '',
        grain_size: 'medium',
        fossils: '',
        remarks: ''
    });

    const [showGrid, setShowGrid] = useState(true);
    const [selectedLayer, setSelectedLayer] = useState(null);

    // Типы литологии с цветами и паттернами
    const lithologyTypes = {
        sandstone: { name: 'Песчаник', color: '#F4D03F', pattern: 'dots' },
        limestone: { name: 'Известняк', color: '#85C1E2', pattern: 'brick' },
        shale: { name: 'Сланец', color: '#95A5A6', pattern: 'horizontal' },
        clay: { name: 'Глина', color: '#D4AC6E', pattern: 'solid' },
        coal: { name: 'Уголь', color: '#34495E', pattern: 'solid' },
        granite: { name: 'Гранит', color: '#E8A798', pattern: 'crosses' },
        conglomerate: { name: 'Конгломерат', color: '#BDC3C7', pattern: 'circles' },
        marl: { name: 'Мергель', color: '#AED6F1', pattern: 'wavy' },
        dolomite: { name: 'Доломит', color: '#F8B88B', pattern: 'brick' },
        gypsum: { name: 'Гипс', color: '#FAD7A0', pattern: 'diagonal' }
    };

    const grainSizes = {
        'very_fine': 'Очень мелкий',
        'fine': 'Мелкий',
        'medium': 'Средний',
        'coarse': 'Крупный',
        'very_coarse': 'Очень крупный'
    };

    // Добавление слоя
    const handleAddLayer = () => {
        if (!currentLayer.depthFrom || !currentLayer.depthTo) {
            alert('Пожалуйста, укажите глубину слоя');
            return;
        }

        const from = parseFloat(currentLayer.depthFrom);
        const to = parseFloat(currentLayer.depthTo);

        if (from >= to) {
            alert('Глубина "До" должна быть больше глубины "От"');
            return;
        }

        const newLayer = {
            id: Date.now().toString(),
            ...currentLayer,
            depthFrom: from,
            depthTo: to,
            color: lithologyTypes[currentLayer.lithology].color
        };

        setLogData(prev => ({
            ...prev,
            layers: [...prev.layers, newLayer].sort((a, b) => a.depthFrom - b.depthFrom)
        }));

        // Очистка формы
        setCurrentLayer({
            depthFrom: to.toString(),
            depthTo: '',
            lithology: 'sandstone',
            color: '#F4D03F',
            description: '',
            grain_size: 'medium',
            fossils: '',
            remarks: ''
        });
    };

    // Удаление слоя
    const handleDeleteLayer = (layerId) => {
        if (window.confirm('Удалить этот слой?')) {
            setLogData(prev => ({
                ...prev,
                layers: prev.layers.filter(l => l.id !== layerId)
            }));
            if (selectedLayer === layerId) {
                setSelectedLayer(null);
            }
        }
    };

    // Рисование на canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Очистка
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Настройки
        const leftMargin = 60;
        const rightMargin = 50;
        const topMargin = 50;
        const logWidth = width - leftMargin - rightMargin;
        const scale = logData.scale;

        // Заголовок
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(logData.wellName || 'Геологический лог', leftMargin, 25);
        ctx.font = '12px Arial';
        ctx.fillText(logData.location ? `Локация: ${logData.location}` : '', leftMargin, 40);

        // Сетка и глубины
        if (showGrid) {
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;

            const maxDepth = parseFloat(logData.totalDepth) || 
                            Math.max(...logData.layers.map(l => l.depthTo), 100);

            for (let depth = 0; depth <= maxDepth; depth += 10) {
                const y = topMargin + (depth * scale / 10);
                
                // Горизонтальная линия
                ctx.beginPath();
                ctx.moveTo(leftMargin, y);
                ctx.lineTo(width - rightMargin, y);
                ctx.stroke();

                // Метка глубины
                ctx.fillStyle = '#000';
                ctx.font = '10px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`${depth}m`, leftMargin - 5, y + 3);
            }
        }

        // Рисование слоев
        logData.layers.forEach(layer => {
            const yStart = topMargin + (layer.depthFrom * scale / 10);
            const yEnd = topMargin + (layer.depthTo * scale / 10);
            const layerHeight = yEnd - yStart;

            // Основной цвет
            ctx.fillStyle = layer.color;
            ctx.fillRect(leftMargin, yStart, logWidth, layerHeight);

            // Паттерн
            drawPattern(ctx, leftMargin, yStart, logWidth, layerHeight, 
                       lithologyTypes[layer.lithology].pattern, layer.color);

            // Граница слоя
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(leftMargin, yStart, logWidth, layerHeight);

            // Выделение выбранного слоя
            if (selectedLayer === layer.id) {
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 3;
                ctx.strokeRect(leftMargin, yStart, logWidth, layerHeight);
            }

            // Название литологии
            if (layerHeight > 20) {
                ctx.fillStyle = '#000';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                const text = lithologyTypes[layer.lithology].name;
                ctx.fillText(text, leftMargin + logWidth / 2, yStart + layerHeight / 2);
            }

            // Описание справа
            if (layer.description) {
                ctx.fillStyle = '#000';
                ctx.font = '10px Arial';
                ctx.textAlign = 'left';
                const maxWidth = rightMargin - 10;
                const words = layer.description.split(' ');
                let line = '';
                let lineY = yStart + 12;

                words.forEach(word => {
                    const testLine = line + word + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && line !== '') {
                        ctx.fillText(line, width - rightMargin + 5, lineY);
                        line = word + ' ';
                        lineY += 12;
                    } else {
                        line = testLine;
                    }
                });
                ctx.fillText(line, width - rightMargin + 5, lineY);
            }
        });

        // Легенда
        drawLegend(ctx, width, height);

    }, [logData, showGrid, selectedLayer]);

    // Функция рисования паттернов
    const drawPattern = (ctx, x, y, width, height, pattern, baseColor) => {
        ctx.save();
        ctx.strokeStyle = adjustColor(baseColor, -40);
        ctx.lineWidth = 1;

        switch (pattern) {
            case 'dots':
                for (let i = 0; i < width; i += 10) {
                    for (let j = 0; j < height; j += 10) {
                        ctx.fillStyle = adjustColor(baseColor, -40);
                        ctx.beginPath();
                        ctx.arc(x + i + 5, y + j + 5, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
            case 'horizontal':
                for (let j = 0; j < height; j += 5) {
                    ctx.beginPath();
                    ctx.moveTo(x, y + j);
                    ctx.lineTo(x + width, y + j);
                    ctx.stroke();
                }
                break;
            case 'brick':
                for (let j = 0; j < height; j += 10) {
                    const offset = (j / 10) % 2 === 0 ? 0 : 15;
                    for (let i = offset; i < width; i += 30) {
                        ctx.strokeRect(x + i, y + j, 25, 8);
                    }
                }
                break;
            case 'crosses':
                for (let i = 0; i < width; i += 15) {
                    for (let j = 0; j < height; j += 15) {
                        ctx.beginPath();
                        ctx.moveTo(x + i, y + j - 5);
                        ctx.lineTo(x + i, y + j + 5);
                        ctx.moveTo(x + i - 5, y + j);
                        ctx.lineTo(x + i + 5, y + j);
                        ctx.stroke();
                    }
                }
                break;
            case 'circles':
                for (let i = 0; i < width; i += 15) {
                    for (let j = 0; j < height; j += 15) {
                        ctx.beginPath();
                        ctx.arc(x + i, y + j, 4, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
                break;
            case 'diagonal':
                for (let i = -height; i < width; i += 10) {
                    ctx.beginPath();
                    ctx.moveTo(x + i, y + height);
                    ctx.lineTo(x + i + height, y);
                    ctx.stroke();
                }
                break;
            case 'wavy':
                for (let j = 0; j < height; j += 8) {
                    ctx.beginPath();
                    ctx.moveTo(x, y + j);
                    for (let i = 0; i < width; i += 5) {
                        ctx.lineTo(x + i, y + j + Math.sin(i / 5) * 2);
                    }
                    ctx.stroke();
                }
                break;
        }
        ctx.restore();
    };

    // Вспомогательная функция для изменения яркости цвета
    const adjustColor = (color, amount) => {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    // Легенда
    const drawLegend = (ctx, width, height) => {
        const legendX = 10;
        const legendY = height - 150;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(legendX, legendY, 200, 140);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(legendX, legendY, 200, 140);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Легенда:', legendX + 10, legendY + 20);

        ctx.font = '10px Arial';
        let yOffset = 35;
        Object.entries(lithologyTypes).slice(0, 5).forEach(([key, value]) => {
            ctx.fillStyle = value.color;
            ctx.fillRect(legendX + 10, legendY + yOffset, 20, 15);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(legendX + 10, legendY + yOffset, 20, 15);
            
            ctx.fillStyle = '#000';
            ctx.fillText(value.name, legendX + 35, legendY + yOffset + 11);
            yOffset += 20;
        });
    };

    // Экспорт в PNG
    const handleExport = () => {
        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = `geological_log_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    // Сохранение данных
    const handleSave = () => {
        if (onSave) {
            onSave({
                ...logData,
                canvas: canvasRef.current.toDataURL()
            });
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Геологический лог</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                        📥 Экспорт PNG
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                        💾 Сохранить
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Левая панель - Настройки */}
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Общие данные</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Название скважины</label>
                                <input
                                    type="text"
                                    value={logData.wellName}
                                    onChange={(e) => setLogData(prev => ({ ...prev, wellName: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                    placeholder="№ 123"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Локация</label>
                                <input
                                    type="text"
                                    value={logData.location}
                                    onChange={(e) => setLogData(prev => ({ ...prev, location: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                    placeholder="Координаты"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Высота (м)</label>
                                <input
                                    type="number"
                                    value={logData.elevation}
                                    onChange={(e) => setLogData(prev => ({ ...prev, elevation: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Общая глубина (м)</label>
                                <input
                                    type="number"
                                    value={logData.totalDepth}
                                    onChange={(e) => setLogData(prev => ({ ...prev, totalDepth: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showGrid}
                                    onChange={(e) => setShowGrid(e.target.checked)}
                                    className="mr-2"
                                />
                                <label className="text-sm">Показать сетку</label>
                            </div>
                        </div>
                    </div>

                    {/* Добавление слоя */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Добавить слой</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Глубина от (м)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={currentLayer.depthFrom}
                                        onChange={(e) => setCurrentLayer(prev => ({ ...prev, depthFrom: e.target.value }))}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Глубина до (м)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={currentLayer.depthTo}
                                        onChange={(e) => setCurrentLayer(prev => ({ ...prev, depthTo: e.target.value }))}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Литология</label>
                                <select
                                    value={currentLayer.lithology}
                                    onChange={(e) => setCurrentLayer(prev => ({ 
                                        ...prev, 
                                        lithology: e.target.value,
                                        color: lithologyTypes[e.target.value].color
                                    }))}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                >
                                    {Object.entries(lithologyTypes).map(([key, value]) => (
                                        <option key={key} value={key}>{value.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Размер зерна</label>
                                <select
                                    value={currentLayer.grain_size}
                                    onChange={(e) => setCurrentLayer(prev => ({ ...prev, grain_size: e.target.value }))}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                >
                                    {Object.entries(grainSizes).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Описание</label>
                                <textarea
                                    value={currentLayer.description}
                                    onChange={(e) => setCurrentLayer(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                    rows="2"
                                    placeholder="Характеристика слоя"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Ископаемые</label>
                                <input
                                    type="text"
                                    value={currentLayer.fossils}
                                    onChange={(e) => setCurrentLayer(prev => ({ ...prev, fossils: e.target.value }))}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                    placeholder="Если есть"
                                />
                            </div>
                            <button
                                onClick={handleAddLayer}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                + Добавить слой
                            </button>
                        </div>
                    </div>

                    {/* Список слоев */}
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                        <h3 className="font-semibold mb-3">Слои ({logData.layers.length})</h3>
                        {logData.layers.length === 0 ? (
                            <p className="text-sm text-gray-500">Нет добавленных слоев</p>
                        ) : (
                            <div className="space-y-2">
                                {logData.layers.map(layer => (
                                    <div
                                        key={layer.id}
                                        onClick={() => setSelectedLayer(layer.id)}
                                        className={`p-2 rounded cursor-pointer ${
                                            selectedLayer === layer.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div
                                                        className="w-4 h-4 rounded border"
                                                        style={{ backgroundColor: layer.color }}
                                                    />
                                                    <span className="text-xs font-medium">
                                                        {lithologyTypes[layer.lithology].name}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {layer.depthFrom}m - {layer.depthTo}m
                                                </div>
                                                {layer.description && (
                                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                                        {layer.description}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteLayer(layer.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Canvas для отображения лога */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-100 rounded-lg p-4 overflow-auto">
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={800}
                            className="border border-gray-300 bg-white mx-auto"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeologicalLogTool;
