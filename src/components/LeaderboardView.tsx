import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Trophy, ArrowLeft, Award, Sparkles, Shield, Percent, Briefcase } from "lucide-react";
import { cn } from "../lib/utils";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface LeaderboardViewProps {
  onBack: () => void;
}

const MOCK_LEADER_AGENTS = [
  { id: 'agent-1', name: 'Chinedu Okafor', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chinedu', profileScore: 98, agentTier: 'Verified Professional', dealsClosedCount: 28, role: 'Agent', kycStatus: 'Verified' },
  { id: 'agent-2', name: 'Amina Bello', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amina', profileScore: 92, agentTier: 'Verified Professional', dealsClosedCount: 19, role: 'Agent', kycStatus: 'Verified' },
  { id: 'agent-3', name: 'Olumide Adebayo', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olumide', profileScore: 88, agentTier: 'Verified Professional', dealsClosedCount: 14, role: 'Agent', kycStatus: 'Verified' },
  { id: 'agent-4', name: 'Emeka Nwosu', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emeka', profileScore: 84, agentTier: 'Platform Agent', dealsClosedCount: 8, role: 'Agent', kycStatus: 'Verified' },
  { id: 'agent-5', name: 'Funmi Alao', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Funmi', profileScore: 81, agentTier: 'Platform Agent', dealsClosedCount: 6, role: 'Agent', kycStatus: 'Verified' },
];

export default function LeaderboardView({ onBack }: LeaderboardViewProps) {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAgents = async () => {
      try {
        if (!user) return;
        
        const isMockInstance = !db || user.isGuest || user.id === 'guest_local_user' || user.id === 'google_local_user' || user.id === 'facebook_local_user';
        if (isMockInstance) {
          const guestAgent = {
            id: user.id,
            name: user.name || 'You',
            avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
            profileScore: user.profileScore !== undefined ? user.profileScore : 50,
            agentTier: user.agentTier || 'Platform Agent',
            dealsClosedCount: user.dealsClosedCount || 0,
            role: 'Agent',
            kycStatus: user.kycStatus || 'Pending'
          };
          
          let combined = [...MOCK_LEADER_AGENTS];
          if (!combined.some(a => a.id === guestAgent.id)) {
            combined.push(guestAgent);
          } else {
            combined = combined.map(a => a.id === guestAgent.id ? { ...a, profileScore: guestAgent.profileScore, dealsClosedCount: guestAgent.dealsClosedCount, kycStatus: guestAgent.kycStatus } : a);
          }
          
          combined.sort((a, b) => (b.profileScore || 0) - (a.profileScore || 0));
          const ranked = combined.map((agent, i) => ({ ...agent, rank: i + 1 }));
          setAgents(ranked);
          setLoading(false);
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
            role: 'Agent',
            kycStatus: data.kycStatus || 'None'
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
            role: 'Agent',
            kycStatus: user.kycStatus || 'Verified'
          });
        }

        agentsList.sort((a, b) => b.profileScore - a.profileScore);

        const rankedAgents = agentsList.map((agent, index) => ({
          ...agent,
          rank: index + 1
        }));

        setAgents(rankedAgents);
        setLoading(false);
      } catch (err) {
        console.error("Error loading full leaderboard:", err);
        setAgents(MOCK_LEADER_AGENTS.map((a, i) => ({ ...a, rank: i + 1 })));
        setLoading(false);
      }
    };

    fetchAllAgents();
  }, [user]);

  return (
    <div className="space-y-6" id="full-leaderboard-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-black uppercase text-zinc-550 dark:text-zinc-400 hover:text-brand-black dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft size={16} />
            Back to Bids
          </button>
          <h2 className="text-2xl font-display font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Trophy className="text-amber-500 fill-amber-500 animate-pulse" size={24} />
            PARTNERSHIP RANKINGS
          </h2>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">
            Global standing, trust indexes, and unlocked platform rewards
          </p>
        </div>

        {/* Dynamic Trust Card Info popup */}
        <div className="bg-brand-black text-brand-teal p-3 border-2 border-brand-black text-xs font-bold uppercase tracking-wide flex items-center gap-2 max-w-sm rounded-none">
          <Award size={18} className="shrink-0" />
          <span>Scores of 80+ unlock direct leads. 90+ cuts fees to 3%.</span>
        </div>
      </div>

      {/* Trust Rules Index Panel (Editorial Grid block) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-xs">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={16} className="text-brand-teal" />
            <h4 className="font-display font-black text-xs uppercase text-zinc-800 dark:text-white">REWARDS FOR PERFORMANCE</h4>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed uppercase tracking-tight">
            Perform outstandingly to get lower commissions. Score ≥ 80 with 10 deals gets commission rate down to <strong>4%</strong>. Score ≥ 90 with 25 deals unlocks <strong>3%</strong> rate.
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-xs">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={16} className="text-brand-teal" />
            <h4 className="font-display font-black text-xs uppercase text-zinc-800 dark:text-white">SECURE ACCOUNT STATUS</h4>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed uppercase tracking-tight">
            Deals are processed securely via secure on-site bidding. Off-platform violations cut scores instantly by <strong>-50 points</strong> and can lead to platform suspension.
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-xs">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-brand-teal" />
            <h4 className="font-display font-black text-xs uppercase text-zinc-800 dark:text-white">TIER 1 HIGHLIGHTS</h4>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed uppercase tracking-tight">
            Verified Professionals wear the elite badge. Complete KYC verification and register a professional licence/agency number under profile to unlock Tier 1 priority rankings.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border-4 border-brand-black shadow-brutal-xs">
          <span className="text-sm font-display font-black uppercase text-zinc-500 animate-pulse tracking-widest block">
            CALCULATING SCORES ...
          </span>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm overflow-hidden rounded-none">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 bg-brand-black text-white px-6 py-3.5 text-xs font-black uppercase tracking-wider rounded-none">
            <div className="col-span-2">Rank</div>
            <div className="col-span-4">Agent Name</div>
            <div className="col-span-2 text-center">Tier</div>
            <div className="col-span-2 text-center">Trust Index</div>
            <div className="col-span-2 text-right">Closed Deals</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y-2 divide-zinc-200 dark:divide-zinc-800">
            {agents.map((agent, index) => {
              const isMe = agent.id === user?.id;
              return (
                <div
                  key={agent.id}
                  className={cn(
                    "grid grid-cols-12 gap-2 px-6 py-4 items-center text-xs font-bold transition-all",
                    isMe ? "bg-amber-500/10 dark:bg-brand-teal/10" : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  )}
                >
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className={cn(
                      "flex items-center justify-center w-6 h-6 border-2 border-brand-black font-black text-xs",
                      index === 0 ? "bg-amber-400 text-brand-black" :
                      index === 1 ? "bg-zinc-300 text-brand-black" :
                      index === 2 ? "bg-amber-600/60 text-white" :
                      "bg-white dark:bg-zinc-800 text-brand-black dark:text-gray-200"
                    )}>
                      {agent.rank}
                    </span>
                    {index === 0 && <Sparkles size={14} className="text-amber-500" />}
                  </div>

                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full border-2 border-brand-black overflow-hidden bg-brand-teal flex-shrink-0">
                      <img src={agent.avatarUrl} alt={agent.name} referrerPolicy="no-referrer" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-black text-sm uppercase truncate text-zinc-900 dark:text-white flex items-center gap-1">
                        {agent.name}
                        {isMe && <span className="bg-brand-teal text-brand-black px-1 text-[8px] font-mono font-bold tracking-tight uppercase">YOU</span>}
                      </p>
                      <p className="text-[9px] text-zinc-400 font-mono mt-0.5 truncate uppercase">
                        KYC Status: {agent.kycStatus === 'Verified' ? 'VERIFIED' : 'PENDING'}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2 text-center">
                    <span className={cn(
                      "px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border",
                      agent.agentTier === 'Verified Professional'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-850 dark:text-zinc-300'
                    )}>
                      {agent.agentTier === 'Verified Professional' ? 'Tier 1' : 'Tier 2'}
                    </span>
                  </div>

                  <div className="col-span-2 text-center font-display font-black text-sm text-brand-teal">
                    {agent.profileScore}%
                  </div>

                  <div className="col-span-2 text-right font-mono font-black text-sm text-zinc-800 dark:text-zinc-150 pr-4">
                    {agent.dealsClosedCount}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
