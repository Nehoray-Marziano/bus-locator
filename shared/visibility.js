// Screen events also cover short sleeps that do not destroy/rebuild the page.
// Cards must additionally have focus: merely opening the list is not activity.
export function bindScreenVisibility({
  screen,
  onResume,
  onPause,
  focused = true,
}) {
  let active = false
  let destroyed = false
  function sync() {
    if (destroyed) return
    const next = focused && screen.getStatus() === 1
    if (next === active) return
    active = next
    if (active) onResume()
    else onPause()
  }
  screen.onChange(sync)
  sync()
  return {
    setFocused(value) {
      focused = value
      sync()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      screen.offChange(sync)
      if (active) onPause()
      active = false
    },
  }
}
