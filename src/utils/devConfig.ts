/**
 * Configuration pour les fonctionnalités de développement
 * SoinLokal — Application mobile pour infirmières libérales
 */

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

declare const __DEV__: boolean;

export const IS_DEVELOPMENT: boolean = __DEV__;

// ---------------------------------------------------------------------------
// Developer feature flags
// ---------------------------------------------------------------------------

export interface DevConfigShape {
  SHOW_DEBUG_INFO: boolean;
  ENABLE_DEBUG_LOGS: boolean;
  IGNORE_SSL: boolean;
  USE_MOCK_DATA: boolean;
  NETWORK_DELAY: number;
  OFFLINE_MODE: boolean;
}

export const DEV_CONFIG: DevConfigShape = {
  SHOW_DEBUG_INFO:   IS_DEVELOPMENT,
  ENABLE_DEBUG_LOGS: IS_DEVELOPMENT,
  IGNORE_SSL:        IS_DEVELOPMENT,
  USE_MOCK_DATA:     false,
  NETWORK_DELAY:     0,
  OFFLINE_MODE:      false,
};

// ---------------------------------------------------------------------------
// Debug messages
// ---------------------------------------------------------------------------

export const DEBUG_MESSAGES = {
  MOCK_DATA_LOADED: '📦 Données simulées chargées',
  OFFLINE_MODE:     '📡 Mode hors ligne activé',
  SUPABASE_LOGIN:   '🔐 Connexion Supabase',
} as const;

// ---------------------------------------------------------------------------
// Debug logging utilities
// ---------------------------------------------------------------------------

export function debugLog(message: string, data?: unknown): void {
  if (DEV_CONFIG.ENABLE_DEBUG_LOGS) {
    if (data !== undefined) {
      console.log(`[SoinLokal Debug] ${message}`, data);
    } else {
      console.log(`[SoinLokal Debug] ${message}`);
    }
  }
}

export function devAlert(title: string, message: string): void {
  if (IS_DEVELOPMENT) {
    console.warn(`[DEV ALERT] ${title}: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Dev UI colours (debug overlays, badges, etc.)
// ---------------------------------------------------------------------------

export const DEV_COLORS = {
  DEBUG_OVERLAY: 'rgba(0, 0, 0, 0.8)',
  WARNING:       '#ef4444',
  INFO:          '#3b82f6',
} as const;

export default DEV_CONFIG;
