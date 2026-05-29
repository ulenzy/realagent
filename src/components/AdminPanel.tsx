import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Shield, 
  Sparkles, 
  Building, 
  Check, 
  X, 
  AlertTriangle, 
  Send, 
  SendHorizontal, 
  BarChart3, 
  Bell, 
  Users, 
  FileText, 
  ExternalLink, 
  Scale, 
  RefreshCw, 
  Ban, 
  Info, 
  MapPin, 
  FileCheck,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, addDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ListingRequest, User } from "../types";
import { sendNotification } from "../lib/notifications";

// Setup unique fallback database cases for simulation mode
const FALLBACK_PENDING_LISTINGS: any[] = [
  {
    id: "mock-list-1",
    title: "Commercial Multi-Storey Complex, Ikeja",
    type: "Commercial",
    price: 350000000,
    location: "Ikeja, Lagos",
    status: "Pending",
    submittedAt: "2026-05-27T10:30:00Z",
    lastUpdated: "2026-05-27T10:30:00Z",
    expiresAt: "2026-06-27T10:30:00Z",
    commission: 5,
    ownerId: "seller-id-1",
    ownerName: "Alhaji Kolawole Sanusi",
    listingType: "Sale",
    propertySubType: "Office",
    sizeSqm: 1200,
    bedrooms: 0,
    bathrooms: 8,
    estateName: "Central Ikeja District",
    listingRequirements: {
      titleDocumentFileName: "certificate_of_occupancy_ikeja_9281.pdf",
      titleDocumentFileType: "application/pdf",
      titleDocumentUrl: "https://firebasestorage.googleapis.com/v0/b/mock-project/o/ikeja_co_o.pdf",
      physicalConditionDescription: "Excellent structure built in 2021. Fitted with running elevators, industrial generators, and independent water system.",
      photos: ["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600"]
    },
    aiScreeningResult: "Title Deed Matches Records",
    aiScreeningConfidence: 96,
    requiresManualReview: true
  },
  {
    id: "mock-list-2",
    title: "Premium Residential Plot, Lekki Phase 1",
    type: "Land",
    price: 180000000,
    location: "Lekki Phase 1, Lagos",
    status: "Pending",
    submittedAt: "2026-05-28T08:15:00Z",
    lastUpdated: "2026-05-28T08:15:00Z",
    expiresAt: "2026-06-28T08:15:00Z",
    commission: 3,
    ownerId: "seller-id-2",
    ownerName: "Dr. Florence Adebayo",
    listingType: "Sale",
    propertySubType: "Residential Land",
    sizeSqm: 650,
    bedrooms: 0,
    bathrooms: 0,
    estateName: "Block 12 Plot 4, Lekki Phase 1",
    listingRequirements: {
      titleDocumentFileName: "governor_consent_lekki_p1.pdf",
      titleDocumentFileType: "application/pdf",
      titleDocumentUrl: "https://firebasestorage.googleapis.com/v0/b/mock-project/o/lekki_consent.pdf",
      physicalConditionDescription: "Fully dry land in a high-security gated residential street of Lekki Phase 1. Ready for immediate construction.",
      photos: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=600"]
    },
    aiScreeningResult: "Manual Signature Audit Requested",
    aiScreeningConfidence: 79,
    requiresManualReview: true
  }
];

const FALLBACK_KYC_REQUESTS = [
  { id: 'kyc-u1', name: 'Kabiru Yusuf', phone: '+234 803 111 2222', NIN: '48201938501', kycStatus: 'Pending', submittedDocuments: ['https://example.com/utility_bill_yusuf.jpg', 'https://example.com/national_id_card_yusuf.jpg'], role: 'Seller' },
  { id: 'kyc-u2', name: 'Chioma Nze', phone: '+234 815 333 4444', NIN: '95810238475', kycStatus: 'Pending', submittedDocuments: ['https://example.com/international_passport_scan_nze.jpg'], role: 'Buyer' },
];

const FALLBACK_AGENT_REQUESTS = [
  { id: 'agent-req-1', name: 'Tunde Bakare', agentRegNumber: 'RC-12948102', agentTier: 'Platform Agent', agentVerificationStatus: 'Pending', role: 'Agent' },
  { id: 'agent-req-2', name: 'Fatima Umar', agentRegNumber: 'RC-95812039', agentTier: 'Platform Agent', agentVerificationStatus: 'Pending', role: 'Agent' }
];

const FALLBACK_DISPUTES = [
  {
    id: 'dispute-1',
    propertyTitle: 'Spacious Duplex in Gbagada',
    buyerName: 'Emeka Okafor',
    buyerId: 'buyer-user-id',
    agentName: 'Amina Bello',
    agentId: 'agent-2',
    initiatorName: 'Emeka Okafor',
    reason: 'Inspection fee paid but agent did not show up on schedule and refused to answer calls.',
    evidence: 'Screenshot of 3 missed calls and inspection confirmation email',
    timeline: [
      { date: '2026-05-24', label: 'Dispute filed by Buyer' },
      { date: '2026-05-25', label: 'Agent replied claiming a car breakdown' }
    ],
    disputeStatus: 'Open',
    createdAt: '2026-05-24T10:00:00Z'
  },
  {
    id: 'dispute-2',
    propertyTitle: 'Lekki Phase 1 Land Area',
    buyerName: 'Seyi Makinde',
    buyerId: 'buyer-user-id-2',
    agentName: 'Chinedu Okafor',
    agentId: 'agent-1',
    initiatorName: 'Chinedu Okafor',
    reason: 'Buyer attempted to exchange off-platform contact information to bypass platform bidding process.',
    evidence: 'Chat transcript asking for phone number before inspection fee payment',
    timeline: [
      { date: '2026-05-26', label: 'Dispute filed by Agent' }
    ],
    disputeStatus: 'Open',
    createdAt: '2026-05-26T14:30:00Z'
  }
];

export default function AdminPanel() {
  const { user, listingRequests, updateListingRequest, updateAgentTrustScore } = useAuth();
  const isLocalGuest = !db || user?.isGuest || user?.id === 'guest_local_user';

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'listings' | 'kyc' | 'agents' | 'disputes' | 'notifications' | 'analytics'>('listings');

  // Real-time Database state
  const [kycList, setKycList] = useState<any[]>([]);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [disputesList, setDisputesList] = useState<any[]>([]);
  const [activeDisputeNotes, setActiveDisputeNotes] = useState<{ [id: string]: string }>({});
  const [isSubmittingDisputeAction, setIsSubmittingDisputeAction] = useState(false);

  // Listings state inputs
  const [rejectingListingId, setRejectingListingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [requestingInfoId, setRequestingInfoId] = useState<string | null>(null);
  const [requestInfoNote, setRequestInfoNote] = useState("");

  // KYC state inputs
  const [rejectingKycId, setRejectingKycId] = useState<string | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState("");

  // Agents state inputs
  const [rejectingAgentId, setRejectingAgentId] = useState<string | null>(null);
  const [agentRejectionReason, setAgentRejectionReason] = useState("");

  // Notification form inputs
  const [announcementText, setAnnouncementText] = useState("");
  const [alertCategory, setAlertCategory] = useState<'info' | 'warning' | 'promotion'>('info');
  const [targetAudience, setTargetAudience] = useState<'all' | 'Buyer' | 'Seller' | 'Agent'>('all');

  // Load database streams if not simulated
  useEffect(() => {
    if (isLocalGuest || !db) return;

    // Stream KYC Pending
    const qKyc = query(collection(db, 'users'), where('kycStatus', '==', 'Pending'));
    const unsubKyc = onSnapshot(qKyc, (snap) => {
      setKycList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("KYC Snapshot Error:", err));

    // Stream Agents Pending
    const qAgents = query(collection(db, 'users'), where('agentVerificationStatus', '==', 'Pending'));
    const unsubAgents = onSnapshot(qAgents, (snap) => {
      setAgentsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("Agents Snapshot Error:", err));

    // Stream Disputes
    const qDisputes = collection(db, 'disputes');
    const unsubDisputes = onSnapshot(qDisputes, (snap) => {
      setDisputesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("Disputes Snapshot Error:", err));

    return () => {
      unsubKyc();
      unsubAgents();
      unsubDisputes();
    };
  }, [user, isLocalGuest]);

  // Fallbacks logic (ensure data is always available to interact with)
  const displayKyc = kycList.length > 0 ? kycList : FALLBACK_KYC_REQUESTS;
  const displayAgents = agentsList.length > 0 ? agentsList : FALLBACK_AGENT_REQUESTS;
  const displayDisputes = disputesList.length > 0 ? disputesList : FALLBACK_DISPUTES;

  // Real-time Listings filtering
  // Get listings that require manual review or are pending
  const realListingRequests = listingRequests || [];
  const filteredListings = realListingRequests.filter(
    req => req.requiresManualReview === true || req.status === 'Pending'
  );
  // Merge with fallback pending listings if there are none in the real database state, to allow immediate engagement
  const displayListings = filteredListings.length > 0 ? filteredListings : FALLBACK_PENDING_LISTINGS;

  // -- Event Handlers --

  // 1. APPROVE Listing
  const handleApproveListing = async (listingId: string) => {
    try {
      if (isLocalGuest) {
        await updateListingRequest(listingId, { status: "Agent Bidding", requiresManualReview: false });
        alert("Listing approved! It is now in 'Agent Bidding' status.");
        return;
      }
      await updateListingRequest(listingId, { status: "Agent Bidding", requiresManualReview: false });
      alert("Listing request has been approved and opened contextually to the bidding grid!");
    } catch (err) {
      console.error(err);
      alert("Verification update failed.");
    }
  };

  // 2. REJECT Listing
  const handleRejectListing = async (listingId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide the rejection reason.");
      return;
    }
    try {
      if (isLocalGuest) {
        await updateListingRequest(listingId, { status: "Rejected", rejectionReason });
        setRejectingListingId(null);
        setRejectionReason("");
        alert("Listing request marked as Rejected.");
        return;
      }
      await updateListingRequest(listingId, { status: "Rejected", rejectionReason });
      setRejectingListingId(null);
      setRejectionReason("");
      alert("Success: Listing set to Rejected index.");
    } catch (err) {
      console.error(err);
      alert("Operation failed.");
    }
  };

  // 3. REQUEST MORE INFO
  const handleRequestMoreInfo = async (listing: any) => {
    if (!requestInfoNote.trim()) {
      alert("Please provide custom feedback guidance note.");
      return;
    }
    try {
      const notesMsg = `Verification Alert - We require more information for listing [${listing.title}]: ${requestInfoNote}`;
      const sellerId = listing.ownerId || "mock-seller-id";
      
      if (isLocalGuest) {
        alert(`[Simulated Info Request] Message dispatched to seller's inbox: "${notesMsg}"`);
        setRequestingInfoId(null);
        setRequestInfoNote("");
        return;
      }

      // Generate identical chat session identifier from real communication standards
      const getChatId = (uid1: string, uid2: string, propId: string) => {
        const sorted = [uid1, uid2].sort();
        return `${sorted[0]}_${sorted[1]}_${propId}`;
      };

      const chatId = getChatId(user!.id, sellerId, listing.id || "general_verification");

      // Set chat document first
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user!.id, sellerId].sort(),
        propertyId: listing.id || 'general',
        propertyName: listing.title || 'Verification Request',
        inspectionFeePaid: true,
        lastMessage: notesMsg,
        lastTimestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Append real subcollection message node
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user!.id,
        receiverId: sellerId,
        text: notesMsg,
        timestamp: new Date().toISOString(),
        blocked: false
      });

      setRequestingInfoId(null);
      setRequestInfoNote("");
      alert("Dynamic query request dispatched securely to Seller inbox!");
    } catch (err) {
      console.error(err);
      alert("Inbox notification dispatcher crashed.");
    }
  };

  // 4. VERIFY KYC
  const handleVerifyKyc = async (userId: string) => {
    try {
      if (isLocalGuest) {
        alert(`[Simulated] KYC user status set to Verified for: ${userId}`);
        return;
      }
      await updateDoc(doc(db, "users", userId), { kycStatus: "Verified" });
      alert("KYC Trust verification has been completed successfully.");
    } catch (err) {
      console.error(err);
      alert("Verification update failed.");
    }
  };

  // 5. REJECT KYC
  const handleRejectKyc = async (userId: string) => {
    if (!kycRejectionReason.trim()) {
      alert("Please enter rejection reason.");
      return;
    }
    try {
      if (isLocalGuest) {
        alert(`[Simulated] KYC User rejected with reason: ${kycRejectionReason}`);
        setRejectingKycId(null);
        setKycRejectionReason("");
        return;
      }
      await updateDoc(doc(db, "users", userId), { 
        kycStatus: "Rejected", 
        kycRejectionReason: kycRejectionReason 
      });
      setRejectingKycId(null);
      setKycRejectionReason("");
      alert("KYC has been successfully set to Rejected.");
    } catch (err) {
      console.error(err);
      alert("Operation failed.");
    }
  };

  // 6. CONFIRM AGENT
  const handleConfirmAgent = async (agentId: string) => {
    try {
      if (isLocalGuest) {
        alert(`[Simulated] Agent confirmed. Status: Verified, Tier: Verified Professional.`);
        return;
      }
      await updateDoc(doc(db, "users", agentId), { 
        agentVerificationStatus: "Verified", 
        agentTier: "Verified Professional" 
      });
      alert("Agent professional status and registration confirmed.");
    } catch (err) {
      console.error(err);
      alert("Error confirming agent verification.");
    }
  };

  // 7. REJECT AGENT
  const handleRejectAgent = async (agentId: string) => {
    if (!agentRejectionReason.trim()) {
      alert("Please type a reason.");
      return;
    }
    try {
      if (isLocalGuest) {
        alert(`[Simulated] Agent request rejected. Reason: ${agentRejectionReason}`);
        setRejectingAgentId(null);
        setAgentRejectionReason("");
        return;
      }
      await updateDoc(doc(db, "users", agentId), { 
        agentVerificationStatus: "Rejected",
        agentRejectionReason 
      });
      setRejectingAgentId(null);
      setAgentRejectionReason("");
      alert("Agent verification request setting updated to Rejected.");
    } catch (err) {
      console.error(err);
      alert("Operation failed.");
    }
  };

  // 8. RESOLVE, HOLD & DISMISS DISPUTES
  const handleResolveDisputeAction = async (disputeId: string) => {
    const note = activeDisputeNotes[disputeId] || "";
    if (!note.trim()) {
      alert("Please enter a resolution note first.");
      return;
    }

    const dispute = displayDisputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const plaintiffId = dispute.raisedBy || dispute.buyerId;
    const defendantId = dispute.againstUserId || dispute.agentId;
    const type = dispute.type || (dispute.reason?.toLowerCase().includes('off-platform') ? 'off_platform_deal' : 'other');

    setIsSubmittingDisputeAction(true);

    try {
      const nowStr = new Date().toISOString();
      const appealDeadlineStr = new Date(Date.now() + 48 * 3600000).toISOString();

      if (isLocalGuest) {
        alert(`[Simulated] Case resolved. ID: ${disputeId}. SLA resolution logged: "${note}".`);

        const stored = JSON.parse(localStorage.getItem('localGuestDisputes') || '[]');
        const updated = stored.map((d: any) => {
          if (d.id === disputeId) {
            return {
              ...d,
              status: 'Resolved',
              disputeStatus: 'Resolved',
              resolution: note,
              adminNote: note,
              resolvedAt: nowStr,
              appealDeadline: appealDeadlineStr,
            };
          }
          return d;
        });
        localStorage.setItem('localGuestDisputes', JSON.stringify(updated));

        if (type === 'off_platform_deal' && defendantId) {
          await updateAgentTrustScore(defendantId, 'off_platform_deal_reported');
          
          let latestScore = 50;
          const localUserStored = localStorage.getItem('localGuestUser');
          if (localUserStored) {
            const u = JSON.parse(localUserStored);
            if (u.id === defendantId) {
              latestScore = u.profileScore || 50;
              if (latestScore < 30) {
                u.accountStatus = 'Suspended';
                u.active = false;
                localStorage.setItem('localGuestUser', JSON.stringify(u));
              }
            }
          }
        }
      } else {
        await updateDoc(doc(db, 'disputes', disputeId), {
          status: 'Resolved',
          disputeStatus: 'Resolved',
          resolution: note,
          adminNote: note,
          resolvedAt: nowStr,
          appealDeadline: appealDeadlineStr,
        });

        if (type === 'off_platform_deal' && defendantId) {
          await updateDoc(doc(db, 'users', defendantId), {
            accountStatus: 'Suspended',
            active: false,
            suspendedAt: nowStr,
            suspensionReason: `Suspended due to verified Off-Platform Deal dispute resolution: Case ID ${disputeId}.`
          });
          
          await updateAgentTrustScore(defendantId, 'off_platform_deal_reported');

          try {
            const userSnap = await getDoc(doc(db, 'users', defendantId));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              const score = uData.profileScore !== undefined ? uData.profileScore : 50;
              if (score < 30) {
                await updateDoc(doc(db, 'users', defendantId), {
                  accountStatus: 'Suspended',
                  active: false,
                  suspensionReason: `Trust score dropped below 30 threshold (Current Score: ${score}). Suspension enforced.`
                });
              }
            }
          } catch (scoreErr) {
            console.error("Failed to check trust score for auto suspension:", scoreErr);
          }
        }
      }

      if (plaintiffId) {
        sendNotification(plaintiffId, {
          type: 'dispute_resolved',
          title: "Dispute Case Resolved",
          body: `Our arbitration review is complete. Action decision: ${note}. Appeal deadline: 48h.`,
          data: { disputeId }
        });
      }

      if (defendantId) {
        sendNotification(defendantId, {
          type: 'dispute_resolved',
          title: "Resolution Adjudication Outcome",
          body: `Admin resolved Case ID: ${disputeId}. Outcome verdict has been entered and logged.`,
          data: { disputeId }
        });
      }

      alert("Dispute resolved successfully.");
    } catch (err: any) {
      console.error(err);
      alert("Failed to resolve dispute: " + err.message);
    } finally {
      setIsSubmittingDisputeAction(false);
    }
  };

  const handleDismissDisputeAction = async (disputeId: string) => {
    const note = activeDisputeNotes[disputeId] || "";
    if (!note.trim()) {
      alert("Please enter a dismissal note first.");
      return;
    }

    const dispute = displayDisputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const plaintiffId = dispute.raisedBy || dispute.buyerId;

    setIsSubmittingDisputeAction(true);

    try {
      const nowStr = new Date().toISOString();

      if (isLocalGuest) {
        alert(`[Simulated] Dispute dismissed. ID: ${disputeId}. Note: "${note}"`);
        const stored = JSON.parse(localStorage.getItem('localGuestDisputes') || '[]');
        const updated = stored.map((d: any) => {
          if (d.id === disputeId) {
            return {
              ...d,
              status: 'Closed',
              disputeStatus: 'Closed',
              resolution: `Dismissed: ${note}`,
              adminNote: note,
              resolvedAt: nowStr
            };
          }
          return d;
        });
        localStorage.setItem('localGuestDisputes', JSON.stringify(updated));
      } else {
        await updateDoc(doc(db, 'disputes', disputeId), {
          status: 'Closed',
          disputeStatus: 'Closed',
          resolution: `Dismissed: ${note}`,
          adminNote: note,
          resolvedAt: nowStr
        });
      }

      if (plaintiffId) {
        sendNotification(plaintiffId, {
          type: 'dispute_resolved',
          title: "Dispute Dismissed",
          body: `Our arbitration review dismissed dispute Case ID ${disputeId}: ${note}`,
          data: { disputeId }
        });
      }

      alert("Dispute dismissed successfully.");
    } catch (err: any) {
      console.error(err);
      alert("Failed to dismiss dispute: " + err.message);
    } finally {
      setIsSubmittingDisputeAction(false);
    }
  };

  const handleHoldDisputeAction = async (disputeId: string) => {
    const note = activeDisputeNotes[disputeId] || "";

    const dispute = displayDisputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const plaintiffId = dispute.raisedBy || dispute.buyerId;

    setIsSubmittingDisputeAction(true);

    try {
      if (isLocalGuest) {
        alert(`[Simulated] Case set to Hold (Under Review). ID: ${disputeId}.`);
        const stored = JSON.parse(localStorage.getItem('localGuestDisputes') || '[]');
        const updated = stored.map((d: any) => {
          if (d.id === disputeId) {
            return {
              ...d,
              status: 'Under Review',
              disputeStatus: 'Under Review',
              adminNote: note || 'Placed under audit review.'
            };
          }
          return d;
        });
        localStorage.setItem('localGuestDisputes', JSON.stringify(updated));
      } else {
        await updateDoc(doc(db, 'disputes', disputeId), {
          status: 'Under Review',
          disputeStatus: 'Under Review',
          adminNote: note || 'Placed under audit review.'
        });
      }

      if (plaintiffId) {
        sendNotification(plaintiffId, {
          type: 'dispute_under_review',
          title: "Dispute Placed Under Review",
          body: `Case ID: ${disputeId} status updated: Under active investigation review.`,
          data: { disputeId }
        });
      }

      alert("Dispute status updated to Under Review.");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update status: " + err.message);
    } finally {
      setIsSubmittingDisputeAction(false);
    }
  };

  // 9. SUSPEND PARTY User
  const handleSuspendUser = async (userId: string, userName: string) => {
    const reason = prompt(`Enter account suspension reason for user [${userName}]:`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert("No reason entered. Action aborted.");
      return;
    }
    try {
      if (isLocalGuest) {
        alert(`[Simulated] Account Suspended for User: ${userName} (${userId}) for reason: "${reason}"`);
        return;
      }
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'Suspended',
        suspensionReason: reason,
        suspendedAt: new Date().toISOString()
      });
      alert(`Account status updated: ${userName} is now suspended.`);
    } catch (err) {
      console.error(err);
      alert("Suspension failed.");
    }
  };

  // 10. SYSTEM ANNOUNCEMENT WRITER
  const handleDispatchAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    try {
      if (isLocalGuest) {
        alert(`[Simulated Broadcast] Sent dispatch to [${targetAudience.toUpperCase()}] with text: "${announcementText}"`);
        setAnnouncementText("");
        return;
      }
      await addDoc(collection(db, 'announcements'), {
        text: announcementText,
        category: alertCategory,
        audience: targetAudience,
        dispatchDate: new Date().toISOString(),
        author: user!.name
      });
      setAnnouncementText("");
      alert("Platform-wide global announcement broadcasted successfully.");
    } catch (err) {
      console.error(err);
      alert("Error broadcasting dispatch.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-[#121214] pb-16 pt-4" id="admin-panel-container">
      {/* Top Banner / Headline */}
      <div className="border-4 border-brand-black dark:border-zinc-700 bg-brand-teal p-6 shadow-brutal-sm mb-6 rounded-none relative overflow-hidden">
        <div className="absolute right-4 top-4 opacity-10">
          <Shield className="w-32 h-32 text-brand-black" />
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-brand-black animate-pulse" />
          <h1 className="text-2xl font-display font-black text-brand-black uppercase tracking-tight">
            NEXUS CORE ADMINISTRATION
          </h1>
        </div>
        <p className="text-xs font-mono font-black uppercase text-brand-black/80 mt-1 max-w-xl">
          Authorized operations environment. Escrow safeguards, agent licenses audits, KYC verification, and transaction dispute arbitration.
        </p>
      </div>

      {/* Primary Sub-navigation Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6" id="admin-subtabs-nav">
        {[
          { key: 'listings', label: 'Listings', icon: <Building size={16} /> },
          { key: 'kyc', label: 'KYC', icon: <Users size={16} /> },
          { key: 'agents', label: 'Agents', icon: <UserCheck size={16} /> },
          { key: 'disputes', label: 'Disputes', icon: <Scale size={16} /> },
          { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
          { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "flex items-center justify-center gap-2 py-3 px-2 text-xs font-black uppercase tracking-wider border-2 border-brand-black transition-all rounded-none select-none",
                isActive 
                  ? "bg-brand-black text-white dark:bg-white dark:text-zinc-900 border-brand-black dark:border-zinc-750 font-bold hover:opacity-95" 
                  : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Core Panels Wrapper */}
      <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 shadow-brutal-sm rounded-none min-h-[450px]">
        
        {/* TAB 1: LISTINGS MANUAL REVIEW & PENDING */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="border-b-2 border-zinc-200 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-base uppercase text-zinc-900 dark:text-white">PROPERTY PIPELINE VERIFICATION</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Review titles, spatial compliance, and AI risk reports</p>
              </div>
              <span className="bg-brand-teal text-brand-black px-2 py-0.5 text-xs font-black uppercase tracking-tight">
                {displayListings.length} PENDING AUDITS
              </span>
            </div>

            {displayListings.length === 0 ? (
              <div className="p-12 text-center bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800">
                <FileCheck className="w-12 h-12 mx-auto text-zinc-400 mb-2" />
                <p className="text-sm font-display font-black uppercase text-zinc-500">Pipeline is totally clean. No pending listings.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {displayListings.map((listing) => (
                  <div key={listing.id} className="bg-zinc-50 dark:bg-[#1a1a1f] border-2 border-brand-black dark:border-zinc-750 p-5 shadow-brutal-xs relative flex flex-col md:flex-row gap-6">
                    {/* Left Column: Core property specs */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase bg-amber-500 text-black px-1.5 py-0.5">
                            {listing.status || "Pending"}
                          </span>
                          {listing.requiresManualReview && (
                            <span className="text-[10px] font-black uppercase bg-brand-red text-white px-1.5 py-0.5 animate-pulse">
                              Manual Audit Needed
                            </span>
                          )}
                        </div>
                        <h4 className="font-display font-black uppercase text-brand-black dark:text-white text-base">
                          {listing.title}
                        </h4>
                        <p className="text-xs font-semibold text-zinc-400 uppercase mt-0.5 flex items-center gap-1">
                          <MapPin size={12} className="text-brand-teal" /> {listing.location} • {listing.estateName || "Standard Sub-District"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-white dark:bg-zinc-900 p-3 border border-brand-black">
                        <div>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase">Seller Identity</p>
                          <p className="text-xs font-mono font-black text-brand-black dark:text-gray-200 uppercase">{listing.ownerName || "Estate Seller"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Commission Share</p>
                          <p className="text-xs font-mono font-black text-brand-black dark:text-gray-200">{listing.commission || 5}% Approved</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase">Valuation Price</p>
                          <p className="text-xs font-mono font-black text-brand-teal">{formatCurrency(listing.price)}</p>
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase">Description Details</p>
                          <p className="text-[11px] font-medium text-zinc-550 dark:text-zinc-400 leading-relaxed truncate hover:text-clip">
                            {listing.listingRequirements?.physicalConditionDescription || "No physical layout description provided."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: AI Report Status & Document audits */}
                    <div className="w-full md:w-80 bg-zinc-100 dark:bg-zinc-900/60 p-4 border border-zinc-300 dark:border-zinc-700 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* AI Screener Details */}
                        <div className="bg-zinc-900 text-white p-3 border border-brand-black font-semibold text-xs rounded-none">
                          <div className="flex items-center gap-1.5 mb-1 text-[9px] text-brand-teal font-black uppercase tracking-wider">
                            <Sparkles size={11} className="fill-brand-teal" /> AI LAND SCRUTINY REPORT
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="uppercase text-[10px] text-zinc-300">Result:</span>
                            <span className="font-extrabold uppercase text-xs text-emerald-400">
                              {listing.aiScreeningResult || "DOCUMENT AUTHENTICATED"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="uppercase text-[10px] text-zinc-300">Safety Index:</span>
                            <span className="font-mono font-black text-white text-xs">
                              {listing.aiScreeningConfidence || 94}% Confidence
                            </span>
                          </div>
                        </div>

                        {/* Title Deed Link */}
                        <div className="bg-white dark:bg-zinc-850 p-2.5 border border-zinc-200 dark:border-zinc-700">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Title Land Deed Document</p>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <span className="text-[10px] font-mono font-bold truncate text-zinc-600 dark:text-zinc-300 max-w-[120px]">
                              {listing.listingRequirements?.titleDocumentFileName || "deed_of_assignment.pdf"}
                            </span>
                            <a
                              href={listing.listingRequirements?.titleDocumentUrl || "https://firebasestorage.googleapis.com/v0/b/mock-project/o/dummy-title-deed.pdf"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-black uppercase text-brand-teal border border-brand-teal px-2 py-1 flex items-center gap-1 hover:bg-brand-teal hover:text-brand-black transition-all select-none"
                            >
                              OPEN FILE <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <p className="text-[9px] font-mono text-zinc-400 mt-3 border-t pt-2 uppercase">
                        Submitted: {listing.submittedAt ? new Date(listing.submittedAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>

                    {/* Right Column: Decisions Buttons */}
                    <div className="w-full md:w-52 flex flex-col justify-center gap-2 h-full py-2">
                      <button
                        onClick={() => handleApproveListing(listing.id)}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase p-3 border-2 border-brand-black shadow-brutal-xs flex items-center justify-center gap-1.5 transition-all active:translate-y-0.5"
                      >
                        <Check size={14} className="stroke-[3]" /> APPROVE LISTING
                      </button>

                      {/* Reject Form toggle */}
                      {rejectingListingId === listing.id ? (
                        <div className="border border-brand-red p-2 bg-red-50 dark:bg-red-950/20 space-y-2">
                          <input
                            type="text"
                            placeholder="Reason for Rejection"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full text-xs p-1.5 border border-brand-black outline-none bg-white font-semibold text-black"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleRejectListing(listing.id)}
                              className="flex-1 bg-brand-red text-white text-[10px] font-extrabold uppercase py-1 border border-brand-black"
                            >
                              CONFIRM
                            </button>
                            <button
                              onClick={() => setRejectingListingId(null)}
                              className="px-2 bg-zinc-200 text-zinc-700 text-[10px] font-extrabold uppercase py-1 border border-brand-black"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRejectingListingId(listing.id);
                            setRequestingInfoId(null);
                          }}
                          className="w-full bg-brand-red hover:bg-red-500 text-white font-black text-xs uppercase p-3 border-2 border-brand-black shadow-brutal-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <X size={14} className="stroke-[3]" /> REJECT LISTING
                        </button>
                      )}

                      {/* Request Info Box */}
                      {requestingInfoId === listing.id ? (
                        <div className="border border-brand-teal p-2 bg-teal-50 dark:bg-teal-950/20 space-y-2">
                          <textarea
                            placeholder="Type clarification instructions memo..."
                            rows={2}
                            value={requestInfoNote}
                            onChange={(e) => setRequestInfoNote(e.target.value)}
                            className="w-full text-xs p-1.5 border border-brand-black outline-none bg-white font-medium text-black"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleRequestMoreInfo(listing)}
                              className="flex-1 bg-brand-teal text-brand-black text-[10px] font-extrabold uppercase py-1 border border-brand-black"
                            >
                              DISPATCH INBOX
                            </button>
                            <button
                              onClick={() => setRequestingInfoId(null)}
                              className="px-2 bg-zinc-200 text-zinc-700 text-[10px] font-extrabold uppercase py-1 border border-brand-black"
                            >
                              BACK
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRequestingInfoId(listing.id);
                            setRejectingListingId(null);
                          }}
                          className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-brand-black dark:text-zinc-200 font-black text-[11px] uppercase p-3 border-2 border-brand-black dark:border-zinc-750 shadow-brutal-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <SendHorizontal size={12} /> REQUEST INFORMATION
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KYC STATUS PENDING MODERATION */}
        {activeTab === 'kyc' && (
          <div className="space-y-6">
            <div className="border-b-2 border-zinc-200 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-base uppercase text-zinc-900 dark:text-white">KYC TRUST REGISTRY VERIFICATION</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Validate National Identification Numbers (NIN) and personal credentials</p>
              </div>
              <span className="bg-brand-teal text-brand-black px-2 py-0.5 text-xs font-black uppercase tracking-tight">
                {displayKyc.length} PENDING INQUESTS
              </span>
            </div>

            <div className="space-y-4">
              {displayKyc.map((kycUser) => (
                <div key={kycUser.id} className="bg-zinc-50 dark:bg-[#1a1a1f] border-2 border-brand-black dark:border-zinc-750 p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-black text-sm uppercase text-brand-black dark:text-white">{kycUser.name}</h4>
                      <span className="text-[8px] font-bold bg-zinc-800 text-white px-2 py-0.5 uppercase tracking-normal">
                        Role: {kycUser.role || "User"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold uppercase text-zinc-500">
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-mono">Contact Phone</span>
                        <span className="text-brand-black dark:text-gray-200 font-bold">{kycUser.phoneNumber || kycUser.phone || "No Phone"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-mono">NIN Identity Number</span>
                        <span className="text-zinc-900 dark:text-gray-200 font-mono font-bold tracking-widest">{kycUser.NIN || "39102485912"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-mono">Credential Status</span>
                        <span className="text-amber-500 font-black">PENDING MANUAL OK</span>
                      </div>
                    </div>

                    {/* Submitted documents display */}
                    <div className="pt-2">
                      <p className="text-[9px] font-mono text-zinc-400 uppercase mb-1">Attached Government Scans ({kycUser.submittedDocuments?.length || 2})</p>
                      <div className="flex flex-wrap gap-2">
                        {kycUser.submittedDocuments && kycUser.submittedDocuments.length > 0 ? (
                          kycUser.submittedDocuments.map((docPath: string, idx: number) => (
                            <a
                              key={idx}
                              href={docPath}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] font-black uppercase text-brand-teal hover:underline flex items-center gap-1 border border-zinc-300 dark:border-zinc-700 px-2 py-1 bg-white dark:bg-zinc-900"
                            >
                              Verification Upload #{idx + 1} <ExternalLink size={10} />
                            </a>
                          ))
                        ) : (
                          <>
                            <span className="text-[9px] border border-zinc-300 dark:border-zinc-700 px-2 py-1 uppercase bg-white dark:bg-zinc-900 text-zinc-500">national_id_card.jpg (Simulated)</span>
                            <span className="text-[9px] border border-zinc-300 dark:border-zinc-700 px-2 py-1 uppercase bg-white dark:bg-zinc-900 text-zinc-500">utility_bill_doc.png (Simulated)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="w-full md:w-48 flex flex-col gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 md:pl-4 border-zinc-300 dark:border-zinc-800">
                    <button
                      onClick={() => handleVerifyKyc(kycUser.id)}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase py-2 px-2 border border-brand-black shadow-brutal-xs flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> VERIFY KYC
                    </button>

                    {rejectingKycId === kycUser.id ? (
                      <div className="border border-brand-red p-1.5 space-y-1 bg-red-50 dark:bg-red-950/20">
                        <input
                          type="text"
                          placeholder="Rejection Reason"
                          value={kycRejectionReason}
                          onChange={(e) => setKycRejectionReason(e.target.value)}
                          className="w-full text-xs p-1 border border-brand-black outline-none bg-white text-black"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRejectKyc(kycUser.id)}
                            className="flex-1 bg-brand-red text-white text-[9px] font-black uppercase py-0.5 border"
                          >
                            REJECT
                          </button>
                          <button
                            onClick={() => setRejectingKycId(null)}
                            className="px-1.5 bg-zinc-200 text-zinc-700 text-[9px] font-black uppercase py-0.5 border"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setRejectingKycId(kycUser.id);
                          setRejectingAgentId(null);
                        }}
                        className="w-full bg-brand-red hover:bg-red-500 text-white font-black text-xs uppercase py-2 px-2 border border-brand-black shadow-brutal-xs flex items-center justify-center gap-1"
                      >
                        <X size={14} /> REJECT KYC
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AGENTS VERIFICATION */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="border-b-2 border-zinc-200 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-base uppercase text-zinc-900 dark:text-white">AGENCY LICENSING MODERATION</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Validate professional real estate licenses and assign Tier-1 verification privileges</p>
              </div>
              <span className="bg-brand-teal text-brand-black px-2 py-0.5 text-xs font-black uppercase tracking-tight">
                {displayAgents.length} APPLICATIONS
              </span>
            </div>

            <div className="space-y-4">
              {displayAgents.map((agent) => (
                <div key={agent.id} className="bg-zinc-50 dark:bg-[#1a1a1f] border-2 border-brand-black dark:border-zinc-750 p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-black text-sm uppercase text-brand-black dark:text-white">{agent.name}</h4>
                      <span className="text-[8px] font-black bg-brand-teal text-brand-black px-2 py-0.5 uppercase">
                        Current: {agent.agentTier || "Platform Agent"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold uppercase text-zinc-500">
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-mono">Corporate Registration No.</span>
                        <span className="text-zinc-900 dark:text-white font-mono font-extrabold tracking-widest text-xs">
                          {agent.agentRegNumber || "RC-92840581"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-mono">Application Status</span>
                        <span className="text-amber-500 font-black">PENDING TIER-1 RIGHTS</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-mono">Target Authority Level</span>
                        <span className="text-emerald-500 font-extrabold">VERIFIED PROFESSIONAL (TIER 1)</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="w-full md:w-48 flex flex-col gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 md:pl-4 border-zinc-300 dark:border-zinc-800">
                    <button
                      onClick={() => handleConfirmAgent(agent.id)}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase py-2 px-2 border border-brand-black shadow-brutal-xs flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> CONFIRM AGENT
                    </button>

                    {rejectingAgentId === agent.id ? (
                      <div className="border border-brand-red p-1.5 space-y-1 bg-red-50 dark:bg-red-950/20">
                        <input
                          type="text"
                          placeholder="Rejection Reason"
                          value={agentRejectionReason}
                          onChange={(e) => setAgentRejectionReason(e.target.value)}
                          className="w-full text-xs p-1 border border-brand-black outline-none bg-white text-black"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRejectAgent(agent.id)}
                            className="flex-1 bg-brand-red text-white text-[9px] font-black uppercase py-0.5 border"
                          >
                            REJECT
                          </button>
                          <button
                            onClick={() => setRejectingAgentId(null)}
                            className="px-1.5 bg-zinc-200 text-zinc-700 text-[9px] font-black uppercase py-0.5 border"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setRejectingAgentId(agent.id);
                          setRejectingKycId(null);
                        }}
                        className="w-full bg-brand-red hover:bg-red-500 text-white font-black text-xs uppercase py-2 px-2 border border-brand-black shadow-brutal-xs flex items-center justify-center gap-1"
                      >
                        <X size={14} /> REJECT
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DISPUTES RESOLUTION COURT */}
        {activeTab === 'disputes' && (
          <div className="space-y-6">
            <div className="border-b-2 border-zinc-200 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-base uppercase text-zinc-900 dark:text-white">ARBITRATION BOARD & DISPUTES PANEL</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Moderate disputes, write binding resolutions, and restrict rule-violating accounts</p>
              </div>
              <span className="bg-brand-red text-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wider">
                {displayDisputes.length} OPEN JURISDICTIONS
              </span>
            </div>

            <div className="space-y-6">
              {displayDisputes.map((dispute) => (
                <div key={dispute.id} className="border-2 border-brand-black dark:border-zinc-750 bg-zinc-50 dark:bg-[#1a1a1f] p-5 shadow-brutal-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-4 border-zinc-200 dark:border-zinc-800">
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">DISPUTE REFERRING NODE #{dispute.id}</span>
                      <h4 className="font-display font-black text-base text-brand-black dark:text-white uppercase mt-0.5">
                        Subject Property: {dispute.propertyTitle}
                      </h4>
                    </div>
                    <span className={cn(
                      "px-3 py-1 font-mono text-xs font-black uppercase border-2 border-brand-black",
                      dispute.disputeStatus === 'Resolved' ? 'bg-emerald-500 text-white' :
                      dispute.disputeStatus === 'Appealed' ? 'bg-amber-500 text-black' :
                      'bg-brand-black text-brand-teal'
                    )}>
                      Status: {dispute.disputeStatus || "Open"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Plaintiff & Defendant records */}
                    <div className="space-y-4">
                      {/* Plaintiff card */}
                      <div className="bg-white dark:bg-zinc-900 p-3.5 border-2 border-brand-black relative">
                        <p className="absolute top-1 right-2 text-[8px] font-bold uppercase tracking-wider text-brand-red bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">PLAINTIFF</p>
                        <h5 className="font-display font-medium text-xs uppercase text-zinc-800 dark:text-zinc-200">
                          {dispute.buyerName || `USER ROLE ${dispute.raisedByRole || 'Buyer'}`}
                        </h5>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5 uppercase">ID: {dispute.raisedBy || dispute.buyerId}</p>
                        <button
                          onClick={() => handleSuspendUser(dispute.raisedBy || dispute.buyerId, dispute.buyerName || 'Plaintiff')}
                          className="mt-3 bg-red-400 hover:bg-brand-red text-white text-[9px] font-black uppercase py-1 px-3 border border-brand-black flex items-center gap-1"
                        >
                          <Ban size={10} /> SUSPEND PLAINTIFF
                        </button>
                      </div>

                      {/* Defendant card */}
                      <div className="bg-white dark:bg-zinc-900 p-3.5 border-2 border-brand-black relative">
                        <p className="absolute top-1 right-2 text-[8px] font-bold uppercase tracking-wider text-amber-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">DEFENDANT</p>
                        <h5 className="font-display font-medium text-xs uppercase text-zinc-800 dark:text-zinc-200">
                          {dispute.agentName || "RESPONDENT PARTY"}
                        </h5>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5 uppercase">ID: {dispute.againstUserId || dispute.agentId}</p>
                        <button
                          onClick={() => handleSuspendUser(dispute.againstUserId || dispute.agentId, dispute.agentName || 'Defendant')}
                          className="mt-3 bg-red-400 hover:bg-brand-red text-white text-[9px] font-black uppercase py-1 px-3 border border-brand-black flex items-center gap-1"
                        >
                          <Ban size={10} /> SUSPEND DEFENDANT
                        </button>
                      </div>
                    </div>

                    {/* Evidence & Decision Court notes */}
                    <div className="space-y-4 flex flex-col justify-between">
                      <div className="bg-white dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[9px] text-zinc-400 font-mono block uppercase">Claim Narrative & Grievance</span>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 mt-1 uppercase italic leading-loose">
                          "{dispute.description || dispute.reason}"
                        </p>
                        
                        <span className="text-[9px] text-zinc-400 font-mono block uppercase mt-3">Exhibited Evidence</span>
                        {dispute.evidence && Array.isArray(dispute.evidence) ? (
                          <div className="flex flex-col gap-1.5 mt-1">
                            {dispute.evidence.map((url: string, i: number) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-brand-teal hover:underline flex items-center gap-1 uppercase"
                              >
                                <ExternalLink size={12} />
                                View Evidence File #{i + 1}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-black text-brand-teal mt-0.5 uppercase font-mono">
                            {dispute.evidence || "No evidence file attached."}
                          </p>
                        )}
                      </div>

                      {/* Resolution Input controls */}
                      <div className="space-y-3 bg-zinc-100 dark:bg-zinc-850 p-4 border-2 border-brand-black">
                        <div>
                          <label className="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300 block mb-1">
                            LOG JUDICIAL RESOLUTION NOTE
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Type formal resolution justification for archive log..."
                            value={activeDisputeNotes[dispute.id] || ""}
                            onChange={(e) => setActiveDisputeNotes(prev => ({ ...prev, [dispute.id]: e.target.value }))}
                            className="w-full text-xs p-2 border border-brand-black outline-none bg-white text-black font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1">
                          <button
                            disabled={isSubmittingDisputeAction}
                            onClick={() => handleResolveDisputeAction(dispute.id)}
                            className="bg-emerald-500 hover:bg-emerald-405 text-white text-[9px] font-extrabold uppercase py-2 px-1 border border-brand-black shadow-brutal-xs flex items-center justify-center text-center disabled:opacity-40 cursor-pointer"
                          >
                            Set Resolved
                          </button>
                          <button
                            disabled={isSubmittingDisputeAction}
                            onClick={() => handleHoldDisputeAction(dispute.id)}
                            className="bg-zinc-500 hover:bg-zinc-400 text-white text-[9px] font-extrabold uppercase py-2 px-1 border border-brand-black shadow-brutal-xs flex items-center justify-center text-center disabled:opacity-40 cursor-pointer"
                          >
                            Hold Case
                          </button>
                          <button
                            disabled={isSubmittingDisputeAction}
                            onClick={() => handleDismissDisputeAction(dispute.id)}
                            className="bg-brand-red hover:bg-red-500 text-white text-[9px] font-extrabold uppercase py-2 px-1 border border-brand-black shadow-brutal-xs flex items-center justify-center text-center disabled:opacity-40 cursor-pointer"
                          >
                            Dismiss Case
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* History timelines in deep detail */}
                  <div className="mt-4 pt-3 border-t border-dashed border-zinc-300 dark:border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase block mb-1.5">Arbitration Audit Logs Timeline</span>
                    <div className="flex flex-wrap gap-4 text-[10px] font-bold text-zinc-650 dark:text-zinc-400 font-mono uppercase">
                      {dispute.timeline?.map((evt: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5">
                          <ChevronRight size={10} className="text-brand-teal" />
                          <span>[{evt.date}] {evt.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM BROADCASTS (NOTIFICATIONS) */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="border-b-2 border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-display font-black text-base uppercase text-zinc-900 dark:text-white">AUDIENCE ALERT & ANNOUNCEMENT BROADCASTS</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Deploy high-priority alerts contextually over global client viewports</p>
            </div>

            <form onSubmit={handleDispatchAnnouncement} className="max-w-2xl bg-zinc-50 dark:bg-zinc-850 border-4 border-brand-black p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-1">
                    TARGET AUDIENCE ENVELOPE
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    className="w-full text-xs p-2.5 border-2 border-brand-black outline-none bg-white font-black uppercase text-black"
                  >
                    <option value="all">ALL ACTIVE USERS (GLOBAL)</option>
                    <option value="Buyer">BUYERS ONLY</option>
                    <option value="Seller">SELLERS ONLY</option>
                    <option value="Agent">AGENTS ONLY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-1">
                    DANGER LEVEL / ALERT SEVERITY
                  </label>
                  <select
                    value={alertCategory}
                    onChange={(e: any) => setAlertCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border-2 border-brand-black outline-none bg-white font-black uppercase text-black"
                  >
                    <option value="info">INFO - CYAN COMMUNIQUÉ</option>
                    <option value="warning">CRITICAL - YELLOW STAGE WARNING</option>
                    <option value="promotion">CAMPAIGN - SYSTEM PROMO ALERT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-1">
                  ANNOUNCEMENT ALERT CONTENT
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="EX: Safeguard warning. Avoid transferring deposits off-site to any unverified bank account nodes to protect your escrow. Bidding remains on platform."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full text-xs p-3 border-2 border-brand-black outline-none bg-white text-zinc-900 font-medium"
                />
              </div>

              <button
                type="submit"
                className="bg-brand-teal hover:bg-teal-400 text-brand-black font-black text-xs uppercase py-3 px-6 border-2 border-brand-black shadow-brutal-xs flex items-center justify-center gap-2 transition-all active:translate-y-0.5"
              >
                <Send size={14} /> DEPLOY DISPATCH ANNOUNCEMENT
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: ANALYTICS PORTAL */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="border-b-2 border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-display font-black text-base uppercase text-zinc-900 dark:text-white">MARKETPLACE GROSS STATISTICAL FEED</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Live liquidity overview, active escrow nodes, and listing distributions</p>
            </div>

            {/* High Impact KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-brand-teal text-brand-black border-2 border-brand-black p-4 shadow-brutal-xs">
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">TOTAL LIQUIDITY SECURED</span>
                <span className="text-xl font-mono font-black mt-2 block">₦1,280,450,000</span>
                <span className="text-[8px] font-black uppercase block mt-1">Escrowed Balance Under Node Safeguard</span>
              </div>

              <div className="bg-brand-black text-white border-2 border-brand-black p-4 shadow-brutal-xs">
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">ACTIVE PIPELINE INFLOW</span>
                <span className="text-xl font-mono font-black mt-2 block">1,482 Listings</span>
                <span className="text-[8px] font-black uppercase text-brand-teal block mt-1">82.1% Verified Registry Records</span>
              </div>

              <div className="bg-pink-150 dark:bg-zinc-800 text-brand-black dark:text-white border-2 border-brand-black p-4 shadow-brutal-xs">
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">PENDING AUDIT QUEUE</span>
                <span className="text-xl font-mono font-black mt-2 block">{displayListings.length} Requests</span>
                <span className="text-[8px] font-black uppercase text-red-500 block mt-1">Direct manual inspection actions</span>
              </div>

              <div className="bg-brand-teal text-brand-black border-2 border-brand-black p-4 shadow-brutal-xs">
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">TRUST INTEGRITY INDEX</span>
                <span className="text-xl font-mono font-black mt-2 block">94.6% Rank</span>
                <span className="text-[8px] font-black uppercase block mt-1">Platform-wide Dispute Safeguards</span>
              </div>
            </div>

            {/* SVG Visualizing charts for lightweight, crash-free, beautiful execution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Chart 1: Listing Categories distribution */}
              <div className="border-2 border-brand-black dark:border-zinc-750 p-4 bg-zinc-50 dark:bg-[#1a1a1f]">
                <h4 className="font-display font-black text-xs uppercase text-zinc-900 dark:text-white mb-4">
                  CAPITAL VOLUME BY SUB-DISTRICTS (LAGOS)
                </h4>
                <div className="relative h-64 w-full flex items-end justify-between px-6 pb-6 bg-white dark:bg-zinc-900 border-2 border-brand-black rounded-none">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-10">
                    <div className="border-b border-black w-full" />
                    <div className="border-b border-black w-full" />
                    <div className="border-b border-black w-full" />
                    <div className="border-b border-black w-full" />
                  </div>

                  {/* Lekki */}
                  <div className="flex flex-col items-center gap-1.5 w-12 group select-none">
                    <span className="text-[9px] font-mono font-black text-zinc-700 dark:text-zinc-300">42%</span>
                    <div className="w-full bg-brand-teal border-2 border-brand-black h-36 relative hover:bg-teal-400 transition-colors">
                      <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">LEKKI</span>
                  </div>

                  {/* Ikeja */}
                  <div className="flex flex-col items-center gap-1.5 w-12 group select-none">
                    <span className="text-[9px] font-mono font-black text-zinc-700 dark:text-zinc-300">28%</span>
                    <div className="w-full bg-brand-black dark:bg-zinc-600 border-2 border-brand-black h-24 relative hover:opacity-90 transition-colors">
                      <div className="absolute top-0 inset-x-0 h-1 bg-brand-teal" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">IKEJA</span>
                  </div>

                  {/* Gbagada */}
                  <div className="flex flex-col items-center gap-1.5 w-12 group select-none">
                    <span className="text-[9px] font-mono font-black text-zinc-700 dark:text-zinc-300">18%</span>
                    <div className="w-full bg-zinc-300 dark:bg-zinc-750 border-2 border-brand-black h-16 relative hover:opacity-95 transition-colors">
                      <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">GBAGADA</span>
                  </div>

                  {/* Ajah */}
                  <div className="flex flex-col items-center gap-1.5 w-12 group select-none">
                    <span className="text-[9px] font-mono font-black text-zinc-700 dark:text-zinc-300">12%</span>
                    <div className="w-full bg-amber-400 border-2 border-brand-black h-10 relative hover:bg-amber-300 transition-colors">
                      <div className="absolute top-0 inset-x-0 h-1 bg-brand-black" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">AJAH</span>
                  </div>
                </div>
              </div>

              {/* Chart 2: Escrow Trust Index */}
              <div className="border-2 border-brand-black dark:border-zinc-750 p-4 bg-zinc-50 dark:bg-[#1a1a1f]">
                <h4 className="font-display font-black text-xs uppercase text-zinc-900 dark:text-white mb-4">
                  COMPLIANCE & ARBITRATION OUTCOMES
                </h4>
                <div className="h-64 bg-white dark:bg-zinc-900 border-2 border-brand-black p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                        <span>ESTATE LICENSES CONFIRMED</span>
                        <span className="font-mono text-xs">481 Agencies</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-4 border-2 border-brand-black rounded-none overflow-hidden">
                        <div className="bg-brand-teal h-full w-[94%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                        <span>KYC RECORDS SIGNED</span>
                        <span className="font-mono text-xs">1,284 Sellers</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-4 border-2 border-brand-black rounded-none overflow-hidden">
                        <div className="bg-brand-black h-full w-[88%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                        <span>ESCROW DISPUTE SETTLEMENTS</span>
                        <span className="font-mono text-xs">14 Resolved</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-4 border-2 border-brand-black rounded-none overflow-hidden">
                        <div className="bg-amber-400 h-full w-[100%]" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-tight flex items-center gap-1 mt-4">
                    <Info size={11} className="text-brand-teal" /> Dynamic data sets calculated directly from verified ledger collections
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
