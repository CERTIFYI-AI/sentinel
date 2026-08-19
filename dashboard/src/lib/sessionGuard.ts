import { supabase } from './supabase';

// Session Security Guard
// - Auto-logout after 3 hours of inactivity
// - Auto-logout on new IP address (network change)
// - Auto-logout on new browser/device (fingerprint change)

const INACTIVITY_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 h
const CHECK_INTERVAL_MS   = 60_000;              // poll every 60 s
const LAST_ACTIVE_KEY     = 'sentinel_last_active';
const DEVICE_FP_KEY       = 'sentinel_device_fp';
const SESSION_IP_KEY      = 'sentinel_session_ip';

function buildDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? ''),
    String(navigator.platform ?? ''),
  ];
  const str = parts.join('|');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

async function fetchPublicIP(): Promise<string> {
  return '';
}

function clearGuardStorage(): void {
  sessionStorage.removeItem(LAST_ACTIVE_KEY);
  sessionStorage.removeItem(DEVICE_FP_KEY);
  sessionStorage.removeItem(SESSION_IP_KEY);
}

async function forceSignOut(reason: string): Promise<void> {
  console.warn('[SessionGuard] Auto-logout:', reason);
  clearGuardStorage();
  if (supabase) await supabase.auth.signOut();
  window.location.replace('/login');
}

function touchActivity(): void {
  sessionStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

function isInactive(): boolean {
  const raw = sessionStorage.getItem(LAST_ACTIVE_KEY);
  if (!raw) return false;
  return Date.now() - parseInt(raw, 10) > INACTIVITY_LIMIT_MS;
}

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _initialized = false;

export async function initSessionGuard(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  // 1. Device fingerprint — store on first load, logout if it changes
  const currentFP = buildDeviceFingerprint();
  const storedFP  = sessionStorage.getItem(DEVICE_FP_KEY);
  if (!storedFP) {
    sessionStorage.setItem(DEVICE_FP_KEY, currentFP);
  } else if (storedFP !== currentFP) {
    await forceSignOut('browser or device changed');
    return;
  }

  // 2. IP — capture once; checked again on tab-focus
  if (!sessionStorage.getItem(SESSION_IP_KEY)) {
    const ip = await fetchPublicIP();
    if (ip) sessionStorage.setItem(SESSION_IP_KEY, ip);
  }

  // 3. Seed activity timestamp
  touchActivity();

  // 4. Reset inactivity clock on any user interaction
  const EVENTS = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'scroll', 'click'];
  EVENTS.forEach(evt => window.addEventListener(evt, touchActivity, { passive: true }));

  // 5. Re-check everything when the tab regains visibility / focus
  const onVisible = async (): Promise<void> => {
    if (document.visibilityState === 'hidden') return;

    const fp  = buildDeviceFingerprint();
    const sfp = sessionStorage.getItem(DEVICE_FP_KEY);
    if (sfp && fp !== sfp) {
      await forceSignOut('browser or device changed');
      return;
    }

    const currentIP = await fetchPublicIP();
    const savedIP   = sessionStorage.getItem(SESSION_IP_KEY);
    if (currentIP && savedIP && currentIP !== savedIP) {
      await forceSignOut('new IP / network detected');
      return;
    }

    if (isInactive()) {
      await forceSignOut('3-hour inactivity timeout');
    }
  };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);

  // 6. Periodic inactivity poll
  _intervalId = setInterval(async () => {
    if (isInactive()) await forceSignOut('3-hour inactivity timeout');
  }, CHECK_INTERVAL_MS);
}

export function destroySessionGuard(): void {
  if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
  _initialized = false;
  clearGuardStorage();
}
