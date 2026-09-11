window.Lume = window.Lume || {};

Lume.mode = "trending";
Lume.searchTimer = null;
Lume.searchSeq = 0;

function showGridLoading() {
  const grid = document.getElementById("mainGrid");
  if (!grid) return;
  grid.innerHTML = `
    <div class="grid-loading" id="gridLoading">
      <div class="lume-loader">
        <span class="loader-diamond">✦</span>
        <span class="loader-text">LumeMusic</span>
      </div>
    </div>
  `;
}

function setActiveTab(mode) {
  Lume.mode = mode;
  const app = document.querySelector(".app");
  app?.classList.toggle("search-mode", mode === "search");

  document.getElementById("tabTrending")?.classList.toggle("active", mode === "trending");
  document.getElementById("tabLatest")?.classList.toggle("active", mode === "latest");
  document.getElementById("refreshBtn")?.classList.toggle("hidden", mode === "search");
  document.getElementById("backToTrending")?.classList.toggle("hidden", mode !== "search");
  document.getElementById("tabTrending")?.classList.toggle("hidden", mode === "search");
  document.getElementById("tabLatest")?.classList.toggle("hidden", mode === "search");
}

async function loadTrending() {
  clearTimeout(Lume.searchTimer);
  setActiveTab("trending");
  showGridLoading();
  try {
    const items = await Lume.api.trending(24);
    Lume.ui.render(document.getElementById("mainGrid"), items);
  } catch (err) {
    document.getElementById("mainGrid").innerHTML = `<div class="error">${Lume.ui.esc(err.message)}</div>`;
  }
}

async function loadLatest() {
  clearTimeout(Lume.searchTimer);
  setActiveTab("latest");
  showGridLoading();
  try {
    const items = await Lume.api.latest(24);
    Lume.ui.render(document.getElementById("mainGrid"), items);
  } catch (err) {
    document.getElementById("mainGrid").innerHTML = `<div class="error">${Lume.ui.esc(err.message)}</div>`;
  }
}

async function runSearch(q, { showLoader = true } = {}) {
  const query = (q || "").trim();
  if (!query) {
    loadTrending();
    return;
  }

  setActiveTab("search");
  const seq = ++Lume.searchSeq;

  if (showLoader) showGridLoading();
  // Instant scroll avoids a long animated scroll competing with mobile rendering.
  document.getElementById("scrollArea")?.scrollTo({ top: 0, behavior: "auto" });

  try {
    const items = await Lume.api.search(query, 24);
    if (seq !== Lume.searchSeq) return;
    Lume.ui.render(document.getElementById("mainGrid"), items);
  } catch (err) {
    if (seq !== Lume.searchSeq) return;
    document.getElementById("mainGrid").innerHTML = `<div class="error">${Lume.ui.esc(err.message)}</div>`;
  }
}

function onSearchInput(value) {
  clearTimeout(Lume.searchTimer);
  const q = (value || "").trim();

  if (!q) {
    Lume.searchTimer = setTimeout(loadTrending, 280);
    return;
  }

  Lume.searchTimer = setTimeout(() => runSearch(q, { showLoader: true }), 380);
}

function refreshCurrent() {
  if (Lume.mode === "latest") loadLatest();
  else if (Lume.mode === "search") runSearch(document.getElementById("searchInput")?.value || "");
  else loadTrending();
}

function backFromSearch() {
  clearTimeout(Lume.searchTimer);
  Lume.searchSeq++;
  const input = document.getElementById("searchInput");
  if (input) input.value = "";
  loadTrending();
}

function startLumeApp() {
  Lume.ui.bind();
  Lume.player.init();
  loadTrending();

  document.getElementById("tabTrending")?.addEventListener("click", loadTrending);
  document.getElementById("tabLatest")?.addEventListener("click", loadLatest);
  document.getElementById("refreshBtn")?.addEventListener("click", refreshCurrent);
  document.getElementById("backToTrending")?.addEventListener("click", backFromSearch);

  const input = document.getElementById("searchInput");
  const app = document.querySelector(".app");

  input?.addEventListener("input", e => onSearchInput(e.target.value));

  input?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(Lume.searchTimer);
      runSearch(e.target.value, { showLoader: true });
      input.blur();
    }
  });

  document.getElementById("searchBtn")?.addEventListener("click", () => {
    clearTimeout(Lume.searchTimer);
    runSearch(input?.value || "", { showLoader: true });
    input?.blur();
  });

  input?.addEventListener("focus", () => app?.classList.add("search-focus"));
  input?.addEventListener("blur", () => app?.classList.remove("search-focus"));
}

document.addEventListener("DOMContentLoaded", () => {
  const intro = document.getElementById("lumeIntro");
  const reveal = () => {
    if (!intro) {
      startLumeApp();
      return;
    }

    intro.classList.add("fade-out");
    window.setTimeout(() => {
      intro.remove();
      document.body.classList.remove("intro-active");
      startLumeApp();
    }, 480);
  };

  // The intro remains fully visible for exactly 2.5 seconds before the fade begins.
  window.setTimeout(reveal, 2500);
});
