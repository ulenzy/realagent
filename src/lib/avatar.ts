import { User } from '../types';
import { AVATAR_COSMETICS } from '../constants/cosmetics';

export const getUserAvatarUrl = (targetUser: Partial<User>, currentPreviewSeed?: string) => {
  // Check if target has a custom equipped cosmetic avatar
  const equippedId = (targetUser as any).equippedAvatarId;
  const match = equippedId ? AVATAR_COSMETICS.find(a => a.id === equippedId) : null;
  
  let style = 'avataaars';
  let seed = targetUser.name || 'User';
  let rarity = 'Common';
  
  if (match) {
    style = match.style;
    seed = match.seed;
    rarity = match.rarity;
  } else {
    // Legacy support
    const tier = targetUser.avatarTier;
    if (tier === 'Epic') style = 'bottts';
    else if (tier === 'Legendary') style = 'personas';
    
    seed = targetUser.avatarSeed || targetUser.name || 'User';
    rarity = (tier === 'Standard' ? 'Common' : tier) || 'Common';
  }

  if (currentPreviewSeed) {
    // If a specific preview seed is requested, use it
    seed = currentPreviewSeed;
  }

  let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  
  // Custom backgrounds based on structured rarity tiers
  if (rarity === 'Legendary') {
    url += `&backgroundColor=eab308`; // Amber Gold
  } else if (rarity === 'Epic') {
    url += `&backgroundColor=a855f7`; // Purple
  } else if (rarity === 'Rare') {
    url += `&backgroundColor=3b82f6`; // Blue
  } else if (rarity === 'Uncommon') {
    url += `&backgroundColor=22c55e`; // Green
  } else {
    url += `&backgroundColor=94a3b8`; // Slate/Gray for Common
  }
  
  return url;
};

