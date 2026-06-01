import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Building2, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  ArrowLeft, 
  Shield, 
  Check, 
  Loader2,
  Info,
  CheckCircle,
  Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { AgentTier } from '../types';

type RoleType = 'Buyer' | 'Seller' | 'Agent';

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    name: user?.name || '',
    phoneNumber: user?.phoneNumber || '',
    gender: user?.gender || 'Prefer not to say',
    agentRegNumber: ''
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // KYC specific state
  const [ninNumber, setNinNumber] = useState('');
  const [kycFiles, setKycFiles] = useState<string[]>([]);
  const [uploadedKycFiles, setUploadedKycFiles] = useState<Record<string, string>>({});
  const [ninError, setNinError] = useState<string | null>(null);

  const totalSteps = selectedRole === 'Agent' ? 5 : 3;

  // Form validation for step 2
  const isStep2Valid = () => {
    const { firstName, lastName, name } = formData;
    return !!(firstName.trim() && lastName.trim() && name.trim());
  };

  const handleNextStep = () => {
    if (step === 1 && !selectedRole) return;
    if (step === 2 && !isStep2Valid()) return;
    if (step === 3 && selectedRole === 'Agent') {
      setNinError(null);
      if (ninNumber.length !== 11) {
        setNinError("NIN must be exactly 11 digits.");
        return;
      }
      if (kycFiles.length < 1 || Object.keys(uploadedKycFiles).length < 1) {
        return;
      }
    }
    setError(null);
    setStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!selectedRole || !agreedToTerms) return;
    setIsSubmitting(true);
    setError(null);

    const isAgent = selectedRole === 'Agent';
    const hasRegNumber = isAgent && !!formData.agentRegNumber.trim();

    // Mapping payload as requested
    const updates: any = {
      role: selectedRole,
      firstName: formData.firstName,
      lastName: formData.lastName,
      name: formData.name,
      phoneNumber: formData.phoneNumber,
      gender: formData.gender,
      onboardingCompleted: true,
      profileScore: 20,
      kycStatus: 'None' as any,
    };

    if (isAgent) {
      updates.isAgent = true;
      updates.kycStatus = 'Pending';
      updates.ninNumber = ninNumber;
      updates.kycDocuments = kycFiles;

      if (hasRegNumber) {
        updates.agentRegNumber = formData.agentRegNumber;
        updates.agentTier = 'Verified Professional' as AgentTier;
        updates.agentVerificationStatus = 'Pending';
        updates.tokens = 150;
      } else {
        updates.agentTier = 'Platform Agent' as AgentTier;
        updates.agentVerificationStatus = 'Unverified';
        updates.tokens = 100;
      }
    } else {
      updates.isAgent = false;
    }

    try {
      await updateUser(updates);
    } catch (err: any) {
      setError(err.message || 'An error occurred during onboarding activation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    {
      id: 'Buyer' as RoleType,
      title: "I'm a Buyer",
      description: "Browse verified listings and connect with qualified agents",
      icon: Home,
      bgColor: 'bg-brand-teal/5',
      accentColor: 'hover:border-brand-teal'
    },
    {
      id: 'Seller' as RoleType,
      title: "I'm a Property Owner",
      description: "List your property and let qualified agents compete for it",
      icon: Building2,
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
      accentColor: 'hover:border-indigo-500'
    },
    {
      id: 'Agent' as RoleType,
      title: "I'm an Agent",
      description: "Bid on listings, manage clients, and build your reputation on a structured platform",
      icon: ShieldCheck,
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      accentColor: 'hover:border-amber-400'
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-brand-gray dark:bg-[#040405] font-sans antialiased text-brand-black dark:text-zinc-100 selection:bg-brand-teal selection:text-white">
      <div className="w-full max-w-4xl">
        {/* Progress bar Tracker */}
        <div className="mb-8 flex items-center justify-between max-w-md mx-auto relative px-4">
          <div className="absolute top-[18px] left-0 right-0 h-1 bg-zinc-300 dark:bg-zinc-800 -z-10 rounded"></div>
          <div 
            className="absolute top-[18px] left-0 h-1 bg-brand-black dark:bg-brand-teal -z-10 rounded transition-all duration-300"
            style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
          ></div>
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const s = idx + 1;
            return (
              <div 
                key={s} 
                className={cn(
                  "w-10 h-10 border-4 rounded-none flex items-center justify-center font-black transition-all",
                  step === s 
                    ? "bg-brand-teal text-white border-brand-black dark:border-brand-teal shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_#14b8a6]"
                    : step > s 
                      ? "bg-brand-black text-white border-brand-black shadow-none"
                      : "bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800"
                )}
              >
                {s}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] p-6 md:p-10 max-w-3xl mx-auto"
            >
              <div className="text-center mb-8">
                <span className="bg-brand-teal text-white border-2 border-brand-black px-3 py-1 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Step 1 of {totalSteps}
                </span>
                <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-brand-black dark:text-white mt-4">
                  Who are you on RealAgents?
                </h1>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wide mt-1">
                  Choose your primary platform alignment
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                {roles.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedRole === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedRole(item.id)}
                      className={cn(
                        "text-left p-6 border-4 flex flex-col justify-between transition-all rounded-none relative overflow-hidden group min-h-[220px]",
                        isSelected 
                          ? "bg-brand-teal/15 dark:bg-brand-teal/10 border-brand-black dark:border-brand-teal shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_#14b8a6]" 
                          : "bg-white dark:bg-zinc-900 dark:border-zinc-800 border-zinc-300 dark:hover:bg-zinc-800/30 hover:border-brand-black dark:hover:border-zinc-700 shadow-none hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      )}
                    >
                      <div>
                        <div className={cn(
                          "w-12 h-12 border-4 border-brand-black dark:border-zinc-700 flex items-center justify-center mb-4 transition-transform group-hover:scale-105 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                          isSelected ? "bg-brand-teal text-white" : "bg-brand-gray dark:bg-zinc-800 dark:text-zinc-200"
                        )}>
                          <Icon size={24} />
                        </div>
                        <h3 className="text-lg font-black uppercase text-brand-black dark:text-white tracking-tight leading-tight mb-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-brand-black dark:bg-brand-teal text-white border-2 border-brand-black dark:border-zinc-900 p-1">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4 border-t-2 border-zinc-100 dark:border-zinc-800">
                <button
                  disabled={!selectedRole}
                  onClick={handleNextStep}
                  className={cn(
                    "px-8 py-4 bg-brand-black dark:bg-brand-teal text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  )}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] p-6 md:p-10 max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <span className="bg-brand-teal text-white border-2 border-brand-black px-3 py-1 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Step 2 of {totalSteps}
                </span>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-brand-black dark:text-white mt-4">
                  Identity Setup
                </h1>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wide mt-1">
                  Configure your primary details
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                      First Name <span className="text-brand-red font-black text-xs">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black text-sm uppercase tracking-wider focus:outline-none focus:border-brand-teal dark:focus:border-brand-teal focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-zinc-400"
                      placeholder="e.g. John"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                      Last Name <span className="text-brand-red font-black text-xs">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black text-sm uppercase tracking-wider focus:outline-none focus:border-brand-teal dark:focus:border-brand-teal focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-zinc-400"
                      placeholder="e.g. Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                      Display Username <span className="text-brand-red font-black text-xs">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black text-sm uppercase tracking-wider focus:outline-none focus:border-brand-teal dark:focus:border-brand-teal focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-zinc-400"
                      placeholder="e.g. LandlordPro"
                    />
                  </div>
                  <div className="space-y-1.5 opacity-80 cursor-not-allowed" title="Phone number is verified and cannot be changed here.">
                    <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                      Phone Number <Check size={12} className="text-brand-teal ml-1" /> <span className="text-brand-teal text-[9px]">VERIFIED</span>
                    </label>
                    <input 
                      type="tel"
                      required
                      readOnly
                      disabled
                      value={formData.phoneNumber}
                      className="w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-black text-sm uppercase tracking-wider focus:outline-none cursor-not-allowed"
                      placeholder="e.g. +234 8..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                    Gender (Optional)
                  </label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black text-sm uppercase tracking-wider focus:outline-none focus:border-brand-teal dark:focus:border-brand-teal focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all appearance-none cursor-pointer"
                  >
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Non-Binary / Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center mt-10 pt-6 border-t-2 border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={handleBackStep}
                  className="px-6 py-4 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 text-brand-black dark:text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  disabled={!isStep2Valid()}
                  onClick={handleNextStep}
                  className="px-8 py-4 bg-brand-black dark:bg-brand-teal text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && selectedRole === 'Agent' && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] p-6 md:p-10 max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <span className="bg-brand-teal text-white border-2 border-brand-black px-3 py-1 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Step 3 of 5
                </span>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-brand-black dark:text-white mt-4">
                  KYC Verification
                </h1>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wide mt-1">
                  Upload your documents for administrative approval
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black p-4 shadow-brutal-xs">
                  <label className="text-[10px] font-black uppercase text-brand-black dark:text-gray-150 tracking-wider mb-1 block">
                    National Identification Number (NIN)
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={ninNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNinNumber(val);
                      if (ninError) setNinError(null);
                    }}
                    placeholder="Enter 11-digit NIN"
                    className={cn(
                      "w-full bg-zinc-50 dark:bg-zinc-950 border-2 p-3 text-sm font-black tracking-widest focus:outline-none transition-all dark:text-white",
                      ninError
                        ? "border-brand-red focus:border-brand-red"
                        : "border-brand-black dark:border-zinc-700 focus:border-brand-teal"
                    )}
                  />
                  {ninError && (
                    <p className="text-brand-red text-[10px] font-bold mt-1 uppercase tracking-tight">
                      {ninError}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="text-[10px] font-black uppercase text-brand-black dark:text-gray-300 tracking-wider border-b-2 border-dashed border-zinc-200 dark:border-zinc-800 pb-2">
                    Required Documents (Select at least one)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "nin_slip", label: "NIN Slip" },
                      { id: "intl_passport", label: "Intl. Passport" },
                      { id: "drivers_license", label: "Driver's License" },
                      { id: "voters_card", label: "Voter's Card" },
                    ].map((doc) => {
                      const isSelected = kycFiles.includes(doc.id);
                      const fileName = uploadedKycFiles[doc.id];
                      return (
                        <div key={doc.id} className="flex flex-col gap-1">
                          <label
                            className={cn(
                              "flex items-center gap-3 p-3 border-2 cursor-pointer transition-all",
                              isSelected
                                ? "border-brand-teal bg-brand-teal/10 text-brand-black dark:text-brand-teal"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-60 hover:opacity-100 text-zinc-500 dark:text-zinc-400"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              onChange={() =>
                                setKycFiles(
                                  isSelected
                                    ? kycFiles.filter((f) => f !== doc.id)
                                    : [...kycFiles, doc.id]
                                )
                              }
                            />
                            <span className="text-[10px] font-black uppercase flex-1">
                              {doc.label}
                            </span>
                            {isSelected && (
                              <CheckCircle size={14} className="text-brand-teal" />
                            )}
                          </label>
                          {isSelected && (
                            <div className="p-2 border-2 border-t-0 border-brand-teal bg-white dark:bg-zinc-950">
                              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-black/20 dark:border-zinc-700 p-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                <Upload size={14} className="text-brand-teal" />
                                <span className="text-[9px] font-bold uppercase truncate max-w-[120px] dark:text-zinc-300">
                                  {fileName || "Upload File"}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      setUploadedKycFiles((prev) => ({
                                        ...prev,
                                        [doc.id]: e.target.files![0].name,
                                      }));
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t-2 border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={handleBackStep}
                  className="px-6 py-4 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:translate-y-1 transition-all"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  disabled={kycFiles.length < 1 || Object.keys(uploadedKycFiles).length < 1 || ninNumber.length !== 11}
                  onClick={handleNextStep}
                  className={cn(
                    "px-8 py-4 bg-brand-black dark:bg-brand-teal text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all",
                    (kycFiles.length < 1 || Object.keys(uploadedKycFiles).length < 1 || ninNumber.length !== 11) ? "opacity-50 cursor-not-allowed shadow-none" : ""
                  )}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && selectedRole === 'Agent' && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] p-6 md:p-10 max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <span className="bg-brand-teal text-white border-2 border-brand-black px-3 py-1 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Step 4 of 5
                </span>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-brand-black dark:text-white mt-4">
                  Agent Credentials
                </h1>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wide mt-1">
                  Optional: Provide your regulatory body registration number
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                    Registration Number (Optional)
                  </label>
                  <input 
                    type="text"
                    value={formData.agentRegNumber}
                    onChange={(e) => setFormData({ ...formData, agentRegNumber: e.target.value })}
                    className="w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black text-sm uppercase tracking-wider focus:outline-none focus:border-brand-teal dark:focus:border-brand-teal focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-zinc-400"
                    placeholder="e.g. NIESV/2024/ABJ/0042"
                  />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wide">
                    NIESV, ESVARBON, or any recognised state body number. Leave blank if you don't have one.
                  </p>
                </div>

                {/* Previews */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {/* Card A */}
                  <div className={cn(
                    "p-4 border-4 transition-all",
                    formData.agentRegNumber.trim().length > 0
                      ? "bg-brand-teal/10 border-brand-black dark:border-brand-teal shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#14b8a6]"
                      : "bg-zinc-50 dark:bg-zinc-800/45 border-zinc-200 dark:border-zinc-800 opacity-60 scale-95"
                  )}>
                    <h4 className="text-xs font-black uppercase text-brand-black dark:text-white flex items-center gap-1.5 mb-2">
                      <ShieldCheck size={14} className="text-brand-teal" />
                      Verified Professional
                    </h4>
                    <ul className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide space-y-1 list-disc list-inside">
                      <li>Priority placement in seller bid reviews</li>
                      <li>Inherited credibility from regulatory status</li>
                      <li>Starts at Trust Score 70</li>
                      <li>Unlocked by: providing a registration number</li>
                    </ul>
                  </div>

                  {/* Card B */}
                  <div className={cn(
                    "p-4 border-4 transition-all",
                    formData.agentRegNumber.trim().length === 0
                      ? "bg-zinc-100 dark:bg-zinc-800 border-brand-black dark:border-zinc-650 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-zinc-50 dark:bg-zinc-800/45 border-zinc-200 dark:border-zinc-800 opacity-60 scale-95"
                  )}>
                    <h4 className="text-xs font-black uppercase text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 mb-2">
                      <Shield size={14} className="text-zinc-400 dark:text-zinc-500" />
                      Platform Agent
                    </h4>
                    <ul className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide space-y-1 list-disc list-inside">
                      <li>Full access to all listings and bidding once approved</li>
                      <li>Trust Score built through performance</li>
                      <li>Starts at Trust Score 30</li>
                      <li>Unlocked by: KYC verification only</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t-2 border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={handleBackStep}
                  className="px-6 py-4 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:translate-y-1 transition-all"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="px-8 py-4 bg-brand-black dark:bg-brand-teal text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {((step === 3 && selectedRole !== 'Agent') || step === 5) && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] p-6 md:p-10 max-w-xl mx-auto"
            >
              <div className="text-center mb-8">
                <span className="bg-brand-teal text-white border-2 border-brand-black px-3 py-1 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Step {step} of {totalSteps}
                </span>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-brand-black dark:text-white mt-4">
                  Confirm Your Setup
                </h1>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wide mt-1">
                  Activate your professional platform account
                </p>
              </div>

              {/* Summary card */}
              <div className="border-4 border-brand-black dark:border-zinc-700 p-6 bg-brand-gray dark:bg-zinc-800/40 relative mb-6">
                <span className="absolute -top-[16px] left-4 bg-brand-black dark:bg-zinc-100 text-white dark:text-brand-black px-3 py-1 border-2 border-brand-black dark:border-zinc-100 font-black text-[9px] uppercase tracking-widest">
                  Identity Details Summary
                </span>
                
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border-2 border-brand-black dark:border-white flex items-center justify-center bg-brand-teal text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {selectedRole === 'Buyer' && <Home size={18} />}
                      {selectedRole === 'Seller' && <Building2 size={18} />}
                      {selectedRole === 'Agent' && <ShieldCheck size={18} />}
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-zinc-400 block -mb-0.5">Primary Alignment</span>
                      <span className="text-sm font-black uppercase text-brand-black dark:text-white">
                        {selectedRole === 'Seller' ? 'Property Owner (Seller)' : selectedRole}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black uppercase text-zinc-400 block">Name</span>
                      <span className="text-sm font-bold text-brand-black dark:text-zinc-200">
                        {formData.firstName} {formData.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-zinc-400 block">Display Name</span>
                      <span className="text-sm font-bold text-brand-black dark:text-zinc-200">
                        {formData.name}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black uppercase text-zinc-400 block">Phone Number</span>
                      <span className="text-sm font-bold text-brand-black dark:text-zinc-200">
                        {formData.phoneNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-zinc-400 block">Gender</span>
                      <span className="text-sm font-bold text-brand-black dark:text-zinc-200 uppercase text-xs">
                        {formData.gender}
                      </span>
                    </div>
                  </div>

                  {user?.email && (
                    <div>
                      <span className="text-[9px] font-black uppercase text-zinc-400 block">Associated Email</span>
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{user.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Agent Tier Specific Status */}
              {selectedRole === 'Agent' && (
                <div className="border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 space-y-4 mb-6">
                  {formData.agentRegNumber.trim() ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-brand-teal text-white border-2 border-brand-black dark:border-brand-teal px-3 py-1 font-black text-[10px] uppercase tracking-wide shadow-[1.5px_1.5px_0px_px_rgba(0,0,0,1)]">
                          VERIFIED PROFESSIONAL BADGE
                        </span>
                        <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-2 border-amber-500 px-3 py-1 font-black text-[10px] uppercase tracking-wide">
                          Reg: {formData.agentRegNumber.trim()} (Pending Verification)
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase leading-relaxed">
                        Your registration number will be reviewed by the RealAgents team within 48 hours.
                        You can begin bidding as a Platform Agent in the meantime.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-500 text-white border-2 border-zinc-700 px-3 py-1 font-black text-[10px] uppercase tracking-wide shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
                          PLATFORM AGENT BADGE
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase leading-relaxed">
                        You have full access to all listings and bidding. Add your registration number
                        anytime from your Profile to upgrade to Verified Professional.
                      </p>
                    </>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-100 border-2 border-red-500 text-red-600 text-[10px] font-black uppercase mb-4">
                  {error}
                </div>
              )}

              {/* Checkbox */}
              <div className="mb-6 p-1">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative shrink-0 mt-0.5">
                    <input 
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-6 h-6 border-4 border-brand-black dark:border-zinc-700 flex items-center justify-center transition-all",
                      agreedToTerms ? "bg-brand-teal" : "bg-white dark:bg-zinc-800 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700"
                    )}>
                      {agreedToTerms && <Check size={14} className="text-white stroke-[4]" />}
                    </div>
                  </div>
                  <span className="text-[11px] font-black uppercase text-brand-black dark:text-zinc-300 leading-tight select-none mt-1">
                    I agree to the RealAgents Platform Terms and Agent Conduct Guidelines.
                  </span>
                </label>
              </div>

              {/* Footer transitions */}
              <div className="flex justify-between items-center pt-6 border-t-2 border-zinc-100 dark:border-zinc-800">
                <button
                  disabled={isSubmitting}
                  onClick={handleBackStep}
                  className="px-6 py-4 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 text-brand-black dark:text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all disabled:opacity-55"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  disabled={!agreedToTerms || isSubmitting}
                  onClick={handleSubmit}
                  className="px-8 py-4 bg-brand-black dark:bg-brand-teal text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> ACTIVATING...
                    </>
                  ) : (
                    <>
                      <Zap size={16} className="text-amber-400 fill-amber-400" /> ACTIVATE ACCOUNT
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
