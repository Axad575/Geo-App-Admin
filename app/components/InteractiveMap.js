"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import { useStrings } from "@/app/hooks/useStrings";

// Функция для конвертации в DMS формат
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

// Фиксируем иконки маркеров для Leaflet в Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Компонент для обработки кликов по карте
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

// Компонент для автоматической подгонки границ карты под все точки
function FitBounds({ locations }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations && locations.length > 0) {
      // Создаем массив координат для всех точек
      const bounds = locations.map(location => [
        Number(location.latitude), 
        Number(location.longitude)
      ]);
      
      if (bounds.length === 1) {
        // Если только одна точка, центрируем на ней
        map.setView(bounds[0], 15);
      } else if (bounds.length > 1) {
        // Если несколько точек, подгоняем границы
        const latLngBounds = L.latLngBounds(bounds);
        map.fitBounds(latLngBounds, { padding: [20, 20] });
      }
    }
  }, [locations, map]);
  
  return null;
}

// Создаем кастомную иконку для новых точек
const newLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const InteractiveMap = ({ 
  locations = [], 
  onLocationClick = null, 
  onMapClick = null,
  center = [41.2995, 69.2401], // Ташкент по умолчанию
  zoom = 10,
  height = '400px'
}) => {
  const { t } = useStrings();
  const [isClient, setIsClient] = useState(false);
  const [tempMarker, setTempMarker] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  // Убеждаемся, что карта рендерится только на клиенте
  useEffect(() => {
    setIsClient(true);
    setIsMounted(true);
  }, []);

  const handleMapClick = (latlng) => {
    setTempMarker(latlng);
    if (onMapClick) {
      onMapClick(latlng);
    }
  };

  // Очищаем временный маркер при изменении локаций
  useEffect(() => {
    setTempMarker(null);
  }, [locations]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('map.loadingMap')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border shadow-md">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Обработчик кликов по карте */}
        <MapClickHandler onMapClick={handleMapClick} />
        
        {/* Автоматическая подгонка границ карты */}
        <FitBounds locations={locations} />
        
        {/* Отображаем существующие локации */}
        {locations.map((location, index) => (
          <Marker
            key={location.id || index}
            position={[Number(location.latitude), Number(location.longitude)]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg mb-1">{location.name}</h3>
                {location.description && (
                  <p className="text-gray-600 mb-2">{location.description}</p>
                )}
                <div className="text-sm flex gap-4 text-gray-500">
                  <div className="mb-1">
                    <p className="font-semibold">{t('map.decimal')}:</p>
                    <p>{t('map.lat')}: {Number(location.latitude).toFixed(6)}</p>
                    <p>{t('map.lng')}: {Number(location.longitude).toFixed(6)}</p>
                  </div>
                  <div>
                    <p className=" font-semibold">{t('map.dms')}:</p>
                    <p>{t('map.lat')}: {decimalToDMS(Number(location.latitude), true)}</p>
                    <p>{t('map.lng')}: {decimalToDMS(Number(location.longitude), false)}</p>
                  </div>
                </div>
                {onLocationClick && (
                  <button
                    onClick={() => onLocationClick(location)}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors not-active:opacity-50 cursor-no-drop"
                  >
                    {t('map.moreDetails')}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Временный маркер для новой точки */}
        {tempMarker && (
          <Marker 
            position={[tempMarker.lat, tempMarker.lng]}
            icon={newLocationIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg mb-1">{t('map.newPoint')}</h3>
                <div className="text-sm text-gray-500">
                  <div className="mb-1">
                    <p className="font-semibold">{t('map.decimal')}:</p>
                    <p>{t('map.lat')}: {Number(tempMarker.lat).toFixed(6)}</p>
                    <p>{t('map.lng')}: {Number(tempMarker.lng).toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">{t('map.dms')}:</p>
                    <p>{t('map.lat')}: {decimalToDMS(Number(tempMarker.lat), true)}</p>
                    <p>{t('map.lng')}: {decimalToDMS(Number(tempMarker.lng), false)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {t('map.clickToAdd')}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;