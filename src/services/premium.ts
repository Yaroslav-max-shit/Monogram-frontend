export const PREMIUM_FEATURES = {
  free: {
    accounts: 5,
    accentColors: 5,
    stickerPacks: 10,
    animatedEmoji: false,
    callRecording: false,
    customWallpapers: 10,
    customReactions: false,
    premiumBadge: false,
    storiesPerDay: 1,
    businessProfile: false,
    emojiStatus: false,
  },
  premium: {
    accounts: 10,
    accentColors: Infinity,
    stickerPacks: Infinity,
    animatedEmoji: true,
    callRecording: true,
    customWallpapers: Infinity,
    customReactions: true,
    premiumBadge: true,
    storiesPerDay: Infinity,
    businessProfile: true,
    emojiStatus: true,
  },
};

export const PREMIUM_PRICES = {
  monthly: 50,
  yearly: 500,
};

export const PREMIUM_OLD_PRICES = {
  monthly: 60,
  yearly: 600,
};

export const PREMIUM_DISCOUNT = 17;

export const checkPremium = async (userId: number): Promise<boolean> => {
  try {
    const { default: api } = await import('./api');
    const res = await api.get(`/premium/check/${userId}`);
    return res.data.is_premium === true;
  } catch {
    return false;
  }
};
