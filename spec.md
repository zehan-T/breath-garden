# Specification

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose: Keep a concise, testable description of what the project should do now and how the system is structured to do it.

## Working agreement

Developer: Approve the intended behavior and the system's structure, test directly, understand each part well enough to explain it in your own words, and update this file whenever either changes.

Agent: Read the project documents and inspect the project. Turn the Developer's decisions into acceptance checks without inventing product choices or freezing details that still need testing. Propose structures suited to the project's scope, with their trade-offs, in plain language. Keep the architecture consistent with the actual project and point out where they have drifted apart. Do not restructure the project without the Developer's approval.

When you begin this step, start a fresh chat so its transcript stays clean. For example:

`Read the project documents, inspect the project, and help me specify what the next version should do.`

## Intended experience

Breath Garden is currently a mobile-first browser prototype. A User chooses Breathe or Hum, selects a short duration, grants microphone permission, completes a quiet calibration, and then uses breath noise or humming to grow a flower in real time. The finished flower is saved in a private garden on that device. The experience should feel calm, beautiful, responsive, and encouraging rather than diagnostic or competitive.

## Behavior and acceptance checks

### Approved Phase 2 behavior

- The interface is designed for a phone-width viewport and remains usable on a larger screen inside a phone-sized frame.
- Users can choose Breathe or Hum and a 15-, 30-, or 60-second prototype session. Sing is visible but unavailable.
- Microphone access is requested only after the User presses the Begin button. The interface explains that audio is analyzed locally and is not recorded or uploaded.
- Each session begins with a short quiet calibration so that response is relative to the current device and room.
- In Breathe, the system estimates breath sound from live level and broad, noise-like frequency energy. Duration and relative strength affect flower growth. It does not measure physical airflow or lung capacity.
- In Hum, the system estimates humming response from live level and tonal frequency concentration. Duration and relative strength affect flower growth.
- The flower must react visibly within the same moment as the sound. Stronger input may add light or movement, but stronger is never presented as better.
- Background sound or silence must not grow the flower. Input must rise above a calibration-derived trigger and persist briefly before growth begins. Mode-specific spectral characteristics adjust sensitivity but are not a hard rejection gate because mobile audio processing varies by device.
- A session with less than one second of accepted input does not create or save a flower; the result explains that the seed is still waiting.
- Finishing a session creates a local flower record containing mode, date, duration, active time, relative strength, growth, and a visual seed.
- Saved flowers remain after refresh through `localStorage` and appear in My Garden.
- If microphone access is denied, unsupported, or unavailable outside a secure context, the User sees a specific recovery message instead of a broken practice screen.
- All controls have text labels or accessible names, visible keyboard focus, sufficient touch size, and reduced motion support.

### Provisional details

The exact thresholds that distinguish breath noise from humming are provisional until tested on multiple phones and in different rooms. The visual mapping from sound metrics to flower shape is also open to revision. This prototype proves responsiveness; it does not claim accurate breath classification.

## Architecture

How the system works and the structural decisions that keep it coherent, consistent, and easy to change. Adapt these sections to your project and tech stack.

### Overview

The project is a static site with three files: semantic HTML for screens and SVG artwork, CSS for the mobile layout and flower animation, and JavaScript for state, microphone analysis, growth, and local persistence.

```text
phone microphone
       |
       v
getUserMedia -> Web Audio AnalyserNode -> level/frequency estimates
                                              |
                                              v
                                   session + growth state
                                      /             \
                                     v               v
                              SVG/CSS flower     localStorage
                                                     |
                                                     v
                                                My Garden
```

### Data and state

`app.js` owns the current mode, duration, session phase, growth, smoothed strength, active time, and saved bloom list. The in-memory `state` object is the single source of truth during a session. The `breathGardenBloomsV1` localStorage entry is the source of truth between visits. Raw microphone samples are read into temporary typed arrays and are never saved.

### Interaction loop

After a User gesture, `getUserMedia()` supplies a microphone stream to a Web Audio `AnalyserNode`. Each animation frame reads waveform and frequency data, estimates a mode-specific relative strength, smooths it, and updates session growth. Growth is translated into CSS custom properties that reveal the SVG stem, leaves, and petals. When the timer ends, the stream stops before the result is stored and displayed.

### Visual and content rules

Use a bright pale background, pale blue and soft lavender gradients, translucent white surfaces, thin organic lines, gentle light, and generous spacing. Georgia provides an elegant display voice; system sans-serif text keeps controls readable. Motion should communicate growth and response, not decoration. Copy must avoid medical claims, performance scores, or language that pressures Users to blow or vocalize harder.

### Structure rules

Keep the prototype buildless and dependency-free. Page structure belongs in `index.html`, shared visual rules in `styles.css`, and all interaction/state rules in `app.js`. Add new modes through the existing mode state and analysis boundary instead of separate applications. Never store raw audio. New persistence fields must be serializable and backwards-safe.

### Decisions and changes

- **Static site instead of a framework:** The Developer currently knows GitHub Pages, and the MVP does not need a server, account, or database. Plain HTML/CSS/JavaScript keeps the system explainable and deployable.
- **Mobile-only primary interaction:** On November 9, the Developer narrowed the intended interaction to phone use so that microphone placement and touch behavior can be designed deliberately.
- **Microphone-based Breathe:** After pitch approval, Breathe changed from a non-microphone guided animation to a Nintendo-like blowing interaction. This creates a stronger core interaction but removes the original no-permission fallback. The interface must honestly call it breath-sound estimation, not airflow measurement.
- **One analysis engine:** Breathe and Hum share waveform/frequency collection and calibration. Only their weighting differs, preventing duplicated audio pipelines.
- **Mobile audio startup:** Create and resume `AudioContext` directly from the Begin tap before waiting for microphone permission. This protects the interaction from mobile browsers that otherwise leave an asynchronously created context suspended.
