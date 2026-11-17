const cfg = window.WEAPON_CONFIG;
const cockButton = document.querySelector("#cock");
const shootButton = document.querySelector("#shoot");
const statusText = document.querySelector("#status");

let cocked = false;
let firing = false;
let continuousAudio = null;
const activeAudios = new Set();

// Use native HTMLAudio playback. The previous version routed remote MP3s
// through Web Audio without cross-origin permission, which can produce silence
// in Safari. Native playback avoids that CORS/Web Audio routing problem.
function makeAudio(url, loop = false, rate = 1) {
  const audio = new Audio();
  audio.src = url;
  audio.preload = "auto";
  audio.loop = loop;
  audio.playbackRate = rate;
  audio.volume = 1;
  audio.playsInline = true;
  audio.addEventListener("ended", () => activeAudios.delete(audio), { once: true });
  audio.addEventListener("error", () => activeAudios.delete(audio), { once: true });
  activeAudios.add(audio);
  return audio;
}

function playOne(url, rate = 1) {
  const audio = makeAudio(url, false, rate);
  return audio.play().then(() => audio).catch((error) => {
    activeAudios.delete(audio);
    statusText.textContent = "SOUND COULD NOT PLAY — CHECK INTERNET / TAP AGAIN";
    console.error("Audio playback failed:", error);
    return null;
  });
}

cockButton.addEventListener("click", async () => {
  if (firing || cocked) return;
  statusText.textContent = "COCKING…";
  cockButton.disabled = true;
  await playOne(cfg.cock);
  cocked = true;
  shootButton.disabled = false;
  statusText.textContent = "READY";
  cockButton.textContent = "COCKED";
});

async function fireSingle() {
  const audio = await playOne(cfg.shot);
  if (audio) statusText.textContent = "SHOT FIRED";
}

async function fireRifleBurst() {
  statusText.textContent = "10-SHOT BURST";
  for (let i = 0; i < 10; i++) {
    if (!firing) break;
    await playOne(cfg.shot);
    if (i < 9) await new Promise(r => setTimeout(r, 125));
  }
}

function startContinuous() {
  firing = true;
  shootButton.textContent = "STOP FIRING";
  shootButton.classList.add("stop");
  statusText.textContent = "FIRING — TAP STOP";
  const rate = cfg.slug === "minigun" ? 1.22 : 1;
  continuousAudio = makeAudio(cfg.shot, true, rate);
  continuousAudio.play().catch((error) => {
    statusText.textContent = "SOUND COULD NOT PLAY — CHECK INTERNET / TAP AGAIN";
    console.error("Continuous audio playback failed:", error);
    stopContinuous();
  });
}

function stopContinuous() {
  firing = false;
  if (continuousAudio) {
    continuousAudio.pause();
    continuousAudio.currentTime = 0;
    activeAudios.delete(continuousAudio);
    continuousAudio = null;
  }
  shootButton.textContent = "START FIRING";
  shootButton.classList.remove("stop");
  statusText.textContent = "FIRING STOPPED";
}

shootButton.addEventListener("click", async () => {
  if (cfg.mode === "continuous") {
    if (firing) stopContinuous();
    else if (cocked) startContinuous();
    return;
  }
  if (!cocked || firing) return;
  firing = true;
  shootButton.disabled = true;
  cockButton.disabled = true;

  if (cfg.mode === "ten") {
    await fireRifleBurst();
  } else {
    await fireSingle();
  }

  firing = false;
  cocked = false;
  cockButton.disabled = false;
  cockButton.textContent = "COCK / READY";
  shootButton.disabled = true;
  statusText.textContent = "COCK AGAIN";
});

if (cfg.mode === "continuous") {
  shootButton.textContent = "START FIRING";
}
