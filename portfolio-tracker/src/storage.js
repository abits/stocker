const KEY = "portfolio:positions:v1"

const hasClaudeStorage = typeof window !== "undefined" && window.storage != null

export const storage = {
  get: () => {
    try {
      const raw = hasClaudeStorage
        ? window.storage.get(KEY)
        : localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  set: (data) => {
    try {
      const raw = JSON.stringify(data)
      if (hasClaudeStorage) window.storage.set(KEY, raw)
      else localStorage.setItem(KEY, raw)
    } catch {}
  },
  delete: () => {
    try {
      if (hasClaudeStorage) window.storage.delete(KEY)
      else localStorage.removeItem(KEY)
    } catch {}
  },
}
