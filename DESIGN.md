---
version: alpha
name: Meitar Bus
description: A playful pocket transit display with mint arrivals and rounded lettering.
colors:
  background: '#161326'
  surface: '#29233d'
  primary: '#b9a7ff'
  success: '#78ffc6'
  text: '#fff8f1'
  muted: '#c0b6d3'
  warning: '#ffc18e'
  ink: '#161326'
  pressed: '#9b87ee'
typography:
  display:
    fontFamily: 'Meitar Bold (Fredoka subset, 600)'
    fontSize: '120px'
  body:
    fontFamily: 'Meitar Sans (Nunito subset, 600)'
    fontSize: '22px'
  utility:
    fontFamily: 'Meitar Sans (Nunito subset, 600)'
    fontSize: '18px'
rounded:
  DEFAULT: '24px'
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

The user selected Playful modern: rounded shapes, expressive icons and bright
accents, after finding the previous design bland and confusing. The reference
is a friendly pocket transit display: a bus-line badge, one arrival panel, and
an origin-to-destination route. Color and typography supply energy without
animation. The commuter should immediately read when and where to board.
English labels use Israel time; station codes stay in backend metadata.

`shared/theme.js` owns runtime tokens, mirrored here and tested for drift.
`shared/presentation.js` owns source labels, arrival colors, units and route
wording. Both native views consume these owners. Component bindings are native
JavaScript, so DESIGN.md orphan-token warnings are covered by runtime token
and contrast tests.

## Colors

Inky violet canvas, lilac controls and route badges, bright mint live panels,
and warm peach scheduled panels. Arrival numerals use dark ink inside colored
panels. Green broadcast waves and a dot accompany Live; an amber calendar
accompanies Scheduled. Demo, cached and unavailable data use neutral surfaces.
Color always has a source label. Lilac is the control color, independent of
prediction freshness. Text and pressed-state combinations meet AA contrast.

## Typography

Fredoka 600 gives arrival numerals and boarding towns a rounded, expressive
shape. Nunito 600 keeps actions and supporting labels readable. The two static,
renamed Latin subsets total 41,360 bytes, including a right-sized glyph set;
licenses are bundled separately. Fonts are never downloaded at runtime.

Nearby arrivals use 120px numerals; waits of an hour or more use an 82px clock.
Tomorrow is explicit. Body labels are 20-22px; Reverse/Reset uses 18px. The
boarding town uses 26px. Card text scales within its safe content column.

Sources: [Fredoka](https://github.com/google/fonts/tree/main/ofl/fredoka) and
[Nunito](https://github.com/google/fonts/tree/main/ofl/nunito), with their OFL
licenses preserved in assets. Assets use renamed families after subsetting.

## Layout

The 480x480 watch has three distinct groups: route 440 and source at the top;
a rounded arrival panel; and a compact route panel above Refresh. The boarding
town comes first, followed by "to" and the destination. Two fixed stop markers
connect those labels. This is a direction diagram, never vehicle progress.
Reverse sits beside the route it changes; Reset restores the automatic choice.
No extra station ID, check-age row or repeated arrival clock appears.

The 220px shortcut card shares the line badge and source heading, a compact
arrival panel beside Reverse/Reset, and one full route line below. Both towns
are shown in travel order. At least 28px horizontal insets respect the system
margin and rounded edges; content is at most 320px wide. The T-Rex 3 simulator
requires the reported horizontal margin as the native drawing origin. Apply it
once to the background, content and hit targets; the reported width already
excludes that margin. Controls keep at least
48px touch height. Actual type metrics are checked at card widths 320/400/480.
Native widgets are allocated once and updated in place.

## Elevation & Depth

Flat color panels provide grouping. The main arrival has a 44px radius; the
card arrival has a 28px scaled radius. There are no shadows, blur or motion.
The rounded bus icon has paired windows, lights and wheels. Broadcast, calendar
and refresh pictograms are static native shapes from shared/icons.js.
The refresh head meets the clockwise arc endpoint. The launcher bus is rendered
from the source geometry in scripts/render-preview.py onto transparent RGBA,
with no rectangular background baked into the asset.

## Shapes

Pills and rounded panels follow the same friendly geometry. Buttons use a
24px radius and at least 48px height. Header badges use 14-16px radii. Cards
retain the system-supplied outer radius. Shape supports grouping and touch
rather than adding decorative information.

## Components

Live predictions expire after two minutes. An actual supplied future timetable
can replace an expired live ETA, switching to peach Scheduled. A schedule is
never invented from a stale live estimate. Scheduled cache lasts up to 24 hours
and never beyond its service date or passed arrival. Demo is always labelled.

Automatic selection is Meitar before 10:00, Jerusalem until 18:00, and tomorrow's
Meitar from 18:00. Settings remain editable. Shared Israel-time conversion
handles DST and date rollovers.

shared/direction-button.js owns Reverse/Reset on both surfaces. Reverse selects
the other boarding town for the current view. Reset restores the time rule.
Refresh preserves the temporary choice; pause/destroy clears it. No direction
preference is saved. The automatic Today/Tomorrow context remains in effect.
The card passes a temporary selection through router params when opening the
app. That app session clears the choice on exit too.

shared/cache.js retains one observation per direction and validates freshness
through the shared model. The card reads cache on build/resume and switches
cached views without networking. Tap its body to check the selected direction
in the full app. Missing cache never borrows another direction's ETA.

Local redraws run only while focused and stop on pause. Networking occurs only
on app opening/resuming, Reverse/Reset there, or Refresh. There is no GPS,
background polling, keep-awake, animation or remote asset request.

## Do's and Don'ts

- Do keep the arrival panel as the strongest visual group.
- Do show the boarding town before its destination and label tomorrow.
- Do pair source colors with readable labels and recognizable icons.
- Do reserve separate hit targets for the card body and Reverse/Reset.
- Don't show backend stop IDs, fake vehicle progress or invented departures.
- Don't add continuous motion, background requests or runtime font downloads.
