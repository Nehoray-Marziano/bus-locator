---
version: alpha
name: Meitar Bus
description: A sporty transit display with source-colored arrivals and orange actions.
colors:
  background: '#000000'
  surface: '#14181e'
  control: '#232c38'
  primary: '#ff9b42'
  primaryPressed: '#e8812a'
  success: '#62dca8'
  text: '#f5f7fa'
  muted: '#9aa5b5'
  warning: '#e4bd76'
  ink: '#000000'
  pressed: '#4a2a12'
  divider: '#2a333f'
typography:
  display:
    fontFamily: 'Meitar Bold (Space Grotesk subset, 700)'
    fontSize: '112px'
  body:
    fontFamily: 'Meitar Sans (DM Sans subset, 500)'
    fontSize: '22px'
  utility:
    fontFamily: 'Meitar Sans (DM Sans subset, 500)'
    fontSize: '18px'
rounded:
  DEFAULT: '16px'
spacing:
  safe-inset: '64px'
components:
  arrival-display: {}
  refresh-button: {}
  shortcut-card: {}
  direction-button: {}
---

# Meitar Bus design system

## Overview

The user selected Sporty on 2026-10-20: dark background, bold ETA and orange
accents. This pass combines a sports-watch instrument with a transit departure
display: bold source-colored arrival, compact route identification and clear direction.
It is a native watch tool for a commuter reading while walking. No large colored
arrival containers, candy colors or bubbly lettering. Orange stop markers
connecting the two towns form the visual signature; they show
travel direction, never vehicle progress. English labels use Israel time.
Station codes stay in backend metadata.

`shared/theme.js` owns runtime tokens (Model B), mirrored here and tested for
drift. Its colors, fonts and sizes feed both native view modules and
`shared/direction-button.js` directly. `shared/presentation.js` consumes the same
type sizes and owns source labels, semantic tones, units and route wording.
Native JavaScript bindings explain DESIGN.md orphan-token warnings; runtime
tests verify actual ownership, contrast, geometry and source states.

## Colors

True black watch canvas and graphite card surface. Arrival numerals, source label
and icon use green for Live and amber for Scheduled on both surfaces. Demo and
empty states use white numerals; disconnected cached live values use muted gray.
Orange identifies the bus, boarding marker and actions. Source labels and icons
remain visible alongside color. Stale/demo data cannot claim green Live.
Reverse/Reset has a distinct graphite fill, including on the card, with a dark
orange pressed state. Refresh is the single solid orange action and darkens on
press. Dividers separate information without surrounding every group.
Text and pressed-state combinations meet AA contrast. No gradients or glow.

## Typography

Space Grotesk 700 gives numerals a bold, compact silhouette. DM Sans 500 keeps
actions and supporting labels quiet and readable. The two static, renamed Latin
subsets total 38,368 bytes; licenses are bundled separately. Fonts are never
downloaded at runtime. The Latin glyph set includes all English UI punctuation.

Nearby arrivals use 112px numerals, reduced from 120px; three-character arrivals
use 88px and waits of an hour or more use a 76px clock. Tomorrow is explicit.
The unit uses 24px; body labels 20-22px; Reverse/Reset 18px; boarding town 26px.
Cards use 92px nearby arrivals (up from 60px) and 64px clocks (up from 48px)
before safe-column scaling. Their taller arrival region preserves room for the
unit, route and separate Reverse/Reset target.

Sources: [Space Grotesk](https://github.com/floriankarsten/space-grotesk) and
[DM Sans](https://github.com/googlefonts/dm-fonts), with their OFL licenses in
assets. Assets use renamed families after subsetting.

## Layout

The 480x480 watch has three groups: route 440 and source at the top; an unboxed
arrival figure; and the route above Refresh. Boarding town comes first, followed
by "to" and the destination. Reverse sits beside the route it changes; Reset
restores the automatic choice. Loading and recovery occupy the arrival region
without moving the route or controls. No repeated arrival clock or check-age row.

The 220px shortcut card shares the bus/line and source heading, a left-aligned
arrival beside Reverse/Reset, and one full route line below. Both towns are shown
in travel order. At least 28px horizontal insets respect the system margin and
rounded edges; content is at most 320px wide. T-Rex 3's observed native origin
includes the reported horizontal margin: apply it once to background, content
and hit targets. Reported width already excludes that margin. Controls keep
at least 48px touch height. Native widgets update in place without allocation.

## Elevation & Depth

Space and a quiet divider provide grouping. There are no arrival panels,
shadows, blur or motion. Buttons have a 16px radius. The rounded bus icon has
paired windows, lights and wheels. Broadcast, calendar and refresh pictograms
are static native shapes from shared/icons.js. Refresh uses one closed polygon
for its curve and triangular head on a native Canvas, avoiding separate rounded
bar joints. The canvas passes taps through to Refresh and hides while checking.
The launcher PNG is rendered from source geometry onto transparent RGBA.

## Shapes

Compact rounded controls share a 16px radius and at least 48px height. There
are no filled header badges. Cards retain the system-supplied outer radius.
Source icons retain their recognizable shapes; decoration never implies data.

## Components

Live predictions expire after two minutes. An actual supplied future timetable
can replace an expired live ETA, switching to an amber Scheduled label. A schedule
is never invented from a stale live estimate. Scheduled cache lasts up to 24 hours
and never beyond its service date or passed arrival. Demo is always labelled.

Automatic selection is Meitar before 10:00, Jerusalem until 18:00, and tomorrow's
Meitar from 18:00. Settings remain editable. Shared Israel-time conversion handles
DST and date rollovers. Backend stop IDs never appear in either view.

shared/direction-button.js owns Reverse/Reset on both surfaces. Refresh preserves
the temporary choice; pause/destroy clears it. No direction preference is saved.
The automatic Today/Tomorrow context remains in effect. The card passes its
selection through router params when opening the app. shared/cache.js retains
one observation per direction; missing cache never borrows the opposite ETA.

The card reloads cache on focus and wrist wake and switches cached views without
networking. Tap its body to check the selected direction in the full app.
Local redraws run only while focused with the screen on, stopping on pause or
screen-off. The app reopens on wrist wake until explicit exit. Networking occurs
only on app opening/waking, Reverse/Reset there, or Refresh. There is no GPS,
background polling, keep-awake, animation or remote asset request.

## Do's and Don'ts

- Do keep the arrival figure as the strongest visual group.
- Do show boarding town before destination and label tomorrow.
- Do pair source colors with readable labels and recognizable icons.
- Do keep separate hit targets for card body and Reverse/Reset.
- Don't restore large mint/peach panels or give all controls equal emphasis.
- Don't show backend IDs, fake vehicle progress or invented departures.
- Don't add continuous motion, background requests or runtime font downloads.
