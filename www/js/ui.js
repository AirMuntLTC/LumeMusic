// UI rendering, controls, artist profiles and performance helpers
window.Lume = window.Lume || {};

Lume.ui = {
  _stylesReady: false,

  esc(t) {
    const d = document.createElement("div");
    d.textContent = t == null ? "" : String(t);
    return d.innerHTML;
  },

  formatTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  },

  installPerformanceStyles() {
    if (this._stylesReady) return;
    this._stylesReady = true;
    const style = document.createElement("style");
    style.id = "lumeDynamicUiStyles";
    style.textContent = `
      /* Mobile scroll performance: avoid expensive backdrop-filter repaint while scrolling. */
      .modal-overlay { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; contain: strict; }
      .modal { transform: translate3d(0,0,0); contain: layout paint; }
      .modal-body { touch-action: pan-y; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; contain: layout paint; transform: translateZ(0); }
      .modal-description { white-space: pre-wrap; overflow-wrap: anywhere; contain: content; }
      .modal-body, .artist-profile-body { scrollbar-width: thin; }
      .artist-profile-body { overflow-y: auto; min-height: 0; touch-action: pan-y; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; contain: layout paint; transform: translateZ(0); }
      .artist-profile { width:100%; max-width:680px; max-height:90vh; }
      .artist-profile > .modal-body { overflow:hidden; padding:0; }
      .artist-hero { padding:18px 16px 14px; text-align:center; border-bottom:1px solid var(--border); }
      .artist-avatar { width:108px; height:108px; border-radius:50%; object-fit:cover; display:block; margin:0 auto 10px; border:2px solid var(--accent); box-shadow:0 0 18px var(--glow); background:var(--surface-2); }
      .artist-label { display:inline-flex; align-items:center; gap:7px; margin-bottom:6px; font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#c9b9ff; text-shadow:0 0 7px rgba(124,92,255,.85),0 0 18px rgba(124,92,255,.45); }
      .artist-label svg { width:23px; height:23px; filter:drop-shadow(0 0 6px rgba(34,211,238,.75)); }
      .artist-name { font-size:20px; font-weight:800; color:#fff; overflow-wrap:anywhere; }
      .artist-stats { display:flex; justify-content:center; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .artist-stat { padding:5px 9px; border:1px solid var(--border); border-radius:999px; background:var(--surface-2); font-size:10px; color:var(--text-muted); }
      .artist-description { padding:14px 16px 4px; font-size:12px; line-height:1.55; color:var(--text-muted); white-space:pre-wrap; overflow-wrap:anywhere; contain:content; }
      .artist-videos-title { padding:14px 16px 8px; font-size:13px; font-weight:700; color:var(--text); }
      .artist-videos { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:0 12px 16px; }
      .artist-video { min-width:0; border:1px solid var(--border); background:var(--surface-2); border-radius:10px; overflow:hidden; cursor:pointer; contain:layout paint; }
      .artist-video img { width:100%; aspect-ratio:16/9; display:block; object-fit:cover; }
      .artist-video-title { padding:7px; font-size:10px; line-height:1.3; color:var(--text); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .channel-link { display:inline-flex; align-items:center; gap:4px; padding:0; margin:0; border:0; background:none; color:var(--text-muted); font:inherit; cursor:pointer; text-align:left; }
      .channel-link:hover { color:var(--accent); }
      .artist-inline-icon { width:12px; height:12px; flex:0 0 auto; }
      .artist-loading { padding:28px 16px; text-align:center; color:var(--text-muted); font-size:12px; }
      .player-error { position:absolute; inset:0; z-index:15; display:flex; align-items:center; justify-content:center; padding:18px; text-align:center; background:rgba(10,10,15,.94); color:#fff; font-size:12px; }
      .player-error strong { display:block; margin-bottom:5px; color:#ff8ca5; }
      @media (max-width:480px) { .artist-profile { max-height:88vh; } .artist-videos { gap:7px; } }
    `;
    document.head.appendChild(style);
  },

  showUI() {
    document.getElementById("playerWrapper")?.classList.add("show-ui");
    clearTimeout(Lume.state.hideTimer);
    Lume.state.hideTimer = setTimeout(() => {
      document.getElementById("playerWrapper")?.classList.remove("show-ui");
    }, 3000);
  },

  keepUI() {
    clearTimeout(Lume.state.hideTimer);
    Lume.state.hideTimer = setTimeout(() => {
      document.getElementById("playerWrapper")?.classList.remove("show-ui");
    }, 3000);
  },

  hidePlaceholder() {
    document.getElementById("playerPlaceholder")?.classList.add("hidden");
    document.getElementById("playerLoading")?.classList.add("hidden");
    document.getElementById("playerError")?.remove();
  },

  showPlaceholder() {
    document.getElementById("playerPlaceholder")?.classList.remove("hidden");
  },

  showPlayerError(message) {
    const wrapper = document.getElementById("playerWrapper");
    if (!wrapper) return;
    document.getElementById("playerError")?.remove();
    const box = document.createElement("div");
    box.id = "playerError";
    box.className = "player-error";
    box.innerHTML = `<div><strong>Video unavailable</strong>${this.esc(message)}</div>`;
    wrapper.appendChild(box);
    document.getElementById("playerLoading")?.classList.add("hidden");
  },

  setPlayIcon(playing) {
    document.getElementById("iconPlay")?.classList.toggle("hidden", playing);
    document.getElementById("iconPause")?.classList.toggle("hidden", !playing);
  },

  setMuteIcon(muted) {
    document.getElementById("iconVolume")?.classList.toggle("hidden", muted);
    document.getElementById("iconMuted")?.classList.toggle("hidden", !muted);
  },

  updateProgress() {
    if (!Lume.state.ready || Lume.state.dragging || !Lume.state.playing) return;
    try {
      const cur = Lume.state.player.getCurrentTime() || 0;
      const dur = Lume.state.player.getDuration() || 0;
      const ct = document.getElementById("currentTime");
      const dt = document.getElementById("duration");
      if (ct) ct.textContent = this.formatTime(cur);
      if (dt) dt.textContent = this.formatTime(dur);
      if (dur > 0) {
        const pct = Math.max(0, Math.min(100, (cur / dur) * 100));
        const f = document.getElementById("progressFilled");
        const h = document.getElementById("progressHandle");
        if (f) f.style.width = pct + "%";
        if (h) h.style.left = pct + "%";
      }
    } catch (e) {}
  },

  markPlaying(id) {
    document.querySelectorAll(".video-card").forEach(c => {
      c.classList.toggle("playing", c.dataset.videoId === id);
    });
    this.setBadges(Lume.state.playing);
  },

  setBadges(playing) {
    document.querySelectorAll(".video-card.playing .playing-badge").forEach(b => {
      b.classList.toggle("is-playing", playing);
      b.classList.toggle("is-paused", !playing);
    });
  },

  artistSvg(className = "") {
    const gid = `artistGrad_${Math.random().toString(36).slice(2,9)}`;
    return `<svg class="${className}" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="4" y1="3" x2="29" y2="29"><stop stop-color="#f0eaff"/><stop offset=".28" stop-color="#a78bfa"/><stop offset=".62" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
      <circle cx="16" cy="11" r="5.1" stroke="url(#${gid})" stroke-width="2.6"/>
      <path d="M6.8 27c1.1-6 4.3-9 9.2-9s8.1 3 9.2 9" stroke="url(#${gid})" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M25.1 5.1l1.1 2.3 2.3 1.1-2.3 1.1-1.1 2.3L24 9.6l-2.3-1.1L24 7.4l1.1-2.3Z" fill="url(#${gid})"/>
      <path d="M6 7.1l.65 1.35L8 9.1l-1.35.65L6 11.1l-.65-1.35L4 9.1l1.35-.65L6 7.1Z" fill="#22d3ee" opacity=".9"/>
    </svg>`;
  },

  card(item) {
    const id = item?.id?.videoId;
    const snippet = item?.snippet || {};
    const title = snippet.title || "Untitled";
    const channelTitle = snippet.channelTitle || "Unknown artist";
    const channelId = snippet.channelId || "";
    const thumb = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "";

    const el = document.createElement("div");
    el.className = "video-card";
    el.dataset.videoId = id || "";
    el.dataset.channelId = channelId;
    el.innerHTML = `
      <div class="playing-badge is-paused">
        <span class="play-text">Playing</span><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
      </div>
      <div class="thumb"><img src="${this.esc(thumb)}" alt="" loading="lazy" decoding="async" /></div>
      <div class="info">
        <div class="title">${this.esc(title)}</div>
        <button class="channel-link" type="button" aria-label="Open artist profile">
          ${this.artistSvg("artist-inline-icon")}<span>${this.esc(channelTitle)}</span>
        </button>
      </div>
    `;

    el.addEventListener("click", () => this.playVideo(id, title, channelTitle, channelId));
    el.querySelector(".channel-link")?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      this.openArtist(channelId, channelTitle);
    });
    return el;
  },

  render(container, items) {
    if (!container) return;
    if (!items?.length) {
      container.innerHTML = `<div class="empty">No videos found</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(i => frag.appendChild(this.card(i)));
    container.replaceChildren(frag);
    if (Lume.state.videoId) this.markPlaying(Lume.state.videoId);
  },

  loadAndPlay(id, title, channel, channelId = "") {
    Lume.state.videoId = id;
    Lume.state.details = null;
    Lume.state.channelId = channelId || "";
    Lume.state.channel = null;

    const nowTitle = document.getElementById("nowTitle");
    const nowChannel = document.getElementById("nowChannel");
    const topbarTitle = document.getElementById("topbarTitle");
    const topbarChannel = document.getElementById("topbarChannel");

    if (nowTitle) nowTitle.textContent = title || "Untitled";
    if (nowChannel) {
      nowChannel.textContent = channel || "Unknown artist";
      nowChannel.dataset.channelId = channelId || "";
      nowChannel.classList.toggle("artist-clickable", !!channelId);
    }
    if (topbarTitle) topbarTitle.textContent = title || "Untitled";
    if (topbarChannel) topbarChannel.textContent = channel || "LumeMusic";
    document.getElementById("aboutBtn")?.classList.remove("hidden");

    document.getElementById("currentTime").textContent = "0:00";
    document.getElementById("duration").textContent = "0:00";
    document.getElementById("progressFilled").style.width = "0%";
    document.getElementById("progressHandle").style.left = "0%";
    this.setPlayIcon(false);
    this.markPlaying(id);
    this.showUI();

    document.getElementById("playerError")?.remove();
    const loading = document.getElementById("playerLoading");
    loading?.classList.remove("hidden");

    Lume.player.load(id);
    setTimeout(() => {
      loading?.classList.add("hidden");
      Lume.player.play();
      this.showUI();
    }, 450);
  },

  playVideo(id, title, channel, channelId = "") {
    if (!id) return;
    if (Lume.state.ready) this.loadAndPlay(id, title, channel, channelId);
    else Lume.state.pending = { id, title, channel, channelId };
  },

  ensureModal(id, title) {
    let modal = document.getElementById(id);
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "modal-overlay hidden";
    modal.id = id;
    modal.innerHTML = `
      <div class="modal ${id === "artistModal" ? "artist-profile" : ""}">
        <div class="modal-header"><h3>${this.esc(title)}</h3><button class="modal-close" type="button" data-modal-close="${id}" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        <div class="modal-body" id="${id}Body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("[data-modal-close]")?.addEventListener("click", () => this.closeModal(id));
    modal.addEventListener("click", e => { if (e.target === modal) this.closeModal(id); });
    return modal;
  },

  closeModal(id) {
    if (id === "artistModal") Lume.state.artistRequestSeq++;
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
    if (Lume.state.activeModal === id) Lume.state.activeModal = null;
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    const scrollBody = modal.querySelector(".artist-profile-body, .modal-body");
    if (scrollBody) scrollBody.scrollTop = 0;
    Lume.state.activeModal = id;
  },

  async openAbout() {
    if (!Lume.state.videoId) return;
    this.installPerformanceStyles();
    const modal = this.ensureModal("aboutModal", "About");
    const body = document.getElementById("aboutModalBody") || document.getElementById("modalBody");
    body.innerHTML = `<div class="modal-loading">Loading...</div>`;
    this.openModal("aboutModal");

    try {
      const d = Lume.state.details || await Lume.api.details(Lume.state.videoId);
      Lume.state.details = d;
      if (!d) {
        body.innerHTML = `<div class="modal-loading">No details available.</div>`;
        return;
      }
      const s = d.snippet || {};
      const st = d.statistics || {};
      const views = st.viewCount ? Number(st.viewCount).toLocaleString() + " views" : "";
      const likes = st.likeCount ? Number(st.likeCount).toLocaleString() + " likes" : "";
      const pub = s.publishedAt ? new Date(s.publishedAt).toLocaleDateString() : "";
      body.innerHTML = `
        <div class="about-title">${this.esc(s.title)}</div>
        <button class="channel-link about-channel" type="button">${this.artistSvg("artist-inline-icon")}${this.esc(s.channelTitle || "Unknown artist")}</button>
        <div class="about-meta">${[pub, views, likes].filter(Boolean).map(this.esc).join(" · ")}</div>
        <div class="modal-description">${this.esc(s.description || "No description.")}</div>
      `;
      body.querySelector(".channel-link")?.addEventListener("click", () => this.openArtist(s.channelId, s.channelTitle));
    } catch (err) {
      body.innerHTML = `<div class="modal-loading">${this.esc(err.message)}</div>`;
    }
  },

  async openArtist(channelId, fallbackName = "Artist") {
    if (!channelId) return;
    const requestSeq = ++Lume.state.artistRequestSeq;
    this.installPerformanceStyles();
    const modal = this.ensureModal("artistModal", "Artist");
    const body = document.getElementById("artistModalBody");
    body.innerHTML = `<div class="artist-profile-body"><div class="artist-loading"><div class="lume-loader"><span class="loader-diamond">✦</span><span class="loader-text">LumeMusic</span></div><div>Loading artist...</div></div></div>`;
    this.openModal("artistModal");

    try {
      const [artist, videos] = await Promise.all([
        Lume.api.channel(channelId),
        Lume.api.channelVideos(channelId, 500)
      ]);
      if (requestSeq !== Lume.state.artistRequestSeq) return;
      if (!artist) throw new Error("Artist profile is unavailable.");

      const s = artist.snippet || {};
      const st = artist.statistics || {};
      const avatar = s.thumbnails?.high?.url || s.thumbnails?.medium?.url || s.thumbnails?.default?.url || "";
      const subscribers = st.hiddenSubscriberCount ? "Subscribers hidden" : (st.subscriberCount ? Number(st.subscriberCount).toLocaleString() + " subscribers" : "");
      const videosCount = st.videoCount ? Number(st.videoCount).toLocaleString() + " videos" : "";
      const views = st.viewCount ? Number(st.viewCount).toLocaleString() + " views" : "";

      body.innerHTML = `
        <div class="artist-profile-body">
          <div class="artist-hero">
            <div class="artist-label">${this.artistSvg("artist-label-icon")}<span>ARTIST</span></div>
            <img class="artist-avatar" src="${this.esc(avatar)}" alt="" decoding="async" />
            <div class="artist-name">${this.esc(s.title || fallbackName)}</div>
            <div class="artist-stats">${[subscribers, videosCount, views].filter(Boolean).map(x => `<span class="artist-stat">${this.esc(x)}</span>`).join("")}</div>
          </div>
          ${s.description ? `<div class="artist-description">${this.esc(s.description)}</div>` : ""}
          <div class="artist-section-head">
            <div class="artist-videos-title"><span class="artist-section-title-text">All music videos</span> <span class="artist-count">${videos.length}</span></div>
            <div class="artist-section-actions">
              <button class="artist-view-btn all-videos-btn active" type="button" aria-label="Show all music videos" aria-pressed="true">${this.videoCollectionSvg()}<span>All Music Videos</span></button>
              <button class="artist-view-btn album-btn" type="button" aria-label="Show albums" aria-pressed="false">${this.albumSvg()}<span>Albums</span></button>
            </div>
          </div>
          <div class="artist-videos"></div>
          <div class="artist-albums hidden"></div>
        </div>`;

      const grid = body.querySelector(".artist-videos");
      this.renderArtistVideos(grid, videos, s.title || fallbackName, channelId);
      const allBtn = body.querySelector(".all-videos-btn");
      const albumBtn = body.querySelector(".album-btn");
      const albumsEl = body.querySelector(".artist-albums");
      const titleEl = body.querySelector(".artist-section-title-text");
      const countEl = body.querySelector(".artist-count");
      allBtn?.addEventListener("click", () => {
        grid?.classList.remove("hidden"); albumsEl?.classList.add("hidden");
        allBtn.classList.add("active"); albumBtn?.classList.remove("active");
        allBtn.setAttribute("aria-pressed", "true"); albumBtn?.setAttribute("aria-pressed", "false");
        if (titleEl) titleEl.textContent = "All music videos";
        if (countEl) countEl.textContent = videos.length;
      });
      albumBtn?.addEventListener("click", e => this.openArtistAlbums(channelId, body, s.title || fallbackName, e.currentTarget));
    } catch (err) {
      if (requestSeq !== Lume.state.artistRequestSeq) return;
      body.innerHTML = `<div class="artist-loading">${this.esc(err.message)}</div>`;
    }
  },

  videoCollectionSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.5h10.5A2.5 2.5 0 0 1 17 9v6a2.5 2.5 0 0 1-2.5 2.5H4A2.5 2.5 0 0 1 1.5 15V9A2.5 2.5 0 0 1 4 6.5Z" stroke="currentColor" stroke-width="1.8"/><path d="m17 10 5-3v10l-5-3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M5 4h8M5 20h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".65"/></svg>`;
  },

  albumSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5h16M4 9.5h16M4 13.5h10M4 17.5h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="17" r="3" stroke="currentColor" stroke-width="2"/><path d="M18 14V8.5l2.5-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },

  renderArtistVideos(grid, videos, artistName, channelId) {
    if (!grid) return;
    if (!videos?.length) { grid.innerHTML = `<div class="artist-loading">No public music videos found.</div>`; return; }
    const frag = document.createDocumentFragment();
    videos.forEach(v => {
      const id = v?.id?.videoId;
      if (!id) return;
      const item = document.createElement("div");
      item.className = "artist-video";
      const thumb = v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || "";
      item.innerHTML = `<img src="${this.esc(thumb)}" alt="" loading="lazy" decoding="async"><div class="artist-video-title">${this.esc(v.snippet?.title || "Untitled")}</div>`;
      item.addEventListener("click", () => {
        this.closeModal("artistModal");
        this.playVideo(id, v.snippet?.title || "Untitled", artistName, channelId);
      });
      frag.appendChild(item);
    });
    grid.replaceChildren(frag);
  },

  async openArtistAlbums(channelId, body, artistName, button) {
    const albums = body.querySelector(".artist-albums");
    const videos = body.querySelector(".artist-videos");
    const allBtn = body.querySelector(".all-videos-btn");
    const albumBtn = body.querySelector(".album-btn");
    const titleEl = body.querySelector(".artist-section-title-text");
    const countEl = body.querySelector(".artist-count");
    if (!albums || !videos) return;
    videos.classList.add("hidden"); albums.classList.remove("hidden");
    allBtn?.classList.remove("active"); albumBtn?.classList.add("active");
    allBtn?.setAttribute("aria-pressed", "false"); albumBtn?.setAttribute("aria-pressed", "true");
    if (titleEl) titleEl.textContent = "Albums"; if (countEl) countEl.textContent = "";
    if (albums.dataset.loaded === "1") return;
    albums.innerHTML = `<div class="artist-loading"><div class="lume-loader"><span class="loader-diamond">✦</span><span class="loader-text">LumeMusic</span></div><div>Loading all albums...</div></div>`;
    try {
      const list = await Lume.api.channelAlbums(channelId, 50);
      if (!list.length) { albums.innerHTML = `<div class="artist-loading">No albums/playlists found for this artist.</div>`; albums.dataset.loaded="1"; return; }
      const frag=document.createDocumentFragment();
      list.forEach(album=>{
        const card=document.createElement("button"); card.type="button"; card.className="album-card";
        const thumb=album.snippet?.thumbnails?.medium?.url||album.snippet?.thumbnails?.default?.url||"";
        const count=album.contentDetails?.itemCount?`${Number(album.contentDetails.itemCount).toLocaleString()} videos`:"";
        card.innerHTML=`<img src="${this.esc(thumb)}" alt="" loading="lazy" decoding="async"><span class="album-card-info"><strong>${this.esc(album.snippet?.title||"Untitled album")}</strong><small>${this.esc(count)}</small></span><span class="album-chevron">›</span>`;
        card.addEventListener("click",async()=>{
          const existing=card.nextElementSibling; if(existing?.classList.contains("album-tracks")){existing.remove();return;}
          const loading=document.createElement("div"); loading.className="album-tracks";
          loading.innerHTML=`<div class="artist-loading"><div class="lume-loader"><span class="loader-diamond">✦</span><span class="loader-text">LumeMusic</span></div><div>Loading album...</div></div>`; card.after(loading);
          try {
            const tracks=await Lume.api.albumVideos(album.id,200); loading.innerHTML="";
            if(!tracks.length){loading.innerHTML=`<div class="artist-loading">No videos in this album.</div>`;return;}
            const tf=document.createDocumentFragment(); tracks.forEach((v,index)=>{const id=v?.id?.videoId;if(!id)return;const row=document.createElement("button");row.type="button";row.className="album-track";row.innerHTML=`<span class="track-number">${index+1}</span><img src="${this.esc(v.snippet?.thumbnails?.default?.url||"")}" alt="" loading="lazy"><span>${this.esc(v.snippet?.title||"Untitled")}</span>`;row.addEventListener("click",()=>{this.closeModal("artistModal");this.playVideo(id,v.snippet?.title||"Untitled",artistName,channelId);});tf.appendChild(row);}); loading.appendChild(tf);
          } catch(err){loading.innerHTML=`<div class="artist-loading">${this.esc(err.message)}</div>`;}
        }); frag.appendChild(card);
      });
      albums.replaceChildren(frag); albums.dataset.loaded="1";
    } catch(err){albums.innerHTML=`<div class="artist-loading">${this.esc(err.message)}</div>`;}
  },
  closeAbout() { this.closeModal("aboutModal"); },

  setupProgress() {
    const bar = document.getElementById("progressBar");
    if (!bar) return;
    const pct = e => {
      const r = bar.getBoundingClientRect();
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      return Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100));
    };
    bar.addEventListener("click", e => {
      e.stopPropagation();
      Lume.player.seek(pct(e));
      this.keepUI();
    });
    bar.addEventListener("mousedown", e => {
      e.stopPropagation();
      Lume.state.dragging = true;
      bar.classList.add("dragging");
      Lume.player.seek(pct(e));
    });
    window.addEventListener("mousemove", e => {
      if (!Lume.state.dragging) return;
      const p = pct(e);
      document.getElementById("progressFilled").style.width = p + "%";
      document.getElementById("progressHandle").style.left = p + "%";
    }, { passive: true });
    window.addEventListener("mouseup", e => {
      if (!Lume.state.dragging) return;
      Lume.state.dragging = false;
      bar.classList.remove("dragging");
      Lume.player.seek(pct(e));
      this.keepUI();
    });
    bar.addEventListener("touchstart", e => {
      Lume.state.dragging = true;
      bar.classList.add("dragging");
      Lume.player.seek(pct(e));
    }, { passive: true });
    bar.addEventListener("touchmove", e => {
      if (!Lume.state.dragging) return;
      const p = pct(e);
      document.getElementById("progressFilled").style.width = p + "%";
      document.getElementById("progressHandle").style.left = p + "%";
    }, { passive: true });
    bar.addEventListener("touchend", () => {
      Lume.state.dragging = false;
      bar.classList.remove("dragging");
      this.keepUI();
    }, { passive: true });
  },

  bind() {
    this.installPerformanceStyles();

    document.getElementById("playPauseBtn")?.addEventListener("click", e => {
      e.stopPropagation(); Lume.player.toggle(); this.keepUI();
    });
    document.getElementById("muteBtn")?.addEventListener("click", e => {
      e.stopPropagation(); Lume.player.mute(); this.keepUI();
    });
    document.getElementById("fullscreenBtn")?.addEventListener("click", e => {
      e.stopPropagation();
      const el = document.getElementById("playerWrapper");
      try {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } catch (err) {}
      this.keepUI();
    });
    document.getElementById("speedBtn")?.addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById("speedMenu")?.classList.toggle("open");
      this.keepUI();
    });
    document.querySelectorAll("#speedMenu button").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        Lume.player.speed(btn.dataset.speed);
        document.getElementById("speedBtn").textContent = Lume.state.speed + "x";
        document.querySelectorAll("#speedMenu button").forEach(b => b.classList.toggle("active", parseFloat(b.dataset.speed) === Lume.state.speed));
        document.getElementById("speedMenu")?.classList.remove("open");
        this.keepUI();
      });
    });
    document.addEventListener("click", e => {
      if (!e.target.closest(".speed-control")) document.getElementById("speedMenu")?.classList.remove("open");
    });

    document.getElementById("aboutBtn")?.addEventListener("click", () => this.openAbout());
    document.getElementById("modalClose")?.addEventListener("click", () => this.closeAbout());
    document.querySelector("#artistModal [data-modal-close=\"artistModal\"]")?.addEventListener("click", () => this.closeModal("artistModal"));
    document.getElementById("aboutModal")?.addEventListener("click", e => { if (e.target.id === "aboutModal") this.closeAbout(); });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (Lume.state.activeModal === "artistModal") this.closeModal("artistModal");
      else if (Lume.state.activeModal === "aboutModal") this.closeAbout();
    });

    // Artist name under the player opens the artist profile.
    document.getElementById("nowChannel")?.addEventListener("click", e => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.channelId || Lume.state.channelId;
      if (id) this.openArtist(id, e.currentTarget.textContent || "Artist");
    });

    const shield = document.getElementById("playerShield");
    shield?.addEventListener("click", () => this.showUI());
    shield?.addEventListener("touchstart", () => this.showUI(), { passive: true });

    this.setupProgress();
  }
};
