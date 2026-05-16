import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, TrendingUp, AlertTriangle, ChevronRight, Zap, Target, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { mockProperties } from '../data/mockListings';
import { ROILevel, Property } from '../types';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: typeof mockProperties;
}

export default function AISearch({ onSelectProperty }: { onSelectProperty: (id: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I am your AI Development Analyst. I track infrastructure growth, government projects, and market signals across Nigeria. \n\nTell me: What's your investment budget and what kind of land are you looking for?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const prompt = `
        You are an expert Nigerian Real Estate Investment Analyst named RealAI.
        User Query: "${input}"
        
        Available Property Data: ${JSON.stringify(mockProperties)}
        
        Task:
        1. Analyze user intent (flip/rent/live).
        2. Filter matching properties from data.
        3. Assign a Location Development Score (0-100).
        4. Provide reasoning text for ROI.
        
        Response Format (JSON):
        {
          "answer": "Concise natural language summary of why you chose these properties and market trends.",
          "recommendedIds": ["1", "3"],
          "intent": "flip",
          "budget": "numbers only",
          "marketHighlight": "Latest infra news in that area"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt
      });
      
      const responseText = response.text || '';
      
      // Try to parse JSON from response
      let parsedData;
      try {
        const jsonMatch = responseText.match(/\{.*\}/s);
        parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) {
        console.error("Failed to parse AI response", e);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsedData?.answer || responseText,
        recommendations: parsedData?.recommendedIds 
          ? mockProperties.filter(p => parsedData.recommendedIds.includes(p.id)) 
          : []
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble accessing real-time market data right now. However, looking at my local cache, areas like Ibeju-Lekki and Lugbe are currently seeing high infrastructure growth signals."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-brand-gray dark:bg-[#1c1c21] overflow-hidden">
      {/* AI Intelligence Header */}
      <div className="bg-brand-black text-white p-4 flex items-center justify-between border-b-8 border-brand-teal">
        <div className="flex items-center gap-3">
          <div className="bg-brand-teal p-2 shadow-brutal-sm">
            <BrainCircuit className="w-5 h-5 text-brand-black" />
          </div>
          <div>
            <h2 className="text-sm font-display font-black uppercase tracking-tighter">IDIE Engine v4.2</h2>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-brand-teal/80">Real-time Data Active</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 font-black uppercase">Confidence</p>
            <p className="text-xs font-black text-brand-teal">94.8%</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "ml-auto" : "mr-auto"
              )}
            >
              <div className={cn(
                "p-4 border-2 border-brand-black dark:border-zinc-700 shadow-aggressive dark:shadow-[6px_6px_0px_0px_#52525b]",
                msg.role === 'user' ? "bg-white dark:bg-zinc-900 text-brand-black dark:text-brand-gray" : "bg-brand-black text-white"
              )}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800">
                    <Sparkles size={14} className="text-brand-teal" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-teal">IDIE Analysis</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
              </div>

              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-1">
                    <Target size={12} className="text-brand-red" /> Target Acquisitions Found
                  </span>
                  {msg.recommendations.map(prop => (
                    <RecommendationCard 
                      key={prop.id} 
                      property={prop} 
                      onClick={() => onSelectProperty(prop.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex gap-2 text-brand-teal items-center">
            <Bot className="animate-bounce" size={16} />
            <span className="text-xs font-black uppercase italic tracking-widest text-brand-black">Analyzing development clusters...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white dark:bg-[#1c1c21] border-t-8 border-brand-black dark:border-zinc-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="e.g. Find me land under 20M with high ROI in Abuja"
            className="flex-1 bg-brand-gray dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-3 font-display uppercase tracking-tighter text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] dark:text-brand-gray"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-brand-black text-brand-teal p-3 border-2 border-brand-black shadow-brutal-sm hover:bg-brand-teal hover:text-brand-black transition-all disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

const RecommendationCard: React.FC<{ property: Property; onClick: () => void }> = ({ property, onClick }) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-700 p-3 flex gap-4 shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#52525b] cursor-pointer hover:bg-brand-gray dark:hover:bg-zinc-800"
    >
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-black dark:border-zinc-700 overflow-hidden flex-shrink-0">
        <img src={property.image} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-display font-black leading-tight uppercase line-clamp-1">{property.title}</h4>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">{property.location.area}, {property.location.state}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-black text-brand-red font-display tracking-tight">₦{(property.price / 1000000).toFixed(1)}M</span>
            {property.commission !== undefined && (
              <span className="text-[7px] font-black uppercase text-brand-red opacity-80 leading-none">
                {property.commission}% Comm
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-brand-teal px-1 text-[9px] font-black text-brand-black uppercase border border-brand-black">
            <TrendingUp size={10} /> {property.roiPotential} ROI
          </div>
        </div>
      </div>
    </motion.div>
  );
}
