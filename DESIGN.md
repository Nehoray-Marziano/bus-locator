---
version: alpha
name: Meitar Bus
description: A sharp, readable departure display with green live ETAs.
colors:
  background: '#090d13'
  surface: '#151e29'
  primary: '#7afc9e'
  success: '#7afc9e'
  text: '#f6f9fc'
  muted: '#a4b2c3'
  warning: '#ffcf70'
  ink: '#08120b'
  pressed: '#50ce76'
typography:
  display:
    fontFamily: 'Meitar Bold (DM Sans subset, 700)'
    fontSize: '120px'
  body:
    fontFamily: 'Meitar Sans (DM Sans subset, 500)'
    fontSize: '23px'
  utility:
    fontFamily: 'Meitar Sans (DM Sans subset, 500)'
    fontSize: '20px'
rounded:
  DEFAULT: '14px'
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

The user's current direction replaces the calm plum/cream palette: more modern,
more legible, with a strong green live ETA. The reference is a compact transit
departure display. One glance identifies where to board, when the bus arrives,
and whether the time is live or scheduled. English labels and Israel time remain.
No station codes appear. No Hebrew font coverage is promised.

`shared/theme.js` owns runtime tokens; this document mirrors them. Both native
views use these tokens and `shared/presentation.js` for source labels, date
context and countdown formatting. Tests check drift and actual surface contrast.
DESIGN.md component maps describe native bindings in prose, so orphan-token
linter warnings do not replace the JavaScript drift/contrast checks.

## Colors

Near-black canvas, bright white place names and green live arrival numerals.
Amber marks scheduled times and expiration; muted steel identifies supporting
text. Color always has an accompanying label: Live, Scheduled, Demo, Cached
ETA or an actionable empty/error state. Broadcast waves never mark scheduled, demo
or expired data. Button ink is dark against green; all text combinations meet AA.

## Typography

DM Sans 700 provides stronger numbers and headings; weight 500 carries labels.
The two static, renamed Latin subsets total about 40 KB and include OFL licenses.
They are bundled and never downloaded at runtime. Nearby arrivals use large
minutes; waits of an hour or more use an 82px clock instead of a three-digit
countdown. Tomorrow has an explicit Tomorrow label. Due means at your stop.
Supporting labels are 20–24px; the combined route/town heading is 26px. The compact
direction control uses 18px text on a 56×48px touch target. No animation.

## Layout

480×480 round canvas: a bus icon beside one route/town heading, large arrival
value and unit/date, one source icon/label, and a fixed Refresh button with arrow.
The existing heading row contains a small Swap button, changing to Auto during a
temporary selection. Its placement never adds an information row or moves the ETA.
No repeated arrival time, separate boarding label or visible check-age line.
Empty states replace the arrival with a short headline and one recovery action.
No large cream panel, shadows, or decorative border.
The hierarchy follows the commuter's questions: where, when, how trustworthy.
Native widgets are allocated once and updated in place.

`shared/icons.js` owns native bus, broadcast, calendar and refresh pictograms.
Live uses green waves with a dot; scheduled uses an amber calendar. Icons have
short text labels, so meaning never depends on shape or color alone. These are
static native shapes, with no icon font, remote bitmap or animation cost.

The card is explicitly 220px high. A single column replaces the split number/unit
layout that was clipped on the user's simulator. Its content respects the
system margin, rounded edges, at least 28px horizontal insets, and a maximum
320px content width. Units stay with the number, away from the right edge.
Examples cover narrow cards, wide rounded cards, Jerusalem and tomorrow labels.

## Elevation & Depth

Flat near-black watch canvas; a dark steel shortcut card. No blur, gradients,
photos, animated decoration or simulated hardware. The original bus icon uses
the same green and dark ink.

## Shapes

The refresh button has a 14px radius and at least 48px height.
Shortcut cards retain the system-supplied corner radius.

## Components

Live predictions expire after two minutes. When an actual future timetable time
is available, expiration falls back to Scheduled; it never relabels a stale
live ETA as a timetable. Scheduled cache is valid for up to 24 hours and never
beyond its service date/passed arrival. Current-day live failures fall back to
the official daily timetable. No arrivals found means neither source supplied
a usable time. Demo remains explicitly labelled.

Default selection is Meitar before 10:00, Jerusalem 10:00–18:00, and tomorrow's
Meitar from 18:00. Both boundaries are editable in Zepp's native settings.
Clock conversion handles Israel DST and calendar rollovers.

`shared/direction-button.js` owns the same labelled Swap/Auto control on both
surfaces. Swap temporarily selects the other boarding town; Auto restores the
clock decision immediately. Selection lives in the view controller only and is
cleared on pause/destroy. Both directions retain the automatic service date,
including tomorrow after 18:00. No permanent direction setting is introduced.
The card can pass its temporary direction into a new app page via router params;
that page clears it on exit too. `shared/cache.js` retains one observation per
direction, validates it through the shared model, and never saves the selection.

Refresh requests are explicit; busy taps are guarded. The card reads cache on
build/resume, updates locally every 15 seconds while focused, and stops on pause.
Tap opens the full app for a phone fetch. The card's Swap action uses cache;
missing data still requires opening the app. There is no GPS, background polling,
keep-awake, timer-triggered network work, custom popup, table or destructive UI.

## Do's and Don'ts

- Do show the boarding town and distinguish minutes from a clock time.
- Do label tomorrow and every data source explicitly.
- Do keep all card text well inside the system's rounded clipping area.
- Don't display stop IDs, unlabelled schedule estimates, or invented fallback times.
- Don't add background networking, remote assets, motion or extra runtime SDKs.
