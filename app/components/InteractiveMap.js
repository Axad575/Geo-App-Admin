"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
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

const InteractiveMap = ({ 
  locations = [], 
  onLocationClick = null, 
  onMapClick = null,
  center = null,
  zoom = 10,
  height = '400px'
}) => {
  const { t } = useStrings();
  const [map, setMap] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [tempMarker, setTempMarker] = useState(null);

  // Используем useJsApiLoader вместо LoadScript
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    id: 'google-map-script'
  });

  // Валидация и мемоизация центра карты
  const validCenter = useMemo(() => {
    // Если есть локации, вычисляем центр автоматически
    if (locations && locations.length > 0) {
        const validLocs = locations.filter(loc => {
            const lat = Number(loc.latitude);
            const lng = Number(loc.longitude);
            return !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng);
        });
        
        if (validLocs.length > 0) {
            const lats = validLocs.map(loc => Number(loc.latitude));
            const lngs = validLocs.map(loc => Number(loc.longitude));
            
            return {
                lat: lats.reduce((a, b) => a + b) / lats.length,
                lng: lngs.reduce((a, b) => a + b) / lngs.length
            };
        }
    }
    
    // Если передан центр извне
    if (center && typeof center === 'object') {
        const lat = Number(center.lat);
        const lng = Number(center.lng);
        
        if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
            return { lat, lng };
        }
    }
    
    // Дефолтный центр - Ташкент
    return { lat: 41.2995, lng: 69.2401 };
  }, [center, locations]); // Добавлен locations в зависимости

  const mapContainerStyle = {
    width: '100%',
    height: height
  };

  const options = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
  };

  // Обработчик загрузки карты
  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Обработчик клика по карте
  const handleMapClick = useCallback((e) => {
    if (!e || !e.latLng) return;
    
    try {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
        const newMarker = { lat, lng };
        setTempMarker(newMarker);
        setSelectedMarker(null);
        
        if (onMapClick) {
          onMapClick({ lat, lng });
        }
      }
    } catch (error) {
      console.error('Error handling map click:', error);
    }
  }, [onMapClick]);

  // Подгонка границ карты под все точки
  useEffect(() => {
    if (map && locations && locations.length > 0 && window.google) {
      try {
        const bounds = new window.google.maps.LatLngBounds();
        let validLocations = 0;
        
        locations.forEach(location => {
          const lat = Number(location.latitude);
          const lng = Number(location.longitude);
          
          // Проверяем валидность координат
          if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
            bounds.extend({ lat, lng });
            validLocations++;
          }
        });

        if (validLocations === 1) {
          const lat = Number(locations[0].latitude);
          const lng = Number(locations[0].longitude);
          
          if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
            map.setCenter({ lat, lng });
            map.setZoom(15);
          }
        } else if (validLocations > 1) {
          map.fitBounds(bounds);
          // Добавляем небольшой отступ после fitBounds
          setTimeout(() => {
            const currentZoom = map.getZoom();
            if (currentZoom > 15) {
                map.setZoom(15);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [map, locations]); // Убедитесь что locations в зависимостях

  // Очищаем временный маркер при изменении локаций
  useEffect(() => {
    setTempMarker(null);
  }, [locations]);

  if (loadError) {
    return (
      <div className="rounded-lg overflow-hidden border shadow-md bg-red-50 p-6">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 mb-2">{t('map.loadError')}</h3>
          <p className="text-red-600 text-sm">{t('map.checkApiKey')}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-lg overflow-hidden border shadow-md">
        <div className="flex items-center justify-center bg-gray-100" style={{ height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('map.loadingMap')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border shadow-md">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={validCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={options}
      >
        {/* Отображаем существующие локации */}
        {locations.map((location, index) => {
          const lat = Number(location.latitude);
          const lng = Number(location.longitude);
          
          // Пропускаем невалидные координаты
          if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
            console.warn(`Invalid coordinates for location ${location.id || index}:`, { lat, lng });
            return null;
          }
          
          return (
            <Marker
              key={location.id || index}
              position={{ lat, lng }}
              onClick={() => setSelectedMarker(location)}
            />
          );
        })}

        {/* Временный маркер для новой точки (красный) */}
        {tempMarker && (
          <Marker
            position={tempMarker}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }}
            onClick={() => setSelectedMarker({ 
              ...tempMarker, 
              isTemp: true 
            })}
          />
        )}

        {/* InfoWindow для выбранного маркера */}
        {selectedMarker && (
          <InfoWindow
            position={{
              lat: selectedMarker.isTemp ? selectedMarker.lat : Number(selectedMarker.latitude),
              lng: selectedMarker.isTemp ? selectedMarker.lng : Number(selectedMarker.longitude)
            }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 max-w-xs">
              {selectedMarker.isTemp ? (
                <>
                  <h3 className="font-bold text-lg mb-1">{t('map.newPoint')}</h3>
                  <div className="text-sm text-gray-600">
                    <div className="mb-2">
                      <p className="font-semibold">{t('map.decimal')}:</p>
                      <p>{t('map.lat')}: {selectedMarker.lat.toFixed(6)}</p>
                      <p>{t('map.lng')}: {selectedMarker.lng.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{t('map.dms')}:</p>
                      <p>{t('map.lat')}: {decimalToDMS(selectedMarker.lat, true)}</p>
                      <p>{t('map.lng')}: {decimalToDMS(selectedMarker.lng, false)}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {t('map.clickToAdd')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-lg mb-1">{selectedMarker.name}</h3>
                  {selectedMarker.description && (
                    <p className="text-gray-600 mb-2 text-sm">{selectedMarker.description}</p>
                  )}
                  <div className="text-sm text-gray-600">
                    <div className="mb-2">
                      <p className="font-semibold">{t('map.decimal')}:</p>
                      <p>{t('map.lat')}: {Number(selectedMarker.latitude).toFixed(6)}</p>
                      <p>{t('map.lng')}: {Number(selectedMarker.longitude).toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{t('map.dms')}:</p>
                      <p>{t('map.lat')}: {decimalToDMS(Number(selectedMarker.latitude), true)}</p>
                      <p>{t('map.lng')}: {decimalToDMS(Number(selectedMarker.longitude), false)}</p>
                    </div>
                  </div>
                  {onLocationClick && (
                    <button
                      onClick={() => onLocationClick(selectedMarker)}
                      className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors w-full"
                    >
                      {t('map.moreDetails')}
                    </button>
                  )}
                </>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default InteractiveMap;