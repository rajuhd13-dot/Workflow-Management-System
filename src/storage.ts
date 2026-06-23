// Memory fallback when localStorage or sessionStorage are disabled (e.g. inside sandboxed iframes)
const memoryStore: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("localStorage is blocked, using memory fallback:", e);
    }
    return memoryStore[`ls_${key}`] || null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("localStorage is blocked, saving to memory fallback:", e);
    }
    memoryStore[`ls_${key}`] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("localStorage is blocked, removing from memory fallback:", e);
    }
    delete memoryStore[`ls_${key}`];
  }
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn("sessionStorage is blocked, using memory fallback:", e);
    }
    return memoryStore[`ss_${key}`] || null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("sessionStorage is blocked, saving to memory fallback:", e);
    }
    memoryStore[`ss_${key}`] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("sessionStorage is blocked, removing from memory fallback:", e);
    }
    delete memoryStore[`ss_${key}`];
  }
};
