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

  const colorMap: Record<string, string> = {
    'black': '2c1b18',
    'brown': '4a312c,724130',
    'blonde': 'd6b97b,b58143',
    'red': 'c93305,a55728',
    'silverGray': 'e8e1e1,platinum'
  };
  const mappedColor = colorMap[hairColor] || '2c1b18';

  if (targetUser.avatarTier === 'Epic') {
    url += `&backgroundColor=a855f7`;
    if (headwear !== 'none') {
      url += `&top=antenna,antennaCrooked`;
    } else {
      if (hairStyle === 'longHair') url += `&top=radar,glow`;
      else url += `&top=pyramid,bulb`;
    }
  } else if (targetUser.avatarTier === 'Legendary') {
    url += `&backgroundColor=fbbf24`;
    if (headwear === 'hat') url += `&hair=cap`;
    else if (headwear === 'hijab') url += `&hair=hijab`;
    else if (headwear === 'turban') url += `&hair=turban`;
    else {
      if (hairStyle === 'longHair') url += `&hair=long,curly`;
      else if (hairStyle === 'shortHair') url += `&hair=short,bald`;
      else url += `&hair=bob`;
    }
    url += `&hairColor=${mappedColor.split(',')[0]}`; 
  } else {
    // Basic - avataaars
    if (headwear === 'hat') {
       url += `&top=hat,winterHat1,winterHat2,winterHat3,winterHat4`;
    } else if (headwear === 'hijab') {
       url += `&top=hijab`;
    } else if (headwear === 'turban') {
       url += `&top=turban`;
    } else if (headwear === 'winterHat') {
       url += `&top=winterHat1,winterHat2,winterHat3,winterHat4`;
    } else {
       if (hairStyle === 'shortHair') url += `&top=shortHairDreads01,shortHairFrizzle,shortHairShaggy,shortHairShortCurly,shortHairShortFlat,shortHairShortRound,shortHairShortWaved,shortHairSides,shortHairTheCaesar,shortHairTheCaesarSidePart`;
       if (hairStyle === 'longHair') url += `&top=longHairBigHair,longHairBob,longHairBun,longHairCurly,longHairCurvy,longHairDreads,longHairFro,longHairStraight`;
       if (hairStyle === 'bob') url += `&top=longHairBob`;
       if (hairStyle === 'curly') url += `&top=shortHairShortCurly,longHairCurly,longHairCurvy,longHairFro`;
       if (hairStyle === 'shaggy') url += `&top=shortHairShaggy,shortHairShaggyMullet`;
       if (hairStyle === 'frida') url += `&top=longHairFrida`;
       if (hairStyle === 'frizzle') url += `&top=shortHairFrizzle`;
    }
    url += `&hairColor=${mappedColor}`;
    url += `&accessoriesProbability=0`;
  }
  return url;
};
