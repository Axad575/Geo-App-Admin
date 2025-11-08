"use client";
import { useState, useEffect } from 'react';
import { useStrings } from "@/app/hooks/useStrings";

const AddLocationModal = ({ isOpen, onClose, onAdd, selectedLocation = null }) => {
    const { t } = useStrings();
    const [locationData, setLocationData] = useState({
        name: '',
        description: '',
        latitude: '',
        longitude: ''
    });
    const [coordinateFormat, setCoordinateFormat] = useState('decimal'); // 'decimal' или 'dms'

    // Функции для работы с координатами в формате DMS
    const decimalToDMS = (decimal, isLatitude = true) => {
        const absolute = Math.abs(decimal);
        const degrees = Math.floor(absolute);
        const minutes = Math.floor((absolute - degrees) * 60);
        const seconds = Math.round(((absolute - degrees) * 60 - minutes) * 60);
        
        const direction = isLatitude 
            ? (decimal >= 0 ? 'N' : 'S')
            : (decimal >= 0 ? 'E' : 'W');
            
        return `${degrees}°${minutes}'${seconds}"${direction}`;
    };

    const dmsToDecimal = (dms) => {
        // Парсинг строки формата "41°17'28"N" или "41 17 28 N"
        const regex = /(\d+)[°\s]+(\d+)['\s]*(\d+)["\s]*([NSEW])/i;
        const match = dms.match(regex);
        
        if (!match) return null;
        
        const degrees = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        const direction = match[4].toUpperCase();
        
        let decimal = degrees + minutes/60 + seconds/3600;
        
        if (direction === 'S' || direction === 'W') {
            decimal = -decimal;
        }
        
        return decimal;
    };

    // Заполняем координаты при выборе точки на карте
    useEffect(() => {
        if (selectedLocation) {
            if (coordinateFormat === 'decimal') {
                setLocationData(prev => ({
                    ...prev,
                    latitude: selectedLocation.lat.toFixed(6),
                    longitude: selectedLocation.lng.toFixed(6)
                }));
            } else {
                setLocationData(prev => ({
                    ...prev,
                    latitude: decimalToDMS(selectedLocation.lat, true),
                    longitude: decimalToDMS(selectedLocation.lng, false)
                }));
            }
        }
    }, [selectedLocation, coordinateFormat]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!locationData.name.trim()) return;

        let lat, lng;

        if (coordinateFormat === 'decimal') {
            lat = parseFloat(locationData.latitude);
            lng = parseFloat(locationData.longitude);
        } else {
            lat = dmsToDecimal(locationData.latitude);
            lng = dmsToDecimal(locationData.longitude);
            
            if (lat === null || lng === null) {
                alert('Неверный формат координат. Пример: 41°17\'28"N');
                return;
            }
        }

        onAdd({
            ...locationData,
            latitude: lat,
            longitude: lng,
            id: Date.now(), // Временный ID
            createdAt: new Date().toISOString()
        });

        setLocationData({
            name: '',
            description: '',
            latitude: '',
            longitude: ''
        });
        onClose();
    };

    const handleClose = () => {
        setLocationData({
            name: '',
            description: '',
            latitude: '',
            longitude: ''
        });
        onClose();
    };

    const toggleCoordinateFormat = () => {
        const newFormat = coordinateFormat === 'decimal' ? 'dms' : 'decimal';
        setCoordinateFormat(newFormat);

        // Конвертируем существующие координаты
        if (locationData.latitude && locationData.longitude) {
            if (newFormat === 'dms') {
                // Конвертируем из десятичного в DMS
                const lat = parseFloat(locationData.latitude);
                const lng = parseFloat(locationData.longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setLocationData(prev => ({
                        ...prev,
                        latitude: decimalToDMS(lat, true),
                        longitude: decimalToDMS(lng, false)
                    }));
                }
            } else {
                // Конвертируем из DMS в десятичный
                const lat = dmsToDecimal(locationData.latitude);
                const lng = dmsToDecimal(locationData.longitude);
                if (lat !== null && lng !== null) {
                    setLocationData(prev => ({
                        ...prev,
                        latitude: lat.toFixed(6),
                        longitude: lng.toFixed(6)
                    }));
                }
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{t('locations.addLocationPoint')}</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {selectedLocation && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                            <strong>{t('locations.selectedCoordinates')}:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('locations.pointName')} *
                        </label>
                        <input
                            type="text"
                            required
                            value={locationData.name}
                            onChange={(e) => setLocationData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={t('locations.pointNamePlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('locations.description')}
                        </label>
                        <textarea
                            value={locationData.description}
                            onChange={(e) => setLocationData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder={t('locations.descriptionPlaceholder')}
                        />
                    </div>

                    {/* Переключатель формата координат */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{t('locations.coordinateFormat')}:</span>
                        <button
                            type="button"
                            onClick={toggleCoordinateFormat}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            {coordinateFormat === 'decimal' ? t('locations.switchToDMS') : t('locations.switchToDecimal')}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('locations.latitude')}
                            </label>
                            <input
                                type={coordinateFormat === 'decimal' ? 'number' : 'text'}
                                step={coordinateFormat === 'decimal' ? 'any' : undefined}
                                value={locationData.latitude}
                                onChange={(e) => setLocationData(prev => ({ ...prev, latitude: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={coordinateFormat === 'decimal' ? '40.7128' : '41°17\'28"N'}
                            />
                            {coordinateFormat === 'dms' && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('locations.formatDMSExample')}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('locations.longitude')}
                            </label>
                            <input
                                type={coordinateFormat === 'decimal' ? 'number' : 'text'}
                                step={coordinateFormat === 'decimal' ? 'any' : undefined}
                                value={locationData.longitude}
                                onChange={(e) => setLocationData(prev => ({ ...prev, longitude: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={coordinateFormat === 'decimal' ? '-74.0060' : '69°14\'26"E'}
                            />
                            {coordinateFormat === 'dms' && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('locations.formatDMSExampleLng')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            {t('locations.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {t('locations.addPoint')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddLocationModal;