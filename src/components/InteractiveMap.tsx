import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Property } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Building2, MapPin } from 'lucide-react';

// Fix leaflet icon issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createPriceIcon = (price: number, isMain: boolean) => {
  const formattedPrice = `₦${(price / 1000000).toFixed(1)}M`;
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="${isMain ? 'bg-brand-red text-white' : 'bg-white text-brand-black'} font-display font-black text-[10px] px-2 py-1 border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap transition-transform" style="transform: translate(-50%, -100%); margin-top: -8px;">${formattedPrice}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

const MOCK_POIS = [
  { name: 'Supermarket (Upcoming)', type: 'Retail', offset: { lat: 0.002, lng: 0.001 }, info: 'Planned multi-level supermarket and retail complex.' },
  { name: 'Elite Fitness Center', type: 'Health', offset: { lat: -0.0015, lng: 0.0025 }, info: '24/7 fitness center with olympic pool.' },
  { name: 'International School', type: 'Education', offset: { lat: 0.003, lng: -0.002 }, info: 'Top-tier secondary education institution.' },
  { name: 'Central Park', type: 'Recreation', offset: { lat: -0.002, lng: -0.0015 }, info: 'Public green space and running tracks.' },
];

const createPoiIcon = (type: string) => {
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="bg-brand-black text-white p-1.5 rounded-full border-2 border-white shadow-md flex items-center justify-center w-6 h-6 hover:scale-110 transition-transform" style="transform: translate(-50%, -50%);">
      <div class="w-2 h-2 bg-brand-teal rounded-full"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

interface InteractiveMapProps {
  mainProperty: Property;
  nearbyProperties: Property[];
  onPropertyClick: (id: string) => void;
}

export default function InteractiveMap({ mainProperty, nearbyProperties, onPropertyClick }: InteractiveMapProps) {
  const mainCoords = mainProperty.location.coordinates;
  const position: [number, number] = [mainCoords.lat, mainCoords.lng];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={position} 
        zoom={16} 
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        {/* Esri World Imagery configuration for satellite map */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {/* Fallback labels layer - optional but helpful for satellite */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          opacity={0.8}
        />

        {/* Main Property Marker */}
        <Marker position={position} icon={createPriceIcon(mainProperty.price, true)}>
          <Popup className="custom-popup">
            <div className="flex flex-col gap-1 p-1 min-w-[150px]">
              <span className="text-[10px] uppercase font-black text-brand-red bg-red-100 px-1 w-fit">Current View</span>
              <p className="font-display font-black leading-tight text-sm">{mainProperty.title}</p>
              <p className="font-black text-brand-teal text-xs">{formatCurrency(mainProperty.price)}</p>
            </div>
          </Popup>
        </Marker>

        {/* Nearby Properties */}
        {nearbyProperties.map(p => (
          <Marker 
            key={p.id} 
            position={[p.location.coordinates.lat, p.location.coordinates.lng]}
            icon={createPriceIcon(p.price, false)}
            eventHandlers={{
              click: () => onPropertyClick(p.id)
            }}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={1} className="bg-white border-2 border-brand-black shadow-brutal-sm p-2 rounded-none">
              <div className="flex flex-col">
                <span className="font-display font-black text-xs">{p.title}</span>
                <span className="font-black text-[10px] text-zinc-500">{p.type} • {p.bedrooms} Beds</span>
                <span className="text-brand-teal font-black text-sm mt-1">{formatCurrency(p.price)}</span>
                <span className="text-[9px] uppercase font-black bg-brand-black text-white px-2 py-0.5 mt-2 w-fit">Click to View</span>
              </div>
            </Tooltip>
          </Marker>
        ))}
        {/* Nearby POIs */}
        {MOCK_POIS.map((poi, idx) => (
          <Marker 
            key={`poi-${idx}`} 
            position={[position[0] + poi.offset.lat, position[1] + poi.offset.lng]}
            icon={createPoiIcon(poi.type)}
          >
            <Popup className="custom-popup poi-popup">
              <div className="flex flex-col gap-1 p-2 max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} className="text-brand-teal" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 bg-zinc-100 px-1">{poi.type}</span>
                </div>
                <p className="font-display font-black leading-tight text-sm text-brand-black">{poi.name}</p>
                <p className="text-xs font-medium text-zinc-600 mt-1">{poi.info}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Global styles for leaflet popup/tooltip overrides since we want brutalist style */}
      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 0;
          border: 2px solid #18181b;
          box-shadow: 4px 4px 0px 0px rgba(24,24,24,1);
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 8px 12px;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .leaflet-tooltip {
          border-radius: 0 !important;
          border: 2px solid #18181b !important;
          box-shadow: 2px 2px 0px 0px rgba(24,24,24,1) !important;
        }
        .leaflet-tooltip-bottom:before, .leaflet-tooltip-top:before,
        .leaflet-tooltip-left:before, .leaflet-tooltip-right:before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
