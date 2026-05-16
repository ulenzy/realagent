import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Search, ArrowLeft, MoreVertical, CheckCheck, MapPin, ExternalLink, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatSession, Message } from '../types';

interface MessagingProps {
  isOpen: boolean;
  onClose: () => void;
  initialChatId?: string | null;
}

export default function Messaging({ isOpen, onClose, initialChatId }: MessagingProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialChatId || null);
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'session-1',
      participant: {
        id: 'a1', // Changed to match agent-1 in mockListings
        name: 'Agent Musa',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Musa'
      },
      propertyId: 'lento-1',
      propertyName: 'Lento Classic Villa',
      lastMessage: 'The survey plan is ready for your review.',
      lastTimestamp: new Date(Date.now() - 3600000).toISOString(),
      unreadCount: 2
    },
    {
      id: 'session-2',
      participant: {
        id: 'a2', // Changed to match agent-2 in mockListings
        name: 'Agent Sarah',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
      },
      propertyId: 'bh-1',
      propertyName: 'B&H Terrace Duplex',
      lastMessage: 'When would you like to schedule the physical inspection?',
      lastTimestamp: new Date(Date.now() - 86400000).toISOString(),
      unreadCount: 0
    }
  ]);

  const [handshakeSessions, setHandshakeSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleOpenChatEvent = (e: any) => {
      const { agentId, agentName, agentAvatar, propertyId, propertyName } = e.detail || {};
      if (!agentId) return;

      // Check if session already exists
      const existingSession = sessions.find(s => s.participant.id === agentId);
      let sessionId = '';
      
      if (existingSession) {
        sessionId = existingSession.id;
        setActiveSessionId(sessionId);
        
        // Update property context if a specific property was clicked
        if (propertyId && propertyId !== 'general') {
           setSessions(prev => prev.map(s => 
             s.id === sessionId ? { ...s, propertyId, propertyName: propertyName || s.propertyName } : s
           ));
        }
      } else {
        // Create a new session
        const newSessionId = `session-${Date.now()}`;
        sessionId = newSessionId;
        
        // Start handshake simulation
        setHandshakeSessions(prev => new Set(prev).add(newSessionId));
        setTimeout(() => {
          setHandshakeSessions(prev => {
            const next = new Set(prev);
            next.delete(newSessionId);
            return next;
          });
        }, 2000);

        const newSession: ChatSession = {
          id: newSessionId,
          participant: {
            id: agentId,
            name: agentName || 'Real Agent助理',
            avatar: agentAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${agentName || agentId}`
          },
          propertyId: propertyId || 'general',
          propertyName: propertyName || 'General Inquiry',
          lastMessage: 'Chat started. Messages are end-to-end encrypted.',
          lastTimestamp: new Date().toISOString(),
          unreadCount: 0
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSessionId);
      }
      
      // Auto-reference property in message if provided
      if (propertyName && propertyName !== 'General Inquiry') {
        setNewMessage(`Hello ${agentName || 'Agent'}! I'm interested in "${propertyName}". Could you provide more details?`);
      }
    };

    window.addEventListener('open-chat', handleOpenChatEvent);
    return () => window.removeEventListener('open-chat', handleOpenChatEvent);
  }, [sessions]);

  const [messages, setMessages] = useState<Record<string, Message[]>>({
    'session-1': [
      { id: 'm1', senderId: 'agent-1', receiverId: 'user-1', text: 'Hello! I noticed you were interested in the Lento Classic Villa.', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: 'm2', senderId: 'user-1', receiverId: 'agent-1', text: 'Yes, I wanted to know if the price is negotiable.', timestamp: new Date(Date.now() - 7000000).toISOString() },
      { id: 'm3', senderId: 'agent-1', receiverId: 'user-1', text: 'The survey plan is ready for your review.', timestamp: new Date(Date.now() - 3600000).toISOString() },
    ],
    'session-2': [
      { id: 'm4', senderId: 'agent-2', receiverId: 'user-1', text: 'Hi! Let me know if you have any questions about the Katampe property.', timestamp: new Date(Date.now() - 90000000).toISOString() },
      { id: 'm5', senderId: 'user-1', receiverId: 'agent-2', text: 'When would you like to schedule the physical inspection?', timestamp: new Date(Date.now() - 86400000).toISOString() },
    ]
  });

  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeSessionId) {
      scrollToBottom();
    }
  }, [activeSessionId, messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeSessionId) return;

    const msg: Message = {
      id: `m-${Date.now()}`,
      senderId: 'user-1',
      receiverId: sessions.find(s => s.id === activeSessionId)?.participant.id || '',
      text: newMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => ({
      ...prev,
      [activeSessionId]: [...(prev[activeSessionId] || []), msg]
    }));

    setSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, lastMessage: newMessage, lastTimestamp: new Date().toISOString() } : s
    ));

    setNewMessage('');
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentMessages = activeSessionId ? messages[activeSessionId] || [] : [];

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
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
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

                <div className="flex-1 overflow-y-auto">
                  {sessions.length > 0 ? (
                    sessions.sort((a,b) => new Date(b.lastTimestamp || 0).getTime() - new Date(a.lastTimestamp || 0).getTime()).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id)}
                        className={cn(
                          "w-full p-4 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-white dark:hover:bg-zinc-900 text-left relative group",
                          activeSessionId === session.id && "bg-white dark:bg-zinc-900 border-r-4 border-r-brand-teal"
                        )}
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-brand-black overflow-hidden bg-brand-teal flex-shrink-0 group-hover:scale-110 transition-transform">
                          <img src={session.participant.avatar} alt={session.participant.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-display font-black uppercase text-xs truncate text-brand-black dark:text-white">{session.participant.name}</span>
                            <span className="text-[9px] font-bold text-zinc-500">{new Date(session.lastTimestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                            <span className="text-[9px] font-black uppercase text-zinc-400">Active Agent</span>
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
                    <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
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
                            const isMe = msg.senderId === 'user-1';
                            return (
                              <div key={msg.id} className={cn(
                                "flex flex-col max-w-[80%]",
                                isMe ? "ml-auto items-end" : "mr-auto items-start"
                              )}>
                                <div className={cn(
                                  "p-3 text-sm border-2 border-brand-black shadow-brutal-xs relative group",
                                  isMe 
                                    ? "bg-brand-teal text-brand-black rounded-tl-xl rounded-tr-xl rounded-bl-xl" 
                                    : "bg-white dark:bg-zinc-800 text-brand-black dark:text-white rounded-tl-xl rounded-tr-xl rounded-br-xl"
                                )}>
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
                    <div className="p-4 bg-white dark:bg-zinc-900 border-t-2 border-brand-black dark:border-zinc-800">
                      <div className="flex gap-2">
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
