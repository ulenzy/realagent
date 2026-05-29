import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Upload, ChevronRight, ChevronLeft, ShieldCheck, FileText, CheckCircle, Trash2, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { sendNotification } from "../lib/notifications";
import { db, storage } from "../lib/firebase";
import { doc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "../lib/utils";
import { Property, Dispute } from "../types";

interface DisputeFlowProps {
  property: Property;
  onClose: () => void;
}

type DisputeType = 'property_mismatch' | 'off_platform_deal' | 'inspection_no_show' | 'fraud' | 'other';

export const DisputeFlow: React.FC<DisputeFlowProps> = ({ property, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [disputeType, setDisputeType] = useState<DisputeType | null>(null);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCaseId, setSuccessCaseId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1300] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black p-6 max-w-sm text-center shadow-aggressive">
          <AlertTriangle className="w-12 h-12 text-brand-red mx-auto mb-4" />
          <h3 className="font-display font-black text-lg uppercase mb-2">Authentication Required</h3>
          <p className="text-xs text-zinc-500 uppercase mb-4">You must be logged in to report a dispute regarding this property.</p>
          <button onClick={onClose} className="brutalist-button w-full">Close</button>
        </div>
      </div>
    );
  }

  const disputeTypesInfo = [
    {
      id: 'property_mismatch' as DisputeType,
      title: "Property Description Mismatch",
      description: "The actual property specifications, rooms, status, or location do not match the photos or text provided in the listing mandate."
    },
    {
      id: 'off_platform_deal' as DisputeType,
      title: "Off-Platform Proposal",
      description: "The agent, seller, or broker suggested bypassing our platform safeguards to complete the lease or sale in cash direct."
    },
    {
      id: 'inspection_no_show' as DisputeType,
      title: "Inspection No-Show",
      description: "You paid the inspection fee, but the designated agent or seller failed to show up at the site location at the scheduled time."
    },
    {
      id: 'fraud' as DisputeType,
      title: "Fraud & False Representation",
      description: "Suspicious, duplicate listings, forged title documents, false ownership claims, or extortion of extra fees."
    },
    {
      id: 'other' as DisputeType,
      title: "Other Issue",
      description: "Any other contract violation, unprofessional behavior, or platform issue regarding this property or designated agent."
    }
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragRef.current) {
      dragRef.current.classList.add("border-brand-teal", "bg-brand-teal/5");
    }
  };

  const handleDragLeave = () => {
    if (dragRef.current) {
      dragRef.current.classList.remove("border-brand-teal", "bg-brand-teal/5");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    if (e.dataTransfer.files) {
      const addedFiles = Array.from(e.dataTransfer.files);
      if (files.length + addedFiles.length > 5) {
        alert("Maximum 5 evidence files allowed.");
        return;
      }
      setFiles(prev => [...prev, ...addedFiles].slice(0, 5));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const addedFiles = Array.from(e.target.files);
      if (files.length + addedFiles.length > 5) {
        alert("Maximum 5 evidence files allowed.");
        return;
      }
      setFiles(prev => [...prev, ...addedFiles].slice(0, 5));
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDispute = async () => {
    if (!disputeType || description.length < 100) return;
    setIsSubmitting(true);
    setUploadProgress(10);

    const isLocalGuest = localStorage.getItem('isLocalGuest') === 'true';
    const disputeId = `disp-${Date.now()}`;
    const listingId = property.listingRequestId || property.id;
    const againstUserId = property.agent.id || "a1";

    try {
      let evidenceUrls: string[] = [];

      // Step 3: Handle uploaded files
      if (files.length > 0) {
        setUploadProgress(30);
        if (isLocalGuest) {
          // Fallback base64 conversion in guest mode
          for (const file of files) {
            const url = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            evidenceUrls.push(url);
          }
        } else {
          // Upload to Firebase Storage
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const storagePath = `disputes/${disputeId}/evidence/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            evidenceUrls.push(downloadUrl);
            setUploadProgress(Math.floor(30 + (i / files.length) * 40));
          }
        }
      }

      setUploadProgress(80);

      const disputeData: Dispute = {
        id: disputeId,
        listingId,
        propertyTitle: property.title,
        raisedBy: user.id,
        raisedByRole: user.role as 'Buyer' | 'Seller' | 'Agent',
        againstUserId,
        type: disputeType,
        description,
        evidence: evidenceUrls,
        status: 'Open',
        raisedAt: new Date().toISOString()
      };

      if (isLocalGuest) {
        // Save locally
        const storedDisputes = JSON.parse(localStorage.getItem('localGuestDisputes') || '[]');
        storedDisputes.push(disputeData);
        localStorage.setItem('localGuestDisputes', JSON.stringify(storedDisputes));

        // Update listing role status locally
        const storedRequests = JSON.parse(localStorage.getItem('localGuestListings') || '[]');
        const updatedRequests = storedRequests.map((req: any) => {
          if (req.id === listingId) {
            return { ...req, dealStatus: 'Disputed' };
          }
          return req;
        });
        localStorage.setItem('localGuestListings', JSON.stringify(updatedRequests));

        // Update local properties list status as well
        const storedProperties = JSON.parse(localStorage.getItem('localGuestProperties') || '[]');
        const updatedProperties = storedProperties.map((p: any) => {
          if (p.listingRequestId === listingId || p.id === property.id) {
            return { ...p, dealStatus: 'Disputed' };
          }
          return p;
        });
        localStorage.setItem('localGuestProperties', JSON.stringify(updatedProperties));
        
        window.dispatchEvent(new Event('local_guest_properties_updated'));
      } else {
        // 1. Save dispute document
        await setDoc(doc(db, 'disputes', disputeId), disputeData);

        // 2. Update status of the listing request
        try {
          await updateDoc(doc(db, 'listingRequests', listingId), { dealStatus: 'Disputed' });
        } catch (e) {
          console.error("ListingRequest dealStatus update omitted if not matching:", e);
        }

        // 3. Update trust score delta if any
        if (disputeType === 'off_platform_deal') {
          // Suspend agent/seller account action done during administrator resolution
        }
      }

      setUploadProgress(90);

      // 4. Send notification alerts
      // Acknowledgment alert in-app
      sendNotification(user.id, {
        type: 'dispute_opened',
        title: "Dispute Case Opened",
        body: `Your dispute case Case ID: ${disputeId} has been successfully registered. Rest assured, our team will review this within 48 hours.`,
        data: { disputeId, propertyId: property.id }
      });

      // Send to Admin
      if (isLocalGuest) {
        // Mock notify admin locally
        const storedAdmins = ['admin-musa'];
        storedAdmins.forEach(admId => {
          sendNotification(admId, {
            type: 'dispute_opened',
            title: "New Dispute Submitted",
            body: `Buyer reported ${disputeType} against agent ${property.agent.name}. Case ID: ${disputeId}.`,
            data: { disputeId, propertyId: property.id }
          });
        });
      } else {
        // Query admins in Firestore
        try {
          const adminsQuery = query(collection(db, 'users'), where('role', '==', 'Admin'));
          const snapshot = await getDocs(adminsQuery);
          snapshot.forEach(docSnap => {
            sendNotification(docSnap.id, {
              type: 'dispute_opened',
              title: "New Dispute Submitted",
              body: `A dispute has been reported regarding "${property.title}" for ${disputeType}. Case ID: ${disputeId}.`,
              data: { disputeId, propertyId: property.id }
            });
          });
        } catch (adminErr) {
          console.error("Failed to notify admins online:", adminErr);
        }
      }

      setUploadProgress(100);
      setSuccessCaseId(disputeId);
    } catch (err: any) {
      console.error("Dispute Submission failed:", err);
      alert(`Submission failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[1300] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background card container */}
      <div 
        className="bg-brand-gray dark:bg-zinc-950 border-4 border-brand-black dark:border-zinc-800 w-full max-w-2xl shadow-aggressive text-brand-black dark:text-zinc-200 relative my-8"
        id="dispute-flow-container"
      >
        {/* Success state display */}
        {successCaseId ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 border-4 border-brand-black dark:border-zinc-800 rounded-full flex items-center justify-center mx-auto rotate-3 shadow-brutal-sm">
              <CheckCircle size={36} />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-display font-black text-2xl uppercase tracking-wider">Dispute Registered</h3>
              <p className="text-xs text-zinc-500 uppercase font-mono">CASE FILE ID: <span className="text-brand-black dark:text-white font-bold">{successCaseId}</span></p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 p-5 space-y-3 shadow-brutal-sm max-w-md mx-auto text-left">
              <h4 className="text-[10px] font-mono font-black uppercase text-brand-red tracking-widest border-b border-zinc-200 pb-1">
                ADJUDICATION PROTOCOLS
              </h4>
              <ul className="text-xs space-y-2.5 font-bold uppercase text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-brand-teal shrink-0 mt-1"></span>
                  <span><strong>48-HOUR SLA:</strong> Platform Administrators will examine your detailed claim and submitted evidence.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-brand-teal shrink-0 mt-1"></span>
                  <span><strong>ONE APPEAL RIGHT:</strong> If you disagree with our resolution verdict, you retain a single right to appeal before closure.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-brand-teal shrink-0 mt-1"></span>
                  <span><strong>LISTING DISPUTED:</strong> The listing has been flagged under active review to prevent off-platform damage.</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-4 max-w-sm mx-auto pt-2">
              <button
                onClick={onClose}
                className="bg-brand-teal text-brand-black font-display font-black uppercase text-xs tracking-widest w-full py-3 border-4 border-brand-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-4 border-b-4 border-brand-black bg-brand-black text-white dark:bg-zinc-900 dark:border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-brand-red animate-bounce" />
                <h3 className="font-display font-black text-md uppercase tracking-wider text-brand-teal">
                  REPORT TRANSACTION DISPUTE
                </h3>
              </div>
              <button 
                onClick={onClose} 
                className="text-white hover:text-brand-red font-mono font-bold uppercase text-xs border border-white px-2 py-0.5"
              >
                CLOSE [X]
              </button>
            </div>

            {/* Stepper indicators */}
            <div className="grid grid-cols-4 border-b-2 border-brand-black dark:border-zinc-800 text-[10px] font-mono font-bold bg-white dark:bg-zinc-900 text-center select-none uppercase">
              <div className={cn("p-2 border-r border-brand-black dark:border-zinc-800", step === 1 ? "bg-brand-teal text-brand-black" : "text-zinc-500")}>1. Type</div>
              <div className={cn("p-2 border-r border-brand-black dark:border-zinc-800", step === 2 ? "bg-brand-teal text-brand-black" : "text-zinc-500")}>2. Details</div>
              <div className={cn("p-2 border-r border-brand-black dark:border-zinc-800", step === 3 ? "bg-brand-teal text-brand-black" : "text-zinc-500")}>3. Evidence</div>
              <div className={cn("p-2 bg-white dark:bg-zinc-900", step === 4 ? "bg-brand-teal text-brand-black" : "text-zinc-500")}>4. Review</div>
            </div>

            {/* Step Body */}
            <div className="p-6 min-h-[300px]">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="text-sm font-black uppercase mb-1">Select Dispute category</h4>
                      <p className="text-[11px] text-zinc-500 uppercase font-mono">Select the primary issue regarding this property</p>
                    </div>

                    <div className="space-y-2">
                      {disputeTypesInfo.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setDisputeType(item.id)}
                          className={cn(
                            "p-3 border-2 border-brand-black dark:border-zinc-800 shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer rounded-sm flex items-start gap-3",
                            disputeType === item.id 
                              ? "bg-brand-teal/20 border-brand-teal outline-2 outline-brand-teal" 
                              : "bg-white dark:bg-zinc-900"
                          )}
                        >
                          <input 
                            type="radio" 
                            checked={disputeType === item.id} 
                            onChange={() => setDisputeType(item.id)}
                            className="mt-1" 
                          />
                          <div>
                            <h5 className="text-[12px] font-black uppercase text-brand-black dark:text-zinc-100">{item.title}</h5>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold mt-1 leading-normal">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="text-sm font-black uppercase mb-1">Narrate Dispute details</h4>
                      <p className="text-[11px] text-zinc-500 uppercase font-mono">Explain what happened in full details (minimum 100 characters requirement)</p>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please provide explicit descriptions of dates, locations, spoken conversations, prices proposed, or actions representing the violation. Keep it objective."
                        className="w-full h-40 p-4 font-bold border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-905 text-xs text-brand-black dark:text-white rounded-sm focus:outline-none focus:ring-2 focus:ring-brand-teal leading-relaxed uppercase"
                      />
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className={cn(description.length >= 100 ? "text-green-600 font-bold" : "text-brand-red font-bold")}>
                          {description.length} / 100 characters minimum
                        </span>
                        <span className="text-zinc-400">Keep statements strictly professional</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="text-sm font-black uppercase mb-1">Attach supporting Evidence</h4>
                      <p className="text-[11px] text-zinc-500 uppercase font-mono">Upload up to 5 screenshots, PDF receipts, or communication logs</p>
                    </div>

                    {/* Drag & Drop uploader */}
                    <div
                      ref={dragRef}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-4 border-dashed border-brand-black dark:border-zinc-700 p-8 text-center bg-white dark:bg-zinc-900 shadow-brutal-sm hover:cursor-pointer transition-colors relative"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        multiple 
                        accept="image/*,application/pdf"
                      />
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <p className="text-xs font-black uppercase text-brand-black dark:text-zinc-300">Drag files here or click to select</p>
                      <p className="text-[9px] font-mono text-zinc-500 uppercase mt-1">Accepts images and PDF up to 10MB (max 5 files)</p>
                    </div>

                    {/* Uploaded files list */}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-mono font-black uppercase text-zinc-500">Selected Files ({files.length}/5):</p>
                        <div className="space-y-1.5">
                          {files.map((f, index) => (
                            <div key={index} className="flex items-center justify-between bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-800 p-2 text-xs rounded-sm">
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-4 h-4 text-brand-teal shrink-0" />
                                <span className="font-bold uppercase tracking-tight truncate">{f.name}</span>
                                <span className="text-[9px] font-mono text-zinc-500">({(f.size / 1024).toFixed(1)} KB)</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                                className="text-zinc-500 hover:text-brand-red p-1 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="text-sm font-black uppercase mb-1">Review case submission</h4>
                      <p className="text-[11px] text-zinc-500 uppercase font-mono">Verify details before filing the legal platform case</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border-2 border-brand-black dark:border-zinc-800 p-4 space-y-3 shadow-brutal-sm">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">Dispute category</span>
                          <span className="font-black uppercase text-brand-red">{disputeType ? disputeType.replace('_', ' ') : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">Property listing Title</span>
                          <span className="font-black uppercase text-zinc-800 dark:text-zinc-200">{property.title}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">Respondent Party</span>
                          <span className="font-black uppercase text-brand-teal">{property.agent.name}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">Evidence logs</span>
                          <span className="font-mono">{files.length} FILE{files.length === 1 ? '' : 'S'} ATTACHED</span>
                        </div>
                      </div>

                      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 selection:bg-brand-teal">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Case narrative description preview</span>
                        <p className="text-[11px] font-bold text-zinc-650 dark:text-zinc-400 uppercase italic line-clamp-3">
                          "{description}"
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-955/20 border-2 border-brand-black dark:border-zinc-800 p-3 flex gap-2 rounded-sm items-start">
                      <ShieldCheck className="text-brand-teal shrink-0 mt-0.5" size={16} />
                      <p className="text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400">
                        Submitting this report initiates an active review. Our platform reserves the right to suspend accounts of parties found guilty of off-platform bypass or fraudulent transactions.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step Actions Footer */}
            <div className="p-4 border-t-4 border-brand-black dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center">
              {step > 1 ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep(prev => prev - 1)}
                  className="bg-brand-gray text-brand-black border-2 border-brand-black py-2 px-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[11px] font-mono font-black uppercase flex items-center gap-1 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                >
                  <ChevronLeft size={14} /> Back
                </button>
              ) : (
                <div />
              )}

              {/* Progress bar for submission */}
              {isSubmitting && (
                <div className="flex-1 max-w-xs mx-4 text-center space-y-1">
                  <div className="flex justify-between text-[8px] font-mono font-black">
                    <span className="uppercase text-brand-red animate-pulse">UPLOADING CASE EVIDENCE</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-zinc-200 border-2 border-brand-black">
                    <div className="h-full bg-brand-teal transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {!isSubmitting && (
                step < 4 ? (
                  <button
                    type="button"
                    disabled={
                      (step === 1 && !disputeType) ||
                      (step === 2 && description.length < 100)
                    }
                    onClick={() => setStep(prev => prev + 1)}
                    className="bg-brand-teal disabled:opacity-40 text-brand-black border-2 border-brand-black py-2 px-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[11px] font-mono font-black uppercase flex items-center gap-1 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitDispute}
                    className="bg-brand-red text-white border-2 border-brand-black py-2.5 px-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[11px] font-display font-black uppercase flex items-center gap-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer rotate-1"
                  >
                    File Case File & Submit
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
