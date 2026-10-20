# Meitar Bus

A small Zepp OS app for Amazfit T-Rex 3, tracking line **440** at your boarding stop.

| Israel time  | Boarding location   | Arrival being checked |
| ------------ | ------------------- | --------------------- |
| Before 10:00 | Meitar, stop 14100  | Today                 |
| 10:00?18:00  | Jerusalem, stop 222 | Today                 |
| From 18:00   | Meitar, stop 14100  | Tomorrow              |

Both switch times are editable in Zepp. Selection applies every day, with Israel
DST and date rollover handled locally. Stop codes stay out of the watch UI.

**Green Live label = live ETA. Amber Scheduled label = timetable.** The phone first checks the public
Ministry live-arrivals API. If live data is missing or unavailable, it uses the
returned schedule or the official daily timetable. Tomorrow uses the daily
calendar directly. No timetable or arrival is fabricated when the provider has
none. Source, boarding town and tomorrow context are explicit on both surfaces.

The app returns to its page on wrist wake until you explicitly leave it, using
Zepp's [setWakeUpRelaunch](https://docs.zepp.com/docs/reference/device-app-api/newAPI/display/setWakeUpRelaunch/).
The screen sleeps normally. Requests happen only when opening/waking the app,
swapping direction there, or tapping Refresh while the screen is on. The phone
has a 30-second request cooldown and caches compact daily timetables for 30 minutes.
Live predictions expire after two minutes; an actual supplied timetable time can
replace an expired live prediction. Scheduled cache lasts up to 24 hours and never
beyond the selected service date or passed arrival. No GPS, background polling,
server, API key, telemetry, remote fonts or map is needed.

Version 0.5.2 handles screen on/off events directly: countdown timers and request
timeouts stop on screen-off, duplicate screen-on events do not request again,
and short sleeps refresh without requiring a page rebuild. The card reloads its
cached countdown on focus and on wrist wake while focused. It cannot fetch a
new live ETA itself; tap its body to open the app. Battery consumption and manual
Back/wrist-wake behavior still require physical-watch verification.

Version 0.6.2 fixes the refresh arrowhead with a single continuous native shape.
[Icon preview](artifacts/refresh-icon-preview-0.6.2.png) shows it at actual size
and enlarged. The ETA changes from 0.6.1 remain: green for live predictions and amber for scheduled
estimates on both surfaces. The card's nearby-arrival font grows from 60px to
92px (53%); clock times grow from 48px to 64px (33%), before card-width scaling.
Cached disconnected and demo values retain neutral colors.

The sporty design uses a black/graphite palette, source-colored arrival
figures, orange actions and smaller semantic source indicators. The
large mint/peach panels and lilac badges are removed. Space Grotesk and DM Sans
replace the rounded lettering; nearby arrivals shrink from 120px to 112px.
The compact card shares the same typography and uses a left-aligned arrival.
The two bundled fonts total 38 KB. Native icons and normal screen sleep remain.
[Card preview](artifacts/card-icons-preview-0.6.1.png),
[16 watch states](artifacts/watch-icons-states-0.6.1.png), and
[48 card layouts](artifacts/card-icons-states-0.6.1.png) use synthetic examples.

**Temporary direction switch:** tap **Reverse** beside the boarding town in either view. The button becomes **Reset** to restore the clock choice immediately. Refresh keeps your temporary choice; leaving the view clears it. After 18:00 either direction checks tomorrow. The card switches cached views; tap its body to open the selected direction in the app for a fresh ETA. Neither view saves a direction preference.

## Continue on your personal computer

The current [installable package](dist/Meitar-Bus-0.6.2.zab) and versioned
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
freshness. Local updates run only while focused with the screen on and stop on
pause or screen-off. Waking a still-focused card reloads cache immediately, even
without another focus event. Live results expire after two minutes; actual
timetable fallback remains labelled Scheduled. Tap the card to open the app and
fetch a fresh prediction.

Zepp's [card guide](https://docs.zepp.com/docs/guides/framework/device/secondary-widget/)
requires the phone Bluetooth bridge to be initialized from an app page. The card
therefore makes no network requests. A continuously fresh standalone card is
outside the documented capability used by this implementation.
