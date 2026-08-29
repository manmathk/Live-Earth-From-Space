# ISS Earth Live

A cinematic 3D International Space Station Earth observatory designed for GitHub Pages / Netlify and 24/7 viewing.

## Live data

- **ISS orbit:** CelesTrak GP/TLE for NORAD 25544, propagated in-browser with SGP4 via satellite.js.
- **Camera:** official NASA International Space Station live stream embedded from YouTube.
- **3D Earth:** Three.js with Earth, normal and cloud textures.
- **Telemetry:** altitude, velocity, latitude, longitude, orbital period, orbit count, TLE age and sunlit/night status.
- **Ground track:** live ISS position marker.
- **Location label:** best-effort reverse geocoding via OpenStreetMap Nominatim; it falls back to `OVER OCEAN` when unavailable.

## Important

NASA's official ISS video can show a blue screen during communications handovers. The tracker continues independently, so the visualization does not depend on the camera feed.

The page fetches current orbital elements from CelesTrak every 30 minutes and propagates the satellite locally every second. The external APIs and video provider can change independently of this repository.

## Deploy

No build step is required. Publish the repository root as a static site. GitHub Pages can serve `index.html` directly.

## Sources

- NASA Space Station Views: https://www.nasa.gov/live/
- NASA ISS tracker information: https://www.nasa.gov/spot-the-station/
- CelesTrak ISS data: https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE
