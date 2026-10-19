# Meitar Bus

A small Zepp OS app for Amazfit T-Rex 3, tracking line **440** at your boarding stop.

| Israel time  | Boarding location   | Arrival being checked |
| ------------ | ------------------- | --------------------- |
| Before 10:00 | Meitar, stop 14100  | Today                 |
| 10:00?18:00  | Jerusalem, stop 222 | Today                 |
| From 18:00   | Meitar, stop 14100  | Tomorrow              |

Both switch times are editable in Zepp. Selection applies every day, with Israel
DST and date rollover handled locally. Stop codes stay out of the watch UI.

**Green = live ETA. Amber = scheduled arrival.** The phone first checks the public
Ministry live-arrivals API. If live data is missing or unavailable, it uses the
returned schedule or the official daily timetable. Tomorrow uses the daily
calendar directly. No timetable or arrival is fabricated when the provider has
none. Source, boarding town and tomorrow context are explicit on both surfaces.

Requests happen only when opening/resuming the app, swapping direction there, or tapping Refresh. The phone
has a 30-second request cooldown and caches compact daily timetables for 30 minutes.
Live predictions expire after two minutes; an actual supplied timetable time can
replace an expired live prediction. Scheduled cache lasts up to 24 hours and never
beyond the selected service date or passed arrival. No GPS, background polling,
server, API key, telemetry, remote fonts or map is needed.

Version 0.5.0 uses rounded mint live-arrival panels, peach schedules, lilac controls and expressive rounded lettering. Native
bus, broadcast, calendar and refresh icons replace repeated explanatory text. The
220px shortcut card uses a single column and conservative side insets to prevent
right-edge clipping. Two bundled Fredoka/Nunito fonts total about 40 KB.
[Design preview](artifacts/design-icons-preview-0.5.0.png),
[16 watch states](artifacts/watch-icons-states-0.5.0.png), and
[18 card layouts](artifacts/card-icons-states-0.5.0.png) use synthetic examples.

**Temporary direction switch:** tap **Reverse** beside the boarding town in either view. The button becomes **Reset** to restore the clock choice immediately. Refresh keeps your temporary choice; leaving the view clears it. After 18:00 either direction checks tomorrow. The card switches cached views; tap its body to open the selected direction in the app for a fresh ETA. Neither view saves a direction preference.

## Continue on your personal computer

The current [installable package](dist/Meitar-Bus-0.5.0.zab) and versioned
previews are included in this repository. You still need Zepp's developer-mode
preview flow to install on the watch; the package is not a phone application.

With Git, Node.js and npm installed on your personal computer:

```sh
git clone https://github.com/Nehoray-Marziano/bus-locator.git
cd bus-locator
npm ci
npm test
npm run check
node scripts/zeus.cjs login
npm run preview
```

Scan the resulting QR code in the Zepp phone app's developer-mode scanner while
paired with your watch. See [INSTALL.md](INSTALL.md) for the full procedure and
remaining hardware checks. The current app ID is a development ID; use your own
Zepp developer app ID if the preview service requires ownership.

Dependencies and temporary tooling are deliberately excluded from Git. `npm ci`
restores the pinned dependencies on the new computer. The bundled font and its
license are included; generating fonts or installing Python is unnecessary for
normal development, building or watch installation.

## Develop and validate

Use a current Node.js release with npm:

```sh
npm ci
npm test
npm run check
npm run format:check
npm run check:provider
npm run build
```

`check:provider` checks today's two directions and tomorrow's morning schedule (up to five on-demand HTTP requests); unit tests never use the internet. The build writes `dist/`. Dependencies are pinned to the latest published versions checked on 2026-10-19, with a lockfile. Zeus brings its own development dependencies; the watch package only includes the app and the messaging code it needs.

Read [INSTALL.md](INSTALL.md) for simulator and watch installation. [Provider validation](docs/PROVIDERS.md) records the observed responses and the remaining route verification. [Validation notes](docs/VALIDATION.md) distinguish automated, desktop-layout and hardware checks.

## Small code map

| Location                                             | Responsibility                                     |
| ---------------------------------------------------- | -------------------------------------------------- |
| `shared/config.js`, `shared/time.js`                 | Fixed journeys, switch time, Israel dates/DST      |
| `shared/model.js`                                    | Countdown, freshness and display states            |
| `app-side/provider.js`                               | Live MOT arrivals, daily timetable and validation  |
| `app-side/service.js`                                | Throttling, shared requests and cache              |
| `page/controller.js`                                 | Refresh, timeout, pause and late responses         |
| `page/view.js`, `shared/theme.js`, `shared/icons.js` | Native widgets, design tokens and shared icons     |
| `app-widget/index.js`                                | Optional cached shortcut card                      |
| `setting/index.js`                                   | Switch time and explicit demo toggle               |
| `tests/`                                             | Deterministic behavior, transport and layout tests |

The app includes an AppWidget for the vertical Shortcut Cards list, separate from
full-screen SecondaryWidgets. To add it, swipe right from the watch face, scroll
to the bottom of the card list, open its settings, and add Meitar Bus. Its presence
still needs confirmation on the paired watch. The card shows the boarding location
(Meitar before 10:00, Jerusalem until 18:00, then Meitar for tomorrow), cached countdown and
freshness. Local updates run only while focused and stop on pause. Live results expire after two minutes; actual timetable fallback remains labelled Scheduled. Tap the card to open the app and fetch a fresh prediction.

Zepp's [card guide](https://docs.zepp.com/docs/guides/framework/device/secondary-widget/)
requires the phone Bluetooth bridge to be initialized from an app page. The card
therefore makes no network requests. A continuously fresh standalone card is
outside the documented capability used by this implementation.
