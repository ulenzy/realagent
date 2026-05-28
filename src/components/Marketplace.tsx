import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { 
  Search, Filter, ArrowUpRight, ShieldCheck, MapPin, 
  TrendingUp, Info, Tag, X, ChevronDown, Check, 
  Zap, Home, Gem, Landmark, Building2, Layers, 
  SlidersHorizontal, History, Star, Clock, 
  ArrowDownWideNarrow, Verified, Heart, ShieldAlert, Banknote, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, formatCurrency, formatNumber, formatNumberString, parseFormattedNumber } from '../lib/utils';
import { ROILevel, Property } from '../types';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

type SortOption = 'recommended' | 'newest' | 'price-low' | 'price-high' | 'appreciation' | 'yield';

interface Filters {
  priceRange: [number, number];
  sizeRange: [number, number];
  propertyTypes: string[];
  bedrooms: number | 'any';
  bathrooms: number | 'any';
  furnishing: string[];
  isDistressDeal: boolean;
  isHotDeal: boolean;
  minAppreciation: number;
  minYield: number;
  listingType: 'any' | 'Sale' | 'Rent';
  acceptsDownPayment: boolean;
  state: string | 'any';
  city: string | 'any';
  verifiedAgent: boolean;
}

const INITIAL_FILTERS: Filters = {
  priceRange: [0, 5000000000],
  sizeRange: [100, 5000000],
  propertyTypes: [],
  bedrooms: 'any',
  bathrooms: 'any',
  furnishing: [],
  isDistressDeal: false,
  isHotDeal: false,
  minAppreciation: 0,
  minYield: 0,
  listingType: 'any',
  acceptsDownPayment: false,
  state: 'any',
  city: 'any',
  verifiedAgent: false,
};

import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

export default function Marketplace() {
  const { savedProperties, toggleSavedProperty: onToggleSave, isLocalGuest } = useAuth();
  const { handleSelectProperty: onSelectProperty, setSelectedAgentId: onViewAgentProfile } = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Guzape', 'Land in Jahi', 'Duplex under 200M']);
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<string[]>([]);
  const [activeSort, setActiveSort] = useState<SortOption>('recommended');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  
  const searchRef = useRef<HTMLDivElement>(null);

  const [liveProperties, setLiveProperties] = useState<Property[]>([]);

  useEffect(() => {
    if (isLocalGuest) {
      const loadLocalProps = () => {
        const saved = localStorage.getItem('localGuestProperties');
        if (saved) {
          setLiveProperties(JSON.parse(saved));
        } else {
          setLiveProperties([]);
        }
      };
      loadLocalProps();
      window.addEventListener('local_guest_properties_updated', loadLocalProps);
      return () => window.removeEventListener('local_guest_properties_updated', loadLocalProps);
    }

    const q = collection(db, 'properties');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nowStr = new Date().toISOString();
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((p: any) => p.expiresAt > nowStr);
      setLiveProperties(list);
    }, (error) => {
      console.error("Firestore error loading marketplace live properties: ", error);
    });

    return () => unsubscribe();
  }, [isLocalGuest]);

  const availableStates = useMemo(() => {
    return ['any', ...new Set(liveProperties.map(p => p.location.state))];
  }, [liveProperties]);

  const availableCities = useMemo(() => {
    let propertiesToCount = liveProperties;
    if (filters.state !== 'any') {
      propertiesToCount = liveProperties.filter(p => p.location.state === filters.state);
    }
    
    const areas = propertiesToCount.map(p => p.location.area);
    const areaCounts = areas.reduce((acc, area) => {
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { area: 'any', count: liveProperties.length },
      ...Object.entries(areaCounts)
        .map(([area, count]) => ({ area, count: count as number }))
        .sort((a, b) => b.count - a.count)
    ];
  }, [liveProperties, filters.state]);

  // Close search suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const quickFilterOptions = [
    { id: 'distress', label: 'Distress Deals', icon: <Zap size={14} /> },
    { id: 'duplex', label: 'Duplex', icon: <Home size={14} /> },
    { id: 'land', label: 'Land', icon: <Landmark size={14} /> },
    { id: 'rent', label: 'Rent', icon: <Building2 size={14} /> },
    { id: 'furnished', label: 'Furnished', icon: <Layers size={14} /> },
  ];

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const searchSuggestions = useMemo(() => {
    if (!deferredSearchQuery) return [];
    const queries = deferredSearchQuery.toLowerCase();
    const estates = Array.from(new Set(liveProperties.map(p => p.estateName || ''))).filter(e => (e as string).toLowerCase().includes(queries));
    const locations = Array.from(new Set(liveProperties.map(p => p.location?.area || ''))).filter(l => (l as string).toLowerCase().includes(queries));
    const propertyTypes = Array.from(new Set(liveProperties.map(p => p.type || ''))).filter(t => (t as string).toLowerCase().includes(queries));
    
    return [
      ...estates.map(e => ({ type: 'Estate', value: e as string })), 
      ...locations.map(l => ({ type: 'Location', value: l as string })),
      ...propertyTypes.map(p => ({ type: 'Property Type', value: p as string }))
    ].slice(0, 5);
  }, [deferredSearchQuery, liveProperties]);

  const toggleQuickFilter = (id: string) => {
    setSelectedQuickFilters(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const filteredProperties = useMemo(() => {
    let result = liveProperties.filter(p => {
      const qs = deferredSearchQuery.toLowerCase();
      const matchesSearch = p.title.toLowerCase().includes(qs) || 
                           (p.location?.area || '').toLowerCase().includes(qs) ||
                           (p.estateName || '').toLowerCase().includes(qs);
      
      const matchesPrice = p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1];
      const matchesSize = (p.sizeSqm || 0) >= filters.sizeRange[0] && (p.sizeSqm || 0) <= filters.sizeRange[1];
      const matchesType = filters.propertyTypes.length === 0 || filters.propertyTypes.includes(p.type);
      const matchesBeds = filters.bedrooms === 'any' || (p.bedrooms || 0) >= (filters.bedrooms as number);
      const matchesDistress = !filters.isDistressDeal || p.isDistressDeal;
      const matchesHot = !filters.isHotDeal || p.isHotDeal;

      // New Filters
      const matchesListingType = filters.listingType === 'any' || p.listingType === filters.listingType;
      const matchesDownPayment = !filters.acceptsDownPayment || p.acceptsDownPayment;
      const matchesState = filters.state === 'any' || p.location?.state === filters.state;
      const matchesCity = filters.city === 'any' || p.location?.area === filters.city;
      const matchesVerifiedAgent = !filters.verifiedAgent || p.agent?.verified;
      const matchesFurnishing = filters.furnishing.length === 0 || (p.furnishing && filters.furnishing.includes(p.furnishing));

      // Quick Filters
      const matchesQuickDistress = !selectedQuickFilters.includes('distress') || p.isDistressDeal;
      const matchesQuickDuplex = !selectedQuickFilters.includes('duplex') || p.type.toLowerCase().includes('duplex');
      const matchesQuickLand = !selectedQuickFilters.includes('land') || p.type.toLowerCase() === 'land';
      const matchesQuickRent = !selectedQuickFilters.includes('rent') || p.listingType === 'Rent';
      const matchesQuickFurnished = !selectedQuickFilters.includes('furnished') || p.furnishing === 'Fully-furnished';
      
      return matchesSearch && matchesPrice && matchesSize && matchesType && matchesBeds && 
             matchesDistress && matchesHot && matchesListingType && matchesDownPayment &&
             matchesState && matchesCity && matchesVerifiedAgent && matchesFurnishing &&
             matchesQuickDistress && matchesQuickDuplex && matchesQuickLand && matchesQuickRent && matchesQuickFurnished;
    });

    // Sorting
    switch (activeSort) {
      case 'recommended':
        result.sort((a, b) => {
          const aPriority = (a.agent?.verified && a.isBoosted) ? 1 : 0;
          const bPriority = (b.agent?.verified && b.isBoosted) ? 1 : 0;
          if (aPriority !== bPriority) return bPriority - aPriority;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'appreciation': result.sort((a, b) => (b.appreciationScore || 0) - (a.appreciationScore || 0)); break;
      case 'yield': result.sort((a, b) => (b.rentalYieldEstimate || 0) - (a.rentalYieldEstimate || 0)); break;
      case 'newest':
      default: result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [liveProperties, searchQuery, filters, selectedQuickFilters, activeSort]);

  return (
    <div className="p-4 flex flex-col gap-6 relative min-h-screen pb-32">
      {/* Top Search Bar with Suggestions */}
      <section className="flex flex-col gap-4 sticky top-0 z-40 bg-brand-gray/80 backdrop-blur-md py-2 px-1 -mx-1">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1" ref={searchRef}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search estates, locations, or properties..."
              className="w-full bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-white border-2 border-brand-black p-4 pl-12 font-display uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-teal shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchSuggestions(true)}
            />
            
            <AnimatePresence>
              {showSearchSuggestions && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 shadow-aggressive dark:shadow-[6px_6px_0px_0px_#52525b] z-50 overflow-hidden"
                >
                  {searchQuery.length > 0 ? (
                    <div className="flex flex-col">
                      {searchSuggestions.length > 0 ? (
                        searchSuggestions.map((suggestion, idx) => (
                          <button 
                            key={idx}
                            onClick={() => {
                              setSearchQuery(suggestion.value);
                              setShowSearchSuggestions(false);
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-brand-gray dark:hover:bg-zinc-800 text-left border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                          >
                            <div className="bg-brand-teal/20 p-1.5 rounded">
                              {suggestion.type === 'Estate' ? <Building2 size={14} className="text-brand-teal" /> : 
                               suggestion.type === 'Property Type' ? <Home size={14} className="text-brand-black dark:text-zinc-300" /> :
                               <MapPin size={14} className="text-brand-red" />
                              }
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-tight">{suggestion.value}</p>
                              <p className="text-[10px] text-zinc-400 uppercase font-bold">{suggestion.type}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-zinc-400 text-xs font-bold uppercase">No exact matches found</div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2">
                       <p className="text-[10px] font-black uppercase text-zinc-400 px-2 py-1 flex items-center gap-1">
                         <History size={10} /> Recent Searches
                       </p>
                       {recentSearches.map((s, idx) => (
                         <button 
                           key={idx}
                           onClick={() => setSearchQuery(s)}
                           className="w-full text-left p-2 hover:bg-brand-gray dark:hover:bg-zinc-800 text-xs font-bold uppercase tracking-tight text-brand-black dark:text-zinc-300"
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={() => setIsFilterPanelOpen(true)}
            className={cn(
              "p-4 border-2 border-brand-black dark:border-zinc-700 transition-all shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] relative group",
              Object.keys(filters).length > 2 ? "bg-brand-teal text-brand-black" : "bg-white dark:bg-zinc-900 text-brand-black dark:text-white"
            )}
          >
            <SlidersHorizontal size={20} />
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-brand-red text-white text-[10px] font-black flex items-center justify-center border-2 border-brand-black rounded-full shadow-brutal-sm">
              3
            </div>
          </button>
        </div>

        {/* Quick Horizontal Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar w-full snap-x">
          {quickFilterOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => toggleQuickFilter(opt.id)}
              className={cn(
                "whitespace-nowrap flex-shrink-0 snap-start flex items-center gap-2 px-4 py-2 border-2 border-brand-black dark:border-zinc-700 font-display text-[11px] font-black uppercase tracking-widest transition-all",
                selectedQuickFilters.includes(opt.id) 
                  ? "bg-brand-black dark:bg-brand-gray text-brand-teal dark:text-brand-black shadow-none translate-x-0.5 translate-y-0.5" 
                  : "bg-white dark:bg-zinc-900 text-brand-black dark:text-white shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Results Count & Sorting */}
      <section className="flex justify-between items-center">
        <div className="flex items-center gap-2">
           <span className="text-2xl font-black italic">{filteredProperties.length}</span>
           <span className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter mt-2">Inventory Items Available</span>
        </div>
        
        <div className="relative group">
          <button className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]">
            <ArrowDownWideNarrow size={14} className="text-brand-teal" />
            Sort: {activeSort.replace('-', ' ')}
            <ChevronDown size={14} />
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 shadow-aggressive dark:shadow-[6px_6px_0px_0px_#52525b] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
             {[
               { id: 'recommended', label: 'Recommended' },
               { id: 'newest', label: 'Newest Listed' },
               { id: 'price-low', label: 'Lowest Price' },
               { id: 'price-high', label: 'Highest Price' },
               { id: 'appreciation', label: 'Max Appreciation' },
               { id: 'yield', label: 'Max Rental Yield' },
             ].map(opt => (
               <button 
                 key={opt.id}
                 onClick={() => setActiveSort(opt.id as SortOption)}
                 className={cn(
                   "w-full text-left p-3 text-[10px] font-black uppercase tracking-tight hover:bg-brand-teal dark:hover:bg-brand-teal transition-colors flex justify-between items-center dark:hover:text-zinc-100",
                   activeSort === opt.id ? "bg-brand-gray dark:bg-zinc-800" : ""
                 )}
               >
                 {opt.label}
                 {activeSort === opt.id && <Check size={12} />}
               </button>
             ))}
          </div>
        </div>
      </section>

      {/* Property Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProperties.length > 0 ? (
            filteredProperties.map(property => (
              <motion.div
                key={property.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              >
                <PropertyCard 
                  property={property} 
                  onViewDetails={() => onSelectProperty(property.id)} 
                  onViewAgentProfile={() => onViewAgentProfile(property.agent.id)}
                  isSaved={savedProperties.includes(property.id)}
                  onToggleSave={onToggleSave}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 bg-brand-gray dark:bg-zinc-800 border-4 border-brand-black dark:border-zinc-700 flex items-center justify-center rounded-full">
                <Search size={40} className="text-zinc-400" />
              </div>
              <div>
                <h3 className="text-xl font-display font-black uppercase">No Intel Matches</h3>
                <p className="text-zinc-500 font-bold uppercase text-xs">Try recalibrating your search parameters</p>
              </div>
              <button 
                onClick={() => { setFilters(INITIAL_FILTERS); setSearchQuery(''); setSelectedQuickFilters([]); }}
                className="mt-4 px-6 py-2 bg-brand-black text-brand-teal font-display font-black uppercase text-sm border-2 border-brand-black shadow-aggressive"
              >
                Reset System
              </button>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* Floating Filter Panel (Overlay) */}
      <AnimatePresence>
        {isFilterPanelOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsFilterPanelOpen(false)}
               className="absolute inset-0 bg-brand-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-brand-gray dark:bg-[#1c1c21] h-full shadow-aggressive dark:shadow-[6px_6px_0px_0px_#52525b] border-l-8 border-brand-black dark:border-zinc-700 flex flex-col z-50"
            >
              <div className="p-6 border-b-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-display font-black italic uppercase italic">Deep Filter</h2>
                  <p className="text-[10px] font-black uppercase text-zinc-400">Precision Property Extraction</p>
                </div>
                <button 
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="p-2 border-2 border-brand-black dark:border-zinc-700 bg-brand-red text-white hover:rotate-90 transition-transform shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                {/* Price Range Slider */}
                <div className="flex flex-col gap-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-l-4 border-brand-teal pl-2">Capital Allocation</h3>
                   <div className="px-2 pt-2 pb-6">
                     <Slider 
                       range
                       min={0}
                       max={5000000000}
                       step={10000000}
                       value={filters.priceRange}
                       onChange={(val) => setFilters(f => ({ ...f, priceRange: val as [number, number] }))}
                       styles={{
                         track: { backgroundColor: '#14b8a6', height: 8 },
                         rail: { backgroundColor: '#e4e4e7', height: 8 },
                         handle: { borderColor: '#18181b', backgroundColor: '#fff', opacity: 1, height: 20, width: 20, marginTop: -6, boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }
                       }}
                     />
                     <div className="flex justify-between items-center mt-4 gap-4">
                       <input 
                         type="text"
                         value={filters.priceRange[0] === 0 ? '' : formatNumberString(filters.priceRange[0].toString())}
                         onChange={(e) => {
                           const val = parseFormattedNumber(e.target.value);
                           setFilters(f => ({ ...f, priceRange: [val === '' ? 0 : Number(val), f.priceRange[1]] }));
                         }}
                         className="w-full text-[10px] font-black uppercase tracking-widest border-2 border-brand-black p-2 bg-transparent outline-none focus:border-brand-teal focus:bg-white transition-colors"
                       />
                       <span className="font-black text-zinc-400">-</span>
                       <input 
                         type="text"
                         value={filters.priceRange[1] === 0 ? '' : formatNumberString(filters.priceRange[1].toString())}
                         onChange={(e) => {
                           const val = parseFormattedNumber(e.target.value);
                           setFilters(f => ({ ...f, priceRange: [f.priceRange[0], val === '' ? 0 : Number(val)] }));
                         }}
                         className="w-full text-[10px] font-black uppercase tracking-widest border-2 border-brand-black p-2 bg-transparent outline-none focus:border-brand-teal focus:bg-white transition-colors text-right"
                       />
                     </div>
                   </div>
                </div>

                {/* Property Size Range Slider */}
                <div className="flex flex-col gap-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-l-4 border-brand-teal pl-2">Property Size (sqm)</h3>
                   <div className="px-2 pt-2 pb-6">
                     <Slider 
                       range
                       min={100}
                       max={5000000}
                       step={100}
                       value={filters.sizeRange}
                       onChange={(val) => setFilters(f => ({ ...f, sizeRange: val as [number, number] }))}
                       styles={{
                         track: { backgroundColor: '#14b8a6', height: 8 },
                         rail: { backgroundColor: '#e4e4e7', height: 8 },
                         handle: { borderColor: '#18181b', backgroundColor: '#fff', opacity: 1, height: 20, width: 20, marginTop: -6, boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }
                       }}
                     />
                     <div className="flex justify-between items-center mt-4 gap-4">
                       <div className="relative w-full">
                         <input 
                           type="text"
                           value={filters.sizeRange[0] === 0 ? '' : formatNumberString(filters.sizeRange[0].toString())}
                           onChange={(e) => {
                             const val = parseFormattedNumber(e.target.value);
                             setFilters(f => ({ ...f, sizeRange: [val === '' ? 0 : Number(val), f.sizeRange[1]] }));
                           }}
                           className="w-full text-[10px] font-black uppercase tracking-widest border-2 border-brand-black p-2 pl-2 pr-8 bg-transparent outline-none focus:border-brand-teal focus:bg-white transition-colors"
                         />
                         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-zinc-400 pointer-events-none">sqm</span>
                       </div>
                       <span className="font-black text-zinc-400">-</span>
                       <div className="relative w-full">
                         <input 
                           type="number"
                           value={filters.sizeRange[1] === 0 ? '' : filters.sizeRange[1]}
                           onChange={(e) => setFilters(f => ({ ...f, sizeRange: [f.sizeRange[0], e.target.value === '' ? 0 : Number(e.target.value)] }))}
                           className="w-full text-[10px] font-black uppercase tracking-widest border-2 border-brand-black p-2 pl-2 pr-8 text-right bg-transparent outline-none focus:border-brand-teal focus:bg-white transition-colors"
                         />
                         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-zinc-400 pointer-events-none">sqm</span>
                       </div>
                     </div>
                   </div>
                </div>

                {/* Listing Type Selection */}
                <div className="flex flex-col gap-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-l-4 border-brand-teal pl-2">Market Intent</h3>
                   <div className="grid grid-cols-3 gap-2">
                     {['any', 'Sale', 'Rent'].map((type) => (
                       <button 
                         key={type}
                         onClick={() => setFilters(f => ({ ...f, listingType: type as any }))}
                         className={cn(
                           "py-2 border-2 border-brand-black dark:border-zinc-700 text-[9px] font-black uppercase tracking-widest transition-all",
                           filters.listingType === type ? "bg-brand-black dark:bg-brand-gray text-brand-teal dark:text-brand-black" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
                         )}
                       >
                         {type}
                       </button>
                     ))}
                   </div>
                </div>

                {/* Location Filters */}
                <div className="flex flex-col gap-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-l-4 border-brand-teal pl-2">Geographic Focus</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black uppercase text-zinc-400">State</label>
                        <select 
                          value={filters.state}
                          onChange={(e) => setFilters(f => ({ ...f, state: e.target.value, city: 'any' }))}
                          className="w-full bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-2 text-[10px] font-black uppercase outline-none focus:border-brand-teal"
                        >
                          {availableStates.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black uppercase text-zinc-400">LGA / City</label>
                        <select 
                          value={filters.city}
                          onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                          className="w-full bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-2 text-[10px] font-black uppercase outline-none focus:border-brand-teal"
                        >
                          {availableCities.map(c => (
                            <option key={c.area} value={c.area}>{c.area === 'any' ? 'any' : `${c.area} (${c.count})`}</option>
                          ))}
                        </select>
                      </div>
                   </div>
                </div>

                {/* Property Type Grid */}
                <div className="flex flex-col gap-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-l-4 border-brand-teal pl-2">Asset Architecture</h3>
                   <div className="grid grid-cols-3 gap-2">
                     {['Land', 'Detached', 'Terrace', 'Duplex', 'Penthouse', 'Apartment'].map((type) => (
                       <button 
                         key={type}
                         onClick={() => setFilters(f => ({
                           ...f,
                           propertyTypes: f.propertyTypes.includes(type) 
                             ? f.propertyTypes.filter(t => t !== type)
                             : [...f.propertyTypes, type]
                         }))}
                         className={cn(
                           "py-2 border-2 border-brand-black dark:border-zinc-700 text-[9px] font-black uppercase tracking-widest transition-all",
                           filters.propertyTypes.includes(type) ? "bg-brand-black dark:bg-brand-gray text-brand-teal dark:text-brand-black" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
                         )}
                       >
                         {type}
                       </button>
                     ))}
                   </div>
                </div>

                {/* Furnishing Selection */}
                <div className="flex flex-col gap-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-l-4 border-brand-teal pl-2">Furnishing Status</h3>
                   <div className="grid grid-cols-3 gap-2">
                     {['Unfurnished', 'Semi-furnished', 'Fully-furnished'].map((type) => (
                       <button 
                         key={type}
                         onClick={() => setFilters(f => ({
                           ...f,
                           furnishing: f.furnishing.includes(type) 
                             ? f.furnishing.filter(t => t !== type)
                             : [...f.furnishing, type]
                         }))}
                         className={cn(
                           "py-2 border-2 border-brand-black dark:border-zinc-700 text-[9px] font-black uppercase tracking-widest transition-all",
                           filters.furnishing.includes(type) ? "bg-brand-black dark:bg-brand-gray text-brand-teal dark:text-brand-black" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
                         )}
                       >
                         {type.replace('-furnished', '')}
                       </button>
                     ))}
                   </div>
                </div>

                {/* Bed/Bath Selection */}
                <div className="flex flex-col gap-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-l-4 border-brand-teal pl-2">Spatial Requirements</h3>
                   <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                     {['any', 1, 2, 3, 4, '5+'].map((num) => (
                       <button 
                         key={num}
                         onClick={() => setFilters(f => ({ ...f, bedrooms: num === 'any' ? 'any' : (num === '5+' ? 5 : num as number) }))}
                         className={cn(
                           "min-w-[50px] aspect-square flex items-center justify-center border-2 border-brand-black dark:border-zinc-700 text-[11px] font-black uppercase transition-all",
                           (num === 'any' && filters.bedrooms === 'any') || (num === 1 && filters.bedrooms === 1) || (num === 2 && filters.bedrooms === 2) || (num === 3 && filters.bedrooms === 3) || (num === 4 && filters.bedrooms === 4) || (num === '5+' && filters.bedrooms === 5)
                            ? "bg-brand-teal text-brand-black shadow-none" 
                            : "bg-white dark:bg-zinc-900 text-brand-black dark:text-white shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]"
                         )}
                       >
                         {num} Bed
                       </button>
                     ))}
                   </div>
                </div>

                {/* Distress / Verification Toggles */}
                <div className="flex flex-col gap-3">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-l-4 border-brand-teal pl-2">Strategic Signals</h3>
                   <div className="space-y-3">
                      <FilterToggle 
                        active={filters.isDistressDeal} 
                        onChange={(val) => setFilters(f => ({ ...f, isDistressDeal: val }))}
                        label="Distress Opportunity Extraction"
                        icon={<Zap size={16} />}
                        color="bg-brand-red"
                      />
                      <FilterToggle 
                        active={filters.verifiedAgent} 
                        onChange={(val) => setFilters(f => ({ ...f, verifiedAgent: val }))}
                        label="Verified Elite Agent Registry"
                        icon={<ShieldCheck size={16} />}
                      />
                      <FilterToggle 
                        active={filters.acceptsDownPayment} 
                        onChange={(val) => setFilters(f => ({ ...f, acceptsDownPayment: val }))}
                        label="Accepting Down Payment"
                        icon={<Banknote size={16} />}
                      />
                      <FilterToggle 
                        active={filters.isHotDeal} 
                        onChange={(val) => setFilters(f => ({ ...f, isHotDeal: val }))}
                        label="Active Hot Market Zone"
                        icon={<TrendingUp size={16} />}
                      />
                   </div>
                </div>
              </div>

              {/* Sticky Action Bar */}
              <div className="p-6 bg-white dark:bg-zinc-900 border-t-4 border-brand-black dark:border-zinc-700 flex flex-col gap-4">
                <button 
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="w-full p-4 border-2 border-brand-black dark:border-zinc-700 text-xs font-black uppercase tracking-widest bg-brand-red text-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#52525b] active:shadow-none transition-all"
                >
                  Reset Filters
                </button>
                <button 
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="w-full p-4 bg-brand-black dark:bg-brand-gray text-brand-teal dark:text-brand-black border-2 border-brand-black dark:border-zinc-700 shadow-aggressive dark:shadow-[6px_6px_0px_0px_#52525b] text-xs font-black uppercase tracking-widest active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  Apply Filters ({filteredProperties.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FilterToggle = ({ active, onChange, label, icon, color = 'bg-brand-teal' }: { active: boolean; onChange: (val: boolean) => void; label: string; icon: React.ReactNode; color?: string }) => (
  <button 
    onClick={() => onChange(!active)}
    className={cn(
      "w-full flex items-center justify-between p-4 border-2 border-brand-black dark:border-zinc-700 transition-all bg-white dark:bg-zinc-900 group",
      active ? "shadow-none translate-x-0.5 translate-y-0.5" : "shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
    )}
  >
    <div className="flex items-center gap-3">
      <div className={cn("p-2 border border-brand-black dark:border-zinc-700 group-hover:-translate-y-0.5 transition-transform", active ? color : "bg-brand-gray dark:bg-zinc-800")}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-tight text-brand-black dark:text-white">{label}</span>
    </div>
    <div className={cn(
       "w-6 h-6 border-2 border-brand-black dark:border-zinc-700 transition-all flex items-center justify-center",
       active ? color : "bg-white dark:bg-zinc-900"
    )}>
      {active && <Check size={14} className={active ? "text-brand-black" : ""} />}
    </div>
  </button>
);

export const PropertyCard: React.FC<{ 
  property: Property; 
  onViewDetails: () => void;
  onViewAgentProfile?: () => void;
  isSaved?: boolean; 
  onToggleSave?: (id: string) => void; 
}> = ({ property, onViewDetails, onViewAgentProfile, isSaved, onToggleSave }) => {
  const pricePerSqm = property.price / property.sizeSqm;

  return (
    <div className={cn(
      "overflow-hidden group bg-white dark:bg-zinc-900 border-4 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-aggressive",
      property.isSubscriber 
        ? "border-emerald-500 dark:border-emerald-600 shadow-[6px_6px_0px_0px_#10b981] hover:shadow-[10px_10px_0px_0px_#10b981]" 
        : "border-brand-red dark:border-red-600 shadow-[6px_6px_0px_0px_#FF3B30] hover:shadow-[10px_10px_0px_0px_#FF3B30]"
    )}>
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-brand-black cursor-pointer" onClick={onViewDetails}>
        <img 
          src={property.image} 
          alt={property.title}
          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'; }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {property.isBoosted && (
             <div className="bg-amber-400 text-brand-black px-2 py-1 border-2 border-brand-black shadow-brutal-sm font-display font-black text-[9px] uppercase flex items-center gap-1">
               <Star size={10} className="fill-brand-black" /> Boosted
             </div>
          )}
          {property.isHotDeal && (
            <div className="bg-brand-red text-white px-2 py-1 border-2 border-brand-black shadow-brutal-sm font-display font-black text-[9px] uppercase flex items-center gap-1">
              <TrendingUp size={10} /> Hot Deal
            </div>
          )}
          {property.isDistressDeal && (
            <div className="bg-brand-red text-white px-2 py-1 border-2 border-brand-black shadow-brutal-sm font-display font-black text-[9px] uppercase flex items-center gap-1">
              <Zap size={10} className="fill-white" /> Distress
            </div>
          )}
          {property.acceptsDownPayment && (
            <div className="bg-brand-black text-white px-2 py-1 border-2 border-brand-teal shadow-brutal-sm font-display font-black text-[9px] uppercase flex items-center gap-1">
              <Banknote size={10} className="text-brand-teal" /> Down Payment OK
            </div>
          )}
          <div className="bg-brand-black text-brand-teal px-2 py-1 border-2 border-brand-teal shadow-brutal-sm font-display font-black text-[9px] uppercase">
            FOR {property.listingType}
          </div>
        </div>

        {/* Expiration Badge */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 z-10">
          <div className="bg-brand-black/80 backdrop-blur-sm text-zinc-300 px-2 py-1 border border-zinc-700 font-display font-black text-[8px] uppercase flex items-center gap-1">
            <Clock size={10} /> {Math.ceil((new Date(property.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days Left
          </div>
        </div>

        {/* Save Toggle */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(property.id);
          }}
          className="absolute top-3 right-3 bg-white dark:bg-zinc-900 border-brand-black dark:border-zinc-700 text-brand-black dark:text-white p-1.5 border-2 shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] z-10 hover:bg-brand-gray dark:hover:bg-zinc-800 transition-colors cursor-pointer" 
          title={isSaved ? "Remove from saved" : "Save property"}
        >
          <Heart size={14} className={isSaved ? "fill-brand-red text-brand-red" : "text-brand-black dark:text-white"} />
        </button>
        
        {/* Price Tag Overlay - Luxury Fintech Pulse */}
        <div className="absolute bottom-4 right-0 flex flex-col items-end">
          <div className="bg-brand-red text-white px-2 py-0.5 border-l-4 border-white font-display font-black text-[9px] uppercase mb-1 shadow-brutal-sm">
            5% COMM
          </div>
          <div className="bg-brand-black text-brand-teal px-4 py-2 border-l-4 border-brand-teal font-display font-black text-lg shadow-aggressive">
            {formatCurrency(property.price)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-2">
          <div className="cursor-pointer flex-1" onClick={onViewDetails}>
            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mb-1">
              <span className="text-brand-teal bg-brand-black px-1.5 py-0.5 border border-brand-teal">{property.estateName}</span>
              {property.type !== 'Land' && (
                <span className="text-brand-black bg-brand-teal/20 px-1.5 py-0.5 border border-brand-black/10">{property.type}</span>
              )}
            </div>
            <h3 className="leading-none mb-1 text-lg group-hover:text-brand-teal transition-colors capitalize font-display font-black tracking-tight">
              {property.title}
            </h3>
            <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold uppercase tracking-tight italic">
              <MapPin size={10} className="text-brand-red" />
              <span>{property.location.area}, {property.location.city}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('open-chat', { 
                  detail: { 
                    propertyId: property.id,
                    agentId: property.agent.id,
                    agentName: property.agent.name
                  } 
                }));
              }}
              className="bg-brand-teal text-brand-black border-2 border-brand-black dark:border-zinc-700 p-1 hover:bg-white dark:hover:bg-zinc-800 transition-colors shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              title="Message Agent"
            >
              <MessageSquare size={18} />
            </button>
            <button onClick={onViewDetails} className="bg-brand-gray dark:bg-zinc-800 border-2 border-brand-black dark:border-zinc-700 p-1 hover:bg-brand-teal dark:hover:bg-brand-teal dark:text-zinc-100 transition-colors shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
              <ArrowUpRight size={20} />
            </button>
          </div>
        </div>

        {/* Intelligence Statistics Row */}
        <div className="grid grid-cols-3 gap-2 border-y-2 border-brand-black/10 py-3 my-1">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Dimension</span>
            <span className="font-display font-black text-[10px]">{property.sizeSqm} SQM</span>
          </div>
          <div className="flex flex-col border-x-2 border-zinc-100 dark:border-zinc-800 px-2 min-h-[30px] justify-center">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Rooms</span>
            <span className="font-display font-black text-[10px]">{property.type === 'Land' ? 'N/A' : `${property.bedrooms}B / ${property.bathrooms}BA`}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Yield Signal</span>
            <div className="flex items-center gap-1">
               <TrendingUp size={10} className="text-brand-teal" />
               <span className="font-display font-black text-[11px] text-brand-teal">
                 {property.listingType === 'Rent' ? `${property.rentalYieldEstimate}%` : `${property.appreciationScore}%`}
               </span>
            </div>
          </div>
        </div>

        {/* AI Insight Snippet - Homes.com Style */}
        <div className="bg-brand-black text-white p-2.5 flex flex-col gap-1.5 border-l-4 border-brand-teal shadow-brutal-sm">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                 <Star size={10} className="text-brand-teal fill-brand-teal" />
                 <span className="text-[9px] font-black uppercase tracking-tight text-brand-teal">AI Insight Pulse</span>
              </div>
              <span className="text-[8px] font-black uppercase text-zinc-500">{property.developmentInsight.areaTrend}</span>
           </div>
           <p className="text-[10px] italic leading-tight text-zinc-300">
             "Infrastructure growth nearby is accelerating capital value - {property.developmentInsight.expectedAppreciation} yield forecast."
           </p>
        </div>

        {/* Footer Agent / Quick View */}
        <div className="flex items-center justify-between mt-1">
          <div 
            className="flex items-center gap-2 cursor-pointer group/agent"
            onClick={(e) => {
              e.stopPropagation();
              onViewAgentProfile?.();
            }}
          >
            <div className="w-6 h-6 border-2 border-brand-black flex items-center justify-center text-[10px] font-black overflow-hidden bg-brand-teal shadow-brutal-sm group-hover/agent:shadow-brutal transition-all">
              {property.agent.avatar ? <img src={property.agent.avatar} /> : property.agent.name[0]}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black uppercase tracking-tight text-zinc-500 group-hover/agent:text-brand-teal transition-colors">{property.agent.name.split(' ')[1]}</span>
              {property.isSubscriber ? (
                <ShieldCheck size={11} className="text-emerald-500" />
              ) : (
                <ShieldAlert size={11} className="text-zinc-400" />
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {property.tags?.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-brand-gray dark:bg-zinc-800 border border-brand-black/10 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

