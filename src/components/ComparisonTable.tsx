import React from 'react';
import { X, Check } from 'lucide-react';
import { Property } from '../types';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ComparisonTableProps {
  properties: Property[];
  onClose: () => void;
}

export default function ComparisonTable({ properties, onClose }: ComparisonTableProps) {
  if (properties.length === 0) return null;

  // Ensure we compare up to 4 properties max for UI fit
  const compareProps = properties.slice(0, 4);
  const allAmenities = Array.from(new Set(compareProps.flatMap(p => p.amenities))).sort();

  // Find best metrics
  const minPrice = Math.min(...compareProps.map(p => p.price));
  const maxSize = Math.max(...compareProps.map(p => p.sizeSqm));
  const maxAppreciation = Math.max(...compareProps.map(p => p.appreciationScore));
  const maxYield = Math.max(...compareProps.map(p => p.rentalYieldEstimate));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-zinc-900 border-4 border-brand-black w-full max-w-6xl max-h-[90vh] flex flex-col shadow-aggressive overflow-hidden relative"
      >
        <div className="flex justify-between items-center p-4 border-b-4 border-brand-black bg-brand-teal/10">
          <h2 className="text-2xl italic flex flex-col">
            <span>Property Comparison</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-sans not-italic">Comparing {compareProps.length} properties</span>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 border-2 border-brand-black hover:bg-brand-red hover:text-white dark:text-brand-black dark:bg-white transition-colors shadow-brutal-sm"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-auto flex-1 p-4 scrollbar-hide">
          <div className="min-w-[800px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="w-1/5 p-4 border-2 border-brand-black bg-brand-gray dark:bg-zinc-800">Feature</th>
                  {compareProps.map(p => (
                    <th key={p.id} className="p-4 border-2 border-brand-black w-1/4 align-top">
                      <div className="flex flex-col gap-2">
                        <div className="aspect-video w-full border-2 border-brand-black overflow-hidden bg-zinc-200">
                          <img src={p.image} alt={p.title} onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400'; }} className="w-full h-full object-cover" />
                        </div>
                        <h4 className="font-display font-black leading-tight text-sm line-clamp-2">{p.title}</h4>
                        <p className="text-brand-teal font-black text-lg">{formatCurrency(p.price)}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Basic Metrics */}
                <tr>
                  <td className="p-4 border-2 border-brand-black font-black uppercase text-xs text-zinc-500 bg-brand-gray/50 dark:bg-zinc-800">Price</td>
                  {compareProps.map(p => (
                    <td key={p.id} className={cn("p-4 border-2 border-brand-black font-medium text-sm", p.price === minPrice && "bg-brand-teal/20")}>
                      <span className={cn(p.price === minPrice && "text-brand-teal font-black")}>{formatCurrency(p.price)}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-2 border-brand-black font-black uppercase text-xs text-zinc-500 bg-brand-gray/50 dark:bg-zinc-800">Estate</td>
                  {compareProps.map(p => (
                    <td key={p.id} className="p-4 border-2 border-brand-black font-medium text-sm">
                      {p.estateName}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-2 border-brand-black font-black uppercase text-xs text-zinc-500 bg-brand-gray/50 dark:bg-zinc-800">Location</td>
                  {compareProps.map(p => (
                    <td key={p.id} className="p-4 border-2 border-brand-black font-medium text-sm">
                      {p.location.area}, {p.location.city}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-2 border-brand-black font-black uppercase text-xs text-zinc-500 bg-brand-gray/50 dark:bg-zinc-800">Property Type</td>
                  {compareProps.map(p => (
                    <td key={p.id} className="p-4 border-2 border-brand-black font-medium text-sm">{p.type}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-2 border-brand-black font-black uppercase text-xs text-zinc-500 bg-brand-gray/50 dark:bg-zinc-800">Size (SQM)</td>
                  {compareProps.map(p => (
                    <td key={p.id} className={cn("p-4 border-2 border-brand-black font-medium text-sm", p.sizeSqm === maxSize && "bg-brand-teal/20")}>
                      <span className={cn(p.sizeSqm === maxSize && "text-brand-teal font-black")}>{formatNumber(p.sizeSqm)}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-2 border-brand-black font-black uppercase text-xs text-zinc-500 bg-brand-gray/50 dark:bg-zinc-800">Bedrooms / Baths</td>
                  {compareProps.map(p => (
                    <td key={p.id} className="p-4 border-2 border-brand-black font-medium text-sm">
                      {p.bedrooms > 0 ? `${p.bedrooms} Beds / ${p.bathrooms} Baths` : 'N/A'}
                    </td>
                  ))}
                </tr>
                
                {/* Investment Metrics */}
                <tr>
                  <td className="p-4 border-2 border-brand-black font-black uppercase text-xs bg-brand-teal text-white">Appreciation Score</td>
                  {compareProps.map(p => (
                    <td key={p.id} className={cn("p-4 border-2 border-brand-black font-black text-lg", p.appreciationScore === maxAppreciation && "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400")}>
                      {p.appreciationScore}/100
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-2 border-brand-black font-black uppercase text-xs bg-brand-teal text-white">Rental Yield</td>
                  {compareProps.map(p => (
                    <td key={p.id} className={cn("p-4 border-2 border-brand-black font-black text-lg", p.rentalYieldEstimate === maxYield && p.rentalYieldEstimate > 0 && "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400")}>
                      {p.rentalYieldEstimate > 0 ? `${p.rentalYieldEstimate}%` : 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Amenities */}
                <tr>
                  <th colSpan={compareProps.length + 1} className="p-4 border-2 border-brand-black bg-brand-gray dark:bg-zinc-800 text-left">
                    <span className="font-black uppercase tracking-widest">Amenities</span>
                  </th>
                </tr>
                {allAmenities.map(amenity => (
                  <tr key={amenity}>
                    <td className="p-4 border-2 border-brand-black font-black uppercase text-[10px] text-zinc-500 bg-brand-gray/50 dark:bg-zinc-800">{amenity}</td>
                    {compareProps.map(p => (
                      <td key={p.id} className="p-4 border-2 border-brand-black text-center">
                        {p.amenities.includes(amenity) ? (
                          <Check size={20} className="text-brand-teal mx-auto" />
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-700">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
