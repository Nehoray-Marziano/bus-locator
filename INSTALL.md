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

Enable **Demo mode** in the Zepp settings panel to inspect the countdown without needing an active bus. Disable it to validate the live provider. Test phone disconnect, no prediction, expired prediction, pause/resume and noon switching. A desktop approximation can be regenerated with `node scripts/preview.js` and `uv run --with pillow python scripts/render-preview.py`; it is not a Zepp simulator.

## 3. Personal watch preview

Follow [Zepp developer mode instructions](https://docs.zepp.com/docs/guides/tools/zepp-app/). Zeus preview needs your own developer account:

```sh
node scripts/zeus.cjs login
node scripts/zeus.cjs preview
```

Scan the resulting QR using the **Zepp phone app's developer-mode scanner** with the paired watch connected. Open Meitar Bus from the watch app list. No API credentials or server setup is needed. Under the app's Zepp settings, keep Demo mode off and set the return switch time if noon is unsuitable. Reopen the watch app after settings changes.

## 4. Hardware acceptance

To add the vertical-list shortcut card, swipe right from the watch face, scroll
to the bottom of the card list, open its settings, and choose Add → Meitar Bus.
This is AppWidget, distinct from full-screen SecondaryWidget. Test that it shows
Meitar in the morning and Jerusalem after the switch time, expires old data,
and opens the full app on tap. A fresh phone query still requires opening the
app. Adding this card on the actual firmware remains a device acceptance check.

- During the morning trip, confirm **14100** and compare live line 440 prediction against the phone.
- During the return trip, confirm **222** and verify `10440-1-#` returns the correct journey. The full stop-discovery query timed out during desktop research; the calendar's empty response is not enough to prove this mapping during service.
- Check that the screen explicitly labels demo, no prediction, expired data and disconnection.
- Close the app, wait, and verify that no app-created watch service or alarm is running. Foreground redraw must stop when paused. Use device battery profiling for measured consumption; no battery drain percentage is claimed.
- If firmware offers Meitar Bus in shortcut-card settings, add it and verify cached content and tap-to-open. Otherwise launch the full app, or assign it to a programmable watch shortcut if your firmware supports one.

Account sign-in, QR scanning, physical watch behavior and the final live 440 comparison require your device. They cannot be validated by unit tests or a desktop rendering.
