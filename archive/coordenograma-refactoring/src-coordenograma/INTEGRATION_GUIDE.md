# Quick Integration Guide

## File Overview

After refactoring, the coordenograma module consists of:

```
src/coordenograma/
├── coordenograma.css           (331 lines) - All styling
├── coordenograma.js            (2789 lines) - All JavaScript logic
├── coordenograma-template.html (518 lines) - HTML structure
├── README.md                   (210 lines) - Full documentation
├── INTEGRATION_GUIDE.md        (this file)
└── REFACTORING_REPORT.txt      (verification report)
```

**Total Size:** 752 KB (uncompressed) | ~185 KB (gzipped)

## What Changed

### Before (Original)
- Single 3612-line HTML file
- All CSS inline in `<style>` tag
- All JavaScript inline in `<script>` tag
- Author attribution: "Eng. Eletricista Fagner Luiz"
- Company branding: "FL Volts Engenharia"
- Gold colors: #D6A936, #d8b84f

### After (Refactored)
- Separated into 3 files (HTML + CSS + JS)
- External stylesheets and scripts
- Rebranded to "Relaytester"
- Project color scheme (--orange #fb923c)
- Ready for React integration or standalone deployment

## How to Use

### Option 1: Standalone (Simplest)

Just open the HTML file in a browser:
```bash
# Option A: Direct file open
open src/coordenograma/coordenograma-template.html

# Option B: Local server
python -m http.server 8000
# Visit http://localhost:8000/src/coordenograma/coordenograma-template.html
```

### Option 2: React iframe (Recommended)

Add to your React component:

```jsx
// pages/CoordenogramaPage.jsx
import React from 'react';

export default function CoordenogramaPage() {
  return (
    <iframe
      src="/coordenograma/coordenograma-template.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block'
      }}
      title="Coordenograma"
    />
  );
}
```

Then in your router:
```jsx
import CoordenogramaPage from './pages/CoordenogramaPage';

// Add route
<Route path="/coordenograma" element={<CoordenogramaPage />} />
```

### Option 3: Web Component (Advanced)

Load and access the module directly:

```jsx
import React, { useEffect, useRef } from 'react';

export default function CoordenogramaApp() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Load external script
    const script = document.createElement('script');
    script.src = '/coordenograma/coordenograma.js';
    script.onload = () => {
      if (window.CoordenogramaApp) {
        window.CoordenogramaApp.initModel();
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div ref={containerRef} id="coordenograma-root">
      {/* Content rendered by coordenograma.js */}
    </div>
  );
}
```

## Deployment

### Static Files Serving

For production, ensure these files are served with proper MIME types:

```nginx
# nginx example
location /coordenograma/ {
  alias /var/www/app/src/coordenograma/;
  
  location ~ \.js$ {
    add_header Content-Type application/javascript;
  }
  
  location ~ \.css$ {
    add_header Content-Type text/css;
  }
  
  location ~ \.html$ {
    add_header Content-Type text/html;
  }
}
```

### For Vite (Current Project)

Files in `src/coordenograma/` are automatically served as public assets when using Vite. No additional configuration needed.

Access via: `http://localhost:5173/coordenograma/coordenograma-template.html`

## API Reference

The module exports these functions via `window.CoordenogramaApp`:

```javascript
// Initialize the application
CoordenogramaApp.initModel()

// Perform calculations
CoordenogramaApp.calcular()
CoordenogramaApp.calcData()
CoordenogramaApp.calcAuto()

// State management
CoordenogramaApp.loadState(jsonData)  // Load from JSON
CoordenogramaApp.saveState()          // Export as JSON
CoordenogramaApp.exportXLS()          // Generate Excel report
```

## Troubleshooting

### CSS not loading (unstyled page)
- Ensure `coordenograma.css` is in the same folder as HTML
- Check browser DevTools Network tab for 404 errors
- For iframe: ensure relative paths work with your server config

### JavaScript not running
- Ensure `coordenograma.js` is in the same folder as HTML
- Check Console (F12) for errors
- Verify `window.CoordenogramaApp` is available after script loads

### Canvas rendering issues
- Some older browsers don't support HTML5 Canvas
- Check browser console for WebGL errors
- Ensure JavaScript is enabled

### Cross-Origin Issues (iframe)
- If embedding from different domain, set CORS headers
- Use localhost for development (no CORS issues)
- Production may require `Access-Control-Allow-Origin` headers

## File Placement

```
Relaytester Project Structure:
├── src/
│   ├── coordenograma/          ← New module
│   │   ├── coordenograma.css
│   │   ├── coordenograma.js
│   │   ├── coordenograma-template.html
│   │   ├── README.md
│   │   └── INTEGRATION_GUIDE.md
│   ├── App.jsx
│   ├── main.jsx
│   └── ...
├── public/
│   └── (static files)
├── CLAUDE.md
└── package.json
```

When deploying, ensure the entire `coordenograma/` folder is copied to your server's static assets directory.

## Next Steps

1. **Test locally** - Open HTML in browser or via Vite dev server
2. **Choose integration method** - iframe (easiest) or web component (advanced)
3. **Add to your app** - Follow the React example above
4. **Test in production** - Verify all assets load correctly
5. **Monitor** - Check browser console for any runtime errors

## Support

- Full documentation: See `README.md` in this directory
- Original author: Eng. Eletricista Fagner Luiz (FL Volts Engenharia)
- Refactored for: Relaytester project
- Date: 2026-06-02

## License

Original coordenograma © FL Volts Engenharia
Refactored version for Relaytester © 2026
