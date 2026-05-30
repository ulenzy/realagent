import React from 'react';

interface PhotoUploadProps {
  label: string;
  onPhotosSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export default function PhotoUpload({ label, onPhotosSelect, required }: PhotoUploadProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        type="file" 
        multiple 
        accept="image/jpeg,image/png,image/webp"
        className="brutalist-input" 
        onChange={onPhotosSelect} 
      />
    </div>
  );
}
