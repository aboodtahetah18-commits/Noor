# Auth TypeScript Build Fix — 0.42.9

Fixed the single Netlify build blocker in `src/lib/auth/auth.ts`: the Neon Pool `error` event parameter now has an explicit typed shape. No authentication runtime behavior changed from 0.42.8.
