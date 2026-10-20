# Install and validate on T-Rex 3

## 1. Build

```sh
npm ci
npm test
npm run check
npm run build
```

Target: 480×480 T-Rex 3, API level 4.0, all three documented deviceSource variants. `app.json` uses a development app ID; replace it with your own Zepp developer app ID before marketplace submission or if the preview service requires ownership.

## 2. Simulator

Install the current [Zepp OS simulator](https://docs.zepp.com/docs/guides/tools/simulator/), select T-Rex 3 or its compatible 480×480 target, enable Device Simulator, then run:

```sh
npm run dev
```

Enable **Demo mode** in the Zepp settings panel to inspect the countdown without needing an active bus. Disable it to validate the live provider. Test phone disconnect, no prediction, expired prediction, pause/resume and 10:00/18:00 switching and tomorrow's scheduled time. A desktop approximation can be regenerated with `node scripts/preview.js` and `uv run --with pillow python scripts/render-preview.py`; it is not a Zepp simulator.

## 3. Personal watch preview

Follow [Zepp developer mode instructions](https://docs.zepp.com/docs/guides/tools/zepp-app/). Zeus preview needs your own developer account:

```sh
node scripts/zeus.cjs login
node scripts/zeus.cjs preview
```

Scan the resulting QR using the **Zepp phone app's developer-mode scanner** with the paired watch connected. Open Meitar Bus from the watch app list. No API credentials or server setup is needed. Under the app's Zepp settings, keep Demo mode off and set the return switch time if 10:00/18:00 are unsuitable. Reopen the watch app after settings changes.

### Windows: EPERM on `.tooling/watch`

Update the launcher, then retry:

```sh
git pull --ff-only
npm run preview
```

Each dev, preview or build command now uses its own folder under `.tooling/runs/`.
An open dev session can keep the old `.tooling/watch` locked without blocking
preview. You do not need to delete that folder or run as administrator. Cleanup
retries brief Windows locks; if a private folder remains locked, the launcher
leaves it behind and the next command uses a fresh folder.

## 4. Hardware acceptance

To add the vertical-list shortcut card, swipe right from the watch face, scroll
to the bottom of the card list, open its settings, and choose Add → Meitar Bus.
This is AppWidget, distinct from full-screen SecondaryWidget. Test that it shows Meitar before 10:00, Jerusalem until 18:00 and Meitar for tomorrow after 18:00; differentiates live/scheduled times; expires old live data;
and opens the full app on tap. A fresh phone query still requires opening the
app. Adding this card on the actual firmware remains a device acceptance check.

- During the morning trip, confirm **14100** and compare live line 440 prediction against the phone.
- During the return trip, confirm **222** and verify `10440-1-#` returns the correct journey. The daily timetable now validates this mapping. Compare the live prediction during service as well.
- Check that the screen explicitly labels demo, no prediction, expired data and disconnection.
- For 0.6.1, compare the green Live/amber Scheduled ETA, enlarged card numerals,
  orange actions and unboxed layout against artifacts/card-icons-preview-0.6.1.png. Check Due,
  tomorrow's clock and both towns at normal wrist distance and outdoors. Confirm
  that the card's Reverse button remains distinct from the card body and that
  native font metrics match the desktop previews without clipping.
- Open the app, lower your wrist for a short sleep (under ten seconds), then
  raise it: the app should remain visible and refresh once. Repeat after a longer
  sleep (over ten seconds) to exercise Zepp's automatic destroy/relaunch path.
- Press Back to leave the app, let the screen sleep, and raise your wrist:
  Meitar Bus must stay closed. Check both wrist raise and button wake, with your
  usual always-on-display setting. These firmware behaviors need watch testing.
- Focus the card, sleep and wake without scrolling away: its cached countdown
  should update immediately. Opening the list or focusing a different card must
  not start its timer or a phone request. A fresh live ETA needs a card-body tap.
- Close the app, wait, and verify that no app-created watch service or alarm is running. Foreground redraw must stop when paused. Use device battery profiling for measured consumption; no battery drain percentage is claimed.
- If firmware offers Meitar Bus in shortcut-card settings, add it and verify cached content and tap-to-open. Otherwise launch the full app, or assign it to a programmable watch shortcut if your firmware supports one.

Account sign-in, QR scanning, physical watch behavior and the final live 440 comparison require your device. They cannot be validated by unit tests or a desktop rendering.

## Temporary direction switching

Tap Reverse beside the boarding town in the app or shortcut card. Refresh stays on that direction. Tap Reset to restore the time rule, or leave the view: the next session is automatic. After 18:00 both directions check tomorrow. The card uses cached data; tap its body to open the selected direction in the app for a phone check. Verify that tapping Reverse does not also open the app, that the selected direction reaches the app, and that returning to either view resets it.
