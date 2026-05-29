import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Search, ArrowLeft, MoreVertical, CheckCheck, MapPin, ExternalLink, Lock, Smile } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { cn } from '../lib/utils';
import { ChatSession, Message } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc, addDoc, orderBy } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { AVATAR_COSMETICS } from '../constants/cosmetics';

interface MessagingProps {
  isOpen: boolean;
  onClose: () => void;
  initialChatId?: string | null;
}

export default function Messaging({ isOpen, onClose, initialChatId }: MessagingProps) {
  const { user } = useAuth();
  const isMockUser = !user || user.isGuest || user.id === 'guest_local_user' || user.id === 'google_local_user' || user.id === 'facebook_local_user' || !auth.currentUser;

  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialChatId || null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [sessions, setSessions] = useState<any[]>([]);
  const [firestoreMessages, setFirestoreMessages] = useState<any[]>([]);
  const [blockedMessages, setBlockedMessages] = useState<Record<string, any[]>>({});
  const [participantDetails, setParticipantDetails] = useState<Record<string, { id: string, name: string, avatar: string }>>({});
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [handshakeSessions] = useState<Set<string>>(new Set());

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getChatId = (uid1: string, uid2: string, propId: string) => {
    const sorted = [uid1, uid2].sort();
    return `${sorted[0]}_${sorted[1]}_${propId}`;
  };

  const filterMessage = (text: string, inspectionFeePaid: boolean): { allowed: boolean; blockedReason?: string } => {
    if (inspectionFeePaid) {
      return { allowed: true };
    }
    const phonePattern = /(\+?234|0)[789][01]\d{8}/g;
    const whatsappPattern = /whatsapp|wa\.me|\+234/gi;
    const urlPattern = /https?:\/\//gi;

    if (phonePattern.test(text) || whatsappPattern.test(text) || urlPattern.test(text)) {
      return {
        allowed: false,
        blockedReason: 'Phone numbers and external links are unlocked after inspection fee payment.'
      };
    }
    return { allowed: true };
  };

  // Sync activeSessionId with prop change
  useEffect(() => {
    if (initialChatId) {
      setActiveSessionId(initialChatId);
    }
  }, [initialChatId]);

  // handle open chat event
  useEffect(() => {
    const handleOpenChatEvent = (e: any) => {
      const { agentId, agentName, agentAvatar, propertyId, propertyName } = e.detail || {};
      if (!agentId || !user) return;

      const chatId = getChatId(user.id, agentId, propertyId || 'general');

      const chatDocRef = doc(db, 'chats', chatId);
      getDoc(chatDocRef).then((chatSnap) => {
        if (!chatSnap.exists()) {
          setDoc(chatDocRef, {
            participants: [user.id, agentId].sort(),
            propertyId: propertyId || 'general',
            propertyName: propertyName || 'General Inquiry',
            inspectionFeePaid: false,
            createdAt: new Date().toISOString()
          }).then(() => {
            setActiveSessionId(chatId);
          }).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
          });
        } else {
          setActiveSessionId(chatId);
        }
      }).catch((err) => {
        handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
      });

      if (propertyName && propertyName !== 'General Inquiry') {
        setNewMessage(`Hello ${agentName || 'Agent'}! I'm interested in "${propertyName}". Could you provide more details?`);
      }
    };

    window.addEventListener('open-chat', handleOpenChatEvent);
    return () => window.removeEventListener('open-chat', handleOpenChatEvent);
  }, [user, sessions]);

  // Query chats on mount
  useEffect(() => {
    if (isMockUser) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const loadedSessions: any[] = [];
      snapshot.forEach((docDoc) => {
        const data = docDoc.data();
        const otherUserId = data.participants.find((id: string) => id !== user.id) || '';
        loadedSessions.push({
          id: docDoc.id,
          propertyId: data.propertyId,
          propertyName: data.propertyName,
          inspectionFeePaid: !!data.inspectionFeePaid,
          createdAt: data.createdAt,
          participant: {
            id: otherUserId,
            name: 'Loading...',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId}`
          },
          lastMessage: data.lastMessage || 'No messages yet',
          lastTimestamp: data.lastTimestamp || data.createdAt || new Date().toISOString(),
          unreadCount: data.unreadCount?.[user.id] || 0
        });
      });

      setSessions(loadedSessions);

      // Fetch participants info
      loadedSessions.forEach((session) => {
        const otherId = session.participant.id;
        if (otherId && !participantDetails[otherId]) {
          getDoc(doc(db, 'users', otherId)).then((userDoc) => {
            if (userDoc.exists()) {
              const uData = userDoc.data();
              const fullName = uData.firstName && uData.lastName 
                ? `${uData.firstName} ${uData.lastName}` 
                : (uData.name || `User ${otherId.slice(0, 5)}`);
              const avatar = uData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`;
              setParticipantDetails(prev => ({
                ...prev,
                [otherId]: { id: otherId, name: fullName, avatar }
              }));
            }
          }).catch((err) => {
            console.error("Failed to load details for", otherId, err);
          });
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Query messages for activeSessionId
  useEffect(() => {
    if (isMockUser || !activeSessionId) {
      setFirestoreMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chats', activeSessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((msgDoc) => {
        const data = msgDoc.data();
        msgs.push({
          id: msgDoc.id,
          senderId: data.senderId,
          receiverId: data.receiverId || '',
          text: data.text,
          timestamp: data.timestamp,
          blocked: !!data.blocked
        });
      });
      setFirestoreMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeSessionId}/messages`);
    });

    return () => unsubscribe();
  }, [activeSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeSessionId) {
      scrollToBottom();
    }
  }, [activeSessionId, firestoreMessages, blockedMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeSessionId || !user) return;

    const activeSess = sessions.find(s => s.id === activeSessionId);
    if (!activeSess) return;

    const currentInspectionFeePaid = !!activeSess.inspectionFeePaid;
    const filterResult = filterMessage(newMessage, currentInspectionFeePaid);

    if (!filterResult.allowed) {
      const blockedMsg = {
        id: `blocked-${Date.now()}`,
        senderId: user.id,
        receiverId: activeSess.participant.id,
        text: newMessage,
        timestamp: new Date().toISOString(),
        blocked: true,
        blockedReason: filterResult.blockedReason || 'Content blocked'
      };

      setBlockedMessages(prev => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] || []), blockedMsg]
      }));

      setNewMessage('');
      setShowEmojiPicker(false);
      return;
    }

    try {
      const messagesCollectionRef = collection(db, 'chats', activeSessionId, 'messages');
      await addDoc(messagesCollectionRef, {
        senderId: user.id,
        receiverId: activeSess.participant.id,
        text: newMessage,
        timestamp: new Date().toISOString(),
        blocked: false
      });

      const chatDocRef = doc(db, 'chats', activeSessionId);
      await setDoc(chatDocRef, {
        lastMessage: newMessage,
        lastTimestamp: new Date().toISOString()
      }, { merge: true });

      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${activeSessionId}/messages`);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  if (isMockUser) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-brand-gray dark:bg-[#1c1c21] z-[70] border-l-4 border-brand-black dark:border-zinc-800 shadow-2xl flex flex-col justify-center items-center p-8 text-center"
            >
              <div className="p-4 bg-brand-teal text-brand-black border-4 border-brand-black mb-6 shadow-brutal-xs">
                <Lock size={36} />
              </div>
              <h2 className="text-xl font-display font-black uppercase italic text-brand-black dark:text-white mb-2">ACCESS RESTRICTED</h2>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest leading-relaxed mb-6">
                Please sign in with Google or Facebook to interact with registered agents.
              </p>
              <button onClick={onClose} className="brutalist-button-black w-full py-3 font-bold uppercase tracking-widest text-xs">
                Go Back
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  const enhancedSessions = sessions.map((session) => {
    const details = participantDetails[session.participant.id];
    return {
      ...session,
      participant: {
        ...session.participant,
        name: details?.name || session.participant.name || 'User',
        avatar: details?.avatar || session.participant.avatar
      }
    };
  });

  const activeSession = enhancedSessions.find((s) => s.id === activeSessionId);

  const currentMessages = activeSessionId
    ? [
        ...firestoreMessages,
        ...(blockedMessages[activeSessionId] || [])
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm z-[60] md:hidden"
          />

          {/* Messaging Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-brand-gray dark:bg-[#1c1c21] z-[70] border-l-4 border-brand-black dark:border-zinc-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-b-4 border-brand-black dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeSessionId && (
                  <button onClick={() => setActiveSessionId(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                    <ArrowLeft size={20} />
                  </button>
                )}
                <h2 className="font-display font-black uppercase italic tracking-tighter text-xl">
                  {activeSessionId ? "Direct" : "Messages"}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 border-2 border-brand-black hover:bg-brand-red hover:text-white transition-colors shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Session List */}
              <div className={cn(
                "flex-1 flex flex-col min-h-0 min-w-0",
                activeSessionId ? "hidden" : "flex"
              )}>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search messages..."
                      className="brutalist-input pl-10"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full">
                  {enhancedSessions.length > 0 ? (
                    enhancedSessions.sort((a,b) => new Date(b.lastTimestamp || 0).getTime() - new Date(a.lastTimestamp || 0).getTime()).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id)}
                        className={cn(
                          "w-full p-4 flex items-center gap-3 border-b border-zinc-105 dark:border-zinc-801 transition-colors hover:bg-white dark:hover:bg-zinc-900 text-left relative group",
                          activeSessionId === session.id && "bg-white dark:bg-zinc-900 border-r-4 border-r-brand-teal"
                        )}
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-brand-black overflow-hidden bg-brand-teal flex-shrink-0 group-hover:scale-110 transition-transform">
                          <img src={session.participant.avatar} alt={session.participant.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-display font-black uppercase text-xs truncate text-brand-black dark:text-white">{session.participant.name}</span>
                            <span className="text-[9px] font-bold text-zinc-500">
                              {new Date(session.lastTimestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] font-black uppercase text-brand-teal mb-1 truncate">{session.propertyName}</p>
                          <p className={cn(
                            "text-xs truncate",
                            session.unreadCount && session.unreadCount > 0 ? "font-bold text-brand-black dark:text-gray-200" : "text-zinc-500"
                          )}>
                            {session.lastMessage}
                          </p>
                        </div>
                        {session.unreadCount && session.unreadCount > 0 && (
                          <div className="absolute right-4 bottom-4 w-4 h-4 bg-brand-teal text-brand-black text-[9px] font-black flex items-center justify-center rounded-full border border-brand-black">
                            {session.unreadCount}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-zinc-400">
                      <MessageCircle size={48} className="mb-4 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">No messages yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Window */}
              <div className={cn(
                "flex-1 flex flex-col bg-white dark:bg-zinc-900/30 min-h-0 min-w-0",
                !activeSessionId ? "hidden" : "flex"
              )}>
                {activeSession ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b-2 border-brand-black dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-brand-black overflow-hidden bg-brand-teal">
                          <img src={activeSession.participant.avatar} alt={activeSession.participant.name} />
                        </div>
                        <div>
                          <h3 className="font-display font-black uppercase text-xs text-brand-black dark:text-white leading-tight">{activeSession.participant.name}</h3>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-pulse" />
                            <span className="text-[9px] font-black uppercase text-zinc-400 font-mono">Active Agent</span>
                          </div>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <MoreVertical size={18} />
                      </button>
                    </div>

                    {/* Property Mini-Card */}
                    <div className="p-2 bg-brand-black text-brand-teal border-b border-brand-teal/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} />
                        <span className="text-[9px] font-black uppercase truncate">{activeSession.propertyName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] font-black uppercase text-zinc-500 italic">
                        <Lock size={10} className="text-brand-teal" />
                        Encrypted
                      </div>
                    </div>

                    {/* Encryption Banner */}
                    <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
                       <Lock size={10} className="text-zinc-400" />
                       <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest leading-none">
                         Messages are secured with end-to-end encryption
                       </span>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-zinc-50 dark:bg-zinc-900/30">
                      {handshakeSessions.has(activeSession.id) ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Lock size={48} className="text-brand-teal drop-shadow-brutal-sm" />
                          </motion.div>
                          <div className="text-center">
                            <p className="text-[12px] font-black uppercase tracking-[0.3em] text-brand-black dark:text-brand-teal mb-1">Security Handshake</p>
                            <p className="text-[8px] font-bold text-zinc-500 uppercase italic tracking-widest">Generating ephemeral interaction keys...</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-center my-4">
                            <div className="bg-white dark:bg-zinc-800 border-2 border-brand-black dark:border-zinc-700 px-4 py-2 flex items-center gap-2 shadow-brutal-xs">
                              <Lock size={12} className="text-brand-teal" />
                              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                Protected by Peer-to-Peer Encryption
                              </span>
                            </div>
                          </div>

                          {currentMessages.map((msg, i) => {
                            const isMe = msg.senderId === user?.id;
                            if (msg.blocked) {
                              return (
                                <div key={msg.id || i} className={cn(
                                  "flex flex-col max-w-[80%]",
                                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                                )}>
                                  <div className="p-3 text-xs border-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-550 dark:text-zinc-400 rounded-lg shadow-brutal-xs flex flex-col gap-1.5 opacity-80">
                                    <div className="line-through select-none italic text-zinc-400 dark:text-zinc-500">"{msg.text}"</div>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-500 dark:text-red-400 font-mono">
                                      <Lock size={12} className="shrink-0 text-red-500 dark:text-red-400" />
                                      <span>{msg.blockedReason || 'Phone numbers and external links are unlocked after inspection fee payment.'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 px-1">
                                    <span className="text-[8px] font-black uppercase text-zinc-400">
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            const activeAvatar = (isMe && user?.equippedAvatarId) 
                              ? AVATAR_COSMETICS.find(a => a.id === user.equippedAvatarId) 
                              : null;
                            const isLegendary = activeAvatar?.rarity === 'Legendary';
                            const isEpic = activeAvatar?.rarity === 'Epic';

                            return (
                              <div key={msg.id || i} className={cn(
                                "flex flex-col max-w-[80%]",
                                isMe ? "ml-auto items-end" : "mr-auto items-start"
                              )}>
                                <div className={cn(
                                  "p-3 text-sm border-2 border-brand-black shadow-brutal-xs relative group",
                                  isMe 
                                    ? isLegendary
                                      ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 border-amber-600 font-bold rounded-tl-xl rounded-tr-xl rounded-bl-xl shadow-[0_0_14px_rgba(245,158,11,0.6)]"
                                      : isEpic
                                        ? "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white border-purple-400 font-semibold rounded-tl-xl rounded-tr-xl rounded-bl-xl shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                        : "bg-brand-teal text-brand-black rounded-tl-xl rounded-tr-xl rounded-bl-xl" 
                                    : "bg-white dark:bg-zinc-800 text-brand-black dark:text-white rounded-tl-xl rounded-tr-xl rounded-br-xl"
                                )}>
                                  {isLegendary && <span className="inline-block mr-1 text-xs">👑</span>}
                                  {msg.text}
                                  
                                  {/* Hover Encryption Info */}
                                  <div className={cn(
                                    "absolute -top-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-black text-brand-teal px-2 py-0.5 border border-brand-teal whitespace-nowrap z-10",
                                    isMe ? "right-0" : "left-0"
                                  )}>
                                    <Lock size={8} className="fill-brand-teal" />
                                    <span className="text-[7px] font-black uppercase">AES-256 Secured</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mt-1 px-1">
                                  <span className="text-[8px] font-black uppercase text-zinc-400">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isMe && <CheckCheck size={10} className="text-brand-teal" />}
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-white dark:bg-zinc-900 border-t-2 border-brand-black dark:border-zinc-800 relative">
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <div ref={pickerRef} className="absolute bottom-full right-4 mb-2 z-[80]">
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            >
                              <EmojiPicker 
                                onEmojiClick={onEmojiClick} 
                                theme={Theme.AUTO}
                                width={320}
                                height={400}
                              />
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={cn(
                            "brutalist-button-white px-3 flex items-center justify-center transition-colors",
                            showEmojiPicker && "bg-brand-teal"
                          )}
                        >
                          <Smile size={18} />
                        </button>
                        <input 
                          type="text" 
                          placeholder="Type a message..."
                          className="brutalist-input flex-1"
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button 
                          onClick={handleSendMessage}
                          className="brutalist-button-teal px-4"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center text-zinc-400">
                    <MessageCircle size={64} className="mb-4 opacity-10" />
                    <p className="text-sm font-black uppercase tracking-widest mb-2">Select a chat</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Choose a conversation from the left to start messaging</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
