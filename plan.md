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

### November 9 — first phone test

- Observation: the interface loaded, but blowing produced no visible flower or meter response.
- Likely causes: the AudioContext was created after the asynchronous permission prompt and may have remained suspended on the phone; the revised spectral confidence gate could also reject genuine breath noise.
- Revision: AudioContext now starts directly from the Begin tap, the calibration trigger is more sensitive, spectral characteristics only adjust strength instead of rejecting input, and the practice screen reports raw `Mic signal 0–100%` for diagnosis.
- Next test: confirm whether the signal number changes while blowing and humming, then judge flower response separately.

### November 9 — second phone test

- Observation: microphone response and flower growth worked, but the flower grew too slowly.
- Revision: valid input now contributes a baseline growth rate, strength adds acceleration, and the stem, leaves, and petals appear earlier in the growth curve. The intended result is 75–85% growth from continuous gentle input during a 15-second session, with stronger steady input approaching a full bloom.
- Next test: compare gentle versus moderately strong input without encouraging force, and confirm that petals become visible early enough to feel responsive.

### November 9 — flower and Garden review

- Observation: the original three pointed petals looked unnatural, and Garden cards used generic circles instead of showing each session's actual growth.
- Developer decision: Garden should show only each flower's final growth stage, not replay its animation.
- Revision: practice now uses a symmetrical five-petal bloom. The same geometry is reused in the result and Garden, where saved growth reconstructs the final stem, leaves, bud, or open flower and displays a growth percentage.

### November 9 — flower variety and longer sessions

- Developer decision: add three visually different flower types, randomly select them for each practice, and make longer sessions grow several flowers at the same time.
- Revision: Cloud Bloom, Moon Bell, and Star Petal now share the same staged stem/leaf/bloom growth system. Sessions map to one flower at 15 seconds, two different flowers at 30 seconds, and all three at 60 seconds. Small per-flower pace and delay differences keep a bouquet organic without changing the User's overall result.
- Persistence rule: the selected types and their timing values are stored with the completed session, so the result and Garden reproduce the same final bouquet after refresh. Previous Garden records fall back to a single compatible flower.
- Next phone test: complete one session at each duration and confirm the live quantity, result quantity, Garden quantity, random variety between new sessions, and stable appearance after refresh.

### November 9 — multi-flower phone review

- Verified by the Developer: 15-, 30-, and 60-second sessions show the correct flower quantities, and two- and three-flower arrangements do not feel crowded.
- Observation: Star Petal's circular center appeared too low within its petal arrangement; the issue was internal alignment, not the position of the whole plant.
- First revisions incorrectly moved the flower head and then the entire plant. These position changes were removed after Developer review.
- Final revision: keep the plant and petals in their original bouquet position and move only the circular flower center upward to align it visually with the petals.
- Bouquet alignment revision: calculate every plant's vertical position from one shared ground baseline, so differently scaled flowers have exactly aligned bottom shadows in practice, result, and Garden views.
- Verification still needed: result and Garden reproduce the practice bouquet, and a saved bouquet remains unchanged after refresh.

### November 9 — replace Star Petal

- Developer decision: remove the sunflower-like Star Petal completely and replace it with two new flower designs that retain the shared bottom alignment.
- Revision: the active set is now Cloud Bloom, Moon Bell, Orchid Veil, and Peony Mist. Orchid Veil uses airy asymmetrical blue-lavender petals; Peony Mist uses layered rounded petals without a circular center.
- Compatibility rule: previously saved Star Petal entries render as Peony Mist so the visual is removed without deleting the User's saved practice record.
- Duration behavior remains one flower at 15 seconds, two different flowers at 30 seconds, and three different flowers selected from the four-type set at 60 seconds.

### November 9 — Hum phone test

- Verified by the Developer: Breathe does not false-trigger during the current phone test.
- Observation: Hum did not respond, and the live microphone signal remained at 0% while humming. Because Breathe works on the same phone, the likely cause is Hum sensitivity rather than microphone permission or startup.
- Revision: preserve the verified Breathe thresholds while giving Hum a lower calibration-relative trigger, a narrower level-mapping range, and a lower sustained activation threshold suitable for gentle humming.
- Follow-up observation: the Hum signal began to rise, but its movement and flower response remained too small.
- Follow-up revision: apply a Hum-only nonlinear response curve that expands quiet changes into visible meter movement and growth while leaving zero input at zero and preserving the Breathe mapping.
- Verification still needed: the Hum signal rises during comfortable humming, the flower grows and stops with the voice, different comfortable pitches respond, and ordinary speech does not cause sustained growth.

## Simplification reviews

A project this size invites Agents to pile on code. Redirect them away from bloat, stacked patches, obsolete features, and edge cases that a simpler design or code-structure rule would prevent. At the end of Phases 3, 4, and 5, have the Agent identify these problems, then decide yourself what to change. Record what it found, what you decided and why, and the result. Update the architecture in `spec.md` if the structure changes.
