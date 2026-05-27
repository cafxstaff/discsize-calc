const MEDIA = [
  {
    id: "dvd5",
    name: "DVD 1層",
    detail: "4.7GB",
    capacityGb: 4.7,
    type: "dvd"
  },
  {
    id: "dvd9",
    name: "DVD 2層",
    detail: "8.5GB",
    capacityGb: 8.5,
    type: "dvd"
  },
  {
    id: "bdr",
    name: "BD-R",
    detail: "25GB / 計算容量 23GB",
    capacityGb: 23,
    type: "bd"
  }
];

const AUDIO = {
  dvdPcm: {
    label: "PCM優先",
    detail: "LPCM 16bit / 48kHz / 2ch",
    kbps: 1536,
    badge: "PCM"
  },
  dvdAc3: {
    label: "AC-3代替",
    detail: "AC-3 448kbps",
    kbps: 448,
    badge: "容量節約"
  },
  pcm2: {
    label: "PCM優先",
    detail: "LPCM 16bit / 48kHz / 2ch",
    kbps: 1536,
    badge: "PCM"
  },
  pcm51: {
    label: "PCM 5.1",
    detail: "LPCM 16bit / 48kHz / 5.1ch",
    kbps: 4608,
    badge: "PCM"
  },
  ac3: {
    label: "AC-3代替",
    detail: "AC-3 448kbps",
    kbps: 448,
    badge: "容量節約"
  }
};

const state = {
  margin: 0.07,
  bdAudio: "pcm2"
};

const elements = {
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds"),
  results: document.querySelector("#results"),
  durationSummary: document.querySelector("#durationSummary"),
  marginSummary: document.querySelector("#marginSummary"),
  marginButtons: [...document.querySelectorAll("[data-margin]")],
  bdAudioButtons: [...document.querySelectorAll("[data-bd-audio]")]
};

function clampNumber(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return min;
  }
  return Math.min(Math.max(number, min), max);
}

function getDurationSeconds() {
  const hours = clampNumber(elements.hours.value, 0, 99);
  const minutes = clampNumber(elements.minutes.value, 0, 59);
  const seconds = clampNumber(elements.seconds.value, 0, 59);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}時間${String(minutes).padStart(2, "0")}分${String(seconds).padStart(2, "0")}秒`;
}

function formatMbps(kbps) {
  if (!Number.isFinite(kbps) || kbps <= 0) {
    return "不可";
  }
  return `${(kbps / 1000).toFixed(1)} Mbps`;
}

function formatKbps(kbps) {
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(3)} Mbps` : `${kbps} kbps`;
}

function usableBytes(media) {
  return media.capacityGb * 1_000_000_000 * (1 - state.margin);
}

function formatCapacity(bytes) {
  const mb = bytes / 1_000_000;
  return `${Math.floor(mb).toLocaleString("ja-JP")} MB`;
}

function formatUsableCapacity(media) {
  const bytes = usableBytes(media);
  if (media.type === "bd") {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
  return formatCapacity(bytes);
}

function calculateVideoKbps(media, audio, durationSeconds) {
  if (durationSeconds <= 0) {
    return 0;
  }

  const totalKbps = (usableBytes(media) * 8) / durationSeconds / 1000;
  const rawVideoKbps = totalKbps - audio.kbps;
  return Math.max(0, Math.floor(rawVideoKbps / 100) * 100);
}

function evaluatePlan(media, videoKbps) {
  if (videoKbps <= 0) {
    return { label: "尺または容量を確認", tone: "danger" };
  }

  if (media.type === "dvd") {
    if (videoKbps > 8000) {
      return { label: "DVD推奨上限超え", tone: "caution" };
    }
    if (videoKbps >= 6000) {
      return { label: "高画質域", tone: "good" };
    }
    if (videoKbps >= 4000) {
      return { label: "標準域", tone: "good" };
    }
    if (videoKbps >= 3000) {
      return { label: "画質注意", tone: "caution" };
    }
    return { label: "かなり厳しい", tone: "danger" };
  }

  if (videoKbps >= 20000) {
    return { label: "BD高画質域", tone: "good" };
  }
  if (videoKbps >= 12000) {
    return { label: "BD標準域", tone: "good" };
  }
  if (videoKbps >= 8000) {
    return { label: "長尺向け", tone: "caution" };
  }
  return { label: "BDでも注意", tone: "danger" };
}

function createPlan(media, audio, durationSeconds, isAlternative = false) {
  const videoKbps = calculateVideoKbps(media, audio, durationSeconds);
  const totalKbps = videoKbps + audio.kbps;
  const status = evaluatePlan(media, videoKbps);
  const capNote = media.type === "dvd" && videoKbps > 8000
    ? `<div class="status caution">推奨上限目安: 8.0 Mbps</div>`
    : "";

  return `
    <article class="plan-row">
      <div class="plan-title">
        <div>
          <strong>${audio.label}</strong>
          <p>${audio.detail}</p>
        </div>
        <span class="badge ${isAlternative ? "alt" : ""}">${audio.badge}</span>
      </div>
      <div class="bitrate-hero">
        <span>映像ビットレート</span>
        <strong>${formatMbps(videoKbps)}</strong>
      </div>
      <div class="metric-grid">
        <div class="metric">
          <span>音声</span>
          <strong>${formatKbps(audio.kbps)}</strong>
        </div>
        <div class="metric">
          <span>合計</span>
          <strong>${formatMbps(totalKbps)}</strong>
        </div>
      </div>
      <div class="status ${status.tone === "good" ? "" : status.tone}">${status.label}</div>
      ${capNote}
    </article>
  `;
}

function render() {
  const durationSeconds = getDurationSeconds();
  elements.durationSummary.textContent = formatDuration(durationSeconds);
  elements.marginSummary.textContent = `${Math.round(state.margin * 100)}%`;

  elements.results.innerHTML = MEDIA.map((media) => {
    const plans = media.type === "dvd"
      ? [
          createPlan(media, AUDIO.dvdPcm, durationSeconds),
          createPlan(media, AUDIO.dvdAc3, durationSeconds, true)
        ]
      : [
          createPlan(media, AUDIO[state.bdAudio], durationSeconds, state.bdAudio === "ac3")
        ];

    const panelClass = plans.length === 1 ? "media-panel single-plan" : "media-panel";

    return `
      <article class="${panelClass}">
        <header class="media-header">
          <div>
            <h3>${media.name}</h3>
            <span>${media.detail}</span>
          </div>
          <div class="usable-capacity">
            <span>実効容量</span>
            <strong>${formatUsableCapacity(media)}</strong>
          </div>
        </header>
        <div class="plan-list">
          ${plans.join("")}
        </div>
      </article>
    `;
  }).join("");
}

function setActiveButton(buttons, activeButton) {
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button === activeButton);
    button.setAttribute("aria-pressed", button === activeButton ? "true" : "false");
  });
}

function bindEvents() {
  [elements.hours, elements.minutes, elements.seconds].forEach((input) => {
    input.addEventListener("input", render);
    input.addEventListener("blur", () => {
      const max = input === elements.hours ? 99 : 59;
      input.value = clampNumber(input.value, 0, max);
      render();
    });
  });

  elements.marginButtons.forEach((button) => {
    button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
    button.addEventListener("click", () => {
      state.margin = Number.parseFloat(button.dataset.margin);
      setActiveButton(elements.marginButtons, button);
      render();
    });
  });

  elements.bdAudioButtons.forEach((button) => {
    button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
    button.addEventListener("click", () => {
      state.bdAudio = button.dataset.bdAudio;
      setActiveButton(elements.bdAudioButtons, button);
      render();
    });
  });
}

bindEvents();
render();
