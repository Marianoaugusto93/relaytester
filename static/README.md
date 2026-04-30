# Static Assets

This directory contains static assets for RelayLab 360.

## Structure

- **`fonts/`** — Custom font files (.woff2, .ttf) if self-hosting beyond Google Fonts
- **`icons/`** — SVG icons, favicon.ico, app icons
- **`images/`** — Diagrams, logos, screenshots, backgrounds
- **`audio/`** — Sound effects for relay operations (coil energize, breaker open/close)

## Usage

In React components, import static assets like:

```jsx
import icon from '../static/icons/relay.svg';

<img src={icon} alt="Relay" />
```

Or reference directly in CSS:
```css
background-image: url('/static/images/background.png');
```

## Notes

- Keep assets optimized (minify SVGs, compress images)
- Audio files should be MP3/OGG for web compatibility
- Fonts should be WOFF2 format for best compression
