window.Lume = window.Lume || {};

// Small in-memory caches keep profile/about scrolling and repeat clicks fast.
Lume.cache = new Map();
Lume.channelCache = new Map();
Lume.channelVideosCache = new Map();
Lume.channelAlbumsCache = new Map();
Lume.albumVideosCache = new Map();

Lume.api = {
  _checkKey() {
    if (!Lume.API_KEY || Lume.API_KEY === "YOUR_API_KEY_HERE") {
      throw new Error("Add your YouTube API key in js/config.js");
    }
  },

  async _get(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data?.error?.message || `YouTube API error (${res.status})`);
    }
    return data;
  },

  async _search(params) {
    this._checkKey();
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("videoCategoryId", "10");
    url.searchParams.set("key", Lume.API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const data = await this._get(url);
    return data.items || [];
  },

  async trending(max = 24) {
    return this._search({
      q: "official music video",
      maxResults: Math.min(max, 50),
      order: "viewCount"
    });
  },

  async latest(max = 24) {
    return this._search({
      q: "official music video",
      maxResults: Math.min(max, 50),
      order: "date"
    });
  },

  async search(query, max = 24) {
    return this._search({
      q: query,
      maxResults: Math.min(max, 50),
      order: "relevance"
    });
  },

  async details(id) {
    if (!id) return null;
    if (Lume.cache.has(id)) return Lume.cache.get(id);
    this._checkKey();
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", id);
    url.searchParams.set("key", Lume.API_KEY);
    const data = await this._get(url);
    const item = data.items?.[0] || null;
    if (item) Lume.cache.set(id, item);
    return item;
  },

  // Artist/channel profile data.
  async channel(channelId) {
    if (!channelId) return null;
    if (Lume.channelCache.has(channelId)) return Lume.channelCache.get(channelId);
    this._checkKey();
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "snippet,statistics,brandingSettings,contentDetails");
    url.searchParams.set("id", channelId);
    url.searchParams.set("key", Lume.API_KEY);
    const data = await this._get(url);
    const item = data.items?.[0] || null;
    if (item) Lume.channelCache.set(channelId, item);
    return item;
  },

  // Load the artist's complete upload feed through the channel uploads playlist.
  // This avoids the expensive search endpoint pagination and gives the profile every upload.
  async channelVideos(channelId, max = 500) {
    if (!channelId) return [];
    const cacheKey = `${channelId}:all:${max}`;
    if (Lume.channelVideosCache.has(cacheKey)) return Lume.channelVideosCache.get(cacheKey);
    this._checkKey();

    const channel = await this.channel(channelId);
    const uploadsId = channel?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return [];

    const items = [];
    let pageToken = "";
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("playlistId", uploadsId);
      url.searchParams.set("maxResults", "50");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      url.searchParams.set("key", Lume.API_KEY);
      const data = await this._get(url);
      for (const item of (data.items || [])) {
        const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
        if (!videoId) continue;
        items.push({
          id: { videoId },
          snippet: item.snippet || {},
          contentDetails: item.contentDetails || {}
        });
        if (items.length >= max) break;
      }
      pageToken = items.length >= max ? "" : (data.nextPageToken || "");
    } while (pageToken);

    Lume.channelVideosCache.set(cacheKey, items);
    return items;
  },

  // YouTube albums are represented by playlists on an artist channel.
  async channelAlbums(channelId, max = 50) {
    if (!channelId) return [];
    if (Lume.channelAlbumsCache.has(channelId)) return Lume.channelAlbumsCache.get(channelId);
    this._checkKey();
    const items = [];
    let pageToken = "";
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("channelId", channelId);
      url.searchParams.set("maxResults", "50");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      url.searchParams.set("key", Lume.API_KEY);
      const data = await this._get(url);
      items.push(...(data.items || []));
      pageToken = items.length >= max ? "" : (data.nextPageToken || "");
    } while (pageToken);
    const result = items.slice(0, max);
    Lume.channelAlbumsCache.set(channelId, result);
    return result;
  },

  async albumVideos(playlistId, max = 200) {
    if (!playlistId) return [];
    if (Lume.albumVideosCache.has(playlistId)) return Lume.albumVideosCache.get(playlistId);
    this._checkKey();
    const items = [];
    let pageToken = "";
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("playlistId", playlistId);
      url.searchParams.set("maxResults", "50");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      url.searchParams.set("key", Lume.API_KEY);
      const data = await this._get(url);
      for (const item of (data.items || [])) {
        const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
        if (!videoId) continue;
        items.push({ id: { videoId }, snippet: item.snippet || {}, contentDetails: item.contentDetails || {} });
        if (items.length >= max) break;
      }
      pageToken = items.length >= max ? "" : (data.nextPageToken || "");
    } while (pageToken);
    Lume.albumVideosCache.set(playlistId, items);
    return items;
  }
};
