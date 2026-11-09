"use strict";

const STORAGE_KEY = "breathGardenBloomsV1";
const CALIBRATION_MS = 1600;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const elements = {
  screens: [...document.querySelectorAll(".screen")],
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  durationButtons: [...document.querySelectorAll("[data-duration]")],
  beginButton: document.querySelector("#begin-button"),
  openGardenButton: document.querySelector("#open-garden-button"),
  gardenCount: document.querySelector("#garden-count"),
  practiceModeLabel: document.querySelector("#practice-mode-label"),
  practiceTitle: document.querySelector("#practice-title"),
  timer: document.querySelector("#timer"),
  progressBar: document.querySelector("#progress-bar"),
  exitButton: document.querySelector("#exit-button"),
  stopButton: document.querySelector("#stop-button"),
  calibrationLabel: document.querySelector("#calibration-label"),
  liveInstruction: document.querySelector("#live-instruction"),
  liveDetail: document.querySelector("#live-detail"),
  soundMeterFill: document.querySelector("#sound-meter-fill"),
  signalReadout: document.querySelector("#signal-readout"),
  liveFlower: document.querySelector("#live-flower"),
  ambientOrb: document.querySelector("#ambient-orb"),
  leafLeft: document.querySelector("#leaf-left"),
  leafRight: document.querySelector("#leaf-right"),
  resultTitle: document.querySelector("#result-title"),
  resultSummary: document.querySelector("#result-summary"),
  resultDuration: document.querySelector("#result-duration"),
  resultActive: document.querySelector("#result-active"),
  resultStrength: document.querySelector("#result-strength"),
  resultFlower: document.querySelector("#result-flower"),
  practiceAgainButton: document.querySelector("#practice-again-button"),
  resultGardenButton: document.querySelector("#result-garden-button"),
  gardenBackButton: document.querySelector("#garden-back-button"),
  gardenPracticeButton: document.querySelector("#garden-practice-button"),
  gardenGrid: document.querySelector("#garden-grid"),
  emptyGarden: document.querySelector("#empty-garden"),
  errorDialog: document.querySelector("#error-dialog"),
  errorMessage: document.querySelector("#error-message"),
  errorCloseButton: document.querySelector("#error-close-button"),
};

const state = {
  mode: "breath",
  duration: 15,
  animationFrame: 0,
  phase: "idle",
  startTime: 0,
  lastFrame: 0,
  growth: 0,
  smoothedStrength: 0,
  candidateSeconds: 0,
  inputActive: false,
  activeSeconds: 0,
  strengthTotal: 0,
  activeSamples: 0,
  blooms: loadBlooms(),
};

class AudioProbe {
  constructor() {
    this.stream = null;
    this.context = null;
    this.analyser = null;
    this.timeData = null;
    this.frequencyData = null;
    this.noiseFloor = 0.008;
    this.triggerLevel = 0.018;
  }

  async start() {
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      throw new Error("secure-context");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("unsupported");
    }

    // Mobile Safari may keep an AudioContext suspended when it is created only
    // after an asynchronous permission prompt. Create and resume it directly
    // from the Begin button's user gesture before awaiting the microphone.
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error("unsupported");
    this.context = new AudioContext();
    await this.context.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    });

    if (this.context.state !== "running") await this.context.resume();

    const source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.68;
    source.connect(this.analyser);

    this.timeData = new Float32Array(this.analyser.fftSize);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  sampleRawLevel() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.timeData);
    let sumSquares = 0;
    for (const sample of this.timeData) sumSquares += sample * sample;
    return Math.sqrt(sumSquares / this.timeData.length);
  }

  calibrate(levels) {
    if (!levels.length) return;
    const sorted = [...levels].sort((a, b) => a - b);
    const quietMedian = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const quietHigh = sorted[Math.floor(sorted.length * 0.75)] || quietMedian;
    this.noiseFloor = clamp(quietMedian * 1.35 + 0.0025, 0.0035, 0.06);
    this.triggerLevel = clamp(
      Math.max(quietHigh * 1.16 + 0.0015, this.noiseFloor + 0.0035),
      0.008,
      0.075,
    );
  }

  analyze(mode) {
    if (!this.analyser) {
      return { level: 0, flatness: 0, highRatio: 0, peakiness: 0, rawStrength: 0, strength: 0 };
    }

    const rms = this.sampleRawLevel();
    this.analyser.getByteFrequencyData(this.frequencyData);

    const upperBin = Math.min(390, this.frequencyData.length);
    let arithmetic = 0;
    let logTotal = 0;
    let lowEnergy = 0;
    let highEnergy = 0;
    let peak = 0;
    let count = 0;

    for (let index = 4; index < upperBin; index += 1) {
      const magnitude = this.frequencyData[index] / 255;
      const safeMagnitude = magnitude + 0.0001;
      arithmetic += safeMagnitude;
      logTotal += Math.log(safeMagnitude);
      peak = Math.max(peak, magnitude);
      if (index < 85) lowEnergy += magnitude;
      else highEnergy += magnitude;
      count += 1;
    }

    const mean = arithmetic / Math.max(1, count);
    const flatness = clamp(Math.exp(logTotal / Math.max(1, count)) / Math.max(0.0001, mean));
    const highRatio = highEnergy / Math.max(0.0001, lowEnergy + highEnergy);
    const peakiness = clamp((peak - mean) / Math.max(0.05, 1 - mean));
    const relativeLevel = clamp((rms - this.triggerLevel) / Math.max(0.03, 0.17 - this.triggerLevel));

    // Air noise tends to be flatter and broader; humming tends to have stronger spectral peaks.
    // The User already selected the mode, so spectral character is only a light weighting,
    // not a hard gate that could reject a real phone microphone signal.
    const breathConfidence = clamp((flatness - 0.12) / 0.38) * 0.62
      + clamp((highRatio - 0.2) / 0.45) * 0.38;
    const humConfidence = clamp((peakiness - 0.08) / 0.42) * 0.58
      + clamp((0.82 - flatness) / 0.58) * 0.42;
    const character = mode === "breath"
      ? 0.72 + breathConfidence * 0.28
      : 0.68 + humConfidence * 0.32;

    return {
      level: rms,
      flatness,
      highRatio,
      peakiness,
      rawStrength: relativeLevel,
      strength: clamp(relativeLevel * character),
    };
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.analyser = null;
    if (this.context && this.context.state !== "closed") this.context.close();
    this.context = null;
  }
}

const audioProbe = new AudioProbe();

function loadBlooms() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.slice(0, 50) : [];
  } catch {
    return [];
  }
}

function saveBlooms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.blooms.slice(0, 50)));
}

function showScreen(id) {
  elements.screens.forEach((screen) => {
    const active = screen.id === id;
    screen.hidden = !active;
    screen.classList.toggle("screen--active", active);
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function selectMode(mode) {
  state.mode = mode;
  elements.modeButtons.forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", String(selected));
  });
  elements.beginButton.firstChild.textContent = `Begin ${mode === "breath" ? "Breathe" : "Hum"} `;
}

function selectDuration(duration) {
  state.duration = Number(duration);
  elements.durationButtons.forEach((button) => {
    const selected = Number(button.dataset.duration) === state.duration;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", String(selected));
  });
}

function resetFlower() {
  state.growth = 0;
  state.smoothedStrength = 0;
  state.candidateSeconds = 0;
  state.inputActive = false;
  elements.liveFlower.style.setProperty("--stem-progress", "0");
  elements.liveFlower.style.setProperty("--bloom-progress", "0");
  elements.liveFlower.style.setProperty("--sound", "0");
  elements.leafLeft.style.setProperty("--part-opacity", "0");
  elements.leafLeft.style.setProperty("--part-scale", "0.35");
  elements.leafRight.style.setProperty("--part-opacity", "0");
  elements.leafRight.style.setProperty("--part-scale", "0.35");
  elements.soundMeterFill.style.width = "0%";
  elements.signalReadout.textContent = "Mic signal 0%";
  elements.progressBar.style.width = "0%";
}

async function beginPractice() {
  if (state.phase !== "idle") return;
  state.phase = "requesting";
  resetFlower();
  showScreen("practice-screen");

  elements.practiceModeLabel.textContent = `${state.mode === "breath" ? "Breathe" : "Hum"} ritual`;
  elements.practiceTitle.textContent = state.mode === "breath" ? "Wake the seed" : "Find your resonance";
  elements.timer.textContent = formatTime(state.duration);
  elements.calibrationLabel.textContent = "Preparing microphone";
  elements.liveInstruction.textContent = "Stay quiet for a moment";
  elements.liveDetail.textContent = "We will learn the sound level around you.";

  try {
    await audioProbe.start();
    await calibrateMicrophone();
    if (state.phase !== "requesting") return;
    startSession();
  } catch (error) {
    audioProbe.stop();
    state.phase = "idle";
    showScreen("home-screen");
    showMicrophoneError(error);
  }
}

function calibrateMicrophone() {
  return new Promise((resolve) => {
    const levels = [];
    const start = performance.now();

    function collect(now) {
      if (state.phase !== "requesting") return resolve();
      levels.push(audioProbe.sampleRawLevel());
      const progress = clamp((now - start) / CALIBRATION_MS);
      elements.progressBar.style.width = `${progress * 5}%`;
      if (progress < 1) requestAnimationFrame(collect);
      else {
        audioProbe.calibrate(levels);
        resolve();
      }
    }

    requestAnimationFrame(collect);
  });
}

function startSession() {
  state.phase = "active";
  state.startTime = performance.now();
  state.lastFrame = state.startTime;
  state.activeSeconds = 0;
  state.strengthTotal = 0;
  state.activeSamples = 0;
  state.candidateSeconds = 0;
  state.inputActive = false;
  elements.calibrationLabel.textContent = "Microphone on · Listening live";
  updateInstruction(0);
  state.animationFrame = requestAnimationFrame(runSession);
}

function runSession(now) {
  if (state.phase !== "active") return;

  const deltaSeconds = Math.min(0.1, (now - state.lastFrame) / 1000);
  const elapsedSeconds = (now - state.startTime) / 1000;
  state.lastFrame = now;

  const metrics = audioProbe.analyze(state.mode);
  if (metrics.strength > 0.04) {
    state.candidateSeconds = Math.min(0.5, state.candidateSeconds + deltaSeconds);
  } else {
    state.candidateSeconds = Math.max(0, state.candidateSeconds - deltaSeconds * 2.5);
  }
  state.inputActive = state.candidateSeconds >= 0.12;

  const targetStrength = state.inputActive ? metrics.strength : 0;
  state.smoothedStrength = state.smoothedStrength * 0.72 + targetStrength * 0.28;

  if (state.inputActive && state.smoothedStrength > 0.04) {
    state.activeSeconds += deltaSeconds;
    state.strengthTotal += state.smoothedStrength;
    state.activeSamples += 1;
    const activeGrowthRate = 0.48 + state.smoothedStrength * 0.72;
    state.growth = clamp(state.growth + activeGrowthRate * deltaSeconds / (state.duration * 0.78));
  }

  updateFlower(state.growth, state.smoothedStrength);
  elements.soundMeterFill.style.width = `${Math.round(metrics.rawStrength * 100)}%`;
  elements.signalReadout.textContent = `Mic signal ${Math.round(metrics.rawStrength * 100)}%`;
  updateInstruction(state.smoothedStrength);

  const progress = clamp(elapsedSeconds / state.duration);
  const remaining = Math.max(0, state.duration - elapsedSeconds);
  elements.progressBar.style.width = `${5 + progress * 95}%`;
  elements.timer.textContent = formatTime(Math.ceil(remaining));

  if (progress >= 1) finishPractice();
  else state.animationFrame = requestAnimationFrame(runSession);
}

function updateFlower(growth, strength) {
  const stemProgress = clamp(growth / 0.42);
  const leftLeafProgress = clamp((growth - 0.12) / 0.24);
  const rightLeafProgress = clamp((growth - 0.25) / 0.24);
  const bloomProgress = clamp((growth - 0.38) / 0.62);

  elements.liveFlower.style.setProperty("--stem-progress", stemProgress.toFixed(3));
  elements.liveFlower.style.setProperty("--bloom-progress", bloomProgress.toFixed(3));
  elements.liveFlower.style.setProperty("--sound", strength.toFixed(3));
  elements.ambientOrb.style.setProperty("--sound", strength.toFixed(3));
  elements.leafLeft.style.setProperty("--part-opacity", leftLeafProgress.toFixed(3));
  elements.leafLeft.style.setProperty("--part-scale", (0.35 + leftLeafProgress * 0.65).toFixed(3));
  elements.leafRight.style.setProperty("--part-opacity", rightLeafProgress.toFixed(3));
  elements.leafRight.style.setProperty("--part-scale", (0.35 + rightLeafProgress * 0.65).toFixed(3));
  elements.soundMeterFill.style.width = `${Math.round(strength * 100)}%`;
}

function updateInstruction(strength) {
  if (state.mode === "breath") {
    if (strength < 0.075) {
      elements.liveInstruction.textContent = "Send a soft breeze";
      elements.liveDetail.textContent = "Hold the phone 3–8 cm away and blow gently toward its microphone.";
    } else if (strength < 0.55) {
      elements.liveInstruction.textContent = "The garden feels you";
      elements.liveDetail.textContent = "Keep the breeze comfortable and steady.";
    } else {
      elements.liveInstruction.textContent = "A bright, strong breeze";
      elements.liveDetail.textContent = "Ease back whenever you need. Stronger is not better.";
    }
  } else if (strength < 0.075) {
    elements.liveInstruction.textContent = "Begin a gentle hum";
    elements.liveDetail.textContent = "Choose a comfortable pitch and keep your jaw easy.";
  } else if (strength < 0.55) {
    elements.liveInstruction.textContent = "Your flower is listening";
    elements.liveDetail.textContent = "Let the sound remain comfortable and continuous.";
  } else {
    elements.liveInstruction.textContent = "A vivid resonance";
    elements.liveDetail.textContent = "There is no need to get louder—comfort comes first.";
  }
}

function finishPractice() {
  if (state.phase !== "active") return;
  cancelAnimationFrame(state.animationFrame);
  state.phase = "finishing";
  const elapsed = clamp((performance.now() - state.startTime) / 1000, 0, state.duration);
  const averageStrength = state.activeSamples ? state.strengthTotal / state.activeSamples : 0;
  audioProbe.stop();

  const bloom = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    mode: state.mode,
    createdAt: new Date().toISOString(),
    duration: Math.round(elapsed),
    activeSeconds: Math.round(state.activeSeconds),
    strength: Math.round(averageStrength * 100),
    growth: Math.round(state.growth * 100),
    turn: Math.round(Math.random() * 280),
  };

  const hasMeaningfulInput = bloom.activeSeconds >= 1 && bloom.growth >= 2;
  if (hasMeaningfulInput) {
    state.blooms.unshift(bloom);
    saveBlooms();
    updateGardenCount();
  }
  showResult(bloom, hasMeaningfulInput);
  state.phase = "idle";
}

function showResult(bloom, hasMeaningfulInput) {
  const modeWord = bloom.mode === "breath" ? "breeze" : "hum";
  elements.resultTitle.textContent = hasMeaningfulInput
    ? "Your practice became a flower."
    : "Your seed is still waiting.";
  elements.resultSummary.textContent = hasMeaningfulInput
    ? `Your ${modeWord} helped this bloom unfold. Every practice creates a different moment—never a score.`
    : "We did not detect enough matching sound, so no flower was added. Try again closer to the microphone in a quieter room.";
  elements.resultDuration.textContent = `${bloom.duration}s`;
  elements.resultActive.textContent = `${bloom.activeSeconds}s`;
  elements.resultStrength.textContent = `${bloom.strength}%`;
  elements.resultFlower.classList.toggle("result-flower--seed", !hasMeaningfulInput);
  elements.resultFlower.textContent = hasMeaningfulInput ? "✦" : "○";
  elements.resultFlower.style.transform = `rotate(${bloom.turn % 24 - 12}deg)`;
  showScreen("result-screen");
}

function exitPractice() {
  cancelAnimationFrame(state.animationFrame);
  audioProbe.stop();
  state.phase = "idle";
  showScreen("home-screen");
}

function showMicrophoneError(error) {
  const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
  if (error?.message === "secure-context") {
    elements.errorMessage.textContent = "Microphone access needs HTTPS. Open the published GitHub Pages link or use localhost for testing.";
  } else if (error?.message === "unsupported") {
    elements.errorMessage.textContent = "This browser does not support live microphone access. Try a current mobile browser.";
  } else if (denied) {
    elements.errorMessage.textContent = "Microphone permission was declined. Allow it in your browser settings, then try again.";
  } else {
    elements.errorMessage.textContent = "We could not start the microphone. Check that another app is not using it, then try again.";
  }
  elements.errorDialog.hidden = false;
  elements.errorCloseButton.focus();
}

function updateGardenCount() {
  elements.gardenCount.textContent = String(state.blooms.length);
}

function renderGarden() {
  elements.gardenGrid.replaceChildren();
  elements.emptyGarden.hidden = state.blooms.length > 0;

  state.blooms.forEach((bloom, index) => {
    const card = document.createElement("article");
    card.className = "garden-card";

    const flower = document.createElement("div");
    flower.className = "garden-card__bloom";
    flower.style.setProperty("--turn", `${bloom.turn || index * 31}deg`);
    flower.textContent = "✦";

    const title = document.createElement("strong");
    title.textContent = bloom.mode === "breath" ? "Breeze Bloom" : "Resonance Bloom";

    const detail = document.createElement("small");
    const date = new Date(bloom.createdAt);
    detail.textContent = `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${bloom.duration}s`;

    card.append(flower, title, detail);
    elements.gardenGrid.append(card);
  });
}

function openGarden() {
  renderGarden();
  showScreen("garden-screen");
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

elements.modeButtons.forEach((button) => button.addEventListener("click", () => selectMode(button.dataset.mode)));
elements.durationButtons.forEach((button) => button.addEventListener("click", () => selectDuration(button.dataset.duration)));
elements.beginButton.addEventListener("click", beginPractice);
elements.exitButton.addEventListener("click", exitPractice);
elements.stopButton.addEventListener("click", finishPractice);
elements.openGardenButton.addEventListener("click", openGarden);
elements.resultGardenButton.addEventListener("click", openGarden);
elements.gardenBackButton.addEventListener("click", () => showScreen("home-screen"));
elements.gardenPracticeButton.addEventListener("click", () => showScreen("home-screen"));
elements.practiceAgainButton.addEventListener("click", () => showScreen("home-screen"));
elements.errorCloseButton.addEventListener("click", () => {
  elements.errorDialog.hidden = true;
  elements.beginButton.focus();
});

window.addEventListener("pagehide", () => audioProbe.stop());

updateGardenCount();
resetFlower();
document.documentElement.dataset.appReady = "true";
