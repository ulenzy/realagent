import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Share2, Heart, MapPin, ShieldCheck, 
  TrendingUp, Zap, Droplets, Wifi, Route, 
  Lock, Calendar, Clock, MessageSquare, 
  ChevronRight, Star, ExternalLink, Globe, Info, Check
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Property } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { mockProperties } from '../data/mockListings';
import InteractiveMap from './InteractiveMap';
import ComparisonTable from './ComparisonTable';

import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

export default function PropertyDetail({ 
  property
}: { 
  property: Property;
}) {
  const { user, savedProperties, toggleSavedProperty } = useAuth();
  const { handleBackToMarketplace: onBack, handleSelectProperty: onNavigateToProperty, setSelectedAgentId: onViewAgentProfile } = useNavigation();

  if (!user) return null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [showFloatingBar, setShowFloatingBar] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([property.id]);
  const [showCompareTable, setShowCompareTable] = useState(false);
  const actionSectionRef = useRef<HTMLDivElement>(null);

  const onToggleSave = toggleSavedProperty;

  // Reset comparison when main property changes
  useEffect(() => {
    setSelectedForCompare([property.id]);
    setShowCompareTable(false);
  }, [property.id]);
  const isSaved = savedProperties.includes(property.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hide if the chat with agent block is anywhere visible
        setShowFloatingBar(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    if (actionSectionRef.current) {
      observer.observe(actionSectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Similar properties mock logic
  const similarProperties = mockProperties.filter(p => p.id !== property.id).slice(0, 3);

  const handleMessageAgent = () => {
    window.dispatchEvent(new CustomEvent('open-chat', { 
      detail: { 
        propertyId: property.id,
        propertyName: property.title,
        agentId: property.agent.id,
        agentName: property.agent.name,
        agentAvatar: property.agent.avatar
      } 
    }));
  };

  const pricePerSqm = property.price / property.sizeSqm;

  // Ensure gallery has exactly 4 images
  let displayGallery = [...property.gallery];
  while (displayGallery.length < 4) {
    displayGallery.push('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200'); // generic fallback
  }
  displayGallery = displayGallery.slice(0, 4);

  const getGalleryLabel = (idx: number, isLand: boolean) => {
    if (idx === 0) return 'Satellite View';
    if (idx === 1) return 'Front Facing';
    if (isLand) {
      if (idx === 2) return 'TDP Document';
      if (idx === 3) return 'Allocation Document';
    } else {
      if (idx === 2) return 'Isometric Angle';
      if (idx === 3) return 'Interior';
    }
    return '';
  }

  const isProFeature = (idx: number, isLand: boolean) => {
    return isLand && (idx === 2 || idx === 3);
  }

  return (
    <div className="bg-brand-gray dark:bg-[#1c1c21] min-h-screen">
      {/* Navigation Header */}
      <div className="bg-white dark:bg-[#1c1c21] border-b-4 border-brand-black dark:border-zinc-700 p-4 sticky top-0 z-50 flex justify-between items-center transition-colors duration-300">
        <button 
          onClick={onBack}
          className="p-2 border-2 border-brand-black dark:border-zinc-700 bg-brand-teal shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#52525b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <ArrowLeft size={24} className="text-brand-black" />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => onToggleSave?.(property.id)}
            className="p-2 border-2 border-brand-black dark:border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#52525b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-colors bg-white dark:bg-zinc-900 hover:bg-brand-gray dark:hover:bg-zinc-800"
            title={isSaved ? "Remove from saved" : "Save property"}
          >
            <Heart size={24} className={isSaved ? "fill-brand-red text-brand-red" : "text-brand-black dark:text-white"} />
          </button>
          <button className="p-2 border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#52525b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <Share2 size={24} className="text-brand-black dark:text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 flex flex-col gap-8 pb-32">
        {/* Hero Section - Image Gallery */}
        <section className="flex flex-col gap-4">
          <div className="relative aspect-video border-4 border-brand-black overflow-hidden shadow-aggressive bg-zinc-200">
            {isProFeature(selectedImage, property.type === 'Land') && !user.isSubscriber && (
               <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40 backdrop-blur-md z-30">
                 <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 text-center shadow-aggressive max-w-sm">
                   <Lock size={48} className="mx-auto mb-4 text-brand-black dark:text-brand-gray" />
                   <h3 className="font-display font-black text-2xl uppercase mb-2">Pro Feature</h3>
                   <p className="text-xs uppercase font-bold text-zinc-600 mb-4">You need a Pro account to view this sensitive document.</p>
                   <p className="text-[10px] font-black text-brand-teal uppercase mb-4 italic italic">* Switch to Pro in Dashboard to unlock</p>
                 </div>
               </div>
            )}

            <motion.div 
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0"
            >
              <img 
                src={displayGallery[selectedImage]} 
                alt={property.title}
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200'; }}
                className={cn(
                  "w-full h-full object-cover", 
                  isProFeature(selectedImage, property.type === 'Land') && !user.isSubscriber && "blur-md scale-105"
                )}
              />
              
              {/* Green mark on satellite view for land */}
              {selectedImage === 0 && property.type === 'Land' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <svg width="250" height="250" viewBox="0 0 100 100" className="opacity-80 drop-shadow-xl filter drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">
                     <polygon points="20,10 80,30 90,80 15,90" fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" strokeWidth="3" />
                   </svg>
                </div>
              )}
            </motion.div>

            <div className="absolute top-4 left-4 flex gap-2 z-20">
              <span className="bg-brand-black text-white px-3 py-1 font-display font-black text-xs uppercase border border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                {getGalleryLabel(selectedImage, property.type === 'Land')}
              </span>
              {property.isHotDeal && (
                <span className="bg-brand-red text-white px-3 py-1 font-display font-black text-xs uppercase border border-brand-black">
                  Hot Deal
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {displayGallery.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={cn(
                  "relative w-24 h-24 flex-shrink-0 border-2 border-brand-black transition-all overflow-hidden",
                  selectedImage === idx ? "scale-95 border-brand-teal ring-4 ring-brand-teal/20" : "hover:opacity-100",
                  isProFeature(idx, property.type === 'Land') && !user.isSubscriber ? "opacity-100" : "opacity-70"
                )}
              >
                <img src={img} onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400'; }} className={cn("w-full h-full object-cover", isProFeature(idx, property.type === 'Land') && !user.isSubscriber && "blur-sm scale-110")} />
                {isProFeature(idx, property.type === 'Land') && !user.isSubscriber && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                     <Lock size={20} className="text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Property Overview */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <h1 className="text-4xl lg:text-5xl leading-tight mb-2 uppercase italic">{property.title}</h1>
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-tight">
                <MapPin size={20} className="text-brand-red" />
                <span>{property.location.address || `${property.location.area}, ${property.location.city}`}</span>
              </div>
            </div>

            <div className="bg-brand-black text-white p-6 border-4 border-brand-teal flex flex-col gap-4 shadow-aggressive">
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black uppercase text-zinc-400">Current Market Value (FOR {property.listingType})</p>
                    {property.acceptsDownPayment && (
                      <span className="bg-white text-brand-black px-2 py-0.5 font-display font-black text-[9px] uppercase tracking-tighter border border-brand-teal">
                        Installment OK
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <p className="text-4xl lg:text-5xl font-display font-black text-brand-teal">{formatCurrency(property.price)}</p>
                    {property.commission !== undefined && (
                      <div className="bg-brand-red text-white px-2 py-1 font-display font-black text-sm uppercase tracking-tight border-2 border-white/20 shadow-brutal-xs">
                        {property.commission}% COMM
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-brand-teal text-brand-black px-4 py-1 font-display font-black text-sm uppercase">
                  {property.type === 'Land' ? `${formatCurrency(pricePerSqm)}/SQM` : property.type}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Size</span>
                  <span className="text-xl font-display font-black">{property.sizeSqm} SQM</span>
                </div>
                {property.type !== 'Land' && (
                  <div className="flex flex-col border-x border-zinc-800 px-4">
                    <span className="text-[10px] font-black uppercase text-zinc-500">Layout</span>
                    <span className="text-xl font-display font-black">{property.bedrooms} Bed / {property.bathrooms} Bath</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Estate</span>
                  <span className="text-xl font-display font-black">{property.estateName}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl border-b-4 border-brand-black pb-1 italic">Intelligence Description</h3>
                <div className="text-zinc-600 leading-relaxed font-medium space-y-4">
                  {property.description.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {property.keyHighlights && property.keyHighlights.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 shadow-aggressive dark:shadow-[6px_6px_0px_0px_#52525b]">
                  <h3 className="text-xl font-display font-black uppercase mb-4 flex items-center gap-2 text-brand-black dark:text-brand-gray">
                    <Star size={18} className="text-brand-teal fill-brand-teal" />
                    Key Acquisition Highlights
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                    {property.keyHighlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 bg-brand-red border border-brand-black flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-700 uppercase tracking-tight">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-2xl border-b-4 border-brand-black pb-1">Amenities & Features</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {property.amenities.map(amenity => (
                  <div key={amenity} className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-3 shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]">
                    <Zap size={16} className="text-brand-teal" />
                    <span className="text-xs font-black uppercase tracking-tighter text-brand-black dark:text-brand-gray">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Side Card - Agent & Rapid Action */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 flex flex-col gap-6">
              <div className="brutalist-card p-6 flex flex-col gap-6" ref={actionSectionRef}>
                <div 
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={() => onViewAgentProfile?.(property.agent.id)}
                >
                  <div className="w-16 h-16 bg-brand-teal border-2 border-brand-black shadow-brutal-sm overflow-hidden flex-shrink-0 group-hover:shadow-brutal transition-all">
                    <img src={property.agent.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Musa"} alt={property.agent.name} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="text-lg leading-none group-hover:text-brand-teal transition-colors font-bold">{property.agent.name}</h4>
                      <ShieldCheck size={16} className="text-blue-500" />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">{property.agent.specialization}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-brand-teal fill-brand-teal" />
                      <span className="text-xs font-black">{property.agent.trustScore}% Trust Score</span>
                    </div>
                    <div className="mt-2 text-[9px] font-black text-brand-teal flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                       View Profile <ChevronRight size={10} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-brand-gray dark:bg-zinc-800 p-2 border border-brand-black dark:border-zinc-700 text-center">
                    <p className="text-[9px] font-black text-zinc-500 uppercase">Response</p>
                    <p className="text-xs font-black dark:text-zinc-300">{property.agent.responseTime}</p>
                  </div>
                  <div className="bg-brand-gray dark:bg-zinc-800 p-2 border border-brand-black dark:border-zinc-700 text-center">
                    <p className="text-[9px] font-black text-zinc-500 uppercase">Successful</p>
                    <p className="text-xs font-black dark:text-zinc-300">{property.agent.propertiesSold} Deals</p>
                  </div>
                </div>

                <button 
                  onClick={handleMessageAgent}
                  className="brutalist-button w-full"
                >
                  <MessageSquare size={20} />
                  Chat with Agent
                </button>
              </div>

              <div className="brutalist-card p-6 bg-brand-teal/5">
                <h4 className="text-xl mb-4 italic">Schedule Inspection</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Pick a Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input type="date" className="w-full pl-10 p-3 border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 text-brand-black dark:text-white font-display font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Preferred Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <select className="w-full pl-10 p-3 border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 text-brand-black dark:text-white font-display font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal appearance-none">
                        <option>Morning (9AM - 12PM)</option>
                        <option>Afternoon (12PM - 4PM)</option>
                        <option>Evening (4PM - 6PM)</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-zinc-600 bg-white dark:bg-zinc-800 p-2 border border-brand-black/20 dark:border-zinc-700 shadow-brutal-sm">
                    <p className="flex items-center gap-1 mb-1 text-brand-black dark:text-zinc-300">
                      <span className="w-1.5 h-1.5 inline-block bg-brand-teal"></span>
                      <span className="uppercase text-[10px] font-black tracking-tight">₦15,000 Inspection Fee Applies</span>
                    </p>
                    <p className="opacity-90 leading-tight">100% refundable upon successful property acquisition.</p>
                  </div>
                  <button className="brutalist-button-red w-full mt-1">
                    Book Inspection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* IDIE - Estate Intelligence Panel */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-4 border-b-8 border-brand-black pb-2">
            <h2 className="text-3xl lg:text-4xl italic">Estate Intelligence</h2>
            <div className="bg-brand-black text-brand-teal px-3 py-1 font-display font-black text-sm uppercase">IDIE v4.2</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <IntelligenceCard 
              icon={<Route size={20} />} 
              label="Infrastructure" 
              score={property.estateIntelligence.infrastructureScore} 
              desc="Quality of roads and utilities"
            />
            <IntelligenceCard 
              icon={<ShieldCheck size={20} />} 
              label="Security" 
              score={property.estateIntelligence.securityRating} 
              desc="Gated community protocol"
            />
            <IntelligenceCard 
              icon={<Zap size={20} />} 
              label="Power Reliability" 
              score={property.estateIntelligence.powerReliability} 
              desc="Grid stability & solar usage"
            />
            <IntelligenceCard 
              icon={<Wifi size={20} />} 
              label="Internet" 
              score={property.estateIntelligence.internetCoverage} 
              desc="Fibre-to-home availability"
            />
            <IntelligenceCard 
              icon={<TrendingUp size={20} />} 
              label="Appreciation" 
              score={property.estateIntelligence.appreciationTrend} 
              desc="Annual growth percentage"
              isPercentage
            />
            <IntelligenceCard 
              icon={<Star size={20} />} 
              label="Livability" 
              score={property.estateIntelligence.livabilityScore} 
              desc="Overall social infrastructure"
            />
          </div>
        </section>

        {/* AI Insights & AI Reasoned Analysis */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-brand-red" size={24} />
              <h3 className="text-2xl uppercase italic">Market Reasoning</h3>
            </div>
            <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 shadow-aggressive dark:shadow-[6px_6px_0px_0px_#52525b] relative">
              <div className="absolute top-0 right-0 p-2">
                <SparkleSVG />
              </div>
              <p className="text-lg font-medium leading-relaxed italic text-zinc-700">
                "This area is highly recommended due to its rapid <span className="text-brand-teal font-black underline">development trajectory</span> and its current pricing, which presents a significant advantage relative to its projected market value over the next 24 months."
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex justify-between items-center bg-brand-gray dark:bg-zinc-800 p-3 border-2 border-brand-black dark:border-zinc-700">
                  <span className="text-xs font-black uppercase dark:text-zinc-300">Area Momentum</span>
                  <span className="text-brand-red font-black font-display uppercase tracking-widest">{property.developmentInsight.areaTrend}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-2xl uppercase italic flex items-center gap-2 mb-2">
              <Zap className="text-brand-teal" size={24} /> Macro Signals
            </h3>
            <div className="flex flex-col gap-3">
              {property.aiInsights.map((insight, idx) => (
                <div key={idx} className="bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black uppercase text-brand-teal tracking-widest">{insight.title}</span>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 border border-brand-black",
                      insight.impact === 'Positive' ? "bg-green-400" : "bg-zinc-300"
                    )}>
                      {insight.impact}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-zinc-600">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Satellite Map */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h3 className="text-2xl italic">Nearby & Location</h3>
            <button className="flex items-center gap-1 text-xs font-black uppercase text-brand-red">
               Interactive Satellite View <Globe size={14} />
            </button>
          </div>
          <div className="aspect-video bg-zinc-200 border-4 border-brand-black shadow-aggressive relative overflow-hidden z-0">
            <InteractiveMap 
              mainProperty={property}
              nearbyProperties={mockProperties.filter(p => p.id !== property.id && p.location.area === property.location.area)}
              onPropertyClick={onNavigateToProperty}
            />
          </div>
        </section>

        {/* Similar Properties */}
        <section className="flex flex-col gap-6 relative">
          <div className="flex justify-between items-end border-b-4 border-brand-black pb-1">
            <h3 className="text-2xl italic">Similar Acquisitions Nearby</h3>
            {selectedForCompare.length > 1 && (
              <button 
                onClick={() => setShowCompareTable(true)}
                className="bg-brand-teal text-white px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-brand-black shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                Compare ({selectedForCompare.length})
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {similarProperties.map(p => {
              const isComparing = selectedForCompare.includes(p.id);
              return (
              <div 
                key={p.id} 
                onClick={() => onNavigateToProperty(p.id)}
                className={cn("brutalist-card cursor-pointer group relative transition-colors", isComparing && "ring-4 ring-brand-teal scale-[1.02]")}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isComparing) {
                      setSelectedForCompare(s => s.filter(id => id !== p.id));
                    } else {
                      if (selectedForCompare.length >= 4) return;
                      setSelectedForCompare(s => [...s, p.id]);
                    }
                  }}
                  className={cn(
                    "absolute top-2 right-2 z-10 w-8 h-8 border-2 border-brand-black flex items-center justify-center transition-colors shadow-brutal-sm",
                    isComparing ? "bg-brand-teal text-white" : "bg-white text-zinc-300 hover:text-brand-black"
                  )}
                  title={isComparing ? "Remove from comparison" : "Add to comparison"}
                >
                  {isComparing ? <Check size={16} /> : <div className="w-3 h-3 border-2 border-current" />}
                </button>
                <div className="aspect-square border-b-2 border-brand-black overflow-hidden pointer-events-none">
                  <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="p-4">
                  <h5 className="text-sm mb-1 leading-tight line-clamp-1">{p.title}</h5>
                  <p className="text-lg font-display font-black text-brand-teal">{formatCurrency(p.price)}</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-brand-gray">
                     <span className="text-[10px] font-black uppercase text-zinc-500">{p.sizeSqm} SQM</span>
                     <ArrowLeft size={16} className="rotate-180 text-brand-teal" />
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showCompareTable && (
          <ComparisonTable 
            properties={mockProperties.filter(p => selectedForCompare.includes(p.id))}
            onClose={() => setShowCompareTable(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Bar - Mobile */}
      <AnimatePresence>
        {showFloatingBar && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            className="fixed bottom-24 left-4 right-4 z-50 md:hidden"
          >
            <div className="bg-brand-black text-white p-4 border-4 border-white shadow-aggressive flex justify-between items-center gap-4">
              <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase text-brand-teal">Reserve Now</span>
                 <span className="text-lg font-display font-black">{formatCurrency(property.price)}</span>
              </div>
              <button className="bg-brand-teal text-brand-black px-4 py-1.5 font-display flex flex-col items-center justify-center uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
                <span className="font-black text-xs leading-none mb-0.5">Inspect Now</span>
                <span className="text-[7px] font-bold tracking-widest opacity-80">(₦15K Refundable)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IntelligenceCard({ icon, label, score, desc, isPercentage }: { icon: React.ReactNode; label: string; score: number; desc: string; isPercentage?: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-5 shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] group hover:bg-brand-teal/5 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-brand-black text-brand-teal p-2 shadow-brutal-sm group-hover:-translate-y-1 transition-transform">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-3xl font-display font-black text-brand-black leading-none">
            {score}{isPercentage ? '%' : ''}
          </p>
          <div className="w-16 h-1 bg-brand-teal mt-1 ml-auto"></div>
        </div>
      </div>
      <h4 className="text-xs font-black uppercase tracking-widest mb-1">{label}</h4>
      <p className="text-[10px] font-medium text-zinc-500 leading-tight uppercase">{desc}</p>
      
      {/* Visual Progress Bar */}
      {!isPercentage && (
        <div className="mt-4 h-2 bg-brand-gray dark:bg-zinc-800 border border-brand-black dark:border-zinc-700">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            className={cn(
              "h-full transition-all",
              score > 80 ? "bg-brand-teal" : score > 50 ? "bg-blue-400" : "bg-brand-red"
            )}
          />
        </div>
      )}
    </div>
  );
}

function SparkleSVG() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-brand-teal animate-pulse">
      <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" fill="currentColor" />
    </svg>
  );
}
