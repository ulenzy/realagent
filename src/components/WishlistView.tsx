import React, { useState, useMemo, useEffect } from 'react';
import { Heart, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { mockProperties } from '../data/mockListings';
import { PropertyCard } from './Marketplace';
import { Property } from '../types';

export default function WishlistView() {
  const { savedProperties, toggleSavedProperty } = useAuth();
  const { handleSelectProperty: onSelectProperty, setSelectedAgentId: onViewAgentProfile } = useNavigation();
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'title'>('default');
  const [liveProperties, setLiveProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch live properties from Firestore
  useEffect(() => {
    const fetchLiveProperties = async () => {
      if (savedProperties.length === 0) {
        setLiveProperties([]);
        return;
      }

      setLoading(true);
      try {
        const chunks: string[][] = [];
        const idsToFetch = savedProperties;
        for (let i = 0; i < idsToFetch.length; i += 30) {
          chunks.push(idsToFetch.slice(i, i + 30));
        }

        const fetchedProps: Property[] = [];
        for (const chunk of chunks) {
          if (chunk.length === 0) continue;
          const q = query(collection(db, 'properties'), where(documentId(), 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.forEach(docSnap => {
            fetchedProps.push({ id: docSnap.id, ...docSnap.data() } as Property);
          });
        }
        setLiveProperties(fetchedProps);
      } catch (err) {
        console.error("Error fetching live properties for wishlist:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveProperties();
  }, [savedProperties]);

  // Filter and sort the properties
  const processedProperties = useMemo(() => {
    const mergedMap = new Map<string, Property>();

    // Add mock properties first
    mockProperties.forEach(p => {
      if (savedProperties.includes(p.id)) {
        mergedMap.set(p.id, p);
      }
    });

    // Add live properties (overwriting or complementing)
    liveProperties.forEach(p => {
      if (savedProperties.includes(p.id)) {
        mergedMap.set(p.id, p);
      }
    });

    let list = Array.from(mergedMap.values());

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [savedProperties, liveProperties, sortBy]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls Section */}
      <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 shadow-brutal-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black uppercase italic dark:text-white flex items-center gap-2">
            <Heart className="fill-brand-red text-brand-red animate-pulse" size={24} />
            My Wishlist
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">
            Track and monitor your saved property intelligence
          </p>
        </div>

        {savedProperties.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <SlidersHorizontal size={14} className="text-zinc-400" />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-black text-xs font-black uppercase p-1.5 focus:outline-none cursor-pointer"
            >
              <option value="default">Default (Saved Date)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-12 shadow-brutal-sm text-center py-20 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent animate-spin rounded-full"></div>
          <p className="text-zinc-500 dark:text-zinc-400 font-extrabold uppercase text-xs tracking-wider animate-pulse">
            Synchronizing saved listings...
          </p>
        </div>
      ) : savedProperties.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-12 shadow-brutal-sm text-center py-20 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-brand-gray dark:bg-zinc-800 border-4 border-brand-black flex items-center justify-center rounded-full">
            <Heart size={40} className="text-zinc-400" />
          </div>
          <div>
            <h3 className="text-xl font-display font-black uppercase dark:text-white">No Saved Intel</h3>
            <p className="text-zinc-500 dark:text-zinc-400 font-bold max-w-xs uppercase text-xs mt-1">
              You haven't saved any property listings yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {processedProperties.map(prop => (
            <PropertyCard 
              key={prop.id} 
              property={prop} 
              onViewDetails={() => onSelectProperty?.(prop.id)} 
              onViewAgentProfile={() => onViewAgentProfile?.(prop.agent.id)}
              isSaved={true}
              onToggleSave={toggleSavedProperty}
            />
          ))}
        </div>
      )}
    </div>
  );
}
