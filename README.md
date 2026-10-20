# Meitar Bus

A small Zepp OS app for Amazfit T-Rex 3, tracking line **440** at your boarding stop.

| Israel time  | Boarding location   | Search starts |
| ------------ | ------------------- | ------------- |
| Before 10:00 | Meitar, stop 14100  | Today         |
| 10:00–18:00  | Jerusalem, stop 222 | Today         |
| From 18:00   | Meitar, stop 14100  | Tomorrow      |

Both switch times are editable in Zepp. Selection applies every day, with Israel
DST and date rollover handled locally. Stop codes stay out of the watch UI.
If that day's buses have finished, the lookup continues through the next seven
days and shows the first available bus. Both views label Tomorrow or the actual
weekday/date, including days without service in between.

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
beyond a passed arrival. No GPS, background polling,
server, API key, telemetry, remote fonts or map is needed.

Version 0.5.2 handles screen on/off events directly: countdown timers and request
timeouts stop on screen-off, duplicate screen-on events do not request again,
and short sleeps refresh without requiring a page rebuild. The card reloads its
cached countdown on focus and on wrist wake while focused. It cannot fetch a
new live ETA itself; tap its body to open the app. Battery consumption and manual
Back/wrist-wake behavior still require physical-watch verification.

Version 0.7.2 removes the selected-date-only timetable restriction and the
36-hour scheduled-arrival cutoff. Future service dates pass phone validation and
remain visible in the app and card. The first available bus wins even if a later
bus has live data. [Future-service examples](artifacts/next-service-preview-0.7.2.png)
use synthetic timetables. Lookup remains on demand, with cached calendars and
the same 30-second request cooldown; there is no background polling.

Version 0.7.1 clears the refresh arrow's canvas during Checking… so it cannot
overlap the centered label, then redraws the arrow when Refresh returns.
[Button transitions](artifacts/refresh-button-preview-0.7.1.png) show the cycle.

Version 0.7.0 is based on physical-watch feedback: a 264px card, centered 136px
ETA, 30px units and 34px MTR/JLM route codes. Reverse/Reset remains in the app
only. The full card opens the app, including its header, ETA and route text.
The app also has larger ETA, source labels, town names and controls.

The card now reopens native storage on focus instead of reusing its original
in-memory snapshot. This fixes a card created empty remaining stuck on Ready
after the app has saved an ETA. Empty cache now says Tap to check / No saved ETA.
A fresh phone query still requires opening the full app; the card shows its saved
result with the same freshness checks. Green means live and amber means estimated.

[Before and after](artifacts/ui-before-after-0.7.0.png),
[16 watch states](artifacts/watch-icons-states-0.7.0.png), and
[42 card layouts](artifacts/card-icons-states-0.7.0.png) use synthetic examples.

**Temporary direction switch (app only):** tap Reverse beside the boarding town.
Reset restores the clock choice; leaving the view clears the temporary choice.
The card always follows the clock. After 18:00 both directions start their
search with tomorrow, continuing to later service dates when needed.

## Continue on your personal computer

The current [installable package](dist/Meitar-Bus-0.7.2.zab) and versioned
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

`check:provider` checks today's two directions, tomorrow's morning schedule and
the phone-to-watch validation/presentation for both directions. It makes explicit
on-demand HTTP requests, sharing cached calendars; the exact count and arrival
dates are recorded in artifacts/provider-probe.json. Unit tests never use the
internet. The build writes `dist/`. Dependencies are pinned to the latest published versions checked on 2026-10-19, with a lockfile. Zeus brings its own development dependencies; the watch package only includes the app and the messaging code it needs.

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
to the bottom of the card list, open its settings, and add Meitar Bus. The user
has confirmed the card running on the watch. It shows the boarding location
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
