import React, { useState, useMemo } from 'react';
import { Heart, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { mockProperties } from '../data/mockListings';
import { PropertyCard } from './Marketplace';

export default function WishlistView() {
  const { savedProperties, toggleSavedProperty } = useAuth();
  const { handleSelectProperty: onSelectProperty, setSelectedAgentId: onViewAgentProfile } = useNavigation();
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'title'>('default');

  // Filter and sort the properties
  const processedProperties = useMemo(() => {
    let list = mockProperties.filter(p => savedProperties.includes(p.id));

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [savedProperties, sortBy]);

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

      {savedProperties.length === 0 ? (
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
