"use strict";

const STORAGE_KEY = "breathGardenBloomsV1";
const CALIBRATION_MS = 1600;
const SVG_NS = "http://www.w3.org/2000/svg";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function createSvgNode(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function getGrowthStages(growth) {
  return {
    stem: clamp(growth / 0.42),
    leftLeaf: clamp((growth - 0.12) / 0.24),
    rightLeaf: clamp((growth - 0.25) / 0.24),
    bloom: clamp((growth - 0.38) / 0.62),
  };
}

const FLOWER_TYPES = ["cloud", "moon", "orchid", "peony"];

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function getFlowerCount(duration) {
  if (duration >= 60) return 3;
  if (duration >= 30) return 2;
  return 1;
}

function createFlowerPlan(duration) {
  const seed = Math.floor(Math.random() * 0xFFFFFFFF);
  const random = seededRandom(seed);
  const types = [...FLOWER_TYPES];
  for (let index = types.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [types[index], types[swapIndex]] = [types[swapIndex], types[index]];
  }
  const count = getFlowerCount(duration);
  return {
    seed,
    flowers: types.slice(0, count).map((type, index) => ({
      type,
      pace: Number((0.94 + random() * 0.12).toFixed(3)),
      delay: Number((index === 0 ? 0 : random() * 0.035).toFixed(3)),
    })),
  };
}

function normalizeFlowerPlan(bloom) {
  if (Array.isArray(bloom.flowers) && bloom.flowers.length) {
    return bloom.flowers.slice(0, 3).map((spec, index) => {
      const migratedType = spec?.type === "star" ? "peony" : spec?.type;
      return {
        type: FLOWER_TYPES.includes(migratedType) ? migratedType : FLOWER_TYPES[index % FLOWER_TYPES.length],
        pace: Number(spec?.pace) || 1,
        delay: Number(spec?.delay) || 0,
      };
    });
  }
  const fallbackIndex = Math.abs(Number(bloom.turn) || 0) % FLOWER_TYPES.length;
  return [{ type: FLOWER_TYPES[fallbackIndex], pace: 1, delay: 0 }];
}

function getFlowerLayout(count) {
  const alignToGround = (center, scale) => ({
    center,
    scale,
    y: 365 * (1 - scale),
  });

  if (count === 1) return [alignToGround(210, 0.92)];
  if (count === 2) {
    return [
      alignToGround(130, 0.74),
      alignToGround(290, 0.86),
    ];
  }
  return [
    alignToGround(92, 0.59),
    alignToGround(210, 0.84),
    alignToGround(328, 0.59),
  ];
}

function appendBloomShape(group, type) {
  if (type === "moon") {
    group.append(
      createSvgNode("path", {
        class: "garden-flower__moon-cup",
        d: "M109 95 C119 68 135 47 151 34 C156 54 162 64 168 72 C177 58 187 47 197 35 C203 57 218 74 227 96 C214 120 194 133 168 133 C142 133 122 120 109 95Z",
      }),
      createSvgNode("path", {
        class: "garden-flower__moon-line",
        d: "M151 35 C149 76 157 104 168 130 M197 36 C190 76 181 105 168 130",
      }),
    );
    return;
  }

  if (type === "orchid") {
    group.append(
      createSvgNode("ellipse", {
        class: "garden-flower__orchid-petal garden-flower__orchid-petal--back",
        cx: 146,
        cy: 70,
        rx: 25,
        ry: 49,
        transform: "rotate(-27 146 70)",
      }),
      createSvgNode("ellipse", {
        class: "garden-flower__orchid-petal garden-flower__orchid-petal--back",
        cx: 190,
        cy: 70,
        rx: 25,
        ry: 49,
        transform: "rotate(27 190 70)",
      }),
      createSvgNode("ellipse", {
        class: "garden-flower__orchid-petal",
        cx: 125,
        cy: 98,
        rx: 24,
        ry: 46,
        transform: "rotate(-69 125 98)",
      }),
      createSvgNode("ellipse", {
        class: "garden-flower__orchid-petal",
        cx: 211,
        cy: 98,
        rx: 24,
        ry: 46,
        transform: "rotate(69 211 98)",
      }),
      createSvgNode("path", {
        class: "garden-flower__orchid-lip",
        d: "M143 97 C151 88 160 88 168 97 C176 88 185 88 193 97 C190 119 181 134 168 140 C155 134 146 119 143 97Z",
      }),
      createSvgNode("path", {
        class: "garden-flower__orchid-line",
        d: "M153 103 C161 107 165 116 168 132 C171 116 175 107 183 103",
      }),
    );
    return;
  }

  if (type === "peony") {
    const outerPetals = [
      { cx: 119, cy: 96, rx: 29, ry: 40, transform: "rotate(-58 119 96)" },
      { cx: 140, cy: 70, rx: 30, ry: 45, transform: "rotate(-27 140 70)" },
      { cx: 168, cy: 61, rx: 31, ry: 47 },
      { cx: 196, cy: 70, rx: 30, ry: 45, transform: "rotate(27 196 70)" },
      { cx: 217, cy: 96, rx: 29, ry: 40, transform: "rotate(58 217 96)" },
    ];
    outerPetals.forEach((attributes) => group.append(createSvgNode("ellipse", {
      ...attributes,
      class: "garden-flower__peony-petal garden-flower__peony-petal--outer",
    })));
    group.append(
      createSvgNode("ellipse", {
        class: "garden-flower__peony-petal garden-flower__peony-petal--inner",
        cx: 145,
        cy: 96,
        rx: 27,
        ry: 35,
        transform: "rotate(-32 145 96)",
      }),
      createSvgNode("ellipse", {
        class: "garden-flower__peony-petal garden-flower__peony-petal--inner",
        cx: 191,
        cy: 96,
        rx: 27,
        ry: 35,
        transform: "rotate(32 191 96)",
      }),
      createSvgNode("path", {
        class: "garden-flower__peony-fold",
        d: "M147 104 C151 86 160 79 168 91 C176 79 185 86 189 104 C183 122 176 132 168 138 C160 132 153 122 147 104Z",
      }),
    );
    return;
  }

  const petalSpecs = [
    { cx: 125, cy: 91, rx: 24, ry: 51, transform: "rotate(-56 125 91)", class: "garden-flower__petal garden-flower__petal--outer" },
    { cx: 146, cy: 72, rx: 26, ry: 54, transform: "rotate(-27 146 72)", class: "garden-flower__petal" },
    { cx: 168, cy: 61, rx: 28, ry: 58, class: "garden-flower__petal garden-flower__petal--center" },
    { cx: 190, cy: 72, rx: 26, ry: 54, transform: "rotate(27 190 72)", class: "garden-flower__petal" },
    { cx: 211, cy: 91, rx: 24, ry: 51, transform: "rotate(56 211 91)", class: "garden-flower__petal garden-flower__petal--outer" },
  ];
  petalSpecs.forEach((attributes) => group.append(createSvgNode("ellipse", attributes)));
  group.append(createSvgNode("circle", {
    class: "garden-flower__heart",
    cx: 168,
    cy: 112,
    r: 14,
  }));
}

function applyFlowerGrowth(entry, overallGrowth, sound = 0) {
  const flowerGrowth = clamp(overallGrowth * (Number(entry.spec.pace) || 1) - (Number(entry.spec.delay) || 0));
  const stages = getGrowthStages(flowerGrowth);
  entry.group.style.setProperty("--preview-stem", stages.stem.toFixed(3));
  entry.group.style.setProperty("--preview-left", stages.leftLeaf.toFixed(3));
  entry.group.style.setProperty("--preview-left-scale", (0.35 + stages.leftLeaf * 0.65).toFixed(3));
  entry.group.style.setProperty("--preview-right", stages.rightLeaf.toFixed(3));
  entry.group.style.setProperty("--preview-right-scale", (0.35 + stages.rightLeaf * 0.65).toFixed(3));
  entry.group.style.setProperty("--preview-bloom", stages.bloom.toFixed(3));
  entry.group.style.setProperty("--preview-sound", sound.toFixed(3));
}

function createFlowerCluster(bloom, className) {
  const growth = clamp((Number(bloom.growth) || 0) / 100);
  const flowerSpecs = normalizeFlowerPlan(bloom);
  const layout = getFlowerLayout(flowerSpecs.length);
  const svg = createSvgNode("svg", {
    viewBox: "0 0 420 390",
    class: className,
    role: "img",
    "aria-label": `${flowerSpecs.length} ${flowerSpecs.length === 1 ? "flower" : "flowers"} at ${Math.round(growth * 100)} percent growth`,
  });
  const entries = [];

  flowerSpecs.forEach((spec, index) => {
    const position = layout[index];
    const offsetX = position.center - 168 * position.scale;
    const plant = createSvgNode("g", {
      class: `garden-flower__plant garden-flower__plant--${spec.type}`,
      transform: `translate(${offsetX} ${position.y}) scale(${position.scale})`,
    });
    const ground = createSvgNode("ellipse", {
      class: "garden-flower__ground",
      cx: 160,
      cy: 365,
      rx: 62,
      ry: 10,
    });
    const stem = createSvgNode("path", {
      class: "garden-flower__stem",
      pathLength: 1,
      d: "M160 360 C151 294 178 240 162 185 C151 146 164 124 168 108",
    });
    const leftLeaf = createSvgNode("path", {
      class: "garden-flower__leaf garden-flower__leaf--left",
      d: "M158 269 C115 245 92 255 73 286 C111 295 139 286 158 269Z",
    });
    const rightLeaf = createSvgNode("path", {
      class: "garden-flower__leaf garden-flower__leaf--right",
      d: "M165 229 C195 195 225 193 247 210 C226 239 194 248 165 229Z",
    });
    const flower = createSvgNode("g", {
      class: `garden-flower__bloom garden-flower__bloom--${spec.type}`,
    });
    appendBloomShape(flower, spec.type);
    plant.append(ground, stem, leftLeaf, rightLeaf, flower);
    svg.append(plant);
    const entry = { group: plant, spec };
    applyFlowerGrowth(entry, growth);
    entries.push(entry);
  });

  svg.style.filter = `hue-rotate(${((Number(bloom.seed ?? bloom.turn) || 0) % 25) - 12}deg) drop-shadow(0 10px 14px rgba(105, 82, 164, 0.14))`;
  return { svg, entries };
}

function createFlowerPreview(bloom, className) {
  return createFlowerCluster(bloom, className).svg;
}

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
  sessionPlan: null,
  liveFlowerEntries: [],
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
  const plan = state.sessionPlan || createFlowerPlan(state.duration);
  const cluster = createFlowerCluster({ ...plan, growth: 0 }, "live-flower__svg");
  elements.liveFlower.replaceChildren(cluster.svg);
  state.liveFlowerEntries = cluster.entries;
  elements.soundMeterFill.style.width = "0%";
  elements.signalReadout.textContent = "Mic signal 0%";
  elements.progressBar.style.width = "0%";
}

async function beginPractice() {
  if (state.phase !== "idle") return;
  state.phase = "requesting";
  state.sessionPlan = createFlowerPlan(state.duration);
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
  state.liveFlowerEntries.forEach((entry) => applyFlowerGrowth(entry, growth, strength));
  elements.ambientOrb.style.setProperty("--sound", strength.toFixed(3));
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
    seed: state.sessionPlan?.seed,
    flowers: state.sessionPlan?.flowers || createFlowerPlan(state.duration).flowers,
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
  const flowerCount = normalizeFlowerPlan(bloom).length;
  elements.resultTitle.textContent = hasMeaningfulInput
    ? `Your practice became ${flowerCount === 1 ? "a flower" : `${flowerCount} flowers`}.`
    : "Your seed is still waiting.";
  elements.resultSummary.textContent = hasMeaningfulInput
    ? `Your ${modeWord} helped ${flowerCount === 1 ? "this bloom" : "this little bouquet"} unfold. Every practice creates a different moment—never a score.`
    : "We did not detect enough matching sound, so no flower was added. Try again closer to the microphone in a quieter room.";
  elements.resultDuration.textContent = `${bloom.duration}s`;
  elements.resultActive.textContent = `${bloom.activeSeconds}s`;
  elements.resultStrength.textContent = `${bloom.strength}%`;
  elements.resultFlower.classList.toggle("result-flower--seed", !hasMeaningfulInput);
  elements.resultFlower.replaceChildren(
    hasMeaningfulInput ? createFlowerPreview(bloom, "result-flower__svg") : document.createTextNode("○"),
  );
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

    const visual = document.createElement("div");
    visual.className = "garden-card__visual";
    const visualBloom = { ...bloom, turn: bloom.turn || index * 31 };
    visual.append(createFlowerPreview(visualBloom, "garden-flower-svg"));

    const title = document.createElement("strong");
    const flowerCount = normalizeFlowerPlan(bloom).length;
    title.textContent = flowerCount === 1
      ? (bloom.mode === "breath" ? "Breeze Bloom" : "Resonance Bloom")
      : `${flowerCount}-Bloom Bouquet`;

    const growth = document.createElement("span");
    growth.className = "garden-card__growth";
    growth.textContent = `${flowerCount} ${flowerCount === 1 ? "bloom" : "blooms"} · Growth ${Math.round(Number(bloom.growth) || 0)}%`;

    const detail = document.createElement("small");
    const date = new Date(bloom.createdAt);
    detail.textContent = `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${bloom.duration}s`;

    card.append(visual, title, growth, detail);
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
