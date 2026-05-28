import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import {
  Gavel,
  MapPin,
  FileText,
  User,
  ArrowRight,
  CheckCircle2,
  Home,
  Shield,
  ShieldEllipsis,
  ShieldAlert,
  ShieldCheck,
  Award,
  Clock,
  AlertCircle,
  TrendingUp,
  Percent,
  Check,
  X,
  Sparkles,
  Search,
  Trophy,
} from "lucide-react";
import { cn, formatCurrency, formatNumber } from "../lib/utils";
import { ListingRequest, AgentBid, AgentTier } from "../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AcceptButtonWithCountdownProps {
  bidWindowExpiresAt?: string;
  onAccept: () => void;
  className?: string;
  declineButton: React.ReactNode;
}

const AcceptButtonWithCountdown: React.FC<AcceptButtonWithCountdownProps> = ({
  bidWindowExpiresAt,
  onAccept,
  className = "px-4 py-1 bg-brand-teal hover:bg-teal-400 text-brand-black border-2 border-brand-black text-[11px] font-black uppercase tracking-wider shadow-brutal-xs",
  declineButton,
}) => {
  const [timeLeft, setTimeLeft] = React.useState<number>(0);

  React.useEffect(() => {
    if (!bidWindowExpiresAt) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const expirationTime = new Date(bidWindowExpiresAt).getTime();
      const diff = expirationTime - Date.now();
      return diff > 0 ? diff : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const intervalId = setInterval(() => {
      const currentDiff = calculateTimeLeft();
      setTimeLeft(currentDiff);
      if (currentDiff <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [bidWindowExpiresAt]);

  const isLocked = timeLeft > 0;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  if (isLocked) {
    return (
      <div className="flex flex-col items-end gap-1.5 mt-1">
        <div className="flex gap-2">
          {declineButton}
          <button
            disabled
            type="button"
            title="Minimum 24-hour bidding window — protects fair competition."
            className="px-4 py-1 bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-550 border-2 border-zinc-400 dark:border-zinc-700 text-[11px] font-bold uppercase tracking-wider cursor-not-allowed select-none relative"
          >
            Accept
          </button>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase text-amber-500 tracking-wide animate-pulse">
            Accepting bids for {formatTime(timeLeft)}
          </span>
          <span className="text-[8px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-tighter text-right">
            Min 24h bidding protects fair competition
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {declineButton}
      <button type="button" onClick={onAccept} className={className}>
        Accept
      </button>
    </div>
  );
};

const MOCK_LEADER_AGENTS = [
  { id: 'agent-1', name: 'Chinedu Okafor', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chinedu', profileScore: 98, agentTier: 'Verified Professional', dealsClosedCount: 28, role: 'Agent' },
  { id: 'agent-2', name: 'Amina Bello', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amina', profileScore: 92, agentTier: 'Verified Professional', dealsClosedCount: 19, role: 'Agent' },
  { id: 'agent-3', name: 'Olumide Adebayo', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olumide', profileScore: 88, agentTier: 'Verified Professional', dealsClosedCount: 14, role: 'Agent' },
  { id: 'agent-4', name: 'Emeka Nwosu', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emeka', profileScore: 84, agentTier: 'Platform Agent', dealsClosedCount: 8, role: 'Agent' },
  { id: 'agent-5', name: 'Funmi Alao', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Funmi', profileScore: 81, agentTier: 'Platform Agent', dealsClosedCount: 6, role: 'Agent' },
];

export default function AgentBidding({ onViewLeaderboard }: { onViewLeaderboard?: () => void }) {
  const {
    user,
    listingRequests,
    platformListings = [],
    updateListingRequest,
  } = useAuth();
  const { setActiveTab } = useNavigation();

  const [topAgents, setTopAgents] = useState<any[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  useEffect(() => {
    let intervalId: any;
    
    const fetchLeaderboard = async () => {
      try {
        if (!user) return;
        
        // If local guest user or database not present, do local construction
        const isMockInstance = !db || user.isGuest || user.id === 'guest_local_user' || user.id === 'google_local_user' || user.id === 'facebook_local_user';
        if (isMockInstance) {
          const guestAgent = {
            id: user.id,
            name: user.name || 'You',
            avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
            profileScore: user.profileScore !== undefined ? user.profileScore : 50,
            agentTier: user.agentTier || 'Platform Agent',
            dealsClosedCount: user.dealsClosedCount || 0,
            role: 'Agent'
          };
          
          let combined = [...MOCK_LEADER_AGENTS];
          if (!combined.some(a => a.id === guestAgent.id)) {
            combined.push(guestAgent);
          } else {
            combined = combined.map(a => a.id === guestAgent.id ? { ...a, profileScore: guestAgent.profileScore, dealsClosedCount: guestAgent.dealsClosedCount } : a);
          }
          
          combined.sort((a, b) => (b.profileScore || 0) - (a.profileScore || 0));
          
          const ranked = combined.map((agent, i) => ({ ...agent, rank: i + 1 }));
          setTopAgents(ranked.slice(0, 5));
          
          const myRank = ranked.findIndex(a => a.id === user.id) + 1;
          setCurrentUserRank(myRank > 0 ? myRank : ranked.length + 1);
          setIsLoadingLeaderboard(false);
          return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'Agent'));
        const querySnapshot = await getDocs(q);
        
        let agentsList: any[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          agentsList.push({
            id: docSnap.id,
            name: data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : 'Agent'),
            avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`,
            profileScore: data.profileScore !== undefined ? data.profileScore : 50,
            agentTier: data.agentTier || 'Platform Agent',
            dealsClosedCount: data.dealsClosedCount || 0,
            role: 'Agent'
          });
        });

        if (user.role === 'Agent' && !agentsList.some(a => a.id === user.id)) {
          agentsList.push({
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
            profileScore: user.profileScore !== undefined ? user.profileScore : 50,
            agentTier: user.agentTier || 'Platform Agent',
            dealsClosedCount: user.dealsClosedCount || 0,
            role: 'Agent'
          });
        }

        agentsList.sort((a, b) => b.profileScore - a.profileScore);

        const rankedAgents = agentsList.map((agent, index) => ({
          ...agent,
          rank: index + 1
        }));

        setTopAgents(rankedAgents.slice(0, 5));
        
        const myRankPos = rankedAgents.findIndex(a => a.id === user.id) + 1;
        setCurrentUserRank(myRankPos > 0 ? myRankPos : null);
        setIsLoadingLeaderboard(false);
      } catch (err) {
        console.error("Error fetching leaderboard data:", err);
        setTopAgents(MOCK_LEADER_AGENTS.map((a, i) => ({ ...a, rank: i + 1 })));
        setCurrentUserRank(6);
        setIsLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();

    intervalId = setInterval(fetchLeaderboard, 300000);

    return () => clearInterval(intervalId);
  }, [user]);

  // States for expanding views inline
  const [biddingId, setBiddingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Submit Bid State
  const [coverageNote, setCoverageNote] = useState("");
  const [biddingSuccessId, setBiddingSuccessId] = useState<string | null>(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  // Filter listings based on "Agent Bidding" status using platformListings
  const biddingListings = platformListings;

  // Relative time helper
  const getRelativeTime = (timeStr: string) => {
    try {
      const diffMs = Date.now() - new Date(timeStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24)
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } catch (e) {
      return "3 hours ago";
    }
  };

  // Check user role
  const isAgent = user?.role === "Agent";
  const isSeller = user?.role === "Seller";

  // ----------------- AGENT VIEW -----------------
  if (isAgent) {
    // Top Agent Tier Card Rendering
    const isVP = user.agentTier === "Verified Professional";
    const isPending = user.agentVerificationStatus === "Pending";
    const isVerified = user.agentVerificationStatus === "Verified";

    // Find agent's active bids across all platform listings
    const myActiveBids: { listing: ListingRequest; bid: AgentBid }[] = [];
    platformListings.forEach((req) => {
      if (req.agentBids) {
        const myBid = req.agentBids.find((b) => b.agentId === user.id);
        if (myBid) {
          myActiveBids.push({ listing: req, bid: myBid });
        }
      }
    });

    const handleOpenBidPanel = (reqId: string) => {
      setBiddingId(reqId);
      setCoverageNote("");
      setBiddingSuccessId(null);
    };

    const handleSubmitBid = async (reqId: string) => {
      if (coverageNote.trim().length < 30) return;
      if (user.kycStatus !== "Verified") return;

      setIsSubmittingBid(true);
      const targetListing = platformListings.find((r) => r.id === reqId);
      if (!targetListing) return;

      // Stable mock proximity based on ID length & characters
      const mockedDistance =
        ((reqId.charCodeAt(reqId.length - 1) || 0) % 15) + 1.2;

      const newBid: AgentBid = {
        id: `bid-${Date.now()}`,
        agentId: user.id,
        agentName: user.name,
        agentTier: user.agentTier || "Platform Agent",
        agentTrustScore: user.profileScore || 0,
        agentVerified: isVerified,
        agentRegNumber: user.agentRegNumber,
        coverageNote: coverageNote.trim(),
        distanceKm: Number(mockedDistance.toFixed(1)),
        submittedAt: new Date().toISOString(),
        status: "Pending",
      };

      const currentBids = targetListing.agentBids || [];
      const updatedBids = [
        ...currentBids.filter((b) => b.agentId !== user.id),
        newBid,
      ];

      await updateListingRequest(reqId, {
        agentBids: updatedBids,
        lastUpdated: new Date().toISOString(),
      });

      setIsSubmittingBid(false);
      setBiddingSuccessId(reqId);
      setCoverageNote("");
      // Keep open shortly then close
      setTimeout(() => {
        setBiddingId(null);
        setBiddingSuccessId(null);
      }, 4000);
    };

    return (
      <div className="space-y-6 px-4 py-6" id="agent-bidding-agent-view">
        {/* Tier Status Card */}
        {isVP ? (
          <div
            className="brutalist-card-flat bg-brand-teal text-brand-black p-4 border-2 border-brand-black relative overflow-hidden"
            id="agent-tier-vp"
          >
            <div className="absolute right-3 top-3 opacity-15">
              <ShieldCheck size={72} />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase bg-brand-black text-brand-teal px-2 py-0.5 rounded">
                  YOUR PARTNERSHIP LEVEL
                </span>
                <h2 className="text-xl font-display font-black leading-tight uppercase mt-1">
                  Verified Professional
                </h2>
                <p className="text-xs text-brand-black/80 mt-1 max-w-xl font-medium">
                  Your credentials grant you priority rank on search results.
                  Sellers see your listings and bids first. Complete active
                  transactions to max out your platform trust score.
                </p>
              </div>
              <div className="shrink-0 flex items-center">
                {isPending ? (
                  <span className="bg-amber-100 text-amber-800 border-2 border-amber-600 px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <ShieldAlert size={14} />
                    REG. NUMBER UNDER REVIEW — bidding as Platform Agent
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 border-2 border-emerald-600 px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <CheckCircle2 size={14} />
                    Tier 1 Confirmed
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="brutalist-card-flat bg-zinc-100 dark:bg-zinc-850 p-4 border-2 border-brand-black dark:border-zinc-700 relative overflow-hidden"
            id="agent-tier-pa"
          >
            <div className="absolute right-3 top-3 opacity-10">
              <ShieldEllipsis size={72} />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase bg-zinc-300 dark:bg-zinc-700 text-zinc-750 dark:text-zinc-300 px-2 py-0.5 rounded">
                  YOUR PARTNERSHIP LEVEL
                </span>
                <h2 className="text-xl font-display font-black leading-tight uppercase mt-1 text-zinc-900 dark:text-white">
                  Platform Agent
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 max-w-xl font-medium">
                  Bidding on equal facilitation fees. Upgrade your status by
                  adding your registration details. Verified Professionals are
                  listed above standard accounts.
                </p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => setActiveTab("profile")}
                  className="bg-brand-black text-brand-teal hover:bg-zinc-800 text-xs font-black uppercase tracking-widest px-4 py-2 border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                  Add Reg Number → Upgrade
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agent Leaderboard Section */}
        <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-xs space-y-4" id="agent-leaderboard-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-500 fill-amber-500" size={18} />
              <h3 className="text-xs font-display font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                TOP AGENTS THIS MONTH
              </h3>
            </div>
            {onViewLeaderboard && (
              <button
                onClick={onViewLeaderboard}
                className="text-[10px] font-black uppercase hover:underline text-brand-teal tracking-wider flex items-center gap-1"
              >
                VIEW FULL LEADERBOARD →
              </button>
            )}
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
            {topAgents.map((agent) => {
              const isMe = agent.id === user?.id;
              return (
                <div
                  key={agent.id}
                  className={cn(
                    "snap-start flex-shrink-0 w-64 bg-zinc-50 dark:bg-zinc-850 border-2 p-3 shadow-brutal-xs relative flex items-center gap-3 rounded-none",
                    isMe ? "border-brand-teal" : "border-brand-black dark:border-zinc-750"
                  )}
                >
                  <div className="absolute top-1 right-2 bg-brand-black dark:bg-zinc-850 text-white text-[9px] font-black px-1.5 py-0.5 border border-brand-black">
                    #{agent.rank}
                  </div>

                  <div className="w-10 h-10 rounded-full border-2 border-brand-black overflow-hidden bg-brand-teal flex-shrink-0">
                    <img src={agent.avatarUrl} alt={agent.name} referrerPolicy="no-referrer" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-black uppercase text-xs truncate text-brand-black dark:text-white flex items-center gap-1">
                      {agent.name}
                      {isMe && <span className="text-[8px] bg-brand-teal text-brand-black px-1 font-mono font-bold uppercase">YOU</span>}
                    </h4>
                    <span className="text-[8px] font-black uppercase text-white px-1.5 bg-brand-black inline-block mt-0.5 tracking-wider">
                      {agent.agentTier === 'Verified Professional' ? 'Tier 1' : 'Tier 2'}
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-zinc-550 dark:text-zinc-400 font-bold uppercase">
                      <span>Score: <strong className="text-zinc-850 dark:text-zinc-200">{agent.profileScore}</strong></span>
                      <span>Deals: <strong className="text-zinc-850 dark:text-zinc-200">{agent.dealsClosedCount}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}

            {currentUserRank && currentUserRank > 5 && (
              <div className="snap-start flex-shrink-0 w-64 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-400 dark:border-zinc-750 p-3 flex flex-col justify-center items-center text-center">
                <p className="text-xs font-display font-black uppercase text-zinc-700 dark:text-zinc-300">
                  You're ranked #{currentUserRank}
                </p>
                <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">
                  Score: {user?.profileScore || 50} • Deals: {user?.dealsClosedCount || 0}
                </p>
                {onViewLeaderboard && (
                  <button
                    onClick={onViewLeaderboard}
                    className="mt-1.5 text-[9px] font-black uppercase bg-brand-teal text-brand-black border border-brand-black px-2 py-0.5 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all shadow-brutal-xs"
                  >
                    View Rankings
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Bids Section */}
        {myActiveBids.length > 0 && (
          <div className="space-y-3" id="agent-active-bids-section">
            <h3 className="text-xs font-display font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Clock size={14} className="text-zinc-400" />
              My Active Bids ({myActiveBids.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myActiveBids.map(({ listing, bid }) => (
                <div
                  key={bid.id}
                  className="bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-xs flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h4 className="font-display font-black text-sm uppercase truncate text-zinc-900 dark:text-white">
                      {listing.title}
                    </h4>
                    <p className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">
                      Submitted {getRelativeTime(bid.submittedAt)}
                    </p>
                  </div>
                  <div>
                    {bid.status === "Pending" && (
                      <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-1 text-[9px] font-black uppercase border border-amber-500 tracking-wider">
                        Pending Seller Review
                      </span>
                    )}
                    {bid.status === "Accepted" && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 text-[9px] font-black uppercase border border-emerald-500 tracking-wider">
                        Accepted / Inspection Scheduled
                      </span>
                    )}
                    {bid.status === "Rejected" && (
                      <span className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 px-2 py-1 text-[9px] font-black uppercase border border-red-500 tracking-wider">
                        Declined
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available for Bidding feed */}
        <div className="space-y-4" id="agent-available-listings-section">
          <h3 className="text-xs font-display font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Gavel size={14} className="text-zinc-400" />
            Open Mandates & Agency Leads ({biddingListings.length})
          </h3>

          {biddingListings.length === 0 ? (
            <div className="brutalist-card-flat bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 p-10 text-center flex flex-col items-center justify-center">
              <Gavel size={32} className="text-zinc-300 mb-2" />
              <p className="text-xs font-display font-black text-zinc-500 uppercase tracking-widest">
                No active seller mandates open for bidding right now
              </p>
              <p className="text-[10px] text-zinc-400 max-w-xs mt-1">
                When sellers opt to list through the verification pipeline,
                their listing requests appear here for bidding.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {biddingListings.map((req) => {
                const alreadyBid = req.agentBids?.some(
                  (b) => b.agentId === user.id,
                );
                const hasDocs =
                  !!req.listingRequirements?.titleDocumentFileName;
                const disclosurePreview =
                  req.listingRequirements?.physicalConditionDescription ||
                  "No condition logs supplied.";
                const derivedDistance =
                  ((req.id.charCodeAt(req.id.length - 1) || 0) % 15) + 1.2;

                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm relative overflow-hidden flex flex-col"
                  >
                    {/* Trust Score Badge on Right */}
                    <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-1">
                      <span className="bg-brand-black text-brand-teal border border-brand-teal px-2 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-brutal-xs flex items-center gap-1">
                        <Award size={10} />
                        TRUST SCORE {req.trustScore || 80}
                      </span>
                    </div>

                    <div className="p-5 border-b-2 border-brand-black/10 dark:border-zinc-750">
                      <div className="flex items-start gap-3 justify-between">
                        <div>
                          <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-wider">
                            {req.type} • {req.location}
                          </span>
                          <h4 className="text-lg font-display font-black uppercase tracking-tight text-zinc-900 dark:text-white mt-0.5">
                            {req.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-display font-black text-brand-teal">
                          {formatCurrency(req.price)}
                        </span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase">
                          Target Listing Value
                        </span>
                      </div>

                      {/* Disclosure and Documents Box */}
                      <div className="mt-4 bg-zinc-50 dark:bg-zinc-850 p-3 border-2 border-zinc-200 dark:border-zinc-700 border-dashed space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-zinc-500">
                            SELLER DISCLOSURE OVERVIEW
                          </span>
                          {hasDocs ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <ShieldCheck size={12} /> DOCS PROVIDED
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                              <ShieldAlert size={12} /> DOCS WITHHELD
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed italic truncate">
                          &ldquo;{disclosurePreview.slice(0, 80)}
                          {disclosurePreview.length > 80 ? "..." : ""}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1">
                          <Clock size={11} /> Posted{" "}
                          {getRelativeTime(req.submittedAt)}
                        </span>

                        {alreadyBid ? (
                          <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-black uppercase tracking-wider cursor-default flex items-center gap-1.5">
                            <CheckCircle2
                              size={13}
                              className="text-emerald-500"
                            />
                            Bid Submitted
                          </div>
                        ) : biddingId === req.id ? (
                          <button
                            onClick={() => setBiddingId(null)}
                            className="bg-brand-black text-zinc-300 border-2 border-brand-black px-4 py-1.5 text-xs font-black uppercase tracking-wide hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenBidPanel(req.id)}
                            className="brutalist-button-teal px-5 py-1.5 text-xs text-brand-black group flex items-center gap-1"
                          >
                            Place Bid
                            <ArrowRight
                              size={13}
                              className="group-hover:translate-x-1.5 transition-transform"
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Bid Placement Panel */}
                    <AnimatePresence>
                      {biddingId === req.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-slate-50 dark:bg-zinc-950 border-t-2 border-brand-black p-5 space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black/10 dark:border-zinc-700 p-2.5">
                              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                                PLATFORM COMMISSION
                              </span>
                              <span className="text-sm font-display font-black text-brand-teal uppercase">
                                5% FIXED
                              </span>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black/10 dark:border-zinc-700 p-2.5">
                              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                                YOUR PARTNER TIER
                              </span>
                              <span className="text-sm font-display font-black text-zinc-800 dark:text-zinc-200 uppercase truncate block">
                                {user.agentTier}
                              </span>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black/10 dark:border-zinc-700 p-2.5">
                              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                                LOCAL PROXIMITY
                              </span>
                              <span className="text-sm font-display font-black text-zinc-800 dark:text-zinc-200 uppercase">
                                {derivedDistance.toFixed(1)} km away
                              </span>
                            </div>
                          </div>

                          {biddingSuccessId === req.id ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-600 p-4 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                              <CheckCircle2
                                className="text-emerald-500 shrink-0"
                                size={18}
                              />
                              <div>
                                <p className="font-display font-black uppercase tracking-wider text-[11px]">
                                  Bid Logged Successfully
                                </p>
                                <p className="text-[10px] opacity-90 mt-0.5">
                                  Your mandate pitch is now queued. You will be
                                  notified instantly if accepted.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                                  Your Coverage Pitch & Strategy
                                </label>
                                <textarea
                                  value={coverageNote}
                                  onChange={(e) =>
                                    setCoverageNote(e.target.value)
                                  }
                                  placeholder="Why should this seller choose you? Mention your local experience, nearby properties closed, how fast you can schedule an inspection..."
                                  className="w-full h-24 p-3 border-2 border-brand-black bg-white dark:bg-zinc-900 font-medium text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-teal resize-none"
                                />
                                <div className="flex justify-between items-center mt-1 text-[9px] font-mono uppercase">
                                  <span
                                    className={cn(
                                      "font-black",
                                      coverageNote.trim().length < 30
                                        ? "text-brand-red"
                                        : "text-emerald-500",
                                    )}
                                  >
                                    {coverageNote.trim().length} / 30 chars
                                    minimum
                                  </span>
                                  {user.kycStatus !== "Verified" && (
                                    <span className="text-brand-red font-black">
                                      KYC REQUIRED
                                    </span>
                                  )}
                                </div>
                              </div>

                              {user.kycStatus !== "Verified" && (
                                <div className="p-3 bg-brand-red/10 border-2 border-brand-red text-brand-red text-[11px] font-semibold flex items-center gap-2">
                                  <AlertCircle size={14} className="shrink-0" />
                                  <span>
                                    Complete KYC verification in your Profile to
                                    activate real-time bidding permissions.
                                  </span>
                                </div>
                              )}

                              <button
                                onClick={() => handleSubmitBid(req.id)}
                                disabled={
                                  isSubmittingBid ||
                                  coverageNote.trim().length < 30 ||
                                  user.kycStatus !== "Verified"
                                }
                                className={cn(
                                  "w-full text-center py-2 text-xs font-black uppercase tracking-widest border-2 border-brand-black transition-all",
                                  user.kycStatus === "Verified" &&
                                    coverageNote.trim().length >= 30
                                    ? "bg-brand-teal text-brand-black hover:bg-teal-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                                    : "bg-zinc-200 text-zinc-400 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 cursor-not-allowed",
                                )}
                              >
                                {isSubmittingBid
                                  ? "Transmitting Pitch..."
                                  : "SUBMIT PITCH & REGISTER LEAD"}
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------- SELLER VIEW -----------------
  if (isSeller) {
    const sellerListings = listingRequests.filter(
      (req) => req.status === "Agent Bidding",
    );

    const handleAcceptBid = async (listingId: string, bidId: string) => {
      const listing = listingRequests.find((r) => r.id === listingId);
      if (!listing || !listing.agentBids) return;

      const acceptedBid = listing.agentBids.find((b) => b.id === bidId);
      if (!acceptedBid) return;

      const updatedBids = listing.agentBids.map((b) => {
        if (b.id === bidId) {
          return { ...b, status: "Accepted" as const };
        } else {
          return { ...b, status: "Rejected" as const };
        }
      });

      await updateListingRequest(listingId, {
        assignedAgentId: acceptedBid.agentId,
        assignedAgentTier: acceptedBid.agentTier,
        status: "Inspection Scheduled",
        agentBids: updatedBids,
        lastUpdated: new Date().toISOString(),
      });
    };

    const handleDeclineBid = async (listingId: string, bidId: string) => {
      const listing = listingRequests.find((r) => r.id === listingId);
      if (!listing || !listing.agentBids) return;

      const updatedBids = listing.agentBids.map((b) => {
        if (b.id === bidId) {
          return { ...b, status: "Rejected" as const };
        }
        return b;
      });

      await updateListingRequest(listingId, {
        agentBids: updatedBids,
        lastUpdated: new Date().toISOString(),
      });
    };

    return (
      <div className="space-y-6 px-4 py-6" id="seller-bidding-view">
        {/* Mandate Lead Info */}
        <div className="brutalist-card-flat bg-brand-black text-white p-5 border-2 border-brand-black relative">
          <div className="absolute right-4 top-4 text-brand-teal mb-2">
            <Sparkles size={24} />
          </div>
          <h2 className="text-xl font-display font-black uppercase tracking-tight text-white mb-1">
            Seller Dispatch Dashboard
          </h2>
          <p className="text-xs text-zinc-300 leading-relaxed font-semibold max-w-xl">
            RealAgents operates a competitive bidding model. Qualified agents
            pitch to verify and inspect your listing before listing on the
            public marketplace. Choose the agent who fits your needs.
          </p>
        </div>

        {/* Listings in Agent Bidding Feed */}
        <div className="space-y-4" id="seller-listings-list">
          <h3 className="text-xs font-display font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <FileText size={14} className="text-zinc-400" />
            My Active Verification Leads ({sellerListings.length})
          </h3>

          {sellerListings.length === 0 ? (
            <div className="brutalist-card-flat bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 p-10 text-center flex flex-col items-center justify-center">
              <Sparkles size={32} className="text-zinc-300 mb-2" />
              <p className="text-xs font-display font-black text-zinc-500 uppercase tracking-widest">
                No properties in bidding status
              </p>
              <p className="text-[10px] text-zinc-400 max-w-xs mt-1">
                When you list a property and options are requested, the listing
                pipeline enters the agency verification phase. Set up a property
                to accept bids.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sellerListings.map((req) => {
                const bids = req.agentBids || [];
                // Filter and sort by Trust score descending
                const verifiedBids = bids
                  .filter((b) => b.agentTier === "Verified Professional")
                  .sort((a, b) => b.agentTrustScore - a.agentTrustScore);

                const platformBids = bids
                  .filter((b) => b.agentTier === "Platform Agent")
                  .sort((a, b) => b.agentTrustScore - a.agentTrustScore);

                const activeBidsCount = bids.filter(
                  (b) => b.status === "Pending",
                ).length;

                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm flex flex-col"
                  >
                    <div className="p-4 border-b-2 border-brand-black/10 dark:border-zinc-750 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-wider">
                            {req.type} • {req.location}
                          </span>
                          <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 text-[8px] font-mono font-black uppercase border border-amber-600">
                            AGENT BIDDING
                          </span>
                        </div>
                        <h4 className="text-base font-display font-black uppercase tracking-tight text-zinc-900 dark:text-white mt-0.5">
                          {req.title}
                        </h4>
                        <p className="text-xs font-mono font-black text-brand-teal mt-1">
                          {formatCurrency(req.price)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs font-display font-black uppercase text-zinc-500 tracking-wider">
                          {bids.length} agents pitched ({activeBidsCount} open)
                        </span>

                        <button
                          onClick={() =>
                            setReviewingId(
                              reviewingId === req.id ? null : req.id,
                            )
                          }
                          className={cn(
                            "px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-brand-black transition-all",
                            reviewingId === req.id
                              ? "bg-brand-black text-white"
                              : "bg-brand-teal text-brand-black hover:bg-teal-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
                          )}
                        >
                          {reviewingId === req.id
                            ? "Close Bids"
                            : "Review Bids"}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Bid Review Section */}
                    <AnimatePresence>
                      {reviewingId === req.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-zinc-50 dark:bg-zinc-950 p-5 border-t-2 border-brand-black space-y-6"
                        >
                          {bids.length === 0 ? (
                            <div className="py-6 text-center text-zinc-400 text-xs font-black uppercase tracking-widest">
                              No bids received on this mandate yet.
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* Tier 1: VERIFIED PROFESSIONALS Group */}
                              <div className="space-y-3">
                                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-brand-teal bg-brand-black px-2 py-1">
                                  <span>VERIFIED PROFESSIONALS</span>
                                  <span>TIER 1 PARTNERS</span>
                                </div>

                                {verifiedBids.length === 0 ? (
                                  <p className="text-[11px] text-zinc-400 italic py-2 pl-2">
                                    No Verified Professionals have bid yet.
                                  </p>
                                ) : (
                                  <div className="space-y-4">
                                    {verifiedBids.map((bid) => (
                                      <div
                                        key={bid.id}
                                        className={cn(
                                          "bg-white dark:bg-zinc-900 border-2 p-4 shadow-brutal-xs flex flex-col md:flex-row justify-between gap-4 relative overflow-hidden",
                                          bid.status === "Accepted"
                                            ? "border-emerald-500 ring-2 ring-emerald-500"
                                            : "border-brand-black dark:border-zinc-700",
                                        )}
                                      >
                                        <div className="space-y-3 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-display font-black uppercase text-sm text-zinc-900 dark:text-white">
                                              {bid.agentName}
                                            </span>
                                            {bid.agentVerified ? (
                                              <span className="bg-teal-50 text-brand-teal border border-brand-teal px-1.5 py-0.5 text-[8px] font-mono font-black uppercase flex items-center gap-1">
                                                <ShieldCheck size={10} />{" "}
                                                Verified •{" "}
                                                {bid.agentRegNumber ||
                                                  "Reg No. Verified"}
                                              </span>
                                            ) : (
                                              <span className="bg-amber-50 text-amber-700 border border-amber-600 px-1.5 py-0.5 text-[8px] font-mono font-black uppercase flex items-center gap-1">
                                                <ShieldAlert size={10} />{" "}
                                                Pending Verification
                                              </span>
                                            )}
                                            <span className="text-[9px] font-mono font-black uppercase text-zinc-400">
                                              {bid.distanceKm
                                                ? `${bid.distanceKm} km away`
                                                : "1.5 km away"}
                                            </span>
                                          </div>

                                          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 font-medium text-xs leading-relaxed border-l-2 border-brand-teal">
                                            <p className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 uppercase tracking-widest text-[9px] text-zinc-400">
                                              AGENT PITCH
                                            </p>
                                            <p className="italic text-zinc-800 dark:text-zinc-200">
                                              &ldquo;{bid.coverageNote}&rdquo;
                                            </p>
                                          </div>

                                          <div className="flex items-center gap-4 text-[10px] font-mono font-black uppercase">
                                            <div className="flex items-center gap-1 text-zinc-500">
                                              <Clock size={11} /> Submitted{" "}
                                              {getRelativeTime(bid.submittedAt)}
                                            </div>
                                            <div className="text-zinc-500">
                                              COMMISSION:{" "}
                                              <span className="text-brand-teal">
                                                5% PLATFORM RATE
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex flex-col items-end justify-between shrink-0 gap-4">
                                          <div className="bg-zinc-900 text-brand-teal p-3 border border-brand-teal shadow-brutal-xs text-center min-w-[130px]">
                                            <span className="text-[8px] font-black tracking-widest uppercase block text-zinc-400">
                                              TRUST SCORE
                                            </span>
                                            <span className="text-xl font-display font-black tracking-tight">
                                              {bid.agentTrustScore}
                                            </span>
                                          </div>

                                          {bid.status === "Accepted" ? (
                                            <div className="text-emerald-600 font-black uppercase tracking-wider text-xs flex items-center gap-1 text-right max-w-[200px]">
                                              <CheckCircle2 size={16} />{" "}
                                              Accepted — inspection scheduled
                                            </div>
                                          ) : bid.status === "Rejected" ? (
                                            <div className="text-zinc-400 font-black uppercase tracking-wider text-xs flex items-center gap-1">
                                              <X size={16} /> Declined
                                            </div>
                                          ) : req.assignedAgentId ? null : (
                                            <AcceptButtonWithCountdown
                                              bidWindowExpiresAt={req.bidWindowExpiresAt}
                                              onAccept={() => handleAcceptBid(req.id, bid.id)}
                                              declineButton={
                                                <button
                                                  onClick={() => handleDeclineBid(req.id, bid.id)}
                                                  className="px-3 py-1 bg-white hover:bg-red-50 text-brand-red border-2 border-brand-red text-[11px] font-black uppercase tracking-wider shadow-brutal-xs"
                                                >
                                                  Decline
                                                </button>
                                              }
                                            />
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Tier 2: PLATFORM AGENTS Group */}
                              <div className="space-y-3">
                                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-800 px-2 py-1">
                                  <span>PLATFORM AGENTS</span>
                                  <span>STANDARD TIER</span>
                                </div>

                                {platformBids.length === 0 ? (
                                  <p className="text-[11px] text-zinc-400 italic py-2 pl-2">
                                    No Platform Agents have bid yet.
                                  </p>
                                ) : (
                                  <div className="space-y-4">
                                    {platformBids.map((bid) => (
                                      <div
                                        key={bid.id}
                                        className={cn(
                                          "bg-white dark:bg-zinc-900 border-2 p-4 shadow-brutal-xs flex flex-col md:flex-row justify-between gap-4 relative overflow-hidden",
                                          bid.status === "Accepted"
                                            ? "border-emerald-500 ring-2 ring-emerald-500"
                                            : "border-brand-black dark:border-zinc-700",
                                        )}
                                      >
                                        <div className="space-y-3 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-display font-black uppercase text-sm text-zinc-900 dark:text-white">
                                              {bid.agentName}
                                            </span>
                                            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-400 px-1.5 py-0.5 text-[8px] font-mono font-black uppercase flex items-center gap-1">
                                              <Shield size={10} /> STANDARD TIER
                                            </span>
                                            <span className="text-[9px] font-mono font-black uppercase text-zinc-400">
                                              {bid.distanceKm
                                                ? `${bid.distanceKm} km away`
                                                : "3.2 km away"}
                                            </span>
                                          </div>

                                          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 font-medium text-xs leading-relaxed border-l-2 border-zinc-400">
                                            <p className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 uppercase tracking-widest text-[9px] text-zinc-400">
                                              AGENT PITCH
                                            </p>
                                            <p className="italic text-zinc-800 dark:text-zinc-200">
                                              &ldquo;{bid.coverageNote}&rdquo;
                                            </p>
                                          </div>

                                          <div className="flex items-center gap-4 text-[10px] font-mono font-black uppercase">
                                            <div className="flex items-center gap-1 text-zinc-500">
                                              <Clock size={11} /> Submitted{" "}
                                              {getRelativeTime(bid.submittedAt)}
                                            </div>
                                            <div className="text-zinc-500">
                                              COMMISSION:{" "}
                                              <span className="text-brand-teal">
                                                5% PLATFORM RATE
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex flex-col items-end justify-between shrink-0 gap-4">
                                          <div className="bg-zinc-900 text-zinc-400 p-3 border border-zinc-700 shadow-brutal-xs text-center min-w-[130px]">
                                            <span className="text-[8px] font-black tracking-widest uppercase block text-zinc-500">
                                              TRUST SCORE
                                            </span>
                                            <span className="text-xl font-display font-black tracking-tight text-zinc-100">
                                              {bid.agentTrustScore}
                                            </span>
                                          </div>

                                          {bid.status === "Accepted" ? (
                                            <div className="text-emerald-600 font-black uppercase tracking-wider text-xs flex items-center gap-1 text-right max-w-[200px]">
                                              <CheckCircle2 size={16} />{" "}
                                              Accepted — inspection scheduled
                                            </div>
                                          ) : bid.status === "Rejected" ? (
                                            <div className="text-zinc-400 font-black uppercase tracking-wider text-xs flex items-center gap-1">
                                              <X size={16} /> Declined
                                            </div>
                                          ) : req.assignedAgentId ? null : (
                                            <AcceptButtonWithCountdown
                                              bidWindowExpiresAt={req.bidWindowExpiresAt}
                                              onAccept={() => handleAcceptBid(req.id, bid.id)}
                                              declineButton={
                                                <button
                                                  onClick={() => handleDeclineBid(req.id, bid.id)}
                                                  className="px-3 py-1 bg-white hover:bg-red-50 text-brand-red border-2 border-brand-red text-[11px] font-black uppercase tracking-wider shadow-brutal-xs"
                                                >
                                                  Decline
                                                </button>
                                              }
                                            />
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Info note explaining score as equalizing metric */}
                              <div className="bg-zinc-900 border border-brand-teal/20 text-brand-gray p-4 font-normal text-[11px] leading-relaxed">
                                <span className="font-display font-black uppercase text-brand-teal tracking-widest block mb-1">
                                  PRO TIP FOR SELLERS
                                </span>
                                <p className="text-zinc-400">
                                  Trust Score reflects each agent's verified
                                  performance on the platform — number of
                                  listings closed, disclosure quality, and buyer
                                  feedback. A Platform Agent with a high Trust
                                  Score is often a stronger choice than a
                                  Verified Professional with a low one.
                                </p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback view if user has no role or is Buyer
  return (
    <div className="p-8 text-center max-w-sm mx-auto flex flex-col items-center justify-center min-h-[40vh]">
      <AlertCircle className="text-brand-red mb-2" size={32} />
      <h3 className="font-display font-black uppercase tracking-wider mx-auto">
        Access Denied
      </h3>
      <p className="text-xs text-zinc-500 mt-2">
        The Agent Bidding and verification desk is exclusively available to
        logged-in Sellers or licensed Agent accounts. Buyers navigate active
        listings on the Marketplace.
      </p>
    </div>
  );
}
