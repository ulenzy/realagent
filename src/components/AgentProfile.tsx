import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, MapPin, Star, MessageSquare, Briefcase, Zap, Clock, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { allAgents, mockProperties } from '../data/mockListings';
import { Property } from '../types';

import { useNavigation } from '../context/NavigationContext';

export default function AgentProfile() {
  const { selectedAgentId: agentId, handleBackToMarketplace: onBack, handleSelectProperty: onSelectProperty } = useNavigation();
  
  const agent = allAgents.find(a => a.id === agentId);
  const agentProperties = mockProperties.filter(p => p.agent.id === agentId);

  if (!agent) return null;

  const handleContact = () => {
    // Generate a new chat session for this agent
    const event = new CustomEvent('open-chat', { 
      detail: { agentId: agent.id, agentName: agent.name, agentAvatar: agent.avatar } 
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="bg-white dark:bg-[#1c1c21] min-h-screen transition-colors duration-300">
      {/* Bio / Header Section */}
      <div className="relative">
        <div className="h-48 bg-brand-teal flex items-end justify-center pb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          <motion.button 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            className="absolute top-6 left-6 p-3 bg-brand-black text-white rounded-none border-2 border-brand-teal shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all z-10"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>
        </div>

        <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-20 pb-12">
          <div className="flex flex-col md:flex-row gap-8 items-end md:items-start mb-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-40 h-40 bg-zinc-100 dark:bg-zinc-800 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-lg overflow-hidden flex-shrink-0"
            >
              <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
            </motion.div>
            
            <div className="flex-1 text-center md:text-left bg-white dark:bg-[#1c1c21] p-6 border-4 border-brand-black dark:border-zinc-700 shadow-brutal transition-colors duration-300">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                <h2 className="text-3xl font-display font-black tracking-tighter uppercase dark:text-white">
                  {agent.name}
                </h2>
                <div className="flex gap-0.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Star 
                      key={i} 
                      size={16} 
                      className={cn(
                        "transition-all",
                        i < Math.round(agent.rating || 5) ? "fill-brand-teal text-brand-teal" : "text-zinc-600 dark:text-zinc-700"
                      )} 
                    />
                  ))}
                  <span className="text-[10px] font-black text-brand-teal ml-1 self-center">({agent.totalReviews || 0})</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-brand-black text-brand-teal text-[10px] font-black uppercase tracking-widest border border-brand-teal shadow-brutal-xs">
                  <Zap className="w-3 h-3 fill-brand-teal" />
                  {agent.trustScore}% Trust
                </div>
                {agent.verified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-brand-teal text-brand-black text-[10px] font-black uppercase tracking-widest border border-brand-black shadow-brutal-sm">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Agent
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-brand-teal" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 leading-none">Core Expertise</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {agent.specialization.split(/[,&]|\s+and\s+/i).map(s => s.trim()).filter(Boolean).map((spec, idx) => (
                      <motion.span 
                        key={spec}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + (idx * 0.05) }}
                        className="px-3 py-1.5 bg-brand-teal text-brand-black text-[11px] font-black uppercase border-2 border-brand-black dark:border-zinc-700 shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-default"
                      >
                        {spec}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {agent.specializationArea && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-zinc-400 dark:bg-zinc-600" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 leading-none">Operational Territory</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {agent.specializationArea.split(',').map(a => a.trim()).filter(Boolean).map((area, idx) => (
                        <motion.span 
                          key={area}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + (idx * 0.05) }}
                          className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-brand-black dark:text-white text-[11px] font-black uppercase border-2 border-brand-black dark:border-zinc-700 shadow-brutal-xs flex items-center gap-1.5"
                        >
                          <MapPin className="w-3 h-3 text-brand-teal" />
                          {area}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-8 leading-relaxed max-w-2xl border-l-4 border-zinc-100 dark:border-zinc-800 pl-4 italic">
                "{agent.bio || `${agent.name} is a top-rated real estate professional with years of experience in the Nigerian property market.`}"
              </p>

              <div className="flex flex-wrap gap-x-6 gap-y-3 bg-brand-gray/30 dark:bg-zinc-800/50 p-4 border-l-4 border-brand-teal mt-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-brand-teal" />
                  <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300">
                    {agent.onlineHours?.includes('|') 
                      ? `Available: ${agent.onlineHours.split('|')[0]} (${agent.onlineHours.split('|')[1]})`
                      : agent.onlineHours || 'Contact for hours'
                    }
                  </span>
                </div>
                {agent.linkedin && (
                  <a 
                    href={agent.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-brand-teal transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand-teal" />
                    <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300">LinkedIn Profile</span>
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start mt-8">
                <button 
                  onClick={handleContact}
                  className="px-6 py-3 bg-brand-black text-white hover:bg-brand-teal hover:text-brand-black font-black uppercase tracking-wide border-2 border-brand-black shadow-brutal transition-all flex items-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Secure Message
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <StatCard label="Avg Turnaround" value="14 Days" icon={<Zap className="text-brand-red" />} />
            <StatCard label="Expertise" value={agent.specialization.split(' ')[0]} icon={<Briefcase className="text-brand-gray" />} />
            <StatCard label="Active Listings" value={agentProperties.length.toString()} icon={<Star className="text-brand-teal" />} />
          </div>

          {/* PERFORMANCE INSIGHTS SECTION */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-8 w-2 bg-brand-teal shadow-brutal-xs" />
              <h3 className="text-base font-black uppercase tracking-[0.25em] text-zinc-800 dark:text-white">Agent Performance DNA</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <RadialMetric 
                label="Trust Capital" 
                value={agent.trustScore} 
                icon={<ShieldCheck className="text-brand-teal" size={24} />} 
                color="#2dd4bf"
                delay={0}
              />
              
              <LinearMetric 
                label="Closure Volume" 
                value={agent.propertiesSold} 
                maxValue={500}
                unit="Units"
                icon={<Briefcase className="text-brand-red" size={18} />} 
                color="#ef4444"
                delay={0.1}
              />

              <LinearMetric 
                label="Strike Speed" 
                value={
                  agent.responseTime === 'Instant' ? 100 : 
                  agent.responseTime.toLowerCase().includes('fast') ? 85 : 
                  agent.responseTime.toLowerCase().includes('hour') ? 60 : 40
                } 
                displayValue={agent.responseTime}
                maxValue={100}
                icon={<Zap className="text-brand-gray" size={18} />} 
                color="#a1a1aa"
                delay={0.2}
              />

              <RadialMetric 
                label="Client Alpha" 
                value={Math.round((agent.rating / 6) * 100)} 
                displayValue={`${agent.rating}/6.0`}
                icon={<Star className="text-brand-teal fill-brand-teal" size={24} />} 
                color="#2dd4bf"
                delay={0.3}
              />
            </div>
          </div>

          {/* Exclusive Catalog */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b-4 border-brand-black dark:border-zinc-700 pb-4">
              <h3 className="text-2xl font-display font-black tracking-tighter uppercase dark:text-white">
                Exclusive <span className="text-brand-teal">Catalog</span>
              </h3>
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                {agentProperties.length} Properties Found
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agentProperties.map((property, idx) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onSelectProperty(property.id)}
                  className="group bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm hover:shadow-brutal hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden relative"
                >
                   {property.isSubscriber && (
                    <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-brand-teal text-brand-black text-[10px] font-black uppercase tracking-widest border-2 border-brand-black">
                      Premium Listing
                    </div>
                  )}
                  <div className="aspect-[4/3] overflow-hidden">
                    <img 
                      src={property.image} 
                      alt={property.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-4 bg-white dark:bg-zinc-900 transition-colors duration-300">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest">{property.type}</span>
                       <span className="text-lg font-black dark:text-white">₦{(property.price / 1000000).toFixed(0)}M</span>
                    </div>
                    <h4 className="font-display font-black text-lg leading-tight mb-2 uppercase tracking-tighter dark:text-white">
                      {property.title}
                    </h4>
                    <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-3">
                      <MapPin className="w-3 h-3" />
                      {property.location.city}, {property.location.state}
                    </div>
                    <div className="flex items-center gap-3 pt-3 border-t-2 border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1 text-xs dark:text-zinc-400">
                        <Star className="w-3 h-3 fill-brand-teal stroke-brand-teal" />
                        <span className="font-bold">{property.appreciationScore}% Appr.</span>
                      </div>
                      <ExternalLink className="w-4 h-4 ml-auto text-brand-black dark:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadialMetric({ label, value, displayValue, icon, color, delay }: { label: string; value: number; displayValue?: string; icon: React.ReactNode; color: string; delay: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 flex flex-col items-center gap-4 shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 transition-all"
    >
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-zinc-100 dark:text-zinc-800"
          />
          <motion.circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "circOut", delay: delay + 0.2 }}
            strokeLinecap="square"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1 leading-none">{label}</p>
        <p className="text-2xl font-display font-black dark:text-white leading-none">{displayValue || `${value}%`}</p>
      </div>
    </motion.div>
  );
}

function LinearMetric({ label, value, displayValue, maxValue, unit, icon, color, delay }: { label: string; value: number; displayValue?: string; maxValue: number; unit?: string; icon: React.ReactNode; color: string; delay: number }) {
  const percentage = Math.min(100, (value / maxValue) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 flex flex-col justify-center shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 border-2 border-brand-black dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1 leading-none">{label}</p>
          <p className="text-2xl font-display font-black dark:text-white leading-none">
            {displayValue || value.toLocaleString()} <span className="text-[10px] font-black text-zinc-500">{unit}</span>
          </p>
        </div>
      </div>
      
      <div className="h-6 bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-black dark:border-zinc-700 p-1">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: delay + 0.3 }}
          style={{ backgroundColor: color }}
          className="h-full relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px]" />
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1c1c21] p-4 border-2 border-brand-black dark:border-zinc-700 shadow-brutal-sm flex items-center gap-4 transition-colors duration-300">
      <div className="w-10 h-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-lg font-black dark:text-white leading-none">{value}</p>
      </div>
    </div>
  );
}
