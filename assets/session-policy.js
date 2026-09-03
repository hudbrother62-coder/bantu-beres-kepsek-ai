export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;

export function isIdleSession(lastActivity, now = Date.now(), hasSession = true) {
  const last = Number(lastActivity);
  return Boolean(hasSession && Number.isFinite(last) && last > 0 && now - last > SESSION_IDLE_MS);
}
