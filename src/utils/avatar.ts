// ---------------------------------------------------------------------------
// DiceBear Personas avatar utilities
// ---------------------------------------------------------------------------

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x/personas';

export type AvatarType = 'photo' | 'generated' | null;

/**
 * Build a DiceBear Personas PNG URL from a seed.
 * Using PNG format so <Image> works natively without react-native-svg.
 */
export function getDicebearUrl(seed: string, size = 256): string {
  return `${DICEBEAR_BASE}/png?seed=${encodeURIComponent(seed)}&size=${size}`;
}

/**
 * Generate a random seed for DiceBear avatars.
 */
export function generateRandomSeed(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a batch of random seeds for the avatar picker grid.
 */
export function generateAvatarBatch(count: number): string[] {
  return Array.from({ length: count }, () => generateRandomSeed());
}

/**
 * Generate a deterministic seed from a user's name (so same name = same avatar
 * if the user hasn't picked a custom seed).
 */
export function nameToSeed(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`;
}
