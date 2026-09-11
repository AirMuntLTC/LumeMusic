// YouTube IFrame player + progress loop
window.Lume = window.Lume || {};

Lume.player = {
  // Ad/interstitial state
  adTimer: null,
  adShowing: false,

  init() {
    if (window.YT && window.YT.Player) {
      this.create();
      return;
    }

    window.onYouTubeIframeAPIReady = () => this.create();

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  },

  create() {
    if (Lume.state.player) return;

    try {
      Lume.state.player = new YT.Player("player", {
        height: "100%",
        width: "100%",

        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          cc_load_policy: 0,
          enablejsapi: 1,
          origin: location.origin
        },

        events: {
          onReady: () => this.onReady(),
          onStateChange: e => this.onState(e),
          onError: e => this.onError(e)
        }
      });
    } catch (err) {
      console.error(
        "LumeMusic player creation failed:",
        err
      );

      Lume.ui?.showPlayerError(
        "The video player could not be created."
      );
    }
  },

  onReady() {
    Lume.state.ready = true;

    if (Lume.state.pending) {
      const v = Lume.state.pending;

      Lume.state.pending = null;

      Lume.ui.loadAndPlay(
        v.id,
        v.title,
        v.channel,
        v.channelId
      );
    }
  },

  onState(event) {
    const s = event.data;

    if (s === YT.PlayerState.PLAYING) {
      Lume.state.playing = true;

      Lume.ui.setPlayIcon(true);
      Lume.ui.setBadges(true);
      Lume.ui.hidePlaceholder();

      this.startProgress();

      // Start the 30-second interstitial timer.
      this.startAdTimer();

    } else if (
      s === YT.PlayerState.PAUSED ||
      s === YT.PlayerState.ENDED
    ) {
      Lume.state.playing = false;

      Lume.ui.setPlayIcon(false);
      Lume.ui.setBadges(false);

      this.stopProgress();

      // Never keep an ad timer running while paused/ended.
      this.stopAdTimer();

    } else if (
      s === YT.PlayerState.BUFFERING ||
      s === YT.PlayerState.CUED
    ) {
      Lume.ui.hidePlaceholder();
    }
  },

  onError(event) {
    const map = {
      2: "This video ID is invalid.",
      5: "YouTube could not play this video in HTML5.",
      100: "This video was not found or is unavailable.",
      101: "This video does not allow embedded playback.",
      150: "This video does not allow embedded playback. Try another video."
    };

    const message =
      map[event.data] ||
      "YouTube could not play this video.";

    this.stopProgress();
    this.stopAdTimer();

    Lume.ui?.showPlayerError(message);
  },

  startProgress() {
    this.stopProgress();

    const tick = now => {
      if (!Lume.state.playing) {
        Lume.state.raf = null;
        return;
      }

      if (now - Lume.state.lastTick >= 250) {
        Lume.state.lastTick = now;
        Lume.ui.updateProgress();
      }

      Lume.state.raf =
        requestAnimationFrame(tick);
    };

    Lume.state.raf =
      requestAnimationFrame(tick);
  },

  stopProgress() {
    if (Lume.state.raf) {
      cancelAnimationFrame(Lume.state.raf);
      Lume.state.raf = null;
    }
  },

  play() {
    try {
      Lume.state.player?.playVideo();
    } catch (e) {}
  },

  pause() {
    try {
      Lume.state.player?.pauseVideo();
    } catch (e) {}
  },

  toggle() {
    if (!Lume.state.ready) return;

    try {
      if (
        Lume.state.player.getPlayerState() ===
        YT.PlayerState.PLAYING
      ) {
        this.pause();
      } else {
        this.play();
      }
    } catch (e) {}
  },

  mute() {
    try {
      if (Lume.state.player.isMuted()) {
        Lume.state.player.unMute();
        Lume.state.muted = false;
      } else {
        Lume.state.player.mute();
        Lume.state.muted = true;
      }

      Lume.ui.setMuteIcon(
        Lume.state.muted
      );
    } catch (e) {}
  },

  speed(v) {
    Lume.state.speed = parseFloat(v);

    try {
      Lume.state.player.setPlaybackRate(
        Lume.state.speed
      );
    } catch (e) {}
  },

  seek(pct) {
    try {
      const d =
        Lume.state.player.getDuration();

      if (d > 0) {
        Lume.state.player.seekTo(
          (pct / 100) * d,
          true
        );
      }
    } catch (e) {}
  },

  load(id) {
    if (!id) return;

    // A new video starts a fresh 30-second timer.
    this.stopAdTimer();
    this.adShowing = false;

    try {
      Lume.state.player.loadVideoById({
        videoId: id,
        startSeconds: 0
      });
    } catch (e) {
      Lume.ui?.showPlayerError(
        "Unable to load this video."
      );
    }
  },

  /*
   * Start the 30-second advertisement timer.
   *
   * The timer only runs while the YouTube video
   * is actually playing.
   */
  startAdTimer() {
    this.stopAdTimer();

    if (this.adShowing) {
      return;
    }

    this.adTimer = window.setTimeout(() => {
      this.adTimer = null;

      if (!Lume.state.playing) {
        return;
      }

      if (this.adShowing) {
        return;
      }

      this.showInterstitial();

    }, 30000);
  },

  /*
   * Stop the current advertisement timer.
   */
  stopAdTimer() {
    if (this.adTimer !== null) {
      window.clearTimeout(this.adTimer);
      this.adTimer = null;
    }
  },

  /*
   * Called after the native AdMob interstitial
   * has been dismissed.
   *
   * Only resumes the video if it was playing
   * before the advertisement.
   */
  resumeAfterAd() {
    const shouldResume =
      Lume.state.adWasPlaying === true;

    Lume.state.adWasPlaying = false;

    this.adShowing = false;

    if (!shouldResume) {
      return;
    }

    // Start a fresh 30-second period after the ad.
    this.startAdTimer();

    this.play();
  },

  /*
   * Pause the current YouTube video and show
   * the native AdMob interstitial.
   */
  async showInterstitial() {
    if (!Lume.state.ready) {
      return;
    }

    if (this.adShowing) {
      return;
    }

    try {
      const state =
        Lume.state.player.getPlayerState();

      const wasPlaying =
        state === YT.PlayerState.PLAYING;

      if (!wasPlaying) {
        return;
      }

      const capacitor =
        window.Capacitor;

      const plugins =
        capacitor?.Plugins;

      const mediaPlugin =
        plugins?.LumeMusicMedia;

      if (!mediaPlugin?.showInterstitial) {
        console.warn(
          "LumeMusic interstitial plugin is not available."
        );

        /*
         * Do not pause the video if the native
         * interstitial is unavailable.
         */
        this.startAdTimer();
        return;
      }

      /*
       * Check whether an interstitial is already
       * loaded before pausing the YouTube video.
       */
      let ready = false;

      if (mediaPlugin.isReady) {
        try {
          ready = await mediaPlugin.isReady();
        } catch (e) {
          ready = false;
        }
      }

      /*
       * If no ad is ready, keep the music playing.
       * The native side will preload another ad.
       */
      if (!ready) {
        console.log(
          "LumeMusic interstitial is not ready yet."
        );

        this.startAdTimer();
        return;
      }

      /*
       * Remember the actual playback state before
       * opening the advertisement.
       */
      Lume.state.adWasPlaying = true;

      this.adShowing = true;

      /*
       * Pause the actual YouTube IFrame player.
       */
      this.pause();

      /*
       * Show the native fullscreen AdMob ad.
       */
      await mediaPlugin.showInterstitial();

    } catch (e) {
      console.error(
        "Unable to show LumeMusic interstitial:",
        e
      );

      /*
       * Never leave the YouTube player stuck
       * paused if the ad could not be shown.
       */
      const shouldResume =
        Lume.state.adWasPlaying === true;

      Lume.state.adWasPlaying = false;
      this.adShowing = false;

      if (shouldResume) {
        this.play();
        this.startAdTimer();
      }
    }
  }
};
