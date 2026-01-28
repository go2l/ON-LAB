import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
    initialLat: number;
    initialLng: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

// Internal component to handle map clicks
const MapEvents = ({ onSelect }: { onSelect: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

// Internal component to fix Leaflet icons (reused from ManagerDashboard idea)
const LeafletIconFix = () => {
    useEffect(() => {
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }, []);
    return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ initialLat, initialLng, onLocationSelect }) => {
    // Local state for the marker to show immediate feedback
    const [position, setPosition] = useState<{ lat: number; lng: number }>({ lat: initialLat, lng: initialLng });

    // Update local state if props change (e.g. from GPS button)
    useEffect(() => {
        setPosition({ lat: initialLat, lng: initialLng });
    }, [initialLat, initialLng]);

    const handleSelect = (lat: number, lng: number) => {
        setPosition({ lat, lng });
        onLocationSelect(lat, lng);
    };

    return (
        <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
            <LeafletIconFix />
            <MapContainer
                center={[initialLat, initialLng]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false} // Disable scroll zoom to prevent accidental page scrolling
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <Marker position={[position.lat, position.lng]} />
                <MapEvents onSelect={handleSelect} />
            </MapContainer>
            <div className="absolute bottom-2 right-2 bg-white/90 px-3 py-1 rounded-lg text-[10px] text-slate-500 z-[1000] font-bold shadow-sm backdrop-blur-sm pointer-events-none">
                לחץ על המפה לבחירת מיקום
            </div>
        </div>
    );
};
