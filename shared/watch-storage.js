// Zepp LocalStorage instances retain their own loaded snapshot. Reopen at each
// boundary so a card built before a page refresh can see the page's saved ETA.
export function createWatchCache(Storage) {
  return {
    read() {
      try {
        return new Storage().getItem('commute')
      } catch {
        return null
      }
    },
    write(value) {
      try {
        new Storage().setItem('commute', value)
      } catch {
        // A storage failure must not stop a successful foreground refresh.
      }
    },
  }
}
