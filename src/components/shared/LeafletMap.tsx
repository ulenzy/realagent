import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ onSelect }: { onSelect: (pos: {lat: number, lng: number}) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export function LeafletMap({ onLocationSelect, defaultLocation }: { onLocationSelect: (pos: {lat: number, lng: number}) => void, defaultLocation?: string }) {
  return (
    <div className="h-[200px] w-full border-2 border-brand-black dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 relative mt-2">
      <MapContainer center={[6.5244, 3.3792]} zoom={11} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onSelect={onLocationSelect} />
      </MapContainer>
      <div className="absolute top-2 right-2 bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 px-2 py-1 text-[8px] font-black uppercase text-brand-black shadow-brutal-sm z-[1000] pointer-events-none">
        Tap map to drop pin
      </div>
    </div>
  );
}
