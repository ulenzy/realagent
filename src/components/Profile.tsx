import React, { useState, useEffect } from "react";
import {
  User,
  Settings,
  Heart,
  History,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  LogOut,
  PlusCircle,
  Briefcase,
  Bell,
  Zap,
  X,
  MapPin,
  ArrowLeft,
  Eye,
  BarChart3,
  Edit3,
  Power,
  MessageSquare,
  Save,
  Star,
  Dices,
  Lock,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { ListingRequest, ListingStatus, User as UserType } from "../types";
import { Coins, Shield, Check } from "lucide-react";
import { TOKEN_BUNDLES, TOKEN_NAIRA_RATE } from "../constants/fees";
import { mockProperties } from "../data/mockListings";
import { PropertyCard } from "./Marketplace";
import {
  formatCurrency,
  parseFormattedNumber,
  formatNumberString,
} from "../lib/utils";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Award,
  Camera,
  FileText,
  Phone,
  Mail,
  Facebook,
} from "lucide-react";
import { useAuth, DEFAULT_PREFERENCES } from "../context/AuthContext";
import { Sliders, Globe, AlertOctagon, ChevronDown } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import { getUserAvatarUrl } from "../lib/avatar";
import { AVATAR_COSMETICS, FRAME_COSMETICS, TITLE_COSMETICS } from "../constants/cosmetics";
import { Crown, Flame, ShoppingBag, Tag } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth, db } from "../lib/firebase";

export default function Profile({
  initialView = "main",
}: {
  initialView?:
    | "main"
    | "Saved Properties"
    | "Viewed History"
    | "Price Alerts"
    | "My Listings"
    | "Trust Score Details"
    | "Customize Profile"
    | "Wallet";
}) {
  const {
    user,
    updateUser,
    listingRequests,
    updateListingRequest,
    savedProperties,
    toggleSavedProperty,
    logout,
    signInWithGoogle,
    signInWithFacebook,
    addTransaction,
  } = useAuth();
  const {
    handleSelectProperty: onSelectProperty,
    setSelectedAgentId: onViewAgentProfile,
    viewedProperties,
    setActiveTab,
  } = useNavigation();

  if (!user) return null;

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<
    | "main"
    | "Saved Properties"
    | "Viewed History"
    | "Price Alerts"
    | "My Listings"
    | "Trust Score Details"
    | "Customize Profile"
    | "Wallet"
    | "Admin Panel"
    | "Preferences"
    | "Account Settings"
  >(initialView);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<any>(TOKEN_BUNDLES[0]);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isPasswordToastVisible, setIsPasswordToastVisible] = useState(false);
  const [activeSessions, setActiveSessions] = useState([
    { device: 'Chrome on MacOS (This device)', active: true, location: 'Lagos, Nigeria' },
    { device: 'Safari on iPhone', active: false, location: 'Abuja, Nigeria' }
  ]);
  const [activeSessionsAlert, setActiveSessionsAlert] = useState<string | null>(null);

  const handleUpdatePreference = (updates: Partial<typeof user.preferences>) => {
    const currentPrefs = user.preferences || DEFAULT_PREFERENCES;
    updateUser({
      preferences: {
        ...currentPrefs,
        ...updates,
        notifications: {
          ...(currentPrefs.notifications || DEFAULT_PREFERENCES.notifications),
          ...(updates.notifications || {})
        }
      }
    });
  };

  const handlePurchaseTokensConfirm = async () => {
    if (!selectedBundle) return;
    const now = new Date().toISOString();
    const purchaseRef = `tp-${Date.now()}`;
    const newPurchase = {
      bundleId: selectedBundle.id,
      tokens: selectedBundle.tokens,
      nairaAmount: selectedBundle.priceNaira,
      purchasedAt: now,
      reference: purchaseRef
    };

    try {
      const currentPurchases = user.tokenPurchases || [];
      await updateUser({
        tokens: (user.tokens || 0) + selectedBundle.tokens,
        tokenPurchases: [newPurchase, ...currentPurchases]
      });

      if (addTransaction) {
        await addTransaction({
          id: `tx-${Date.now()}`,
          type: 'Credit',
          amount: selectedBundle.tokens,
          description: `Token bundle purchase — ${selectedBundle.label}`,
          timestamp: now
        });
      }

      setPurchaseSuccess(`${selectedBundle.tokens} tokens added to your wallet.`);
      setIsTopUpOpen(false);
      setTimeout(() => {
        setPurchaseSuccess(null);
      }, 5050);
    } catch (err) {
      console.error("Failed to complete token purchase stub:", err);
    }
  };

  const ConfettiEffect = () => {
    const colors = ['#00F2FE', '#f1c40f', '#2ecc71', '#e74c3c', '#9b59b6'];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 h-64">
        {[...Array(40)].map((_, i) => {
          const color = colors[i % colors.length];
          const initialX = Math.random() * 100;
          const animX = initialX + (Math.random() * 40 - 20);
          return (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{ backgroundColor: color, left: `${initialX}%`, top: '-10px' }}
              animate={{
                y: ['0px', '240px'],
                x: [`${initialX}%`, `${animX}%`],
                rotate: [0, Math.random() * 360],
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 1.5 + Math.random() * 1.5,
                ease: "easeOut",
              }}
            />
          );
        })}
      </div>
    );
  };

  const LISTING_LIMIT_FREE = 2;
  const LISTING_LIMIT_PRO = 6;
  const ADDITIONAL_LISTING_COST = 10;
  const BOOST_COST = 20;
  const MAX_PRO_BOOSTS = 3;

  const handleSpendTokens = (amount: number, description: string) => {
    if (user.tokens >= amount) {
      const newTransaction = {
        id: `tx-${Date.now()}`,
        type: "Debit" as const,
        amount,
        description,
        timestamp: new Date().toISOString(),
      };
      updateUser({
        tokens: user.tokens - amount,
        transactions: [newTransaction, ...(user.transactions || [])],
      });
      return true;
    }
    setActiveModal("Insufficient Tokens");
    return false;
  };

  const handleBuyTokens = (amount: number, tokens: number) => {
    const newTransaction = {
      id: `tx-${Date.now()}`,
      type: "Credit" as const,
      amount: tokens,
      description: `Purchased ${tokens} tokens`,
      timestamp: new Date().toISOString(),
    };
    updateUser({
      tokens: user.tokens + tokens,
      transactions: [newTransaction, ...(user.transactions || [])],
    });
  };
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    price: string;
  }>({ title: "", price: "" });
  const [viewingMetrics, setViewingMetrics] = useState<string | null>(null);

  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "just now";
    const num = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(num / (1000 * 60));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

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

  // Profile Edit State
  const [profileEditData, setProfileEditData] = useState({
    name: user.name,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    bio: user.bio || "",
    phoneNumber: user.phoneNumber || "",
    avatarSeed: user.avatarSeed || "User",
    avatarUrl: user.avatarUrl || "",
    avatarTier: user.avatarTier || "Standard",
    role: user.role || "Buyer",
    linkedin: user.linkedin || "",
    onlineHours: user.onlineHours || "Mon,Tue,Wed,Thu,Fri|09:00-17:00",
    specializationArea: user.specializationArea || "",
    preferredLocations: user.preferredLocations || [],
    gender: user.gender || "Prefer not to say",
    avatarOptions: user.avatarOptions || {
      hairStyle: "shortHair",
      hairColor: "black",
      headwear: "none",
    },
  });

  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!profileEditData.name || profileEditData.name === user.name) {
      setNameError(null);
      setNameAvailable(null);
      return;
    }

    const checkName = async () => {
      setIsCheckingName(true);
      setNameError(null);
      setNameAvailable(null);

      if (user?.isGuest) {
        setNameAvailable(true);
        setIsCheckingName(false);
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("name", "==", profileEditData.name));
        const querySnapshot = await getDocs(q);

        let foundOtherUser = false;
        querySnapshot.forEach((doc) => {
          if (doc.id !== user.id) {
            foundOtherUser = true;
          }
        });

        if (foundOtherUser) {
          setNameError("This display name is already taken.");
          setNameAvailable(false);
        } else {
          setNameAvailable(true);
        }
      } catch (err) {
        console.error("Error checking name:", err);
      } finally {
        setIsCheckingName(false);
      }
    };

    const timer = setTimeout(checkName, 500);
    return () => clearTimeout(timer);
  }, [profileEditData.name, user.id, user.name]);

  const onUpdateUser = updateUser;
  const onUpdateListingRequest = updateListingRequest;
  const onToggleSave = toggleSavedProperty;

  const [avatarPreview, setAvatarPreview] = useState(user.avatarSeed || "User");
  const [rollsUsed, setRollsUsed] = useState(0);

  // Cosmetics Marketplace States
  const [cosmeticTab, setCosmeticTab] = useState<'avatars' | 'frames' | 'titles'>('avatars');
  const [selectedCosmeticId, setSelectedCosmeticId] = useState<string>('common_1');
  const [rarityFilter, setRarityFilter] = useState<'All' | 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'>('All');
  const [cosmeticSuccessMsg, setCosmeticSuccessMsg] = useState<string | null>(null);
  const [cosmeticErrorMsg, setCosmeticErrorMsg] = useState<string | null>(null);
  const [isBuyingInProgress, setIsBuyingInProgress] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // KYC State
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [kycStage, setKycStage] = useState<1 | 2 | 3>(1);
  const [kycFiles, setKycFiles] = useState<string[]>([]);
  const [uploadedKycFiles, setUploadedKycFiles] = useState<
    Record<string, string>
  >({});
  const [isSubmittingKYC, setIsSubmittingKYC] = useState(false);

  const [ninNumber, setNinNumber] = useState(user.ninNumber || "");
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || "");
  const [otpCode, setOtpCode] = useState("");
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(user.phoneNumber ? true : false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [ninError, setNinError] = useState<string | null>(null);

  // Admin states
  const [pendingKycUsers, setPendingKycUsers] = useState<any[]>([]);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // Manage KYC states on modal actions
  useEffect(() => {
    if (activeModal === "Complete KYC") {
      setKycStage(1);
      setPhoneNumber(user.phoneNumber || "");
      setNinNumber(user.ninNumber || "");
      setIsPhoneVerified(user.phoneNumber ? true : false);
      setIsOTPSent(false);
      setOtpCode("");
      setPhoneError(null);
      setNinError(null);
    }
  }, [activeModal, user]);

  // --- Cosmetics Purchases & Equip Handlers ---
  const buyAvatar = async (avatar: any) => {
    if (!user) return;
    const owned = user.ownedAvatars || ['common_1', 'common_2', 'common_3'];
    if (owned.includes(avatar.id)) {
      setCosmeticErrorMsg("You already own this avatar.");
      return;
    }
    if ((user.tokens || 0) < avatar.price) {
      setCosmeticErrorMsg(`Insufficent tokens. This avatar costs ${avatar.price} tokens.`);
      return;
    }
    
    try {
      const updatedOwned = [...owned, avatar.id];
      await updateUser({
        tokens: (user.tokens || 0) - avatar.price,
        ownedAvatars: updatedOwned
      });
      
      if (addTransaction) {
        await addTransaction({
          id: `burn-[avatar]-${Date.now()}`,
          type: 'Debit',
          amount: avatar.price,
          description: `Cosmetic Burn: Unlocked Avatar [${avatar.name}]`,
          timestamp: new Date().toISOString()
        });
      }
      
      setCosmeticSuccessMsg(`Unlocked ${avatar.name}!`);
      setTimeout(() => setCosmeticSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      setCosmeticErrorMsg("Payment processing failed.");
    }
  };

  const equipAvatar = async (avatarId: string) => {
    if (!user) return;
    const owned = user.ownedAvatars || ['common_1', 'common_2', 'common_3'];
    const avatar = AVATAR_COSMETICS.find(a => a.id === avatarId);
    const isCommon = avatar?.rarity === 'Common';
    if (!owned.includes(avatarId) && !isCommon) {
      setCosmeticErrorMsg("You do not own this avatar.");
      return;
    }
    
    try {
      await updateUser({
        equippedAvatarId: avatarId,
        avatarSeed: avatar?.seed,
        avatarTier: avatar?.rarity === 'Epic' ? 'Epic' : avatar?.rarity === 'Legendary' ? 'Legendary' : 'Standard'
      });
      setCosmeticSuccessMsg(`Equipped ${avatar?.name || 'Avatar'}!`);
      setTimeout(() => setCosmeticSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const buyFrame = async (frame: any) => {
    if (!user) return;
    const owned = user.ownedFrames || ['frame_none'];
    if (owned.includes(frame.id)) {
      setCosmeticErrorMsg("You already own this border frame.");
      return;
    }
    if ((user.tokens || 0) < frame.price) {
      setCosmeticErrorMsg(`Insufficent tokens. This frame costs ${frame.price} tokens.`);
      return;
    }
    
    try {
      const updatedOwned = [...owned, frame.id];
      await updateUser({
        tokens: (user.tokens || 0) - frame.price,
        ownedFrames: updatedOwned
      });
      
      if (addTransaction) {
        await addTransaction({
          id: `burn-[frame]-${Date.now()}`,
          type: 'Debit',
          amount: frame.price,
          description: `Cosmetic Burn: Unlocked Frame [${frame.name}]`,
          timestamp: new Date().toISOString()
        });
      }
      
      setCosmeticSuccessMsg(`Unlocked ${frame.name}!`);
      setTimeout(() => setCosmeticSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      setCosmeticErrorMsg("Payment processing failed.");
    }
  };

  const equipFrame = async (frameId: string) => {
    if (!user) return;
    const owned = user.ownedFrames || ['frame_none'];
    const frame = FRAME_COSMETICS.find(f => f.id === frameId);
    const isFree = frame?.rarity === 'Common' && frame.price === 0;
    if (!owned.includes(frameId) && !isFree) {
      setCosmeticErrorMsg("You do not own this frame.");
      return;
    }
    
    try {
      await updateUser({
        equippedFrameId: frameId
      });
      setCosmeticSuccessMsg(`Equipped border frame: ${frame?.name}!`);
      setTimeout(() => setCosmeticSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const buyTitle = async (title: any) => {
    if (!user) return;
    const owned = user.ownedTitles || ['title_none', 'title_common_scout'];
    if (owned.includes(title.id)) {
      setCosmeticErrorMsg("You already own this title.");
      return;
    }
    if ((user.tokens || 0) < title.price) {
      setCosmeticErrorMsg(`Insufficent tokens. This title costs ${title.price} tokens.`);
      return;
    }
    
    try {
      const updatedOwned = [...owned, title.id];
      await updateUser({
        tokens: (user.tokens || 0) - title.price,
        ownedTitles: updatedOwned
      });
      
      if (addTransaction) {
        await addTransaction({
          id: `burn-[title]-${Date.now()}`,
          type: 'Debit',
          amount: title.price,
          description: `Cosmetic Burn: Unlocked Title [${title.name}]`,
          timestamp: new Date().toISOString()
        });
      }
      
      setCosmeticSuccessMsg(`Unlocked ${title.name}!`);
      setTimeout(() => setCosmeticSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      setCosmeticErrorMsg("Payment processing failed.");
    }
  };

  const equipTitle = async (titleId: string) => {
    if (!user) return;
    const owned = user.ownedTitles || ['title_none', 'title_common_scout'];
    const title = TITLE_COSMETICS.find(t => t.id === titleId);
    const isFree = title?.rarity === 'Common' && title.price === 0;
    if (!owned.includes(titleId) && !isFree) {
      setCosmeticErrorMsg("You do not own this title.");
      return;
    }
    
    try {
      await updateUser({
        equippedTitleId: titleId
      });
      setCosmeticSuccessMsg(`Equipped title: ${title?.name}!`);
      setTimeout(() => setCosmeticSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendOTP = async () => {
    setPhoneError(null);
    if (!phoneNumber) {
      setPhoneError("Phone number is required");
      return;
    }
    
    try {
      let container = document.getElementById('recaptcha-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'recaptcha-container';
        document.body.appendChild(container);
      }

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {}
      });

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      (window as any).confirmationResult = confirmationResult;
      setIsOTPSent(true);
      setPhoneError(null);
    } catch (err: any) {
      console.warn("Firebase Phone Auth real initialization failed (Sandbox Mode allowed):", err);
      // Fail-soft for sandbox, let user proceed using code 123456
      setPhoneError(`Verification gateway notice: Sandbox Demo Active. Please use OTP code '123456' to proceed.`);
      setIsOTPSent(true);
    }
  };

  const handleVerifyOTP = async () => {
    setPhoneError(null);
    if (!otpCode) {
      setPhoneError("OTP code is required");
      return;
    }

    let verificationSuccess = false;
    if ((window as any).confirmationResult) {
      try {
        const result = await (window as any).confirmationResult.confirm(otpCode);
        if (result.user) {
          verificationSuccess = true;
        }
      } catch (err: any) {
        console.warn("Real confirmation result confirmation failed:", err);
        if (otpCode === '123456') {
          verificationSuccess = true;
        } else {
          setPhoneError("Invalid verification code.");
          return;
        }
      }
    } else if (otpCode === '123456') {
      verificationSuccess = true;
    } else {
      setPhoneError("Invalid verification code.");
      return;
    }

    if (verificationSuccess) {
      try {
        const isLocalGuest = localStorage.getItem('isLocalGuest') === 'true';
        let phoneIsTaken = false;

        if (!isLocalGuest) {
          const qUsers = query(collection(db, 'users'), where('phoneNumber', '==', phoneNumber));
          const querySnapshot = await getDocs(qUsers);
          
          for (const docSnap of querySnapshot.docs) {
            if (docSnap.id !== user.id) {
              phoneIsTaken = true;
              break;
            }
          }
        } else {
          const cachedGuestUsers = JSON.parse(localStorage.getItem('localGuestUsers') || '[]');
          const otherUser = cachedGuestUsers.find((u: any) => u.phoneNumber === phoneNumber && u.id !== user.id);
          if (otherUser) {
            phoneIsTaken = true;
          }
        }

        if (phoneIsTaken) {
          setPhoneError("This phone number is already registered to another account.");
          return;
        }

        await updateUser({ phoneNumber });
        setIsPhoneVerified(true);
        setPhoneError(null);
        setKycStage(3); // Proceed to document upload
      } catch (err: any) {
        console.error("Verification confirmation checks fails:", err);
        setPhoneError(`Verification error: ${err.message}`);
      }
    }
  };

  const loadPendingKycUsers = async () => {
    setLoadingPendingUsers(true);
    try {
      const isLocalGuest = localStorage.getItem('isLocalGuest') === 'true';
      if (!isLocalGuest) {
        const qPending = query(collection(db, 'users'), where('kycStatus', '==', 'Pending'));
        const querySnapshot = await getDocs(qPending);
        const usersList: any[] = [];
        querySnapshot.forEach((docSnap) => {
          usersList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPendingKycUsers(usersList);
      } else {
        const cachedGuestUsers = JSON.parse(localStorage.getItem('localGuestUsers') || '[]');
        const pendingGuests = cachedGuestUsers.filter((u: any) => u.kycStatus === 'Pending');
        
        if (pendingGuests.length === 0) {
          const samplePending = {
            id: 'sample-pending-agent',
            name: 'john_doe_agent',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@realagents.ng',
            phoneNumber: '+2348012345678',
            kycStatus: 'Pending',
            ninNumber: '12345678901',
            kycDocuments: ['nin', 'passport'],
            profileScore: 50,
            role: 'Agent'
          };
          setPendingKycUsers([samplePending]);
        } else {
          setPendingKycUsers(pendingGuests);
        }
      }
    } catch (err) {
      console.error("Error loading pending users:", err);
    } finally {
      setLoadingPendingUsers(false);
    }
  };

  const handleReviewUserKyc = async (userId: string, decision: 'Verified' | 'Rejected') => {
    try {
      const isLocalGuest = localStorage.getItem('isLocalGuest') === 'true';

      if (!isLocalGuest) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          kycStatus: decision,
          profileScore: decision === 'Verified' ? 80 : 20
        });
      } else {
        const cachedGuestUsers = JSON.parse(localStorage.getItem('localGuestUsers') || '[]');
        const updatedGuests = cachedGuestUsers.map((u: any) => {
          if (u.id === userId) {
            return { ...u, kycStatus: decision, profileScore: decision === 'Verified' ? 80 : 20 };
          }
          return u;
        });
        localStorage.setItem('localGuestUsers', JSON.stringify(updatedGuests));
        
        if (user.id === userId) {
          await updateUser({ kycStatus: decision, profileScore: decision === 'Verified' ? 80 : 20 });
        }
      }

      setAdminMessage(`Successfully marked user Verification as: ${decision}`);
      await loadPendingKycUsers();
      setTimeout(() => setAdminMessage(null), 5000);
    } catch (err: any) {
      console.error("Failed to update user kyc status:", err);
      setAdminMessage(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (user && user.role === 'Admin') {
      loadPendingKycUsers();
    }
  }, [user]);

  const handleKycFileUpload = (
    docId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedKycFiles((prev) => ({
        ...prev,
        [docId]: file.name,
      }));
    }
  };

  const isSubscriber = user.isSubscriber;

  const handleAction = (action: string) => {
    if (action === "Sign Out") {
      logout();
      return;
    }
    if (action === "Request Listing") {
      const currentLimit = isSubscriber
        ? LISTING_LIMIT_PRO
        : LISTING_LIMIT_FREE;
      const isAboveLimit = (listingRequests?.length || 0) >= currentLimit;

      if (isAboveLimit) {
        setActiveModal("Additional Listing Cost");
      } else {
        window.dispatchEvent(new CustomEvent("open-listing-flow"));
      }
      return;
    }
    if (action === "Complete KYC") {
      setActiveModal("Complete KYC");
      return;
    }
    if (action === "Wallet") {
      setActiveView("Wallet");
      return;
    }
    if (action === "Saved Properties" || action === "My Listings") {
      setActiveTab("myspace");
      return;
    }
    if (
      [
        "Viewed History",
        "Price Alerts",
        "Customize Profile",
        "Wallet",
        "Preferences",
        "Account Settings",
      ].includes(action)
    ) {
      setActiveView(action as any);
    } else {
      setActiveModal(action);
    }
  };

  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            className={cn(
              "transition-all",
              i < Math.round(rating)
                ? "fill-brand-teal text-brand-teal"
                : "text-zinc-700",
            )}
          />
        ))}
        <span className="text-[10px] font-black text-brand-teal ml-1">
          ({user.totalReviews || 0})
        </span>
      </div>
    );
  };

  const renderRoleTierBadges = (u: any) => {
    return (
      <div className="flex flex-wrap gap-2 items-center my-2">
        {u.role === "Buyer" && (
          <span className="px-2.5 py-1 bg-zinc-200 text-zinc-950 font-black text-[9px] uppercase tracking-wider border-2 border-brand-black shadow-brutal-xs">
            Buyer
          </span>
        )}
        {u.role === "Seller" && (
          <span className="px-2.5 py-1 bg-blue-500 text-white font-black text-[9px] uppercase tracking-wider border-2 border-brand-black shadow-brutal-xs">
            Property Owner
          </span>
        )}
        {u.role === "Agent" && (
          <>
            {u.agentTier === "Verified Professional" ? (
              <>
                <span className="px-2.5 py-1 bg-brand-teal text-brand-black font-black text-[9px] uppercase tracking-wider border-2 border-brand-black flex items-center gap-1 shadow-brutal-xs">
                  Verified Professional
                  {u.agentVerificationStatus === "Verified" && (
                    <ShieldCheck size={12} className="text-brand-black" />
                  )}
                </span>
                {u.agentVerificationStatus === "Pending" && (
                  <span className="px-2.5 py-1 bg-amber-400 text-brand-black font-black text-[9px] uppercase tracking-wider border-2 border-brand-black shadow-brutal-xs">
                    Verification Pending
                  </span>
                )}
              </>
            ) : (
              <span className="px-2.5 py-1 bg-zinc-400 text-brand-black font-black text-[9px] uppercase tracking-wider border-2 border-brand-black shadow-brutal-xs">
                Platform Agent
              </span>
            )}
          </>
        )}
      </div>
    );
  };

  if (isPreviewing) {
    return (
      <div className="relative">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b-4 border-brand-black dark:border-zinc-700 p-4 flex items-center gap-4 z-[60] shadow-brutal-sm">
          <button
            onClick={() => setIsPreviewing(false)}
            className="p-2 border-2 border-brand-black dark:border-zinc-700 hover:bg-brand-teal transition-colors text-brand-black dark:text-brand-gray"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-display font-black uppercase tracking-tight text-brand-black dark:text-brand-gray">
            Public Profile Preview
          </h1>
        </div>
        <div className="bg-zinc-50 dark:bg-brand-black min-h-screen">
          <div className="p-4 border-b-2 border-dashed border-zinc-300 dark:border-zinc-800 text-center">
            <p className="text-[10px] font-black uppercase text-zinc-500 italic">
              This is how other users see your profile
            </p>
          </div>

          {/* Reusing some visual logic from AgentProfile but for the current user */}
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 shadow-aggressive">
              <div className="flex gap-6 items-start mb-8">
                {(() => {
                  const equippedFrame = FRAME_COSMETICS.find(f => f.id === user?.equippedFrameId);
                  const frameClass = equippedFrame && equippedFrame.id !== 'frame_none'
                    ? equippedFrame.className
                    : "border-4 border-brand-black shadow-brutal";
                  const activeAvatarId = user?.equippedAvatarId || 'common_1';
                  const matchAv = AVATAR_COSMETICS.find(a => a.id === activeAvatarId);
                  const isLegendary = matchAv?.rarity === 'Legendary';
                  const isEpic = matchAv?.rarity === 'Epic';

                  return (
                    <div className="relative">
                      {isLegendary && (
                        <div className="absolute -inset-1.5 bg-amber-400 rounded-sm opacity-50 blur-sm animate-pulse" />
                      )}
                      {isEpic && (
                        <div className="absolute -inset-1 bg-purple-500 rounded-sm opacity-35 blur-xs animate-pulse" />
                      )}
                      <div className={cn("w-32 h-32 bg-zinc-800 overflow-hidden relative flex items-center justify-center", frameClass)}>
                        <img
                          src={getUserAvatarUrl(user)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2bdctb&color=000`;
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter">
                      {user.name}
                    </h2>
                    {user.kycStatus === "Verified" && (
                      <ShieldCheck className="text-brand-teal" size={20} />
                    )}
                  </div>
                  
                  {/* Equipped Title Display */}
                  {(() => {
                    const activeTitle = TITLE_COSMETICS.find(t => t.id === user?.equippedTitleId);
                    if (activeTitle && activeTitle.id !== 'title_none') {
                      return (
                        <div className="mb-2">
                          <span className={cn("px-2.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-widest font-extrabold inline-block", activeTitle.className)}>
                            {activeTitle.name}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {renderRoleTierBadges(user)}
                  <div className="mb-4">{renderStars(user.rating || 4.5)}</div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    {user.bio || "This user hasn't added a bio yet."}
                  </p>

                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <div className="bg-brand-gray border-2 border-brand-black p-2">
                      <p className="text-[8px] font-black uppercase text-zinc-500">
                        Trust Score
                      </p>
                      <p className="text-base font-black text-brand-teal">
                        {user.profileScore}%
                      </p>
                    </div>
                    <div className="bg-brand-gray border-2 border-brand-black p-2">
                      <p className="text-[8px] font-black uppercase text-zinc-500">
                        Member Since
                      </p>
                      <p className="text-base font-black">May 2026</p>
                    </div>
                  </div>
                </div>
              </div>

              {user.preferredLocations &&
                user.preferredLocations.length > 0 && (
                  <div className="pt-6 border-t-2 border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-2">
                      Operational Focus
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {user.preferredLocations.map((loc) => (
                        <span
                          key={loc}
                          className="px-2 py-1 bg-brand-teal text-brand-black font-black uppercase text-[10px] border-2 border-brand-black"
                        >
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeView !== "main") {
    return (
      <div className="flex flex-col bg-brand-gray dark:bg-[#1c1c21] min-h-screen pb-32">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b-4 border-brand-black dark:border-zinc-700 p-4 flex items-center gap-4 z-10 shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]">
          <button
            onClick={() => setActiveView("main")}
            className="p-2 border-2 border-brand-black dark:border-zinc-700 hover:bg-brand-teal transition-colors text-brand-black dark:text-brand-gray"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-display font-black uppercase tracking-tight text-brand-black dark:text-brand-gray">
            {activeView}
          </h1>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {activeView === "Wallet" && (
            <div className="flex flex-col gap-6 relative">
              {purchaseSuccess && <ConfettiEffect />}

              <div className="bg-brand-black text-white p-6 border-4 border-brand-teal shadow-aggressive relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Coins size={100} className="text-brand-teal fill-brand-teal" />
                </div>
                <h3 className="text-2xl font-display font-black italic uppercase text-brand-teal mb-1">
                  Agent Wallet
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                  Real-Time Token Balance
                </p>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2">
                      <Coins className="text-brand-teal animate-bounce" size={28} />
                      <span className="text-5xl font-display font-black tracking-tighter text-white">
                        {user.tokens || 0}
                      </span>
                      <span className="text-brand-teal font-black uppercase text-sm italic">
                        Tokens
                      </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-400 uppercase mt-1">
                      Naira Equivalent: {formatCurrency((user.tokens || 0) * TOKEN_NAIRA_RATE)}
                    </p>
                  </div>

                  <button
                    onClick={() => setIsTopUpOpen(!isTopUpOpen)}
                    className="bg-brand-teal hover:bg-teal-400 text-brand-black px-6 py-3 border-2 border-brand-black font-display font-black uppercase tracking-wider text-xs shadow-brutal-xs transition-all active:translate-y-0.5"
                  >
                    {isTopUpOpen ? "CLOSE PANEL" : "TOP UP WALLET"}
                  </button>
                </div>

                {purchaseSuccess && (
                  <div className="bg-emerald-500 text-brand-black border-2 border-brand-black p-4 mb-6 font-black uppercase text-xs shadow-brutal-xs flex items-center gap-2">
                    <CheckCircle className="text-brand-black shrink-0" size={16} />
                    <span>{purchaseSuccess}</span>
                  </div>
                )}

                <AnimatePresence>
                  {isTopUpOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t-2 border-dashed border-zinc-700 pt-6 mt-4"
                    >
                      <h4 className="text-[11px] font-black uppercase text-brand-teal tracking-[0.1em] mb-4">
                        Select a Token Bundle
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {TOKEN_BUNDLES.map((bundle) => {
                          const isSelected = selectedBundle?.id === bundle.id;
                          return (
                            <button
                              key={bundle.id}
                              onClick={() => setSelectedBundle(bundle)}
                              className={cn(
                                "relative text-left p-4 border-2 transition-all flex flex-col justify-between h-28",
                                isSelected
                                  ? "bg-brand-teal/20 border-brand-teal text-white shadow-brutal-xs"
                                  : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                              )}
                            >
                              {bundle.popular && (
                                <span className="absolute top-2 right-2 text-[8px] font-black uppercase bg-amber-400 text-black px-1.5 py-0.5 border border-black italic shadow-brutal-xs">
                                  BEST VALUE
                                </span>
                              )}
                              
                              <div>
                                <p className="text-2xl font-display font-black tracking-tight">{bundle.tokens} TKNS</p>
                                <p className="text-[10px] uppercase font-bold text-zinc-400">{bundle.label}</p>
                              </div>

                              <div className="flex justify-between items-center w-full">
                                <p className="text-sm font-black text-white">{formatCurrency(bundle.priceNaira)}</p>
                                {isSelected && (
                                  <span className="w-5 h-5 bg-brand-teal rounded-full flex items-center justify-center border border-black p-0.5">
                                    <CheckCircle size={12} className="text-brand-black shrink-0" />
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mb-6">
                        Value breakdown: <span className="text-brand-teal font-extrabold">1 token = {formatCurrency(TOKEN_NAIRA_RATE)}</span> — use tokens to pay monthly listing fees.
                      </p>

                      <button
                        onClick={handlePurchaseTokensConfirm}
                        disabled={!selectedBundle}
                        className="w-full bg-amber-400 hover:bg-amber-300 text-brand-black py-3 border-2 border-brand-black shadow-brutal-xs font-display font-black uppercase tracking-widest text-sm transition-all active:translate-y-0.5 disabled:opacity-50"
                      >
                        PURCHASE {selectedBundle?.tokens || 0} TOKENS (₦{selectedBundle?.priceNaira?.toLocaleString()})
                      </button>

                      <p className="text-[9px] text-center text-zinc-500 font-bold uppercase mt-3">
                        Secure payment powered by Paystack stub. Tokens credited immediately.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-sm">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-4">
                  Transaction Logs
                </h4>
                <div className="space-y-3">
                  {((user.transactions || [])
                    .filter((tx) => tx.type === "Credit" || tx.type === "Debit")
                    .slice(0, 10)).length > 0 ? (
                    (user.transactions || [])
                      .filter((tx) => tx.type === "Credit" || tx.type === "Debit")
                      .slice(0, 10)
                      .map((tx) => (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center py-2 border-b-2 border-dashed border-zinc-100 dark:border-zinc-800"
                        >
                          <div>
                            <p className="text-[10px] font-black uppercase">
                              {tx.description}
                            </p>
                            <p className="text-[8px] font-bold text-zinc-500">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "font-display font-black text-xs",
                              tx.type === "Credit"
                                ? "text-emerald-500"
                                : "text-brand-red",
                            )}
                          >
                            {tx.type === "Credit" ? "+" : "-"}
                            {tx.amount}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-[10px] font-black uppercase text-zinc-500 py-4 text-center italic">
                      No transaction history detected
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === "Viewed History" && (
            <>
              {viewedProperties.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-4 text-center">
                  <div className="w-20 h-20 bg-brand-gray border-4 border-brand-black flex items-center justify-center rounded-full">
                    <History size={40} className="text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black uppercase">
                      No Recent Activity
                    </h3>
                    <p className="text-zinc-500 font-bold max-w-xs uppercase text-xs">
                      You haven't viewed any properties yet.
                    </p>
                  </div>
                </div>
              ) : (
                viewedProperties.map((id) => {
                  const prop = mockProperties.find((p) => p.id === id);
                  if (!prop) return null;
                  return (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      onViewDetails={() => onSelectProperty?.(prop.id)}
                      onViewAgentProfile={() =>
                        onViewAgentProfile?.(prop.agent.id)
                      }
                      isSaved={savedProperties.includes(prop.id)}
                      onToggleSave={onToggleSave}
                    />
                  );
                })
              )}
            </>
          )}
          {activeView === "Customize Profile" && (
            <div className="flex flex-col gap-6">
              <div className="bg-brand-black text-white p-6 border-4 border-brand-teal shadow-aggressive">
                <h3 className="text-2xl font-display font-black italic uppercase text-brand-teal mb-1">
                  Advanced Customization
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                  Build your professional presence
                </p>

                <div className="space-y-6">
                  {/* Basic Profile Details */}
                  <div className="bg-zinc-900 border-2 border-zinc-800 p-4 space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-brand-teal tracking-widest">
                      Basic Profile
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1 block">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={profileEditData.firstName}
                            onChange={(e) =>
                              setProfileEditData({
                                ...profileEditData,
                                firstName: e.target.value,
                              })
                            }
                            className="brutalist-input h-10 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-700 text-brand-black dark:text-white w-full placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                            placeholder="e.g. John"
                          />
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1 block">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={profileEditData.lastName}
                            onChange={(e) =>
                              setProfileEditData({
                                ...profileEditData,
                                lastName: e.target.value,
                              })
                            }
                            className="brutalist-input h-10 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-700 text-brand-black dark:text-white w-full placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                            placeholder="e.g. Doe"
                          />
                        </div>
                      </div>
                      <div className="group">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1 block flex justify-between">
                          <span>Unique Display Name</span>
                          {isCheckingName && (
                            <span className="text-zinc-500">Checking...</span>
                          )}
                          {!isCheckingName && nameAvailable === true && (
                            <span className="text-brand-teal">Available</span>
                          )}
                          {!isCheckingName && nameAvailable === false && (
                            <span className="text-red-500">Taken</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={profileEditData.name}
                          onChange={(e) =>
                            setProfileEditData({
                              ...profileEditData,
                              name: e.target.value,
                            })
                          }
                          className={cn(
                            "brutalist-input h-10 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-700 text-brand-black dark:text-white w-full placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
                            nameError ? "border-red-500" : "",
                          )}
                          placeholder="e.g. John Doe"
                        />
                        {nameError && (
                          <p className="text-[10px] text-red-500 mt-1">
                            {nameError}
                          </p>
                        )}
                      </div>
                      <div className="group">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1 block">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={profileEditData.phoneNumber}
                          onChange={(e) =>
                            setProfileEditData({
                              ...profileEditData,
                              phoneNumber: e.target.value,
                            })
                          }
                          className="brutalist-input h-10 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-700 text-brand-black dark:text-white w-full placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                          placeholder="+234 ..."
                        />
                      </div>
                      <div className="group">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1 block">
                          Professional Bio
                        </label>
                        <textarea
                          value={profileEditData.bio}
                          onChange={(e) =>
                            setProfileEditData({
                              ...profileEditData,
                              bio: e.target.value,
                            })
                          }
                          className="brutalist-input min-h-[80px] py-3 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-700 text-brand-black dark:text-white leading-relaxed resize-none w-full placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1 block">
                            Account Role
                          </label>
                          <select
                            value={profileEditData.role}
                            onChange={(e) =>
                              setProfileEditData({
                                ...profileEditData,
                                role: e.target.value as any,
                              })
                            }
                            className="brutalist-input h-10 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-700 text-brand-black dark:text-white w-full"
                          >
                            <option value="Buyer">
                              Property Buyer / Investor
                            </option>
                            <option value="Agent">Real Estate Agent</option>
                            <option value="Developer">
                              Property Developer
                            </option>
                          </select>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1 block">
                            Gender Identity
                          </label>
                          <select
                            value={profileEditData.gender}
                            onChange={(e) =>
                              setProfileEditData({
                                ...profileEditData,
                                gender: e.target.value as any,
                              })
                            }
                            className="brutalist-input h-10 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-700 text-brand-black dark:text-white w-full"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">
                              Prefer not to say
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CSS Keyframes for High-Tier Premium Cosmetics */}
                  <div className="hidden">
                    <style>{`
                      @keyframes float-particle {
                        0% { transform: translateY(0px) scale(0.8); opacity: 0; }
                        55% { opacity: 0.8; }
                        100% { transform: translateY(-36px) scale(1.2); opacity: 0; }
                      }
                      @keyframes pulse-aura-gold {
                        0% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.4), inset 0 0 10px rgba(245, 158, 11, 0.2); }
                        50% { box-shadow: 0 0 24px rgba(251, 191, 36, 0.9), inset 0 0 16px rgba(251, 191, 36, 0.4); }
                        100% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.4), inset 0 0 10px rgba(245, 158, 11, 0.2); }
                      }
                      @keyframes pulse-aura-purple {
                        0% { box-shadow: 0 0 8px rgba(168, 85, 247, 0.4), inset 0 0 8px rgba(168, 85, 247, 0.2); }
                        50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.8), inset 0 0 14px rgba(168, 85, 247, 0.4); }
                        100% { box-shadow: 0 0 8px rgba(168, 85, 247, 0.4), inset 0 0 8px rgba(168, 85, 247, 0.2); }
                      }
                      @keyframes gold-glitter {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                      }
                      .animate-bounce-slow {
                        animation: bounce 3s infinite;
                      }
                      .text-legendary-sparkle {
                        background: linear-gradient(90deg, #d97706, #fbbf24, #fef08a, #fbbf24, #d97706);
                        background-size: 200% auto;
                        color: transparent;
                        -webkit-background-clip: text;
                        background-clip: text;
                        animation: gold-glitter 4s linear infinite;
                      }
                    `}</style>
                  </div>

                  {/* Dynamic Identity & Digital Collectibles Marketplace */}
                  <div className="bg-zinc-950 border-2 border-zinc-800 p-5 space-y-5 rounded-md relative text-white">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <h4 className="text-xs font-black uppercase text-brand-teal tracking-widest flex items-center gap-2">
                          <Crown size={14} className="text-amber-400 fill-amber-400" /> Digital Identity & Cosmetics Shop
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Structured Level & Asset Progression System</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-amber-500/30 text-amber-400 shadow-inner rounded">
                        <Flame size={12} className="text-amber-500 fill-amber-500 animate-pulse" />
                        <span className="text-[10px] font-mono tracking-widest uppercase">Wallet: <strong className="font-extrabold text-sm">{user?.tokens || 0}</strong> Tokens</span>
                      </div>
                    </div>

                    {/* Live Digital Identity Preview Block */}
                    <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded flex flex-col md:flex-row gap-5 items-center relative overflow-hidden">
                      {/* Animated Particles & Glow Effects background */}
                      {(() => {
                        const activeId = user?.equippedAvatarId || 'common_1';
                        const match = AVATAR_COSMETICS.find(a => a.id === activeId);
                        const rarity = match?.rarity || 'Common';
                        if (rarity === 'Legendary') {
                          return <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none z-0" />;
                        } else if (rarity === 'Epic') {
                          return <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5 pointer-events-none z-0" />;
                        }
                        return null;
                      })()}

                      <div className="relative flex-shrink-0 z-10">
                        {(() => {
                          const activeId = user?.equippedAvatarId || 'common_1';
                          const match = AVATAR_COSMETICS.find(a => a.id === activeId);
                          const rarity = match?.rarity || 'Common';
                          const isLegendary = rarity === 'Legendary';
                          const isEpic = rarity === 'Epic';
                          
                          const equippedFrame = FRAME_COSMETICS.find(f => f.id === user?.equippedFrameId);
                          const frameClass = equippedFrame && equippedFrame.id !== 'frame_none'
                            ? equippedFrame.className
                            : "border-4 border-zinc-700 shadow-brutal-xs";

                          return (
                            <div className="relative group">
                              {/* Glowing Backdrop */}
                              {isLegendary && (
                                <div className="absolute -inset-1.5 bg-amber-400 rounded-sm opacity-40 blur-sm animate-pulse" />
                              )}
                              {isEpic && (
                                <div className="absolute -inset-1 bg-purple-500 rounded-sm opacity-30 blur-xs animate-pulse" />
                              )}
                              
                              <div
                                className={cn(
                                  "w-20 h-20 bg-zinc-800 overflow-hidden relative transition-all flex items-center justify-center",
                                  frameClass
                                )}
                                style={isLegendary ? { animation: 'pulse-aura-gold 3s infinite ease-in-out' } : isEpic ? { animation: 'pulse-aura-purple 3s infinite ease-in-out' } : {}}
                              >
                                <img
                                  src={getUserAvatarUrl(user || {})}
                                  alt="Live Preview"
                                  className="w-full h-full object-cover relative z-10"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=2bdctb&color=000`;
                                  }}
                                />

                                {/* Interactive Particles */}
                                {isLegendary && (
                                  <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none overflow-hidden z-20">
                                    <div className="absolute bottom-0 left-2 w-1 h-1 bg-yellow-200 rounded-full" style={{ animation: 'float-particle 1.8s infinite ease-out', animationDelay: '0s' }} />
                                    <div className="absolute bottom-0 right-2 w-1.5 h-1.5 bg-amber-300 rounded-full" style={{ animation: 'float-particle 2.4s infinite ease-out', animationDelay: '0.4s' }} />
                                    <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-white rounded-full" style={{ animation: 'float-particle 2.1s infinite ease-out', animationDelay: '1.1s' }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex-1 text-center md:text-left z-10 w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                              <span className="text-sm font-display font-black tracking-wider text-white">
                                {user?.name}
                              </span>
                              {user?.kycStatus === 'Verified' && (
                                <span className="w-4 h-4 bg-brand-teal text-brand-black rounded-full flex items-center justify-center text-[8px] font-black">✓</span>
                              )}
                            </div>
                            
                            {/* Active User Title container */}
                            {(() => {
                              const match = TITLE_COSMETICS.find(t => t.id === user?.equippedTitleId);
                              if (match && match.id !== 'title_none') {
                                return (
                                  <div className="my-1.5 flex justify-center md:justify-start">
                                    <span className={cn("px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-widest font-black inline-block", match.className)}>
                                      {match.name}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">No Active Title Equipped</p>
                              );
                            })()}
                          </div>
                          
                          <div className="bg-zinc-950 p-2 border border-zinc-800 rounded self-center md:self-auto">
                            {(() => {
                              const activeAvId = user?.equippedAvatarId || 'common_1';
                              const match = AVATAR_COSMETICS.find(a => a.id === activeAvId);
                              const rarity = match?.rarity || 'Common';
                              
                              const rarityBadgeClass = 
                                rarity === 'Legendary' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                                rarity === 'Epic' ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' :
                                rarity === 'Rare' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
                                rarity === 'Uncommon' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                                'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';

                              return (
                                <div className="text-center font-mono">
                                  <p className="text-[7px] text-zinc-600 uppercase font-black tracking-widest mb-0.5">ACTIVE COGNITIVE TIER</p>
                                  <span className={cn("text-[9px] font-extrabold uppercase px-2 py-0.5 border rounded-none block", rarityBadgeClass)}>
                                    {rarity} : {match?.name || 'Standard Agent'}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Status Message System */}
                        {cosmeticSuccessMsg && (
                          <div className="mt-3 p-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded animate-pulse">
                            🎉 {cosmeticSuccessMsg}
                          </div>
                        )}
                        {cosmeticErrorMsg && (
                          <div className="mt-3 p-2 bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider rounded">
                            ⚠️ {cosmeticErrorMsg}
                            {cosmeticErrorMsg.includes("Insufficent") && (
                              <button 
                                onClick={() => setActiveView("Wallet")}
                                className="ml-2 underline text-white hover:text-brand-teal font-black"
                              >
                                TOP UP
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex border-b-2 border-zinc-800">
                      {[
                        { id: 'avatars', label: '👥 AVATAR PORTRAITS', icon: Sparkles },
                        { id: 'frames', label: '🖼️ PROFILE BORDERS', icon: Crown },
                        { id: 'titles', label: '🏷️ COMMEMORATIVE TITLES', icon: Tag }
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = cosmeticTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            id={`tab-btn-${tab.id}`}
                            onClick={() => {
                              setCosmeticTab(tab.id as any);
                              // Auto-select first in lists
                              if (tab.id === 'avatars') setSelectedCosmeticId('common_1');
                              else if (tab.id === 'frames') setSelectedCosmeticId('frame_none');
                              else if (tab.id === 'titles') setSelectedCosmeticId('title_none');
                              setCosmeticErrorMsg(null);
                            }}
                            className={cn(
                              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-4 flex items-center justify-center gap-1.5 transition-all outline-none",
                              isActive
                                ? "border-brand-teal text-brand-teal bg-zinc-900 font-extrabold"
                                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                            )}
                          >
                            <Icon size={12} className={cn("shrink-0", isActive ? "text-brand-teal" : "text-zinc-500")} />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.id.toUpperCase()}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* TWO-COLUMN MARKETPLACE CONTAINER */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      
                      {/* LEFT COLUMN: THE SELECTION GRID */}
                      <div className="lg:col-span-7 space-y-4">
                        {/* Rarity filter bar (Only for avatars tab) */}
                        {cosmeticTab === 'avatars' && (
                          <div className="flex flex-wrap gap-1 bg-zinc-900/50 p-1 rounded border border-zinc-900">
                            {(['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const).map((tier) => (
                              <button
                                key={tier}
                                id={`filter-btn-${tier}`}
                                onClick={() => setRarityFilter(tier)}
                                className={cn(
                                  "px-2 py-1 text-[9px] font-bold uppercase transition-colors rounded-none",
                                  rarityFilter === tier
                                    ? "bg-brand-teal text-brand-black"
                                    : "text-zinc-400 hover:bg-zinc-805 hover:text-white"
                                )}
                              >
                                {tier}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Rendering Avatars Portraits */}
                        {cosmeticTab === 'avatars' && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-zinc-900/20 p-3 border border-zinc-900 max-h-[360px] overflow-y-auto">
                            {AVATAR_COSMETICS.filter(a => rarityFilter === 'All' || a.rarity === rarityFilter).map((avatar) => {
                              const isSelected = selectedCosmeticId === avatar.id;
                              const isOwned = (user?.ownedAvatars || ['common_1', 'common_2', 'common_3']).includes(avatar.id) || avatar.rarity === 'Common';
                              const isEquipped = (user?.equippedAvatarId || 'common_1') === avatar.id;
                              
                              const borderStyle = 
                                avatar.rarity === 'Legendary' ? 'border-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.25)]' :
                                avatar.rarity === 'Epic' ? 'border-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.25)]' :
                                avatar.rarity === 'Rare' ? 'border-blue-500' :
                                avatar.rarity === 'Uncommon' ? 'border-green-500' :
                                'border-zinc-700';

                              return (
                                <button
                                  key={avatar.id}
                                  id={`avatar-card-${avatar.id}`}
                                  onClick={() => {
                                    setSelectedCosmeticId(avatar.id);
                                    setCosmeticErrorMsg(null);
                                  }}
                                  className={cn(
                                    "p-2 bg-zinc-900 border-2 rounded transition-all flex flex-col items-center gap-2 group relative overflow-hidden",
                                    isSelected ? "border-brand-teal bg-zinc-850 scale-[1.03] shadow-lg" : borderStyle,
                                    "hover:bg-zinc-850"
                                  )}
                                >
                                  {/* Custom miniature backgrounds */}
                                  <div className="w-12 h-12 rounded-none bg-zinc-800 overflow-hidden flex items-center justify-center relative">
                                    <img
                                      src={`https://api.dicebear.com/7.x/${avatar.style}/svg?seed=${avatar.seed}`}
                                      alt={avatar.name}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    {isEquipped && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <span className="text-[8px] font-black uppercase text-brand-teal bg-zinc-950 px-1 py-0.5 border border-brand-teal">ACTIVE</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-center w-full">
                                    <p className="text-[9px] font-extrabold truncate w-full">{avatar.name}</p>
                                    <div className="flex items-center justify-center mt-1">
                                      {isOwned ? (
                                        <span className="text-[7px] text-zinc-500 uppercase font-black">Owned</span>
                                      ) : (
                                        <div className="flex items-center gap-0.5 text-[8px] font-bold text-amber-400">
                                          <Coins size={8} />
                                          <span>{avatar.price}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Rendering Borders / Frames */}
                        {cosmeticTab === 'frames' && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-zinc-900/20 p-3 border border-zinc-900 max-h-[360px] overflow-y-auto">
                            {FRAME_COSMETICS.map((frame) => {
                              const isSelected = selectedCosmeticId === frame.id;
                              const isOwned = (user?.ownedFrames || ['frame_none']).includes(frame.id) || frame.price === 0;
                              const isEquipped = (user?.equippedFrameId || 'frame_none') === frame.id;

                              return (
                                <button
                                  key={frame.id}
                                  id={`frame-card-${frame.id}`}
                                  onClick={() => {
                                    setSelectedCosmeticId(frame.id);
                                    setCosmeticErrorMsg(null);
                                  }}
                                  className={cn(
                                    "p-2 bg-zinc-900 border-2 rounded transition-all flex flex-col items-center gap-2 group",
                                    isSelected ? "border-brand-teal bg-zinc-850 scale-102 shadow-lg" : "border-zinc-800",
                                    "hover:bg-zinc-850"
                                  )}
                                >
                                  {/* Dummy rendering of user current avatar with this frame around it */}
                                  <div className="w-14 h-14 bg-zinc-800 rounded flex items-center justify-center relative">
                                    <div className={cn("w-10 h-10 overflow-hidden relative flex items-center justify-center bg-brand-teal", frame.className)}>
                                      <img
                                        src={getUserAvatarUrl(user || {})}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    {isEquipped && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <span className="text-[7px] font-black text-brand-teal bg-zinc-950 px-1 font-mono">EQUIPPED</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-center w-full">
                                    <p className="text-[9px] font-extrabold truncate w-full">{frame.name}</p>
                                    <div className="mt-1 flex items-center justify-center">
                                      {isOwned ? (
                                        <span className="text-[7px] text-zinc-500 uppercase font-black">Owned</span>
                                      ) : (
                                        <div className="flex items-center gap-0.5 text-[8px] font-bold text-amber-400">
                                          <Coins size={8} />
                                          <span>{frame.price}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Rendering Commemorative Titles */}
                        {cosmeticTab === 'titles' && (
                          <div className="space-y-2 bg-zinc-900/20 p-3 border border-zinc-900 max-h-[360px] overflow-y-auto">
                            {TITLE_COSMETICS.map((title) => {
                              const isSelected = selectedCosmeticId === title.id;
                              const isOwned = (user?.ownedTitles || ['title_none', 'title_common_scout']).includes(title.id) || title.price === 0;
                              const isEquipped = (user?.equippedTitleId || 'title_none') === title.id;

                              return (
                                <button
                                  key={title.id}
                                  id={`title-card-${title.id}`}
                                  onClick={() => {
                                    setSelectedCosmeticId(title.id);
                                    setCosmeticErrorMsg(null);
                                  }}
                                  className={cn(
                                    "p-3 bg-zinc-900 border border-zinc-800 text-left w-full transition-all flex items-center justify-between group",
                                    isSelected ? "border-brand-teal bg-zinc-850 shadow-md" : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850"
                                  )}
                                >
                                  <div className="flex-1 min-w-0 pr-3">
                                    <div className="flex items-center gap-3">
                                      <p className="text-xs font-black uppercase text-white truncate">{title.name}</p>
                                      {title.id !== 'title_none' && (
                                        <span className={cn("px-1.5 py-0.5 text-[8px] uppercase font-mono font-bold whitespace-nowrap", title.className)}>
                                          Display Render
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 max-w-sm font-mono mt-1">{title.description}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    {isEquipped ? (
                                      <span className="text-[8px] font-bold text-brand-teal border border-brand-teal/40 bg-brand-teal/5 px-2 py-0.5 uppercase tracking-wide">ACTIVE</span>
                                    ) : isOwned ? (
                                      <span className="text-[8px] text-zinc-500 font-bold uppercase py-0.5">Owned</span>
                                    ) : (
                                      <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                                        <Coins size={10} />
                                        <span>{title.price}</span>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* RIGHT COLUMN: DETAILED COSMETIC INSPECT AND CONTROL PANEL */}
                      <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded p-4 flex flex-col justify-between">
                        {(() => {
                          // Find item properties based on current selection
                          let item: any = null;
                          let displayType = '';
                          
                          if (cosmeticTab === 'avatars') {
                            item = AVATAR_COSMETICS.find(a => a.id === selectedCosmeticId) || AVATAR_COSMETICS[0];
                            displayType = 'Avatar Portrait';
                          } else if (cosmeticTab === 'frames') {
                            item = FRAME_COSMETICS.find(f => f.id === selectedCosmeticId) || FRAME_COSMETICS[0];
                            displayType = 'Profile Border';
                          } else if (cosmeticTab === 'titles') {
                            item = TITLE_COSMETICS.find(t => t.id === selectedCosmeticId) || TITLE_COSMETICS[0];
                            displayType = 'Commemorative Title';
                          }

                          if (!item) {
                            return <div className="text-center py-6 text-zinc-500 text-[10px] uppercase font-mono">Selector Empty</div>;
                          }

                          // Calculation attributes
                          const isOwned = 
                            cosmeticTab === 'avatars' 
                              ? (user?.ownedAvatars || ['common_1', 'common_2', 'common_3']).includes(item.id) || item.rarity === 'Common'
                              : cosmeticTab === 'frames'
                                ? (user?.ownedFrames || ['frame_none']).includes(item.id) || item.price === 0
                                : (user?.ownedTitles || ['title_none', 'title_common_scout']).includes(item.id) || item.price === 0;

                          const isEquipped = 
                            cosmeticTab === 'avatars'
                              ? (user?.equippedAvatarId || 'common_1') === item.id
                              : cosmeticTab === 'frames'
                                ? (user?.equippedFrameId || 'frame_none') === item.id
                                : (user?.equippedTitleId || 'title_none') === item.id;

                          const rarityColor = 
                            item.rarity === 'Legendary' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                            item.rarity === 'Epic' ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' :
                            item.rarity === 'Rare' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
                            item.rarity === 'Uncommon' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                            'text-zinc-400 bg-zinc-500/14 border-zinc-500/20';

                          return (
                            <div className="flex flex-col h-full justify-between gap-6" id="cosmetic-inspector">
                              <div className="space-y-4">
                                <span className="text-[8px] font-black bg-zinc-950 font-mono text-brand-teal px-2 py-0.5 border border-zinc-805 tracking-widest uppercase">
                                  INSPECTION PANEL & LIVE FORECAST
                                </span>

                                {/* Display preview window */}
                                <div className="p-4 bg-zinc-950 rounded border border-zinc-805 flex flex-col items-center justify-center relative overflow-hidden">
                                  
                                  {/* Shimmer overlay for Legendary items */}
                                  {item.rarity === 'Legendary' && (
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse pointer-events-none" />
                                  )}

                                  {cosmeticTab === 'avatars' && (
                                    <div className="relative">
                                      {item.rarity === 'Legendary' && (
                                        <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-300 pointer-events-none rounded opacity-30 animate-pulse blur-xs" />
                                      )}
                                      {item.rarity === 'Epic' && (
                                        <div className="absolute -inset-1.5 bg-purple-500 pointer-events-none rounded opacity-25 blur-xs" />
                                      )}
                                      <div className="w-24 h-24 bg-zinc-850 rounded border-2 border-zinc-700 overflow-hidden relative flex items-center justify-center">
                                        <img
                                          src={`https://api.dicebear.com/7.x/${item.style}/svg?seed=${item.seed}`}
                                          alt={item.name}
                                          className="w-full h-full object-cover z-10"
                                          referrerPolicy="no-referrer"
                                        />
                                        
                                        {/* Golden floating star animations */}
                                        {item.rarity === 'Legendary' && (
                                          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                                            <div className="absolute bottom-1 left-2 w-1 h-1 bg-yellow-250 rounded-full" style={{ animation: 'float-particle 1.8s infinite ease-out' }} />
                                            <div className="absolute bottom-1 right-2 w-1 bg-amber-300 rounded-full" style={{ animation: 'float-particle 2.2s infinite ease-out', animationDelay: '0.4s' }} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {cosmeticTab === 'frames' && (
                                    <div className="w-24 h-24 bg-zinc-850 rounded flex items-center justify-center relative">
                                      <div className={cn("w-16 h-16 overflow-hidden bg-brand-teal relative flex items-center justify-center", item.className)}>
                                        <img src={getUserAvatarUrl(user || {})} alt="Borders demo" className="w-full h-full object-cover" />
                                      </div>
                                    </div>
                                  )}

                                  {cosmeticTab === 'titles' && (
                                    <div className="py-5 text-center w-full">
                                      <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono mb-2">Display Output</p>
                                      <p className="text-white text-xs font-black tracking-tight mb-2">{user?.name}</p>
                                      {item.id !== 'title_none' ? (
                                        <span className={cn("px-2.5 py-1 text-[10px] uppercase font-mono font-extrabold tracking-widest", item.className)}>
                                          {item.name}
                                        </span>
                                      ) : (
                                        <span className="text-zinc-650 text-[10px] italic">No active title</span>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-3 text-center">
                                    <h5 className="text-sm font-black uppercase text-white font-display">{item.name}</h5>
                                    <span className={cn("inline-block mt-1.5 px-2.5 py-0.5 border text-[9px] uppercase font-mono font-extrabold tracking-widest rounded-none", rarityColor)}>
                                      {item.rarity} {displayType}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider font-mono">SPECIFICATION DETAIL</p>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{item.description}</p>
                                </div>

                                {item.lore && (
                                  <div className="bg-zinc-950 p-2.5 border border-zinc-900 rounded-sm">
                                    <p className="text-[7px] text-zinc-500 uppercase font-black font-mono tracking-widest mb-1">COSMIC LORE</p>
                                    <p className="text-[10px] text-brand-teal font-serif italic leading-relaxed">"{item.lore}"</p>
                                  </div>
                                )}

                                {item.visualEffects && item.visualEffects.length > 0 && (
                                  <div>
                                    <p className="text-[8px] text-zinc-500 uppercase font-black font-mono tracking-widest mb-1.5">VISUAL EFFECTS UNLOCKED</p>
                                    <div className="flex flex-wrap gap-1">
                                      {item.visualEffects.map((effect: string, fIdx: number) => (
                                        <span key={fIdx} className="text-[8px] text-zinc-400 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded-none font-mono">
                                          ✦ {effect}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Button Controls */}
                              <div className="pt-4 border-t border-zinc-800">
                                {isEquipped ? (
                                  <button
                                    disabled
                                    className="w-full py-3 bg-zinc-800/60 text-zinc-550 border border-zinc-705 text-xs font-black uppercase tracking-widest rounded-none select-none flex items-center justify-center gap-1.5"
                                  >
                                    <Check size={14} className="text-zinc-500" /> ACTIVE EQUIPPED
                                  </button>
                                ) : isOwned ? (
                                  <button
                                    onClick={async () => {
                                      if (cosmeticTab === 'avatars') await equipAvatar(item.id);
                                      else if (cosmeticTab === 'frames') await equipFrame(item.id);
                                      else if (cosmeticTab === 'titles') await equipTitle(item.id);
                                    }}
                                    className="w-full py-3 bg-brand-teal text-brand-black hover:bg-emerald-400 font-black text-xs uppercase tracking-widest border-2 border-brand-black active:translate-y-0.5 transition-all text-center rounded-none shadow-brutal-xs"
                                  >
                                    EQUIP TO PROFILE CARD
                                  </button>
                                ) : (
                                  <button
                                    disabled={isBuyingInProgress}
                                    onClick={async () => {
                                      setIsBuyingInProgress(true);
                                      try {
                                        if (cosmeticTab === 'avatars') await buyAvatar(item);
                                        else if (cosmeticTab === 'frames') await buyFrame(item);
                                        else if (cosmeticTab === 'titles') await buyTitle(item);
                                      } finally {
                                        setIsBuyingInProgress(false);
                                      }
                                    }}
                                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-brand-black font-black text-xs uppercase tracking-widest border-2 border-brand-black active:translate-y-0.5 transition-all text-center rounded-none shadow-brutal-xs flex items-center justify-center gap-1.5"
                                  >
                                    <ShoppingBag size={14} className="text-brand-black" />
                                    <span>UNLOCK & BURN {item.price} TOKENS</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>


                  {/* Online Hours Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] block">
                      Availability Window
                    </label>
                    <div className="bg-zinc-900 border-2 border-zinc-800 p-4">
                      <div className="flex gap-1 mb-4 justify-between">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                          (day) => {
                            const isActive = profileEditData.onlineHours
                              .split("|")[0]
                              .includes(day);
                            return (
                              <button
                                key={day}
                                onClick={() => {
                                  const [days, times] =
                                    profileEditData.onlineHours.split("|");
                                  const daysArr = days
                                    .split(",")
                                    .filter((d) => d);
                                  let newDays;
                                  if (daysArr.includes(day)) {
                                    newDays = daysArr
                                      .filter((d) => d !== day)
                                      .join(",");
                                  } else {
                                    newDays = [...daysArr, day].join(",");
                                  }
                                  setProfileEditData({
                                    ...profileEditData,
                                    onlineHours: `${newDays}|${times}`,
                                  });
                                }}
                                className={cn(
                                  "flex-1 py-2 text-[10px] font-black border-2 transition-all",
                                  isActive
                                    ? "bg-brand-teal border-brand-teal text-brand-black"
                                    : "bg-transparent border-zinc-800 text-zinc-500",
                                )}
                              >
                                {day.charAt(0)}
                              </button>
                            );
                          },
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[8px] font-black text-zinc-600 uppercase mb-1 block">
                            Open
                          </label>
                          <select
                            className="w-full bg-[#dadcd8] dark:bg-zinc-800 border border-zinc-700 text-[#060606] dark:text-white text-xs p-2 h-10"
                            value={
                              profileEditData.onlineHours
                                .split("|")[1]
                                ?.split("-")[0] || "09:00"
                            }
                            onChange={(e) => {
                              const [days, times] =
                                profileEditData.onlineHours.split("|");
                              const [, close] = (times || "09:00-17:00").split(
                                "-",
                              );
                              setProfileEditData({
                                ...profileEditData,
                                onlineHours: `${days}|${e.target.value}-${close}`,
                              });
                            }}
                          >
                            {Array.from({ length: 24 }).map((_, i) => {
                              const h = i.toString().padStart(2, "0");
                              return (
                                <option key={h} value={`${h}:00`}>
                                  {h}:00
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="pt-4 text-zinc-700 font-black">-</div>
                        <div className="flex-1">
                          <label className="text-[8px] font-black text-zinc-600 uppercase mb-1 block">
                            Close
                          </label>
                          <select
                            className="w-full bg-[#dadcd8] dark:bg-zinc-800 border border-zinc-700 text-[#0d0d0d] dark:text-white text-xs p-2 h-10"
                            value={
                              profileEditData.onlineHours
                                .split("|")[1]
                                ?.split("-")[1] || "17:00"
                            }
                            onChange={(e) => {
                              const [days, times] =
                                profileEditData.onlineHours.split("|");
                              const [open] = (times || "09:00-17:00").split(
                                "-",
                              );
                              setProfileEditData({
                                ...profileEditData,
                                onlineHours: `${days}|${open}-${e.target.value}`,
                              });
                            }}
                          >
                            {Array.from({ length: 24 }).map((_, i) => {
                              const h = i.toString().padStart(2, "0");
                              return (
                                <option key={h} value={`${h}:00`}>
                                  {h}:00
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Concentration */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] block">
                        Operational Focus
                      </label>
                      <span className="text-[8px] font-black uppercase text-brand-teal">
                        {profileEditData.preferredLocations.length}/
                        {isSubscriber ? "12" : "5"} Sites
                      </span>
                    </div>
                    <div className="bg-zinc-900 border-2 border-zinc-800 p-4 space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={locationInput}
                          onChange={(e) => {
                            setLocationInput(e.target.value);
                            if (e.target.value.length > 0) {
                              const filtered = [
                                "lekki",
                                "Abuja",
                                "mainland",
                                "lento estate",
                                "gwarimpa",
                                "ikoyi",
                                "vi",
                                "ibeju",
                                "maitama",
                                "asokoro",
                                "wuse",
                                "garki",
                                "katampe",
                                "guzape",
                                "jahi",
                              ].filter((l) =>
                                l
                                  .toLowerCase()
                                  .includes(e.target.value.toLowerCase()),
                              );
                              setSuggestions(filtered);
                            } else {
                              setSuggestions([]);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && locationInput.trim()) {
                              if (
                                profileEditData.preferredLocations.length <
                                (isSubscriber ? 12 : 5)
                              ) {
                                setProfileEditData({
                                  ...profileEditData,
                                  preferredLocations: [
                                    ...new Set([
                                      ...profileEditData.preferredLocations,
                                      locationInput.trim(),
                                    ]),
                                  ],
                                });
                              }
                              setLocationInput("");
                              setSuggestions([]);
                            }
                          }}
                          className="brutalist-input h-12 pl-4 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-700 text-brand-black dark:text-white w-full placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                          placeholder="Type & press Enter to add..."
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-20 bg-zinc-800 border-x-2 border-b-2 border-zinc-700 max-h-40 overflow-y-auto">
                            {suggestions.map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  if (
                                    profileEditData.preferredLocations.length <
                                    (isSubscriber ? 12 : 5)
                                  ) {
                                    setProfileEditData({
                                      ...profileEditData,
                                      preferredLocations: [
                                        ...new Set([
                                          ...profileEditData.preferredLocations,
                                          s,
                                        ]),
                                      ],
                                    });
                                  }
                                  setLocationInput("");
                                  setSuggestions([]);
                                }}
                                className="w-full text-left p-3 text-[10px] font-black uppercase text-white hover:bg-brand-teal hover:text-brand-black border-b border-zinc-700/50"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {profileEditData.preferredLocations.map((loc) => (
                          <div
                            key={loc}
                            className="flex items-center gap-2 bg-brand-teal/10 border border-brand-teal px-2 py-1"
                          >
                            <span className="text-[9px] font-black uppercase text-brand-teal line-clamp-1">
                              {loc}
                            </span>
                            <button
                              onClick={() =>
                                setProfileEditData({
                                  ...profileEditData,
                                  preferredLocations:
                                    profileEditData.preferredLocations.filter(
                                      (l) => l !== loc,
                                    ),
                                })
                              }
                              className="text-brand-teal hover:text-white"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {!isSubscriber &&
                        profileEditData.preferredLocations.length >= 5 && (
                          <div className="p-2 bg-brand-red/10 border border-brand-red/30 flex items-center gap-2 italic">
                            <Zap size={12} className="text-brand-red" />
                            <p className="text-[8px] font-bold text-brand-red uppercase">
                              Limit reached. Upgrade to Pro for 12 locations.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="group">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1 block">
                      LinkedIn Profile URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MessageSquare size={14} className="text-brand-teal" />
                      </div>
                      <input
                        type="url"
                        value={profileEditData.linkedin}
                        onChange={(e) =>
                          setProfileEditData({
                            ...profileEditData,
                            linkedin: e.target.value,
                          })
                        }
                        className="brutalist-input h-12 pl-10 text-xs bg-[#dadcd8] dark:bg-zinc-800 border-zinc-800 dark:border-zinc-700 text-brand-black dark:text-white w-full placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                        placeholder="linkedin.com/in/username"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    disabled={
                      !!nameError ||
                      isCheckingName ||
                      !profileEditData.name ||
                      !profileEditData.firstName ||
                      !profileEditData.lastName
                    }
                    onClick={() => {
                      onUpdateUser({
                        ...profileEditData,
                        avatarSeed: profileEditData.avatarSeed || avatarPreview,
                        avatarUrl: getUserAvatarUrl(
                          profileEditData,
                          avatarPreview,
                        ),
                        profileScore: Math.min(
                          100,
                          (user.profileScore || 0) + 10,
                        ),
                      });
                      setActiveView("main");
                    }}
                    className="brutalist-button-teal w-full py-4 text-xs font-black uppercase shadow-brutal-sm active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCheckingName ? "VERIFYING..." : "DEPLOY ALL CHANGES"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeView === "Trust Score Details" && (
            <div className="flex flex-col gap-6">
              <div className="bg-brand-black text-white p-6 border-4 border-brand-teal shadow-aggressive">
                <h3 className="text-2xl font-display font-black italic uppercase text-brand-teal mb-1">
                  Trust Score Analysis
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                  How your account integrity is calculated
                </p>

                <div className="space-y-4">
                  <ScoreFactor
                    label="Core KYC Verification"
                    score={user.kycStatus === "Verified" ? 40 : 0}
                    max={40}
                  />
                  <ScoreFactor
                    label="Account Customization"
                    score={user.bio ? 10 : 5}
                    max={10}
                  />
                  <ScoreFactor
                    label="Listings Quality"
                    score={listingRequests.length > 0 ? 20 : 5}
                    max={25}
                  />
                  <ScoreFactor label="Response Speed" score={25} max={25} />
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-400">
                      Total Integrity
                    </p>
                    <p className="text-4xl font-display font-black text-brand-teal">
                      {user.profileScore}%
                    </p>
                  </div>
                  <div className="bg-brand-teal text-brand-black px-3 py-1 font-display font-black text-xs uppercase italic">
                    {user.profileScore >= 90
                      ? "Master Trader"
                      : user.profileScore >= 70
                        ? "Gold Tier"
                        : "Standard"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="brutalist-card p-4 bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="text-emerald-500" size={20} />
                    <h4 className="font-display font-black uppercase text-xs">
                      Unlock Exclusive Perks
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase">
                      <div className="w-1.5 h-1.5 bg-brand-teal" />
                      Direct Chat with Verified Premium Buyers
                    </li>
                    <li className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase">
                      <div className="w-1.5 h-1.5 bg-brand-teal" />
                      Zero-Deposit Inspection Booking
                    </li>
                    <li className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase">
                      <div className="w-1.5 h-1.5 bg-brand-teal" />
                      Priority Placement in AISearch Results
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          {activeView === "Price Alerts" && (
            <>
              <div className="bg-brand-teal border-4 border-brand-black p-4 shadow-brutal-sm">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display font-black uppercase text-lg">
                    Lento Classic Estate
                  </h3>
                  <span className="bg-brand-black text-white text-[10px] font-black px-2 py-1 tracking-widest">
                    -15%
                  </span>
                </div>
                <p className="text-sm font-bold opacity-80 mb-2">
                  Price dropped from ₦400M to ₦350M
                </p>
                <button className="bg-brand-black text-white px-4 py-2 text-xs font-black uppercase w-full hover:bg-brand-red transition-colors border-2 border-brand-black">
                  View Property
                </button>
              </div>
              <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display font-black uppercase text-lg">
                    Ochacha Estate
                  </h3>
                  <span className="bg-brand-red text-white text-[10px] font-black px-2 py-1 tracking-widest">
                    HOT
                  </span>
                </div>
                <p className="text-sm font-bold opacity-80 mb-2">
                  High demand alert: 3 new offers made today
                </p>
                <button className="bg-brand-teal text-brand-black px-4 py-2 text-xs font-black uppercase w-full hover:bg-brand-black hover:text-white transition-colors border-2 border-brand-black">
                  View Property
                </button>
              </div>
            </>
          )}

          {activeView === "Preferences" && (
            <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm flex flex-col gap-6 p-4">
              <div className="divide-y-2 divide-zinc-200 dark:divide-zinc-800 flex flex-col gap-6">
              {/* Sub: Display */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 border-l-4 border-brand-teal pl-2">
                  <Eye size={12} /> Display
                </h4>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Theme</span>
                  <div className="flex border-2 border-brand-black dark:border-zinc-750 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
                    {(["LIGHT", "DARK", "SYSTEM"] as const).map((t) => {
                      const isSelected = (user.preferences?.theme || "system").toUpperCase() === t;
                      return (
                        <button
                          key={t}
                          onClick={() => handleUpdatePreference({ theme: t.toLowerCase() as any })}
                          className={cn(
                            "px-3 py-1 font-display text-[9px] font-black uppercase tracking-widest border border-transparent rounded transition-all",
                            isSelected 
                              ? "bg-brand-teal text-brand-black font-black" 
                              : "text-zinc-500 hover:text-brand-black dark:hover:text-white"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sub: Notifications */}
              <div className="flex flex-col gap-3 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 border-l-4 border-brand-teal pl-2">
                  <Bell size={12} /> Notifications
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: "bidReceived", label: "Bid Received" },
                    { key: "listingApproved", label: "Listing Approved" },
                    { key: "inspectionConfirmed", label: "Inspection Confirmed" },
                    { key: "messageReceived", label: "Message Received" },
                    { key: "dealStatusUpdate", label: "Deal Status Update" },
                    { key: "marketingUpdates", label: "Marketing Updates" },
                  ].map(({ key, label }) => {
                    const currentNotifications = user.preferences?.notifications || DEFAULT_PREFERENCES.notifications;
                    const isChecked = !!(currentNotifications as any)[key];
                    return (
                      <div key={key} className="flex justify-between items-center py-1">
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
                        <button
                          onClick={() => {
                            const updatedNotifications = {
                              ...currentNotifications,
                              [key]: !isChecked
                            };
                            handleUpdatePreference({ notifications: updatedNotifications });
                          }}
                          className={cn(
                            "w-10 h-5 border-2 border-brand-black dark:border-zinc-700 transition-all flex items-center shadow-brutal-xs rounded-full p-0.5",
                            isChecked ? "bg-brand-teal" : "bg-zinc-200 dark:bg-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "w-3 h-3 bg-white border border-brand-black dark:border-zinc-700 transition-transform rounded-full",
                            isChecked ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub: Localization & Defaults */}
              <div className="flex flex-col gap-4 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 border-l-4 border-brand-teal pl-2">
                  <Globe size={12} /> Localization & Default Views
                </h4>
                
                {/* Language */}
                <div className="flex justify-between items-center py-1 border-b border-dashed border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Language</span>
                  <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-mono font-black text-zinc-500">
                    English (en)
                  </span>
                </div>

                {/* Currency */}
                <div className="flex flex-col gap-2 py-1 border-b border-dashed border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Currency</span>
                    <div className="flex border-2 border-brand-black dark:border-zinc-750 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
                      {(["NGN", "USD", "GBP"] as const).map((curr) => {
                        const isSelected = (user.preferences?.currency || "NGN").toUpperCase() === curr;
                        return (
                          <button
                            key={curr}
                            onClick={() => handleUpdatePreference({ currency: curr })}
                            className={cn(
                              "px-3 py-1 font-display text-[9px] font-black uppercase tracking-widest border border-transparent rounded transition-all",
                              isSelected 
                                ? "bg-brand-teal text-brand-black font-black" 
                                : "text-zinc-500 hover:text-brand-black dark:hover:text-white"
                            )}
                          >
                            {curr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[10px] italic text-zinc-400 mt-1 dark:text-zinc-550 leading-none">
                    Exchange rates are indicative.
                  </p>
                </div>

                {/* Default SearchView */}
                <div className="flex justify-between items-center py-1 border-b border-dashed border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Default SearchView</span>
                  <div className="flex border-2 border-brand-black dark:border-zinc-750 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
                    {(["LIST", "MAP"] as const).map((v) => {
                      const isSelected = (user.preferences?.defaultSearchView || "list").toUpperCase() === v;
                      return (
                        <button
                          key={v}
                          onClick={() => handleUpdatePreference({ defaultSearchView: v.toLowerCase() as any })}
                          className={cn(
                            "px-3 py-1 font-display text-[9px] font-black uppercase tracking-widest border border-transparent rounded transition-all",
                            isSelected 
                              ? "bg-brand-teal text-brand-black font-black" 
                              : "text-zinc-500 hover:text-brand-black dark:hover:text-white"
                          )}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Default Listing Type */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Default Listing Type</span>
                  <div className="flex border-2 border-brand-black dark:border-zinc-750 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
                    {(["ALL", "SALE", "RENT"] as const).map((lt) => {
                      const isSelected = (user.preferences?.defaultListingType || "All").toUpperCase() === lt;
                      return (
                        <button
                          key={lt}
                          onClick={() => {
                            const capitalizedValue = lt === "ALL" ? "All" : lt === "SALE" ? "Sale" : "Rent";
                            handleUpdatePreference({ defaultListingType: capitalizedValue as any });
                          }}
                          className={cn(
                            "px-3 py-1 font-display text-[9px] font-black uppercase tracking-widest border border-transparent rounded transition-all",
                            isSelected 
                              ? "bg-brand-teal text-brand-black font-black" 
                              : "text-zinc-500 hover:text-brand-black dark:hover:text-white"
                          )}
                        >
                          {lt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            
              </div>
            </div>
          )}
          {activeView === "Account Settings" && (
            <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm flex flex-col gap-6 p-4">
              <div className="divide-y-2 divide-zinc-200 dark:divide-zinc-800 flex flex-col gap-6">
              {/* Sub: Security */}
              <div className="flex flex-col gap-3 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 border-l-4 border-brand-red pl-2">
                  <Lock size={12} /> Security
                </h4>
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Change Password</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Rotate credential verification passcodes</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsPasswordToastVisible(true);
                      setTimeout(() => setIsPasswordToastVisible(false), 5000);
                    }}
                    className="bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-black dark:border-zinc-700 hover:bg-brand-teal hover:text-brand-black px-4 py-1.5 font-display text-[9px] font-black uppercase tracking-widest transition-all shadow-brutal-xs active:translate-y-0.5 text-brand-black dark:text-white font-black"
                  >
                    CHANGE PASSWORD
                  </button>
                </div>
                {isPasswordToastVisible && (
                  <div className="p-3 bg-neutral-950 text-brand-red border border-brand-red font-mono text-[10px] uppercase text-left leading-relaxed">
                    Secure credential rotation system offline. Please contact administrator.
                  </div>
                )}
              </div>

              {/* Sub: Privacy */}
              <div className="flex flex-col gap-4 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 border-l-4 border-brand-red pl-2">
                  <ShieldCheck size={12} /> Privacy & Linked Accounts
                </h4>
                
                {/* Linked accounts */}
                <div className="flex justify-between items-center py-1 border-b border-dashed border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Linked Accounts</span>
                  <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-mono font-black text-zinc-500">
                    {user.firstName === "Google" || user.email?.includes("gmail.com") 
                      ? "Linked to Google" 
                      : user.firstName === "Facebook" || user.email?.includes("facebook.com")
                      ? "Linked to Facebook"
                      : "Credential Email Setup"}
                  </span>
                </div>

                {/* Active Sessions */}
                <div className="flex flex-col gap-3 py-1 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Active Sessions</span>
                    <button
                      onClick={() => {
                        setActiveSessions([ { device: 'Chrome on MacOS (This device)', active: true, location: 'Lagos, Nigeria' } ]);
                        setActiveSessionsAlert("All other sessions have been terminated.");
                        setTimeout(() => setActiveSessionsAlert(null), 4000);
                      }}
                      className="bg-brand-red hover:bg-red-600 text-white px-2.5 py-1 font-display text-[8px] font-black uppercase tracking-widest transition-all shadow-brutal-xs active:translate-y-0.5 font-black"
                    >
                      TERMINATE OTHERS
                    </button>
                  </div>
                  
                  {activeSessionsAlert && (
                    <div className="p-2 border border-brand-teal text-brand-teal bg-neutral-950 font-mono text-[9px] uppercase leading-none">
                      {activeSessionsAlert}
                    </div>
                  )}

                  <ul className="space-y-1.5">
                    {activeSessions.map((session, idx) => (
                      <li key={idx} className="flex justify-between items-center text-[10px] font-mono text-zinc-500 bg-neutral-50 dark:bg-neutral-800 p-2 border border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", session.active ? "bg-brand-teal animate-pulse" : "bg-zinc-400")} />
                          <span>{session.device}</span>
                        </div>
                        <span>{session.location}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sub: Danger Zone */}
              <div className="flex flex-col gap-4 pt-4 border-t-2 border-brand-red/30">
                <button 
                  onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
                  className="w-full flex items-center justify-between text-left group hover:bg-red-500/5 p-2 -ml-2 rounded transition-colors"
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-red flex items-center gap-1.5 border-l-4 border-brand-red pl-2">
                    <AlertOctagon size={12} /> Danger Zone
                  </h4>
                  <ChevronDown size={16} className={cn("text-brand-red transition-transform duration-200", isDangerZoneOpen ? "rotate-180" : "rotate-0")} />
                </button>
                
                <AnimatePresence>
                  {isDangerZoneOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden flex flex-col gap-4"
                    >
                      {/* Profile Visibility */}
                      <div className="flex justify-between items-center py-1">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Profile Visibility</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Toggle public indexing of your professional bio</span>
                        </div>
                        <button
                          onClick={() => {
                            updateUser({ profileVisible: user.profileVisible === false ? true : false });
                          }}
                          className={cn(
                            "w-10 h-5 border-2 border-brand-black dark:border-zinc-700 transition-all flex items-center shadow-brutal-xs rounded-full p-0.5",
                            user.profileVisible !== false ? "bg-brand-teal" : "bg-zinc-200 dark:bg-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "w-3 h-3 bg-white border border-brand-black dark:border-zinc-700 transition-transform rounded-full",
                            user.profileVisible !== false ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      {/* Data Usage */}
                      <div className="flex flex-col gap-3 py-1 text-left">
                        <span className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300">Data Collected</span>
                        <ul className="list-disc pl-4 space-y-1 text-[10px] font-mono text-zinc-500 pb-1">
                          <li>Device and operating system specifications</li>
                          <li>Functional and analytics session cookies allowed</li>
                          <li>Inspection geocoordinate logs</li>
                          <li>Escrow ledger transaction logging history</li>
                        </ul>
                        <button
                          onClick={() => {
                            const jsonStr = JSON.stringify(user, null, 2);
                            const blob = new Blob([jsonStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `profile_export_${user.id || 'export'}.json`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-neutral-200 border-2 border-dashed border-brand-black dark:border-zinc-700 p-2 font-mono text-[9px] font-black uppercase text-center text-brand-black dark:text-white font-black"
                        >
                          EXPORT MY PROFILE PERSIST DETAIL PORTFOLIO
                        </button>
                      </div>

                      {/* Account Deletion */}
                      <div className="py-1">
                        <button
                          onClick={() => setIsEmailModalOpen(true)}
                          className="w-full bg-brand-red hover:bg-red-600 text-white py-3 border-2 border-brand-black font-display font-black uppercase tracking-wider text-xs shadow-aggressive active:translate-y-0.5 font-black"
                        >
                          TERMINATE MY ACCOUNT PROFILE & CLOSE ESCROW WALLET
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            
              </div>
            </div>
          )}
          {activeView === "Admin Panel" && (
            <div className="flex flex-col gap-6">
              <div className="bg-brand-black text-white p-6 border-4 border-brand-teal shadow-aggressive relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield size={100} className="text-brand-teal fill-brand-teal" />
                </div>
                <h3 className="text-2xl font-display font-black italic uppercase text-brand-teal mb-1">
                  System Administrative Desk
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">
                  KYC identity verification approvals & audits
                </p>
              </div>

              {adminMessage && (
                <div className="bg-brand-teal/20 border-2 border-brand-teal text-brand-teal p-3 font-black uppercase text-xs shadow-brutal-xs">
                  {adminMessage}
                </div>
              )}

              <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 shadow-brutal-sm">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-display font-black uppercase tracking-wider dark:text-gray-150">
                    Pending KYC Requests ({pendingKycUsers.length})
                  </h4>
                  <button 
                    onClick={loadPendingKycUsers}
                    className="bg-zinc-100 hover:bg-zinc-200 text-black border-2 border-black font-black uppercase text-[9px] px-3 py-1.5 shadow-brutal-xs"
                  >
                    SYNC CLIENTS
                  </button>
                </div>

                {loadingPendingUsers ? (
                  <div className="py-12 text-center text-xs font-black uppercase tracking-widest text-zinc-500 animate-pulse">
                    Retrieving digital records...
                  </div>
                ) : pendingKycUsers.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="mx-auto text-emerald-500 mb-2 animate-bounce" size={32} />
                    <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
                      All KYC lines are clear! No pending submissions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingKycUsers.map((pendingUser) => (
                      <div 
                        key={pendingUser.id}
                        className="bg-zinc-50 dark:bg-zinc-800 border-4 border-brand-black dark:border-zinc-700 p-5 shadow-brutal-xs relative flex flex-col md:flex-row justify-between gap-6"
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest bg-amber-400 text-black px-1.5 py-0.5 border border-black italic">
                              {pendingUser.role || "User"}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 font-mono">
                              ID: {pendingUser.id.slice(0, 10)}
                            </span>
                          </div>

                          <div>
                            <h5 className="font-display font-black text-base uppercase leading-tight dark:text-zinc-100">
                              {pendingUser.firstName || "N/A"} {pendingUser.lastName || "N/A"}
                            </h5>
                            <p className="text-xs text-brand-teal font-extrabold lowercase leading-none mt-0.5">
                              @{pendingUser.name || "username"}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t-2 border-dashed border-zinc-200 dark:border-zinc-700">
                            <div>
                              <p className="text-[8px] font-black uppercase text-zinc-400">Email Address</p>
                              <p className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300">{pendingUser.email || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase text-zinc-400">Phone (Verified)</p>
                              <p className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300">{pendingUser.phoneNumber || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase text-zinc-400">National ID (NIN)</p>
                              <p className="text-xs font-mono text-brand-red tracking-wider font-extrabold bg-red-50 dark:bg-red-950/20 px-1 py-0.5 max-w-max border border-brand-red/10">
                                {pendingUser.ninNumber || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase text-zinc-400">Submitted Documents</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(pendingUser.kycDocuments || ["nin", "passport", "utility"]).map((docId: string) => (
                                  <span key={docId} className="text-[7.5px] font-black uppercase border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5 max-w-max text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800">
                                    {docId}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex md:flex-col justify-end gap-3 shrink-0">
                          <button
                            onClick={() => handleReviewUserKyc(pendingUser.id, 'Verified')}
                            className="bg-emerald-500 hover:bg-emerald-400 text-brand-black border-2 border-brand-black px-4 py-2.5 text-[10px] font-black uppercase shadow-brutal-xs transition-all active:translate-y-0.5"
                          >
                            APPROVE VERIFICATION
                          </button>
                          <button
                            onClick={() => handleReviewUserKyc(pendingUser.id, 'Rejected')}
                            className="bg-brand-red hover:bg-red-500 text-white border-2 border-brand-black px-4 py-2.5 text-[10px] font-black uppercase shadow-brutal-xs transition-all active:translate-y-0.5"
                          >
                            REJECT APPLICANT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function ScoreFactor({
    label,
    score,
    max,
  }: {
    label: string;
    score: number;
    max: number;
  }) {
    const percentage = (score / max) * 100;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {label}
          </span>
          <span className="text-[10px] font-black uppercase text-brand-teal">
            {score} / {max}
          </span>
        </div>
        <div className="h-1 bg-zinc-800 border border-zinc-700 overflow-hidden">
          <div
            className="h-full bg-brand-teal shadow-[0_0_8px_rgba(43,220,176,0.3)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-6 relative">
      {/* User Info Card */}
      <section className="bg-brand-black text-white p-6 border-4 border-brand-black relative overflow-hidden transition-colors duration-300 dark:border-zinc-700">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <User size={160} />
        </div>

        <div className="flex items-center gap-5 relative z-10">
          <div className="relative group">
            {(() => {
              const equippedFrame = FRAME_COSMETICS.find(f => f.id === user?.equippedFrameId);
              const frameClass = equippedFrame && equippedFrame.id !== 'frame_none'
                ? equippedFrame.className
                : "border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm";
              const activeAvatarId = user?.equippedAvatarId || 'common_1';
              const matchAv = AVATAR_COSMETICS.find(a => a.id === activeAvatarId);
              const isLegendary = matchAv?.rarity === 'Legendary';
              const isEpic = matchAv?.rarity === 'Epic';

              return (
                <div className="relative">
                  {isLegendary && (
                    <div className="absolute -inset-1 bg-amber-400 rounded-sm opacity-50 blur-sm animate-pulse pointer-events-none" />
                  )}
                  {isEpic && (
                    <div className="absolute -inset-1 bg-purple-500 rounded-sm opacity-35 blur-xs pointer-events-none animate-pulse" />
                  )}
                  <div className={cn("w-24 h-24 bg-zinc-800 overflow-hidden relative flex items-center justify-center transition-all", frameClass)}>
                    <img
                      src={getUserAvatarUrl(user)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2bdctb&color=000`;
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl font-display font-black italic tracking-tighter leading-tight">
                    {user.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPreviewing(true)}
                      className="p-1.5 bg-zinc-800 border border-zinc-700 hover:bg-brand-teal hover:text-brand-black transition-all group/preview"
                      title="Preview Public Profile"
                    >
                      <Eye
                        size={14}
                        className="group-hover/preview:scale-110 transition-transform"
                      />
                    </button>
                    <button
                      onClick={() => handleAction("Wallet")}
                      className="flex items-center gap-1.5 px-2 py-1 bg-brand-black border border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-brand-black transition-all shadow-brutal-xs active:translate-y-0.5"
                      title="Open Wallet"
                    >
                      <Zap size={12} className="fill-current" />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                        {user.tokens || 0}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="mb-3">{renderStars(user.rating || 4.5)}</div>
                
                {/* Equipped Title Display */}
                {(() => {
                  const activeTitle = TITLE_COSMETICS.find(t => t.id === user?.equippedTitleId);
                  if (activeTitle && activeTitle.id !== 'title_none') {
                    return (
                      <div className="mb-2">
                        <span className={cn("px-2.5 py-0.5 rounded text-[9px] uppercase font-mono tracking-widest font-extrabold inline-block", activeTitle.className)}>
                          {activeTitle.name}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {renderRoleTierBadges(user)}
                <div className="flex flex-wrap gap-2 mb-2">
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 border border-white/20 flex items-center gap-1",
                      isSubscriber
                        ? "bg-brand-teal text-brand-black"
                        : "bg-zinc-800 text-zinc-400",
                    )}
                  >
                    {isSubscriber ? (
                      <Zap size={10} className="fill-brand-black" />
                    ) : null}
                    {isSubscriber ? "Pro Agent" : "Standard"}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 border border-white/20 flex items-center gap-1",
                      user.kycStatus === "Verified"
                        ? "bg-emerald-500 text-black"
                        : "bg-brand-red text-white",
                    )}
                  >
                    {user.kycStatus === "Verified" ? (
                      <ShieldCheck size={10} />
                    ) : (
                      <AlertTriangle size={10} />
                    )}
                    {user.kycStatus === "Verified"
                      ? "Verified KYC"
                      : "Unverified"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[10px] font-black uppercase text-zinc-400 leading-tight max-w-xs">
              {user.bio || "No bio added yet."}
            </p>
          </div>
        </div>

        {/* Global Trust Score Gauge */}
        <div className="mt-8 pt-6 border-t-2 border-white/10 relative z-10">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest italic mb-0.5">
                Global Trust & Integrity Score
              </p>
              <h3 className="text-2xl font-display font-black text-brand-teal tracking-tighter">
                {user.profileScore}
                <span className="text-sm text-zinc-600">/100</span>
              </h3>
            </div>
            <div className="text-right">
              <button
                onClick={() => setActiveView("Trust Score Details")}
                className="text-[10px] font-black uppercase text-brand-teal hover:underline"
              >
                View Breakdown
              </button>
              <div className="mt-1">
                <span className="text-[10px] font-black uppercase text-brand-red bg-brand-red/10 px-2 py-1 border border-brand-red/30">
                  Level {Math.floor(user.profileScore / 25) + 1} Access
                </span>
              </div>
            </div>
          </div>
          <div className="h-3 bg-zinc-900 border-2 border-brand-teal/20 relative overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${user.profileScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full shadow-[0_0_10px_rgba(43,220,176,0.3)]",
                user.profileScore < 50
                  ? "bg-brand-red"
                  : user.profileScore < 75
                    ? "bg-amber-400"
                    : "bg-brand-teal",
              )}
            />
          </div>
          <p className="mt-2 text-[8px] font-black uppercase text-zinc-500 tracking-widest leading-tight">
            Score based on KYC documents, trade history, and account activity.
            High scores unlock direct buyer leads and lower commission fees.
          </p>
        </div>
      </section>

      {/* Anonymous User Upgrade Banner */}
      {user.isGuest && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-teal/5 border-l-8 border-brand-teal p-4 flex flex-col gap-4 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-teal text-brand-black rotate-6 shadow-brutal-xs">
              <Zap size={20} className="fill-brand-black" />
            </div>
            <div>
              <p className="text-xs font-display font-black uppercase dark:text-gray-100">
                Guest Mode: Save Your Progress
              </p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">
                Create a permanent account to keep your properties and listings
                safe.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => signInWithGoogle()}
              className="brutalist-button-white py-2 px-4 text-[10px] h-auto flex-1 flex items-center justify-center gap-2 font-black"
            >
              <Mail size={12} /> Link Google
            </button>
            <button
              onClick={() => signInWithFacebook()}
              className="brutalist-button-white py-2 px-4 text-[10px] h-auto flex-1 flex items-center justify-center gap-2 border-brand-black font-black"
            >
              <Facebook size={12} /> Link Facebook
            </button>
          </div>
        </motion.div>
      )}

      {/* KYC Alert Banner */}
      {user.kycStatus !== "Verified" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-red/5 border-l-8 border-brand-red p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-red text-white rotate-6">
              <Award size={20} />
            </div>
            <div>
              <p className="text-xs font-display font-black uppercase dark:text-gray-100">
                Action Required: Document Verification
              </p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">
                Your trust score is low. Complete KYC to verify your identity.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleAction("Complete KYC")}
            className="brutalist-button-red py-2 px-4 text-[10px] h-auto"
          >
            Verify Now
          </button>
        </motion.div>
      )}

      {/* Agent Credentials Section */}
      {user.role === "Agent" && (
        <section className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 shadow-aggressive flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b-2 border-brand-black pb-3">
            <Briefcase className="text-brand-teal" size={24} />
            <h3 className="text-xl font-display font-black uppercase">
              Agent Credentials
            </h3>
          </div>

          <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800 p-3 border-2 border-brand-black shadow-brutal-xs">
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400">
                Current Corporate Tier
              </p>
              <p className="text-base font-black uppercase italic text-brand-teal">
                {user.agentTier || "Platform Agent"}
              </p>
            </div>
            {user.agentTier === "Verified Professional" ? (
              <span
                className={cn(
                  "px-2 py-1 text-[9px] font-black uppercase border",
                  user.agentVerificationStatus === "Verified"
                    ? "bg-emerald-500 text-black border-black"
                    : "bg-amber-400 text-brand-black border-black animate-pulse",
                )}
              >
                {user.agentVerificationStatus || "Pending"}
              </span>
            ) : (
              <span className="px-2 py-1 text-[9px] font-black uppercase bg-zinc-300 text-brand-black border border-black">
                Platform Standard
              </span>
            )}
          </div>

          {user.agentTier === "Verified Professional" ? (
            <div className="space-y-3">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 border-2 border-brand-black shadow-brutal-xs">
                <p className="text-[10px] font-black uppercase text-zinc-400">
                  Agent Registration Number
                </p>
                <p className="text-lg font-mono font-black">
                  {user.agentRegNumber || "N/A"}
                </p>
              </div>

              {user.agentVerificationStatus === "Pending" && (
                <div className="bg-amber-500/10 border-2 border-amber-500 text-amber-500 p-3 flex gap-2 items-start">
                  <div className="w-1.5 h-1.5 bg-amber-500 mt-1.5 shrink-0 rounded-full" />
                  <p className="text-[10px] font-bold uppercase tracking-tight leading-relaxed">
                    Your registration number is being reviewed by the RealAgents
                    team. Expected: 48 hours.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-brand-gray dark:bg-zinc-800 border-4 border-brand-black dark:border-zinc-700 p-4 shadow-brutal-sm">
              <h4 className="text-sm font-display font-black uppercase text-brand-black dark:text-brand-teal mb-1">
                Upgrade to Verified Professional
              </h4>
              <p className="text-[10px] text-zinc-500 uppercase tracking-tight mb-4 leading-relaxed">
                Verified Professionals unlock premium badges, direct high-value
                broker pipelines, and rank higher in automated AI matchmaking
                reports.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  id="regNumInput"
                  placeholder="Enter CAC/Reg. Number (e.g., RE-85920)"
                  className="brutalist-input text-xs flex-1 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      const val = input.value.trim();
                      if (val) {
                        updateUser({
                          agentTier: "Verified Professional",
                          agentVerificationStatus: "Pending",
                          agentRegNumber: val,
                        });
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      "regNumInput",
                    ) as HTMLInputElement;
                    const val = input?.value?.trim();
                    if (val) {
                      updateUser({
                        agentTier: "Verified Professional",
                        agentVerificationStatus: "Pending",
                        agentRegNumber: val,
                      });
                    } else {
                      alert("Please enter a valid registration number");
                    }
                  }}
                  className="brutalist-button-teal text-[10px] h-auto px-4 font-black uppercase shadow-brutal-xs"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* Trust Score & Stats Panel */}
          <div className="grid grid-cols-3 gap-3 border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="bg-zinc-50 dark:bg-zinc-800 p-2 text-center border border-brand-black">
              <p className="text-[8px] font-black uppercase text-zinc-400">
                Trust Score
              </p>
              <p className="text-sm font-black text-brand-teal">
                {user.profileScore}%
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 p-2 text-center border border-brand-black">
              <p className="text-[8px] font-black uppercase text-zinc-400">
                Sold Listings
              </p>
              <p className="text-sm font-black text-brand-black dark:text-white">
                {user.propertiesSold || 5}
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 p-2 text-center border border-brand-black">
              <p className="text-[8px] font-black uppercase text-zinc-400">
                Bids Won
              </p>
              <p className="text-sm font-black text-brand-black dark:text-white">
                {user.bidsWon || 12}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Buyer Quick Access Panels */}
      {user.role === "Buyer" && (
        <section className="grid grid-cols-2 gap-4 select-none">
          <button
            onClick={() => handleAction("Saved Properties")}
            className="bg-brand-black text-white p-4 border-4 border-brand-black hover:border-brand-teal hover:text-brand-teal text-left shadow-brutal-sm hover:translate-y-0.5 transition-all relative flex flex-col gap-2"
          >
            <div className="flex justify-between items-center w-full">
              <Heart size={24} className="text-brand-red fill-current" />
              <span className="text-xs font-black bg-zinc-850 text-brand-teal border border-brand-teal px-1.5 py-0.5">
                {savedProperties?.length || 0} ITEMS
              </span>
            </div>
            <div>
              <p className="text-xs font-display font-black uppercase tracking-tight">
                Saved Properties
              </p>
              <p className="text-[8px] uppercase text-zinc-500 font-bold">
                Your prospective deals
              </p>
            </div>
          </button>

          <button
            onClick={() => handleAction("Viewed History")}
            className="bg-brand-black text-white p-4 border-4 border-brand-black hover:border-brand-teal hover:text-brand-teal text-left shadow-brutal-sm hover:translate-y-0.5 transition-all relative flex flex-col gap-2"
          >
            <div className="flex justify-between items-center w-full">
              <History size={24} className="text-brand-teal" />
              <span className="text-xs font-black bg-zinc-850 text-zinc-400 border border-zinc-700 px-1.5 py-0.5">
                {(viewedProperties || []).length} VISITED
              </span>
            </div>
            <div>
              <p className="text-xs font-display font-black uppercase tracking-tight">
                Viewed History
              </p>
              <p className="text-[8px] uppercase text-zinc-500 font-bold">
                Recently checked properties
              </p>
            </div>
          </button>
        </section>
      )}

      {/* Quick Actions Grid */}
      {user.role === "Seller" && (
        <section className="grid gap-4 grid-cols-1">
          <ActionButton
            icon={<PlusCircle className="text-brand-red" />}
            label="List Property"
            subLabel="Submit property request"
            onClick={() => handleAction("Request Listing")}
          />
        </section>
      )}

      {/* List Options */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-display font-black uppercase text-zinc-400 tracking-widest pl-2">
          Personal Management
        </h3>
        <div className="brutalist-card p-2 flex flex-col divide-y-2 divide-zinc-100 dark:divide-zinc-800">
          <ListOption
            icon={<Edit3 size={18} />}
            label="Customize Profile"
            onClick={() => handleAction("Customize Profile")}
          />
          {user.role !== "Buyer" && (
            <ListOption
              icon={<Heart size={18} />}
              label="Saved Properties"
              onClick={() => handleAction("Saved Properties")}
            />
          )}
          {user.role !== "Buyer" && (
            <ListOption
              icon={<History size={18} />}
              label="Viewed History"
              onClick={() => handleAction("Viewed History")}
            />
          )}
          <ListOption
            icon={<Bell size={18} />}
            label="Price Alerts"
            badge="05"
            onClick={() => handleAction("Price Alerts")}
          />

          <div className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors w-full border-t-2 border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "transition-colors",
                  isSubscriber ? "text-brand-teal" : "text-zinc-400",
                )}
              >
                <Zap
                  size={18}
                  className={cn(isSubscriber && "fill-brand-teal")}
                />
              </div>
              <span className="text-sm font-bold uppercase tracking-tight text-brand-black dark:text-white">
                {isSubscriber ? "Active Pro Agent" : "Upgrade to Pro"}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateUser({ isSubscriber: !isSubscriber });
              }}
              className={cn(
                "w-10 h-5 rounded-full p-0.5 transition-all border-2 border-brand-black flex items-center shadow-brutal-xs active:translate-y-0.5",
                isSubscriber ? "bg-brand-teal" : "bg-zinc-200 dark:bg-zinc-700",
              )}
              aria-label="Toggle Pro Subscription"
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full bg-white border border-brand-black transition-all",
                  isSubscriber ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-display font-black uppercase text-zinc-400 tracking-widest pl-2">
          System
        </h3>
        <div className="brutalist-card p-2 flex flex-col divide-y-2 divide-zinc-100 dark:divide-zinc-800">
          <ListOption
            icon={<Sliders size={18} />}
            label="Preferences"
            onClick={() => handleAction("Preferences")}
          />
          <ListOption
            icon={<Settings size={18} />}
            label="Account Settings"
            onClick={() => handleAction("Account Settings")}
          />
          <ListOption
            icon={<HelpCircle size={18} />}
            label="Support Center"
            onClick={() => handleAction("Support Center")}
          />
          <ListOption
            icon={<LogOut size={18} className="text-red-500" />}
            label="Sign Out"
            onClick={() => handleAction("Sign Out")}
          />
        </div>
      </section>

      

      {/* Account Deletion Overlay Modal */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsEmailModalOpen(false);
                setDeleteConfirmEmail('');
              }}
              className="absolute inset-0 bg-brand-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 border-4 border-brand-red shadow-aggressive p-6 flex flex-col gap-4 text-left z-10"
            >
              <div className="flex items-center gap-2 text-brand-red">
                <AlertTriangle size={24} />
                <h2 className="text-xl font-display font-black uppercase italic">Critical Security Authorization</h2>
              </div>

              <p className="text-xs font-bold font-mono text-zinc-600 dark:text-zinc-300 leading-relaxed uppercase bg-red-50 dark:bg-[#201010] p-3 border border-brand-red/30">
                DANGER ZONE: If you terminate your credentials, any outstanding real estate listings, secure escrow holdings, tokens, or pending inspections will be permanently deleted with zero recovery path. To verify, type your registered email address <span className="font-black text-brand-red">{user.email}</span> below:
              </p>

              <input
                type="email"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder={user.email}
                className="w-full p-3 border-2 border-brand-black dark:border-zinc-700 font-mono text-xs uppercase bg-neutral-50 dark:bg-neutral-900 text-brand-black dark:text-white"
                autoFocus
              />

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsEmailModalOpen(false);
                    setDeleteConfirmEmail('');
                  }}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-black dark:border-zinc-700 py-2.5 font-display text-[10px] font-black uppercase tracking-wider text-brand-black dark:text-white font-black"
                >
                  CANCEL REQUEST
                </button>
                
                <button
                  disabled={deleteConfirmEmail !== user.email}
                  onClick={async () => {
                    try {
                      const { doc: firestoreDoc, deleteDoc } = await import("firebase/firestore");
                      await deleteDoc(firestoreDoc(db, 'users', user.id));
                      logout();
                      setIsEmailModalOpen(false);
                      setDeleteConfirmEmail('');
                    } catch (e) {
                      console.error("Account deletion failed", e);
                    }
                  }}
                  className="flex-1 bg-brand-red text-white border-2 border-brand-black py-2.5 font-display text-[10px] font-black uppercase tracking-wider shadow-brutal-xs disabled:opacity-40 disabled:cursor-not-allowed font-black"
                >
                  TERMINATE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="text-center py-4">
        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">
          RealAgents v1.0.4 - Built for Profit
        </p>
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-brand-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-aggressive flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-4 border-b-4 border-brand-black bg-brand-gray flex justify-between items-center text-brand-black shrink-0">
                <h2 className="text-lg font-display font-black uppercase tracking-tight">
                  {activeModal}
                </h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 border-2 border-brand-black bg-brand-red text-white hover:rotate-90 transition-transform shadow-brutal-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {activeModal === "Complete KYC" ? (
                  <div className="space-y-6">
                    {user.kycStatus === "Verified" ? (
                      <div className="py-10 text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-emerald-500 border-4 border-brand-black flex items-center justify-center rounded-full text-white">
                          <ShieldCheck size={32} />
                        </div>
                        <div>
                          <h3 className="font-display font-black text-xl uppercase italic text-brand-black">
                            YOU ARE VERIFIED
                          </h3>
                          <p className="text-xs font-bold text-zinc-500 uppercase mt-2 text-brand-teal">
                            Maximum trade integrity achieved.
                          </p>
                        </div>
                      </div>
                    ) : isSubmittingKYC ? (
                      <div className="py-10 text-center flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-brand-black border-t-brand-teal animate-spin rounded-full"></div>
                        <div>
                          <h3 className="font-display font-black text-xl uppercase italic text-brand-black">
                            UPDATING BIOMETRICS
                          </h3>
                          <p className="text-xs font-bold text-zinc-500 uppercase mt-2">
                            AI is cross-referencing Stage 1-2 intel...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-6 h-6 flex items-center justify-center text-[10px] font-black border-2",
                                  kycStage === step
                                    ? "bg-brand-teal border-brand-black"
                                    : kycStage > step
                                      ? "bg-brand-black text-white"
                                      : "bg-zinc-100 text-zinc-400",
                                )}
                              >
                                {kycStage > step ? (
                                  <CheckCircle size={12} />
                                ) : (
                                  step
                                )}
                              </div>
                              {step < 3 && (
                                <div className="w-12 h-0.5 bg-zinc-200" />
                              )}
                            </div>
                          ))}
                        </div>

                        {kycStage === 1 && (
                          <div className="space-y-4">
                            <h4 className="text-xs font-display font-black uppercase italic text-brand-teal">
                              Stage 1: Basic Intelligence
                            </h4>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="group">
                                  <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1 block">
                                    First Name
                                  </label>
                                  <input
                                    type="text"
                                    value={profileEditData.firstName}
                                    onChange={(e) =>
                                      setProfileEditData({
                                        ...profileEditData,
                                        firstName: e.target.value,
                                      })
                                    }
                                    className="brutalist-input h-10 text-xs w-full bg-white"
                                    placeholder="Legal First Name"
                                  />
                                </div>
                                <div className="group">
                                  <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1 block">
                                    Last Name
                                  </label>
                                  <input
                                    type="text"
                                    value={profileEditData.lastName}
                                    onChange={(e) =>
                                      setProfileEditData({
                                        ...profileEditData,
                                        lastName: e.target.value,
                                      })
                                    }
                                    className="brutalist-input h-10 text-xs w-full bg-white"
                                    placeholder="Legal Last Name"
                                  />
                                </div>
                              </div>
                              <div className="group">
                                <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1 block">
                                  Display Name
                                  </label>
                                  <input
                                    type="text"
                                    value={profileEditData.name}
                                    onChange={(e) =>
                                      setProfileEditData({
                                        ...profileEditData,
                                        name: e.target.value,
                                      })
                                    }
                                    className="brutalist-input h-10 text-xs w-full bg-white"
                                  />
                                </div>
                                <div className="group">
                                  <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1 block">
                                    Gender Identity
                                  </label>
                                  <select
                                    value={profileEditData.gender}
                                    onChange={(e) =>
                                      setProfileEditData({
                                        ...profileEditData,
                                        gender: e.target.value as any,
                                      })
                                    }
                                    className="brutalist-input h-10 text-xs w-full bg-white"
                                  >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">
                                      Prefer not to say
                                    </option>
                                  </select>
                                </div>
                                <div className="group">
                                  <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1 block">
                                    Date of Birth
                                  </label>
                                  <input
                                    type="date"
                                    className="brutalist-input h-10 text-xs w-full bg-white"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => setKycStage(2)}
                                className="brutalist-button-teal w-full py-3 text-xs font-black uppercase tracking-wider"
                              >
                                PROCEED TO PHONE VERIFICATION
                              </button>
                            </div>
                          )}

                          {kycStage === 2 && (
                            <div className="space-y-4">
                              <h4 className="text-xs font-display font-black uppercase italic text-brand-teal">
                                Stage 2: Phone Authentication
                              </h4>
                              
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight leading-normal">
                                To ensure total platform trust and prevent duplicated credentials, please authenticate your unique phone number below.
                              </p>

                              <div className="space-y-3">
                                <div className="group">
                                  <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1 block">
                                    Phone Number (with Dial Code, e.g. +234...)
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="tel"
                                      disabled={isOTPSent && isPhoneVerified}
                                      value={phoneNumber}
                                      onChange={(e) => setPhoneNumber(e.target.value)}
                                      className="brutalist-input h-10 text-xs flex-1 bg-white dark:bg-zinc-800"
                                      placeholder="+2348012345678"
                                    />
                                    <button
                                      type="button"
                                      disabled={isPhoneVerified}
                                      onClick={handleSendOTP}
                                      className="bg-brand-black hover:bg-zinc-850 dark:bg-zinc-800 text-white px-3 border-2 border-brand-black text-[10px] font-black uppercase shadow-brutal-xs text-xs"
                                    >
                                      {isOTPSent ? "RESEND" : "SEND OTP"}
                                    </button>
                                  </div>
                                </div>

                                {isOTPSent && !isPhoneVerified && (
                                  <div className="group animate-fade-in">
                                    <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1 block">
                                      Enter 6-Digit OTP Code
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        className="brutalist-input h-10 text-center text-xs tracking-[0.5em] font-mono flex-1 bg-white dark:bg-zinc-800"
                                        placeholder="123456"
                                        maxLength={6}
                                      />
                                      <button
                                        type="button"
                                        onClick={handleVerifyOTP}
                                        className="brutalist-button-teal px-5 h-10 text-[10px]"
                                      >
                                        VERIFY OTP
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {phoneError && (
                                  <p className="text-[10px] font-black text-brand-red uppercase bg-red-50 dark:bg-red-950/20 p-2.5 border border-brand-red/30">
                                    {phoneError}
                                  </p>
                                )}

                                {isPhoneVerified && (
                                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase flex items-center gap-2">
                                    <CheckCircle size={14} className="shrink-0 animate-bounce" />
                                    <span>Phone number verified & unique!</span>
                                  </div>
                                )}
                              </div>

                              {/* Hidden container for Google Firebase Recaptcha */}
                              <div id="recaptcha-container" className="hidden"></div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => setKycStage(1)}
                                  className="brutalist-button-white flex-1 py-3 text-xs font-black uppercase"
                                >
                                  BACK
                                </button>
                                <button
                                  disabled={!isPhoneVerified}
                                  onClick={() => setKycStage(3)}
                                  className="brutalist-button-teal flex-1 py-3 text-xs font-black uppercase disabled:opacity-50"
                                >
                                  CONTINUE
                                </button>
                              </div>
                            </div>
                          )}

                          {kycStage === 3 && (
                            <div className="space-y-6">
                              <h4 className="text-xs font-display font-black uppercase italic text-brand-teal">
                                Stage 3: NIN & Documentation
                              </h4>

                              {/* National Identification Number input field */}
                              <div className="group bg-white dark:bg-zinc-900 border-2 border-brand-black p-4 shadow-brutal-xs">
                                <label className="text-[10px] font-black uppercase text-brand-black dark:text-gray-150 tracking-wider mb-1 block">
                                  National Identification Number (NIN)
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={11}
                                  value={ninNumber}
                                  onChange={(e) => {
                                    // only digits
                                    const val = e.target.value.replace(/\D/g, "");
                                    setNinNumber(val);
                                  }}
                                  className="brutalist-input h-10 text-xs w-full bg-zinc-50 dark:bg-zinc-800 font-mono"
                                  placeholder="Enter 11-digit NIN"
                                />
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight mt-2 leading-normal">
                                  Your NIN will be collected for regulatory compliance. BVN verification will be added when payment processing is activated.
                                </p>
                                {ninError && (
                                  <p className="text-[10px] font-black text-brand-red uppercase mt-2">
                                    {ninError}
                                  </p>
                                )}
                              </div>

                              <div className="bg-brand-gray dark:bg-zinc-900 p-4 border-2 border-brand-black dark:border-zinc-700 space-y-4">
                                <h5 className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                  Required Supporting Documents
                                </h5>
                                <div className="grid grid-cols-1 gap-3">
                                  {[
                                    {
                                      id: "nin",
                                      icon: <FileText size={14} />,
                                      label: "NIN Slip Copy",
                                    },
                                    {
                                      id: "passport",
                                      icon: <Camera size={14} />,
                                      label: "Passport Photo",
                                    },
                                    {
                                      id: "utility",
                                      icon: <MapPin size={14} />,
                                      label: "Utility Bill / Right of Occupancy",
                                    },
                                  ].map((doc) => {
                                    const isSelected = kycFiles.includes(doc.id);
                                    const fileName = uploadedKycFiles[doc.id];
                                    return (
                                      <div
                                        key={doc.id}
                                        className="flex flex-col gap-1"
                                      >
                                        <label
                                          className={cn(
                                            "flex items-center gap-3 p-3 border-2 cursor-pointer transition-all",
                                            isSelected
                                              ? "border-brand-teal bg-brand-teal/10 text-brand-black dark:text-brand-teal"
                                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
                                          )}
                                        >
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() =>
                                              setKycFiles(
                                                isSelected
                                                  ? kycFiles.filter(
                                                      (f) => f !== doc.id,
                                                    )
                                                  : [...kycFiles, doc.id],
                                              )
                                            }
                                          />
                                          <span className="text-[10px] font-black uppercase flex-1">
                                            {doc.label}
                                          </span>
                                          {isSelected && (
                                            <CheckCircle
                                              size={14}
                                              className="text-brand-teal"
                                            />
                                          )}
                                        </label>
                                        {isSelected && (
                                          <div className="p-2 border-x-2 border-b-2 border-brand-teal bg-white dark:bg-zinc-850 flex items-center justify-between gap-2">
                                            <span className="text-[8px] font-black uppercase text-zinc-400 truncate flex-1 leading-none">
                                              {fileName || "Click upload file button"}
                                            </span>
                                            <label className="bg-brand-black text-white px-2 py-1 text-[8px] font-black uppercase cursor-pointer hover:bg-zinc-900 transition-colors">
                                              Upload
                                              <input
                                                type="file"
                                                className="hidden"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={(e) =>
                                                  handleKycFileUpload(doc.id, e)
                                                }
                                              />
                                            </label>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setKycStage(2)}
                                  className="brutalist-button-white flex-1 py-4 text-xs font-black uppercase animate-pulse"
                                >
                                  BACK
                                </button>
                                <button
                                  disabled={
                                    kycFiles.length < 1 ||
                                    Object.keys(uploadedKycFiles).length < 1 ||
                                    !ninNumber
                                  }
                                  onClick={async () => {
                                    setNinError(null);
                                    if (ninNumber.length !== 11) {
                                      setNinError("NIN must be exactly 11 digits.");
                                      return;
                                    }
                                    setIsSubmittingKYC(true);
                                    setTimeout(async () => {
                                      await updateUser({
                                        kycStatus: "Pending",
                                        ninNumber: ninNumber,
                                        kycDocuments: kycFiles,
                                        phoneNumber: phoneNumber,
                                      });
                                      setIsSubmittingKYC(false);
                                      setActiveModal(null);
                                      setKycStage(1);
                                    }, 3000);
                                  }}
                                  className="brutalist-button-teal flex-1 py-4 text-xs font-black uppercase tracking-wider disabled:opacity-50"
                                >
                                  SUBMIT FOR REVIEW
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                ) : activeModal === "Additional Listing Cost" ? (
                  <div className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center gap-4">
                    <div className="w-16 h-16 border-4 border-brand-black bg-brand-teal flex items-center justify-center rotate-3 shadow-brutal-sm text-brand-black">
                      <PlusCircle size={32} />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase italic mb-1">
                        ADDITIONAL LISTING
                      </h3>
                      <p className="text-xs uppercase font-bold text-zinc-500">
                        You have reached your included quota (
                        {isSubscriber ? "6" : "2"} listings).
                      </p>
                      <p className="text-[10px] font-black text-brand-teal uppercase mt-2 tracking-widest border-2 border-brand-teal p-2 bg-brand-teal/5 italic">
                        Cost: {ADDITIONAL_LISTING_COST} Tokens
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full mt-4">
                      <button
                        onClick={() => {
                          if (user.tokens >= ADDITIONAL_LISTING_COST) {
                            setActiveModal(null);
                            window.dispatchEvent(
                              new CustomEvent("open-listing-flow"),
                            );
                          } else {
                            setActiveModal("Insufficient Tokens");
                          }
                        }}
                        className="bg-brand-black text-white font-display font-black uppercase text-sm py-3 border-2 border-brand-black shadow-brutal-sm active:translate-y-1 transition-all"
                      >
                        Accept & Proceed
                      </button>
                      <button
                        onClick={() => setActiveModal(null)}
                        className="text-[10px] font-black uppercase text-zinc-400 hover:text-brand-black transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : activeModal === "Insufficient Tokens" ? (
                  <div className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center gap-4">
                    <div className="w-16 h-16 border-4 border-brand-black bg-brand-red flex items-center justify-center rotate-3 shadow-brutal-sm">
                      <Zap
                        size={32}
                        className="text-white -rotate-3 fill-white"
                      />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase italic mb-1 text-brand-red">
                        OUT OF TOKENS
                      </h3>
                      <p className="text-xs uppercase font-bold text-zinc-500">
                        You need more fuel to execute this operation.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveModal(null);
                        setActiveView("Wallet");
                      }}
                      className="mt-4 w-full bg-brand-black text-brand-teal font-display font-black uppercase text-sm py-3 border-2 border-brand-black shadow-brutal-sm"
                    >
                      Refill Wallet
                    </button>
                  </div>
                ) : activeModal === "Boost Limit Reached" ? (
                  <div className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center gap-4">
                    <div className="w-16 h-16 border-4 border-brand-black bg-amber-400 flex items-center justify-center rotate-3 shadow-brutal-sm text-brand-black">
                      <Zap size={32} className="fill-brand-black" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase italic mb-1">
                        BOOST LIMIT REACHED
                      </h3>
                      <p className="text-xs uppercase font-bold text-zinc-500">
                        Pro Agents can have 3 active boosts simultaneously.
                      </p>
                      <p className="text-[10px] font-black text-brand-teal uppercase mt-2">
                        * Unboost a listing to free up slots
                      </p>
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
                      <Settings
                        size={32}
                        className="text-brand-black -rotate-3"
                      />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase italic mb-1">
                        UPGRADE TO PRO
                      </h3>
                      <p className="text-xs uppercase font-bold text-zinc-500">
                        Feature Restricted.
                      </p>
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
  const config: Record<
    ListingStatus,
    { icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    Pending: {
      icon: <Clock size={10} />,
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-500",
      border: "border-zinc-300 dark:border-zinc-600",
    },
    "Agent Bidding": {
      icon: <Dices size={10} />,
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-400/50",
    },
    "Inspection Scheduled": {
      icon: <Calendar size={10} />,
      bg: "bg-brand-teal/10",
      text: "text-brand-teal",
      border: "border-brand-teal/50",
    },
    "Under Review": {
      icon: <Zap size={10} />,
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-400/50",
    },
    Approved: {
      icon: <CheckCircle size={10} />,
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-400/50",
    },
    Rejected: {
      icon: <AlertTriangle size={10} />,
      bg: "bg-brand-red/10",
      text: "text-brand-red",
      border: "border-brand-red/50",
    },
    Archived: {
      icon: <Power size={10} />,
      bg: "bg-zinc-800",
      text: "text-zinc-500",
      border: "border-zinc-700",
    },
    Inactive: {
      icon: <AlertTriangle size={10} />,
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-400/50",
    },
  };

  const { icon, bg, text, border } = config[status];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 border-2 text-[9px] font-black uppercase tracking-tight shadow-brutal-xs",
        bg,
        text,
        border,
      )}
    >
      {icon}
      {status}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800 p-2 border border-zinc-700 flex flex-col items-center">
      <span className="text-[9px] font-black uppercase text-zinc-500">
        {label}
      </span>
      <span className="text-lg font-display font-black">{value}</span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  subLabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="brutalist-card p-4 flex flex-col items-start gap-2 hover:bg-brand-gray dark:hover:bg-zinc-800 text-left"
    >
      {icon}
      <div>
        <p className="text-xs font-display font-black uppercase tracking-tight leading-none text-brand-black dark:text-brand-gray">
          {label}
        </p>
        <p className="text-[9px] font-bold text-zinc-500 uppercase">
          {subLabel}
        </p>
      </div>
    </button>
  );
}

function ListOption({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors w-full text-left"
    >
      <div className="flex items-center gap-3">
        <div className="text-zinc-600 dark:text-zinc-400">{icon}</div>
        <span className="text-sm font-bold uppercase tracking-tight text-brand-black dark:text-white">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="bg-brand-red text-white text-[10px] font-black px-1.5 py-0.5 border border-brand-black dark:border-transparent shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b]">
            {badge}
          </span>
        )}
        <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600" />
      </div>
    </button>
  );
}
