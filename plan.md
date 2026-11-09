# Plan

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose: Track the five-week map, the next build checkpoints, testing, and simplification reviews.

## Working agreement

Developer: Choose priorities, plan only the next few checkpoints in detail, test results directly, and keep the map current.

Agent: Read the project documents and inspect the project. Where practical, keep each checkpoint small enough to run and judge. Do not expand scope or mark the Developer's verification complete.

When you begin this step, start a fresh chat so its transcript stays clean. For example:

`Read the project documents, inspect the project, and help me complete the next checkpoint.`

## Five-week map

- **Phase 1:** Complete ideation, branding, Pitch, and Studio director approval.
- **Phase 2:** Prove a mobile microphone can drive one flower through Breathe and Hum; deploy or serve through a secure context for phone testing.
- **Phase 3:** Revise detection from device tests, complete the full session/result/garden loop, and test with intended Users.
- **Phase 4:** Refine flower variety, visual consistency, accessibility, and mobile stability; end with a peer-review version.
- **Phase 5:** Respond to peer review, simplify, verify, publish, and finish the breakdown and debrief.

## Checkpoints

1. **Recognizable mobile shell:** mode and duration choices, privacy explanation, responsive phone layout, and the approved visual direction. Test at 375 × 812 and 430 × 932 viewports.
2. **Microphone proof:** permission request, quiet calibration, live level/frequency analysis, Breathe and Hum response, stream cleanup, and useful error states. Test on at least one iPhone browser and one Android browser if devices are available.
3. **Complete local loop:** timer, flower growth, result, local save, refresh persistence, and My Garden. Test normal completion, early finish, denied permission, refresh, and repeat sessions.
4. **Phase 2 evidence:** record device/browser results, false triggers, sensitivity problems, screenshots, and the next decision before expanding scope.

## Testing and evidence

### November 9 — first Phase 2 implementation

- The local PowerShell server returned HTTP 200 with the expected MIME type for `index.html`, `styles.css`, `app.js`, and the logo asset.
- Static checks found 47 unique HTML IDs, resolved all 31 JavaScript ID selectors, found no missing local references or external scripts, and found no raw-audio recording/storage markers.
- Edge headless validation was attempted twice but produced neither a DOM dump nor screenshot, so visual browser verification remains incomplete on this machine. Further parameter variations were stopped under the project's two-attempt rule.
- Real Breathe/Hum microphone response remains unverified. It requires an HTTPS deployment and tests on physical phones; desktop simulation cannot establish that breath detection is usable.

### November 9 — Developer review

- Observation: the flower could grow without intentional breath or humming.
- Interpretation: the first threshold treated ordinary sound above the median calibration level as accepted input and did not require sustained, mode-matching evidence.
- Revision: calibration now includes the 90th-percentile room level and a separate trigger margin; growth also requires loose breath/hum spectral confidence and at least 140 ms of sustained evidence. Silence begins at zero growth, and sessions with less than one accepted second do not save a flower.
- Verification still needed: quiet room, conversation in the background, phone handling noise, soft/strong blowing, and soft/strong humming on real phones.

## Simplification reviews

A project this size invites Agents to pile on code. Redirect them away from bloat, stacked patches, obsolete features, and edge cases that a simpler design or code-structure rule would prevent. At the end of Phases 3, 4, and 5, have the Agent identify these problems, then decide yourself what to change. Record what it found, what you decided and why, and the result. Update the architecture in `spec.md` if the structure changes.
