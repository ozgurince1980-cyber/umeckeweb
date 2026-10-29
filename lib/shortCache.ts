const PREFIX = "umecke-cache:";
export function readShortCache<T>(key: string, ttlMs = 30_000): T | null {
 if (typeof window === "undefined") return null;
 try { const raw = sessionStorage.getItem(PREFIX + key); if (!raw) return null; const entry = JSON.parse(raw) as { savedAt:number; value:T }; if (Date.now()-entry.savedAt>ttlMs) return null; return entry.value; } catch { return null; }
}
export function writeShortCache<T>(key:string,value:T) { if (typeof window === "undefined") return; try { sessionStorage.setItem(PREFIX+key,JSON.stringify({savedAt:Date.now(),value})); } catch {} }
export function clearShortCache(key?:string) { if(typeof window==="undefined") return; if(key) sessionStorage.removeItem(PREFIX+key); else for(let i=sessionStorage.length-1;i>=0;i--){ const k=sessionStorage.key(i); if(k?.startsWith(PREFIX)) sessionStorage.removeItem(k); } }
