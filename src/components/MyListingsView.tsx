import React, { useState } from 'react';
import { 
  PlusCircle, Clock, MapPin, Eye, Save, 
  MessageSquare, Dices, X, Edit3, BarChart3, 
  Power, Calendar, Zap, AlertTriangle, CheckCircle2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { ListingStatus, ListingRequest } from '../types';
import { formatCurrency, parseFormattedNumber, formatNumberString, cn } from '../lib/utils';

export default function MyListingsView() {
  const { user, updateUser, listingRequests = [], updateListingRequest } = useAuth();
  const { setIsListingFlow } = useNavigation();

  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{title: string, price: string}>({title: '', price: ''});
  const [viewingMetrics, setViewingMetrics] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  if (!user) return null;

  const isSubscriber = user.isSubscriber;
  const MAX_PRO_BOOSTS = 3;
  const BOOST_COST = 20;

  const handleSpendTokens = (amount: number, description: string) => {
    if (user.tokens >= amount) {
      const newTransaction = {
        id: `tx-${Date.now()}`,
        type: 'Debit' as const,
        amount,
        description,
        timestamp: new Date().toISOString()
      };
      updateUser({
        tokens: user.tokens - amount,
        transactions: [newTransaction, ...(user.transactions || [])]
      });
      return true;
    }
    setActiveModal('Insufficient Tokens');
    return false;
  };

  const handleAcceptBid = async (listingId: string, bidId: string) => {
    const listing = listingRequests.find(r => r.id === listingId);
    if (!listing || !listing.agentBids) return;

    const acceptedBid = listing.agentBids.find(b => b.id === bidId);
    if (!acceptedBid) return;

    const updatedBids = listing.agentBids.map(b => {
      if (b.id === bidId) {
        return { ...b, status: 'Accepted' as const };
      } else {
        return { ...b, status: 'Rejected' as const };
      }
    });

    await updateListingRequest(listingId, {
      assignedAgentId: acceptedBid.agentId,
      assignedAgentTier: acceptedBid.agentTier,
      status: 'Inspection Scheduled',
      agentBids: updatedBids,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleDeclineBid = async (listingId: string, bidId: string) => {
    const listing = listingRequests.find(r => r.id === listingId);
    if (!listing || !listing.agentBids) return;

    const updatedBids = listing.agentBids.map(b => {
      if (b.id === bidId) {
        return { ...b, status: 'Rejected' as const };
      }
      return b;
    });

    await updateListingRequest(listingId, {
      agentBids: updatedBids,
      lastUpdated: new Date().toISOString()
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Listing Request Action */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-display font-black uppercase italic dark:text-gray-100">My Listings</h3>
          <button
            onClick={() => setIsListingFlow(true)}
            className="bg-brand-black text-white px-4 py-2 border-2 border-brand-black hover:bg-brand-teal hover:text-brand-black transition-all shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none flex items-center gap-2 text-xs font-black uppercase tracking-wide animate-pulse"
          >
            <PlusCircle size={14} /> List New Property
          </button>
        </div>

        {/* Pipeline Status Summary counts */}
        <div className="grid grid-cols-5 gap-2 select-none bg-brand-black text-white p-3 border-4 border-brand-black shadow-brutal-xs">
          {[
            { label: 'Pending', count: listingRequests.filter(r => r.status === 'Pending').length, color: 'bg-zinc-500' },
            { label: 'Bidding', count: listingRequests.filter(r => r.status === 'Agent Bidding').length, color: 'bg-brand-teal' },
            { label: 'Contracting', count: listingRequests.filter(r => r.status === 'Contracting').length, color: 'bg-blue-500' },
            { label: 'Closed', count: listingRequests.filter(r => r.status === 'Closed' || r.status === 'Completed').length, color: 'bg-emerald-500' },
            { label: 'Total', count: listingRequests.length, color: 'bg-brand-teal' },
          ].map(st => (
            <div key={st.label} className="bg-zinc-900 p-2 text-center border border-zinc-800">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", st.color)} />
                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-wider font-display max-sm:hidden">{st.label}</span>
              </div>
              <span className="text-sm font-display font-black text-white">{st.count}</span>
            </div>
          ))}
        </div>
      </div>

      {listingRequests.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-8 shadow-brutal-sm">
          <div className="w-20 h-20 bg-brand-gray dark:bg-zinc-805 border-4 border-brand-black flex items-center justify-center rounded-full">
            <PlusCircle size={40} className="text-zinc-400" />
          </div>
          <div>
            <h3 className="text-xl font-display font-black uppercase dark:text-white">No Listings Yet</h3>
            <p className="text-zinc-500 dark:text-zinc-400 font-bold max-w-xs uppercase text-xs">Submit a property listing request to track it here.</p>
          </div>
          <button 
            onClick={() => setIsListingFlow(true)}
            className="brutalist-button-teal mt-4 px-8"
          >
            Host a Listing
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-brand-black text-white p-3 border-b-4 border-brand-teal flex justify-between items-center text-left">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight font-display">Listing Pipeline Detail</h2>
            <span className="text-[8px] font-black uppercase opacity-60 text-right max-w-[50%]">
              {isSubscriber ? 'Auto-Renewal Enabled' : 'Manual Renewal Required (30 Days)'}
            </span>
          </div>

          {listingRequests.map(req => {
            const daysLeft = Math.ceil((new Date(req.expiresAt || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const isExpired = daysLeft <= 0;
            const isEditing = editingListing === req.id;
            const isViewingMetrics = viewingMetrics === req.id;
            const bids = req.agentBids || [];
            
            return (
              <div key={req.id} className={cn(
                "bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-sm relative overflow-hidden transition-all duration-300",
                (isExpired || req.status === 'Archived') && "opacity-75 grayscale"
              )}>
                {/* Metrics Overlay */}
                <AnimatePresence>
                  {isViewingMetrics && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 z-20 bg-brand-black text-white p-4 flex flex-col justify-center gap-6"
                    >
                      <button 
                        onClick={() => setViewingMetrics(null)}
                        className="absolute top-2 right-2 text-zinc-400 hover:text-white"
                      >
                        <X size={20} />
                      </button>
                      <div className="text-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-teal mb-4">Real-Time Performance</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col items-center p-3 border-2 border-zinc-800 bg-zinc-900">
                            <Eye size={16} className="text-zinc-500 mb-1" />
                            <span className="text-lg font-display font-black">{req.metrics?.views || 0}</span>
                            <span className="text-[8px] font-black uppercase opacity-60">Views</span>
                          </div>
                          <div className="flex flex-col items-center p-3 border-2 border-zinc-800 bg-zinc-900">
                            <Save size={16} className="text-zinc-500 mb-1" />
                            <span className="text-lg font-display font-black">{req.metrics?.saves || 0}</span>
                            <span className="text-[8px] font-black uppercase opacity-60">Saves</span>
                          </div>
                          <div className={cn(
                            "flex flex-col items-center p-3 border-2 border-zinc-800 bg-zinc-900 relative overflow-hidden transition-all",
                            !isSubscriber && "grayscale opacity-50"
                          )}>
                            <MessageSquare size={16} className="text-zinc-500 mb-1" />
                            <span className="text-lg font-display font-black">
                              {isSubscriber ? (req.metrics?.inquiries || 0) : '—'}
                            </span>
                            <span className="text-[8px] font-black uppercase opacity-60">Leads</span>
                            {!isSubscriber && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-all cursor-help" title="Pro Feature">
                                <Zap size={14} className="text-amber-400 fill-amber-400" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest bg-brand-teal/20 text-brand-teal px-1.5 py-0.5 border border-brand-teal/30">{req.type}</span>
                      {req.isBoosted && <span className="text-[8px] font-black uppercase tracking-widest bg-amber-400 text-black px-1.5 py-0.5 border border-black italic">Boosted</span>}
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Ref: {req.id.slice(0, 8)}</span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input 
                          className="w-full bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-black dark:text-white p-1 font-display font-black uppercase text-lg"
                          value={editFormData.title}
                          onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                          autoFocus
                        />
                        <p className="text-[8px] text-brand-teal font-black uppercase tracking-widest bg-brand-teal/5 p-1 border border-brand-teal/20 italic inline-block">
                          * Verification takes up to 24hrs
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <h3 className="font-display font-black uppercase text-lg leading-tight dark:text-brand-gray">{req.title}</h3>
                        {(req.commission !== undefined || (req.documents && req.documents.length > 0)) && (
                          <div className="flex gap-2">
                            <span className="text-[8px] font-black uppercase bg-brand-black text-brand-teal px-1 border border-brand-teal">
                              Comm: 5%
                            </span>
                            {req.documents && req.documents.length > 0 && (
                              <span className="text-[8px] font-black uppercase bg-brand-teal text-brand-black px-1 border border-brand-black">
                                {req.documents.length} Docs Attached
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 mt-1">
                      <MapPin size={10} className="text-brand-teal" />
                      {req.location}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                     <StatusBadge status={req.status} />
                     <div className={cn(
                       "text-[9px] font-black uppercase tracking-widest flex items-center gap-1 px-2 py-1 border-2",
                       isExpired || req.status === 'Archived' ? "bg-brand-red text-white border-brand-black" : (daysLeft < 5 ? "bg-amber-400 text-black border-black" : "bg-black text-white border-black")
                     )}>
                       <Clock size={10} /> {isExpired || req.status === 'Archived' ? "EXPIRED" : `${daysLeft}D LEFT`}
                     </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t-2 border-zinc-100 dark:border-zinc-800 mt-2">
                  <div className="flex-1">
                    <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest leading-none mb-1">Listing Valuation</p>
                    {isEditing ? (
                      <input 
                        className="w-32 bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-black dark:text-white p-1 font-display font-black text-lg"
                        value={editFormData.price}
                        onChange={e => setEditFormData({...editFormData, price: formatNumberString(e.target.value)})}
                      />
                    ) : (
                      <p className="text-lg font-display font-black text-brand-black dark:text-brand-teal leading-none">{formatCurrency(req.price)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => {
                            updateListingRequest?.(req.id, { 
                              title: editFormData.title, 
                              price: Number(parseFormattedNumber(editFormData.price)) 
                            });
                            setEditingListing(null);
                          }}
                          className="bg-brand-black text-brand-teal border-2 border-brand-black p-2 hover:bg-zinc-800 transition-all"
                        >
                          <Save size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingListing(null)}
                          className="bg-white text-zinc-400 border-2 border-zinc-200 p-2 hover:bg-zinc-50 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            setEditingListing(req.id);
                            setEditFormData({ title: req.title, price: formatNumberString(req.price.toString()) });
                          }}
                          className="p-2 border-2 border-zinc-200 text-zinc-400 hover:border-brand-black hover:text-brand-black dark:border-zinc-800 transition-all"
                          title="Edit Listing"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => setViewingMetrics(req.id)}
                          className="p-2 border-2 border-zinc-200 text-zinc-400 hover:border-brand-black hover:text-brand-black dark:border-zinc-800 transition-all"
                          title="Performance Metrics"
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            const nextStatus: ListingStatus = req.status === 'Archived' ? 'Pending' : 'Archived';
                            updateListingRequest?.(req.id, { status: nextStatus });
                          }}
                          className={cn(
                            "p-2 border-2 transition-all",
                            req.status === 'Archived' 
                              ? "border-emerald-500 text-emerald-500 hover:bg-emerald-50" 
                              : "border-brand-red text-brand-red hover:bg-brand-red/5"
                          )}
                          title={req.status === 'Archived' ? "Activate Listing" : "Deactivate Listing"}
                        >
                          <Power size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {req.status !== 'Archived' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t-2 border-zinc-100 dark:border-zinc-800 border-dashed">
                    <button className="flex-1 bg-brand-teal text-brand-black border-2 border-brand-black px-3 py-1.5 text-[10px] font-black uppercase hover:bg-brand-black hover:text-brand-teal transition-all">
                      {isExpired ? "Renew Free" : "Extend (₦3,700)"}
                    </button>
                         <button 
                          onClick={() => {
                            if (req.isBoosted) {
                               updateListingRequest?.(req.id, { isBoosted: false });
                            } else {
                              // Check boost limit if Pro
                              const boostedCount = listingRequests.filter(r => r.isBoosted).length;
                              if (isSubscriber && boostedCount >= MAX_PRO_BOOSTS) {
                                setActiveModal('Boost Limit Reached');
                                return;
                              }
                              
                              if (handleSpendTokens(BOOST_COST, `Boosted Listing: ${req.title}`)) {
                                updateListingRequest?.(req.id, { isBoosted: true });
                              }
                            }
                          }}
                          className={cn(
                            "flex-1 border-2 px-3 py-1.5 text-[10px] font-black uppercase transition-all",
                            req.isBoosted 
                              ? "bg-brand-black text-amber-400 border-brand-black" 
                              : "bg-amber-400 text-brand-black border-brand-black hover:bg-black hover:text-amber-400"
                          )}
                        >
                          {req.isBoosted ? "Boost Active" : "Boost Listing (20 TKNS)"}
                        </button>
                  </div>
                )}

                {/* Expandable Bidding Review Block */}
                {req.status === 'Agent Bidding' && (
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-zinc-400">Competitive Agent Bidding</h4>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{bids.length} bids submitted by active agents</p>
                      </div>
                      <button
                        onClick={() => setReviewingId(reviewingId === req.id ? null : req.id)}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-brand-black transition-all",
                          reviewingId === req.id
                            ? "bg-brand-black text-white"
                            : "bg-brand-teal text-brand-black hover:bg-teal-400 shadow-brutal-xs"
                        )}
                      >
                        {reviewingId === req.id ? 'Close Bids' : 'Review Bids'}
                      </button>
                    </div>

                    {reviewingId === req.id && (
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border-2 border-brand-black mt-2 space-y-4">
                        {bids.length === 0 ? (
                          <p className="text-[10px] text-zinc-400 italic">No agent bids submitted yet. Agents are actively preparing pitches!</p>
                        ) : (
                          <div className="space-y-3">
                            {bids.map((bid: any) => (
                              <div key={bid.id} className={cn(
                                "bg-white dark:bg-zinc-900 border-2 p-3 shadow-brutal-xs relative overflow-hidden flex flex-col gap-2",
                                bid.status === 'Accepted' ? "border-emerald-500" : (bid.status === 'Rejected' ? "border-zinc-300 opacity-60" : "border-brand-black")
                              )}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-display font-black uppercase text-xs text-zinc-900 dark:text-white">{bid.agentName}</span>
                                      <span className={cn(
                                        "px-1 py-0.5 text-[8px] font-black uppercase border border-brand-black",
                                        bid.agentTier === 'Verified Professional' ? "bg-brand-teal text-brand-black" : "bg-zinc-300 text-brand-black"
                                      )}>
                                        {bid.agentTier === 'Verified Professional' ? 'Verified Pro' : 'Platform Agent'}
                                      </span>
                                    </div>
                                    {bid.agentRegNumber && (
                                      <p className="text-[8px] font-mono text-zinc-400 uppercase mt-0.5">Reg No: {bid.agentRegNumber}</p>
                                    )}
                                  </div>
                                  
                                  {bid.status === 'Pending' ? (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleAcceptBid(req.id, bid.id)}
                                        className="bg-emerald-500 text-white hover:bg-emerald-600 px-2 py-1 text-[8px] font-black uppercase border-2 border-brand-black transition-all shadow-brutal-xs active:translate-y-0.5"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => handleDeclineBid(req.id, bid.id)}
                                        className="bg-brand-red text-white hover:bg-red-650 px-2 py-1 text-[8px] font-black uppercase border-2 border-brand-black transition-all shadow-brutal-xs active:translate-y-0.5"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={cn(
                                      "text-[8px] font-black uppercase px-2 py-1 border border-brand-black",
                                      bid.status === 'Accepted' ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                    )}>
                                      {bid.status}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs italic text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-2 border-l-2 border-brand-teal">
                                  &ldquo;{bid.coverageNote}&rdquo;
                                </p>

                                <div className="flex justify-between items-center text-[8px] font-mono uppercase text-zinc-400 border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-1.5">
                                  <span>Distance: {bid.distanceKm ? `${bid.distanceKm} km` : '1.5 km'}</span>
                                  <span>Commission: 5% Platform rate</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Brutalist Modal Overlays */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-brand-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 w-full max-w-sm relative z-10 shadow-aggressive"
            >
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-brand-black dark:text-zinc-400 hover:text-brand-red transition-all"
              >
                <X size={20} />
              </button>

              <div className="p-1">
                {activeModal === 'Insufficient Tokens' ? (
                  <div className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center gap-4">
                    <div className="w-16 h-16 border-4 border-brand-black bg-brand-red flex items-center justify-center rotate-3 shadow-brutal-sm text-white">
                      <AlertTriangle size={32} />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase italic mb-1 dark:text-white">INSUFFICIENT TOKENS</h3>
                      <p className="text-xs uppercase font-bold text-zinc-500">You do not have enough tokens in your wallet.</p>
                      <p className="text-[10px] font-black text-brand-teal uppercase mt-2">* Please refill tokens in your profile settings</p>
                    </div>
                    <button 
                      onClick={() => setActiveModal(null)} 
                      className="mt-4 w-full bg-brand-black text-white font-display font-black uppercase text-sm py-3 border-2 border-brand-black shadow-brutal-sm"
                    >
                      Understood
                    </button>
                  </div>
                ) : activeModal === 'Boost Limit Reached' ? (
                  <div className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center gap-4">
                    <div className="w-16 h-16 border-4 border-brand-black bg-amber-400 flex items-center justify-center rotate-3 shadow-brutal-sm text-brand-black">
                      <Zap size={32} className="fill-brand-black" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase italic mb-1 dark:text-white">BOOST LIMIT REACHED</h3>
                      <p className="text-xs uppercase font-bold text-zinc-500">Pro Agents can have 3 active boosts simultaneously.</p>
                      <p className="text-[10px] font-black text-brand-teal uppercase mt-2">* Unboost a listing to free up slots</p>
                    </div>
                    <button 
                      onClick={() => setActiveModal(null)} 
                      className="mt-4 w-full bg-brand-black text-white font-display font-black uppercase text-sm py-3 border-2 border-brand-black shadow-brutal-sm"
                    >
                      Understood
                    </button>
                  </div>
                ) : (
                  <div className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center gap-4">
                    <div className="w-16 h-16 border-4 border-brand-black bg-brand-teal flex items-center justify-center rotate-3">
                      <Settings size={32} className="text-brand-black -rotate-3" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase italic mb-1 dark:text-white">UPGRADE TO PRO</h3>
                      <p className="text-xs uppercase font-bold text-zinc-500">Feature Restricted.</p>
                    </div>
                    <button 
                      onClick={() => setActiveModal(null)} 
                      className="mt-4 w-full bg-brand-black text-white font-display font-black uppercase text-sm py-3 border-2 border-brand-black shadow-brutal-sm"
                    >
                      Acknowledge
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: ListingStatus }) {
  const config: Record<string, { icon: React.ReactNode, bg: string, text: string, border: string }> = {
    'Pending': { 
      icon: <Clock size={10} />, 
      bg: 'bg-zinc-100 dark:bg-zinc-800', 
      text: 'text-zinc-500', 
      border: 'border-zinc-300 dark:border-zinc-600' 
    },
    'Agent Bidding': {
      icon: <Dices size={10} />,
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-400/50'
    },
    'Inspection Scheduled': { 
      icon: <Calendar size={10} />, 
      bg: 'bg-brand-teal/10', 
      text: 'text-brand-teal', 
      border: 'border-brand-teal/50' 
    },
    'Under Review': { 
      icon: <Zap size={10} />, 
      bg: 'bg-amber-100 dark:bg-amber-900/30', 
      text: 'text-amber-600 dark:text-amber-400', 
      border: 'border-amber-400/50' 
    },
    'Approved': { 
      icon: <CheckCircle2 size={10} />, 
      bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
      text: 'text-emerald-600 dark:text-emerald-400', 
      border: 'border-emerald-400/50' 
    },
    'Rejected': { 
      icon: <AlertTriangle size={10} />, 
      bg: 'bg-brand-red/10', 
      text: 'text-brand-red', 
      border: 'border-brand-red/50' 
    },
    'Archived': {
      icon: <Power size={10} />,
      bg: 'bg-zinc-800',
      text: 'text-zinc-500',
      border: 'border-zinc-700'
    },
    'Contracting': {
      icon: <CheckCircle2 size={10} />,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-400/50'
    },
    'Completed': {
      icon: <CheckCircle2 size={10} />,
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-400/50'
    },
    'Closed': {
      icon: <CheckCircle2 size={10} />,
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-400/50'
    },
  };

  const { icon, bg, text, border } = config[status] || config['Pending'];

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 border-2 text-[9px] font-black uppercase tracking-tight shadow-brutal-xs",
      bg, text, border
    )}>
      {icon}
      {status}
    </div>
  );
}
