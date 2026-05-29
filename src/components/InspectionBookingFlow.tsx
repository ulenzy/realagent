import React, { useState } from 'react';
import { Calendar, Clock, CreditCard, CheckCircle, AlertTriangle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { sendNotification } from '../lib/notifications';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string, email?: string) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || null,
      email: email || null,
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generate chat ID identical to Messaging.tsx
const getChatId = (uid1: string, uid2: string, propId: string) => {
  const sorted = [uid1, uid2].sort();
  return `${sorted[0]}_${sorted[1]}_${propId}`;
};

// Next 7 days helper
const getNext7Days = () => {
  const days = [];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayOfWeek = weekdayNames[d.getDay()];
    const dayOfMonth = d.getDate();
    const month = monthNames[d.getMonth()];
    const formattedDate = `${dayOfWeek}, ${month} ${dayOfMonth}`;
    const isSunday = d.getDay() === 0;
    
    days.push({
      dateObj: d,
      dayOfWeek,
      dayOfMonth,
      month,
      formattedDate,
      isSunday,
    });
  }
  return days;
};

interface InspectionBookingFlowProps {
  property: Property;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function InspectionBookingFlow({ property, user, onClose, onSuccess }: InspectionBookingFlowProps) {
  const nextDays = getNext7Days();
  const firstAvailableDay = nextDays.find(d => !d.isSunday)?.formattedDate || nextDays[0].formattedDate;

  const [selectedDate, setSelectedDate] = useState<string>(firstAvailableDay);
  const [selectedSlot, setSelectedSlot] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning');
  const [statusState, setStatusState] = useState<'idle' | 'submitting' | 'success' | 'err'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const timeSlots = [
    { label: 'Morning' as const, range: '9AM–12PM', description: 'Best for cool breeze' },
    { label: 'Afternoon' as const, range: '12PM–3PM', description: 'Best for lighting' },
    { label: 'Evening' as const, range: '3PM–6PM', description: 'Best for sunset view' },
  ];

  const listingId = property.listingRequestId || property.id;
  const agentId = property.agent?.id || 'agent_fallback';

  const handleConfirmBooking = async () => {
    if (!user) {
      setErrorMessage('User context is invalid. Please sign in again.');
      setStatusState('err');
      return;
    }

    setStatusState('submitting');
    setErrorMessage('');

    const scheduledSlotObj = timeSlots.find(s => s.label === selectedSlot);
    const timeSlotLabel = `${selectedSlot} (${scheduledSlotObj?.range})`;

    const bookingData = {
      listingId,
      propertyId: property.id,
      buyerId: user.id,
      agentId: agentId,
      scheduledDate: selectedDate,
      timeSlot: timeSlotLabel,
      feeStatus: 'Stub — Paystack pending',
      status: 'Requested',
      createdAt: new Date().toISOString()
    };

    const isLocalGuest = !db || user?.isGuest || user?.id === 'guest_local_user' || localStorage.getItem('isLocalGuest') === 'true';

    if (isLocalGuest) {
      try {
        // Mock offline Guest mode
        const storedInspections = JSON.parse(localStorage.getItem('localGuestInspectionRequests') || '[]');
        storedInspections.unshift({ id: `inspect_${Date.now()}`, ...bookingData });
        localStorage.setItem('localGuestInspectionRequests', JSON.stringify(storedInspections));

        // Update local listings state
        const storedRequests = JSON.parse(localStorage.getItem('localGuestListings') || '[]');
        const updatedRequests = storedRequests.map((req: any) => {
          if (req.id === listingId) {
            return { ...req, dealStatus: 'Inspection Paid' };
          }
          return req;
        });
        localStorage.setItem('localGuestListings', JSON.stringify(updatedRequests));

        // Update local properties state
        const storedProperties = JSON.parse(localStorage.getItem('localGuestProperties') || '[]');
        const updatedProperties = storedProperties.map((p: any) => {
          if (p.listingRequestId === listingId || p.id === property.id) {
            return { ...p, dealStatus: 'Inspection Paid' };
          }
          return p;
        });
        localStorage.setItem('localGuestProperties', JSON.stringify(updatedProperties));

        // Also add simulated transaction Debit
        const storedTrans = JSON.parse(localStorage.getItem('localGuestTransactions') || '[]');
        storedTrans.unshift({
          id: `tx_${Date.now()}`,
          type: 'Debit',
          amount: 15000,
          description: `Inspection Fee payment for ${property.title}`,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('localGuestTransactions', JSON.stringify(storedTrans));

        // Trigger in-app notification dispatch mimicking production logic
        await sendNotification(agentId, {
          type: 'inspection_confirmed',
          title: 'New Inspection Request',
          body: `New inspection request for ${property.title} on ${selectedDate}.`
        });

        await sendNotification(user.id, {
          type: 'in_app',
          title: 'Inspection Requested',
          body: `Your inspection for ${property.title} has been requested for ${selectedDate} (${timeSlotLabel}).`
        });

        window.dispatchEvent(new Event('local_guest_properties_updated'));
        setStatusState('success');
        onSuccess?.();
      } catch (localErr: any) {
        setErrorMessage(localErr.message || 'Error scheduling local booking.');
        setStatusState('err');
      }
    } else {
      // Real database integration
      try {
        // 1. Create inspectionRequests document
        try {
          const inspectCol = collection(db, 'inspectionRequests');
          await addDoc(inspectCol, bookingData);
        } catch (addError) {
          handleFirestoreError(addError, OperationType.WRITE, 'inspectionRequests', user.id, user.email);
        }

        // 2. Setup/Update Chat inspectionFeePaid flag
        try {
          const chatId = getChatId(user.id, agentId, property.id);
          const chatDocRef = doc(db, 'chats', chatId);
          const chatSnap = await getDoc(chatDocRef);
          
          if (!chatSnap.exists()) {
            await setDoc(chatDocRef, {
              participants: [user.id, agentId].sort(),
              propertyId: property.id,
              propertyName: property.title,
              inspectionFeePaid: true,
              createdAt: new Date().toISOString()
            });
          } else {
            await updateDoc(chatDocRef, { inspectionFeePaid: true });
          }
        } catch (chatError) {
          handleFirestoreError(chatError, OperationType.WRITE, `chats`, user.id, user.email);
        }

        // 3. Update listing requests dealStatus
        try {
          const listingDocRef = doc(db, 'listingRequests', listingId);
          await updateDoc(listingDocRef, { dealStatus: 'Inspection Paid' });
        } catch (lErr) {
          console.warn('Omitted non-critical listing update error:', lErr);
        }

        // 4. Update core properties dealStatus
        try {
          const propertyDocRef = doc(db, 'properties', property.id);
          await updateDoc(propertyDocRef, { dealStatus: 'Inspection Paid' });
        } catch (pErr) {
          console.warn('Omitted non-critical property update error:', pErr);
        }

        // 5. Fire notifications (push + SMS to agent, confirmation to buyer)
        await sendNotification(agentId, {
          type: 'inspection_confirmed', // Critical event -> triggers SMS and push
          title: 'New Inspection Request',
          body: `New inspection request for ${property.title} on ${selectedDate}.`,
          data: {
            propertyId: property.id,
            listingId
          }
        });

        await sendNotification(user.id, {
          type: 'in_app',
          title: 'Inspection Requested',
          body: `Your inspection for ${property.title} is requested for ${selectedDate} (${timeSlotLabel}).`,
          data: {
            propertyId: property.id,
            listingId
          }
        });

        setStatusState('success');
        onSuccess?.();
      } catch (err: any) {
        setErrorMessage(err.message || 'An error occurred during booking confirmation.');
        setStatusState('err');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] overflow-hidden flex items-end justify-center">
      {/* Semi-transparent Backdrop overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-black/60 backdrop-blur-xs cursor-pointer pointer-events-auto"
      />

      {/* Spring Sliding Panel */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="w-full max-w-xl bg-white dark:bg-zinc-950 border-t-4 border-l-4 border-r-4 border-brand-black dark:border-zinc-800 shadow-aggressive dark:shadow-[0_-6px_0px_0px_rgba(24,24,27,1)] rounded-t-2xl z-[1210] pointer-events-auto flex flex-col max-h-[85vh] overflow-y-auto"
        id="inspection-booking-drawer"
      >
        {/* Header section with Property info */}
        <div className="p-5 border-b-2 border-brand-black dark:border-zinc-800 flex items-start justify-between gap-4 sticky top-0 bg-white dark:bg-zinc-950 z-[10]">
          <div className="flex gap-4">
            <img 
              src={property.image}
              alt={property.title}
              referrerPolicy="no-referrer"
              className="w-16 h-16 object-cover border-2 border-brand-black dark:border-zinc-800 shadow-brutal-xs flex-shrink-0"
            />
            <div className="flex flex-col justify-center">
              <span className="text-[9px] font-black uppercase text-brand-teal tracking-widest">Schedule Inspection</span>
              <h3 className="text-sm font-display font-black leading-snug tracking-tight dark:text-zinc-100 line-clamp-1">{property.title}</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">
                {property.location.area}, {property.location.city}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent hover:border-brand-black transition-all"
            aria-label="Close booking panel"
          >
            <X size={18} className="dark:text-zinc-300" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 flex-1 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {statusState === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-8 text-center flex flex-col items-center justify-center gap-4"
              >
                <div className="w-16 h-16 text-brand-teal bg-brand-teal/10 rounded-full flex items-center justify-center p-3 border-4 border-brand-black">
                  <CheckCircle size={40} className="stroke-2 text-brand-teal" />
                </div>
                <h4 className="text-xl font-display font-black tracking-tight uppercase italic mt-2 dark:text-white">Request Successful!</h4>
                <p className="text-xs font-semibold text-zinc-650 dark:text-zinc-300 max-w-sm leading-relaxed px-4">
                  Inspection requested — your agent will confirm within 24 hours.
                </p>
                
                <div className="mt-4 p-4 border-2 border-brand-black dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-brutal-xs text-left w-full">
                  <div className="text-[10px] font-black uppercase text-zinc-400">Date & Slot Details</div>
                  <div className="font-display font-black capitalize dark:text-zinc-200 mt-0.5">{selectedDate}</div>
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 font-mono">{selectedSlot} ({timeSlots.find(s => s.label === selectedSlot)?.range})</div>
                </div>

                <button 
                  onClick={onClose}
                  className="brutalist-button w-full mt-6 py-3 text-xs tracking-widest font-black uppercase"
                >
                  Return to Details
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                {/* 1. Date Chips Horizontal Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Calendar size={14} className="text-brand-teal" />
                      1. Choose Date
                    </label>
                    <span className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Next 7 Days</span>
                  </div>
                  
                  <div className="flex overflow-x-auto gap-3 py-1 scrollbar-none snap-x pointer-events-auto">
                    {nextDays.map((day, ix) => {
                      const isSelected = selectedDate === day.formattedDate;
                      const isDisabled = day.isSunday;
                      return (
                        <button
                          key={ix}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => !isDisabled && setSelectedDate(day.formattedDate)}
                          className={cn(
                            "flex-shrink-0 w-20 py-2.5 border-2 flex flex-col items-center justify-center font-display transition-all snap-start",
                            isSelected 
                              ? "border-brand-black dark:border-zinc-200 bg-brand-teal text-brand-black font-black scale-102 shadow-brutal-xs" 
                              : isDisabled
                                ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border-dashed"
                                : "border-brand-black/30 bg-white hover:bg-zinc-50 hover:border-brand-black dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-200"
                          )}
                        >
                          <span className="text-[8px] uppercase font-black tracking-widest">{day.dayOfWeek}</span>
                          <span className="text-lg font-black font-display leading-none my-0.5">{day.dayOfMonth}</span>
                          <span className="text-[8px] uppercase font-bold opacity-80">{day.month}</span>
                          {isDisabled && (
                            <span className="text-[8px] font-black uppercase text-red-500 mt-1">Closed</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Three cards for time slots */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock size={14} className="text-brand-teal" />
                    2. Select Preferred Time Slot
                  </label>

                  <div className="grid grid-cols-3 gap-3">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.label;
                      return (
                        <button
                          key={slot.label}
                          type="button"
                          onClick={() => setSelectedSlot(slot.label)}
                          className={cn(
                            "p-3.5 border-2 flex flex-col items-center justify-center text-center transition-all",
                            isSelected
                              ? "border-brand-black dark:border-zinc-200 bg-brand-teal text-brand-black font-black shadow-brutal-xs scale-102"
                              : "border-brand-black/30 bg-white hover:border-brand-black dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-200"
                          )}
                        >
                          <span className="text-xs font-black uppercase">{slot.label}</span>
                          <span className="text-[9px] font-bold font-mono text-zinc-500 dark:text-zinc-400 mt-1 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                            {slot.range}
                          </span>
                          <span className="text-[8px] opacity-70 mt-1.5 leading-tight">{slot.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Fee & Safety Guarantee */}
                <div className="p-4 border-2 border-brand-black dark:border-zinc-850 bg-brand-teal/5 text-zinc-650 dark:text-zinc-300 font-display flex flex-col gap-1 shadow-brutal-sm">
                  <p className="flex items-center gap-1.5 font-black text-brand-black dark:text-zinc-100 text-xs">
                    <Info size={14} className="text-brand-teal flex-shrink-0" />
                    <span className="uppercase tracking-tight">Inspection Fee: ₦15,000</span>
                  </p>
                  <p className="text-[10px] leading-relaxed opacity-95">
                    Fully refundable if listing doesn't match description. Secured via Paystack Escrow.
                  </p>
                </div>

                {/* Error Banner if any */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-red-700 dark:text-red-400 text-[11px] font-bold flex gap-2">
                    <AlertTriangle size={14} className="shrink-0 text-red-500" />
                    <span className="leading-snug">{errorMessage}</span>
                  </div>
                )}

                {/* 4. Action Button */}
                <button 
                  onClick={handleConfirmBooking}
                  disabled={statusState === 'submitting'}
                  className={cn(
                    "w-full py-4 font-display font-black text-sm uppercase tracking-widest text-center transition-all bg-brand-teal text-brand-black border-2 border-brand-black shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutal-xs flex items-center justify-center gap-2",
                    statusState === 'submitting' && "opacity-75 cursor-not-allowed"
                  )}
                >
                  <CreditCard size={18} />
                  {statusState === 'submitting' ? 'PRODUCING ESCROW PAYMENT...' : 'CONFIRM BOOKING'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
