// LumeMusic config
window.Lume = window.Lume || {};

// Keep your existing key here. For production, restrict this key in Google Cloud
// to the YouTube Data API and the domains that are allowed to use it.
Lume.API_KEY = "AIzaSyAPEm48C6esQJarR5ZW9utfUzwbj_ZBMqM";

Lume.state = {
  player: null,
  ready: false,
  videoId: null,
  playing: false,
  muted: false,
  speed: 1,
  dragging: false,
  pending: null,
  hideTimer: null,
  details: null,
  channelId: null,
  channel: null,
  raf: null,
  lastTick: 0,
  progressTicking: false,
  activeModal: null,
  artistRequestSeq: 0
};
