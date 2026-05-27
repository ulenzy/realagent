import React, { useState } from 'react';
import { Heart, FileText, Gavel } from 'lucide-react';
import WishlistView from './WishlistView';
import MyListingsView from './MyListingsView';
import AgentBidding from './AgentBidding';

interface MySpaceProps {
  defaultActiveSubTab: 'Wishlist' | 'My Listings' | 'Bids';
}

export default function MySpace({ defaultActiveSubTab }: MySpaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<'Wishlist' | 'My Listings' | 'Bids'>(defaultActiveSubTab);

  return (
    <div className="flex flex-col min-h-screen bg-brand-gray dark:bg-[#1a1a1e] pb-16">
      {/* Sub-Tab Navigation Bar with Neo-Brutalist Visual Layout */}
      <div className="px-4 pt-4">
        <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-2 shadow-brutal-xs mb-4 rounded-none">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              id="myspace-tab-wishlist"
              onClick={() => setActiveSubTab('Wishlist')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs font-black uppercase tracking-wide border-2 border-brand-black transition-all ${
                activeSubTab === 'Wishlist'
                  ? 'bg-brand-teal text-brand-black font-extrabold translate-y-0.5 shadow-none'
                  : 'bg-white dark:bg-zinc-800 text-brand-black dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 shadow-brutal-xs'
              }`}
            >
              <Heart size={16} className={activeSubTab === 'Wishlist' ? "fill-brand-black" : ""} />
              Wishlist
            </button>
            <button
              id="myspace-tab-listings"
              onClick={() => setActiveSubTab('My Listings')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs font-black uppercase tracking-wide border-2 border-brand-black transition-all ${
                activeSubTab === 'My Listings'
                  ? 'bg-brand-teal text-brand-black font-extrabold translate-y-0.5 shadow-none'
                  : 'bg-white dark:bg-zinc-800 text-brand-black dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 shadow-brutal-xs'
              }`}
            >
              <FileText size={16} />
              My Listings
            </button>
            <button
              id="myspace-tab-bids"
              onClick={() => setActiveSubTab('Bids')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs font-black uppercase tracking-wide border-2 border-brand-black transition-all ${
                activeSubTab === 'Bids'
                  ? 'bg-brand-teal text-brand-black font-extrabold translate-y-0.5 shadow-none'
                  : 'bg-white dark:bg-zinc-800 text-brand-black dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 shadow-brutal-xs'
              }`}
            >
              <Gavel size={16} />
              Bids
            </button>
          </div>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4">
        {activeSubTab === 'Wishlist' && (
          <WishlistView />
        )}
        {activeSubTab === 'My Listings' && (
          <MyListingsView />
        )}
        {activeSubTab === 'Bids' && (
          <AgentBidding />
        )}
      </div>
    </div>
  );
}
