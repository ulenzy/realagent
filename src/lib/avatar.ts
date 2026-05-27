import { User } from '../types';

export const getUserAvatarUrl = (targetUser: Partial<User>, currentPreviewSeed?: string) => {
  if (targetUser.avatarUrl && !currentPreviewSeed) return targetUser.avatarUrl;
  
  let style = 'avataaars';
  if (targetUser.avatarTier === 'Epic') style = 'bottts';
  if (targetUser.avatarTier === 'Legendary') style = 'personas';

  const seed = currentPreviewSeed || targetUser.avatarSeed || targetUser.name || 'User';
  let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  
  const options = targetUser.avatarOptions || { hairStyle: 'shortHair', hairColor: 'black', headwear: 'none' };
  const { hairStyle, hairColor, headwear } = options;

  if (targetUser.avatarTier === 'Epic') {
    url += `&backgroundColor=a855f7`;
  } else if (targetUser.avatarTier === 'Legendary') {
    url += `&backgroundColor=fbbf24`;
  } else {
    // Basic - avataaars
    url += `&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  }
  return url;
};
