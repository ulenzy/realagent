import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'motion/react';
import { MapPin, Crosshair, Check } from 'lucide-react';

// Fix leaflet icon issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEventHandler({ 
  onMoveStart, 
  onMoveEnd 
}: { 
  onMoveStart: () => void; 
  onMoveEnd: (center: L.LatLng) => void; 
}) {
  useMapEvents({
    movestart: () => onMoveStart(),
    moveend: (e) => onMoveEnd(e.target.getCenter()),
  });
  return null;
}

export function LeafletMap({ 
  onLocationSelect, 
  defaultLocation 
}: { 
  onLocationSelect: (pos: { lat: number; lng: number }) => void; 
  defaultLocation?: string; 
}) {
  const [isMoving, setIsMoving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [confirmedPin, setConfirmedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter] = useState<[number, number]>(() => {
    if (defaultLocation?.toLowerCase().includes('lagos')) {
      return [6.5244, 3.3792];
    }
    return [9.0765, 7.3986]; // Abuja default
  });
  
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const lat = mapCenter[0];
    const lng = mapCenter[1];
    
    const fetchInitial = async () => {
      setIsResolving(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'RealAgentsApp/1.0'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          setResolvedAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } else {
          setResolvedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch (err) {
        setResolvedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } finally {
        setIsResolving(false);
      }
    };
    fetchInitial();
  }, [mapCenter]);

  const handleMoveStart = () => {
    setIsMoving(true);
    setResolvedAddress(null);
    setConfirmedPin(null);
  };

  const handleMoveEnd = async (center: L.LatLng) => {
    setIsMoving(false);
    setIsResolving(true);
    setConfirmedPin(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'RealAgentsApp/1.0'
          }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch address');
      const data = await response.json();
      setResolvedAddress(data.display_name || `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);
    } catch (err) {
      console.error("Geocoding failed:", err);
      setResolvedAddress(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 17, { duration: 1.2 });
        }
      },
      (err) => {
        console.warn("Geolocation error:", err);
      }
    );
  };

  const handleConfirmPin = () => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    const pin = { lat: center.lat, lng: center.lng };
    setConfirmedPin(pin);
    onLocationSelect(pin);
  };

  return (
    <div className="relative w-full flex flex-col gap-0 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-brutal-sm">
      {/* Map container — fixed height */}
      <div className="relative h-72 w-full overflow-hidden border-b-4 border-brand-black dark:border-zinc-700">
        <MapContainer
          center={mapCenter}
          zoom={15}
          className="w-full h-full z-0"
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OSM'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventHandler onMoveStart={handleMoveStart} onMoveEnd={handleMoveEnd} />
        </MapContainer>

        {/* Floating centre pin — CSS-positioned, never moves with map */}
        <div
          className="absolute left-1/2 top-1/2 z-[1000] pointer-events-none"
          style={{ transform: 'translateX(-50%) translateY(-100%)', marginTop: '-12px' }}
        >
          <motion.div
            className="flex flex-col items-center"
            animate={isMoving
              ? { y: -10, filter: 'drop-shadow(0 12px 8px rgba(0,0,0,0.4))' }
              : { y: 0, filter: 'drop-shadow(0 4px 3px rgba(0,0,0,0.25))' }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Pin icon — brand-teal with black border, brutalist style */}
            <div className="w-8 h-8 bg-brand-teal border-4 border-brand-black flex items-center justify-center shadow-brutal-xs">
              <MapPin size={14} className="text-brand-black" fill="currentColor" />
            </div>
            {/* Pin stem — thin vertical line */}
            <div className="w-0.5 h-4 bg-brand-black mx-auto" />
            {/* Pin shadow dot — shrinks when pin lifts */}
            <motion.div
              animate={isMoving ? { scaleX: 0.5, opacity: 0.3 } : { scaleX: 1, opacity: 0.6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-3 h-1 bg-brand-black/60 rounded-full mx-auto blur-[1px]"
            />
          </motion.div>
        </div>

        {/* Use My Location button — top right */}
        <button
          onClick={handleUseMyLocation}
          type="button"
          className="absolute top-3 right-3 z-[1000] bg-white dark:bg-zinc-900 text-brand-black dark:text-white border-2 border-brand-black dark:border-zinc-700 px-3 py-2 text-[9px] font-black uppercase tracking-widest shadow-brutal-xs hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5"
        >
          <Crosshair size={10} /> MY LOCATION
        </button>

        {/* Moving indicator — shown while map is dragging */}
        {isMoving && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-brand-black text-white px-3 py-1 text-[9px] font-black uppercase tracking-widest border border-white">
            MOVE MAP TO POSITION
          </div>
        )}
      </div>

      {/* Address resolution card — below map */}
      <div className="bg-white dark:bg-zinc-900 p-4">
        {isResolving && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Resolving address...</span>
          </div>
        )}
        {!isResolving && resolvedAddress && (
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block mb-1">PINNED LOCATION</span>
              <p className="text-xs font-bold text-brand-black dark:text-white leading-snug line-clamp-2">{resolvedAddress}</p>
            </div>
            {!confirmedPin ? (
              <button
                type="button"
                onClick={handleConfirmPin}
                className="brutalist-button-teal py-3 text-[10px] font-black uppercase tracking-widest w-full text-center"
              >
                ✓ CONFIRM THIS LOCATION
              </button>
            ) : (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 bg-brand-teal border-2 border-brand-black flex items-center justify-center shrink-0">
                  <Check size={10} className="text-brand-black" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-teal font-black">LOCATION CONFIRMED</span>
                <button
                  type="button"
                  onClick={() => setConfirmedPin(null)}
                  className="ml-auto text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500 underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        )}
        {!isResolving && !resolvedAddress && (
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
            Navigate the map to your property location — the pin sets when you stop moving.
          </p>
        )}
      </div>
    </div>
  );
}
