# LumeMusic

LumeMusic is a custom music UI that uses the official YouTube Data API for metadata and the official YouTube IFrame Player API for playback.

## Important production security step

The old browser API key must be considered exposed. **Rotate/revoke that key in Google Cloud** and create a new key before publishing.

For a browser-only deployment:
1. Create a new Google Cloud API key.
2. Enable only the YouTube Data API v3 for the key.
3. Add HTTP referrer/application restrictions for your real LumeMusic domain(s).
4. Put the new restricted key in `js/config.js` as `Lume.API_KEY`.
5. Do not commit an unrestricted key to a public repository.

For stronger production protection, put YouTube Data API requests behind your own server-side proxy and leave `Lume.API_KEY` empty in the browser. Set `Lume.API_BASE` to that proxy's API route.

## YouTube playback safety

LumeMusic uses the official YouTube IFrame Player API. The player keeps YouTube's native controls visible and interactive. LumeMusic does not download, extract, re-host, or bypass YouTube playback.

The app checks video status before embedding and refuses videos marked as non-embeddable instead of attempting to bypass the restriction.

## Quota/request protections

- Search is debounced and ignores one-character queries.
- Search results are cached for 5 minutes.
- Trending/latest feeds are cached for 5 minutes.
- Video details are cached for 30 minutes.
- Channel profiles are cached for 30 minutes.
- Duplicate in-flight requests are deduplicated.
- Artist profiles initially load 50 uploads instead of 500.
- The `All Music Videos` button loads up to 500 uploads only when explicitly requested.
- Albums are loaded only when the Albums tab is opened.
- Album tracks are loaded only when an album is expanded.
- API responses use `fields` to request only data LumeMusic actually needs.

## Run

Use a local HTTPS/HTTP development server rather than `file://`.

## Current structure

```text
LumeMusic/
├── index.html
├── style.css
├── README.md
└── js/
    ├── api.js
    ├── app.js
    ├── config.js
    ├── player.js
    └── ui.js
```

## V6 repair notes
- Restores the V3 visual design outside the YouTube player area.
- Restores `markPlaying()` and keeps `artistSvg()` inside the UI object.
- Does not make an extra `videos.list` request when a user clicks a video; this prevents playback from being blocked by an unnecessary quota/API failure.
- Uses the official YouTube IFrame Player with native controls and no overlay/shield over the player.
- Playback errors are displayed below the player instead of covering YouTube controls.
