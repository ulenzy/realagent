import React from 'react';

interface DocumentUploadProps {
  label: string;
  accept?: string;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
}

export default function DocumentUpload({ label, accept = "application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document", onFileSelect, required }: DocumentUploadProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        type="file" 
        accept={accept}
        className="brutalist-input" 
        onChange={e => onFileSelect(e.target.files?.[0] || null)} 
      />
    </div>
  );
}
