# Voice Partition Frontend

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:3000` and proxies `/api` to `http://localhost:3001`.

Desktop app development uses two terminals:

```bash
npm run dev
npm run desktop:dev
```

The meeting room switches the single desktop window to a narrow portrait layout and keeps it above other applications. The home screen restores the normal window size.

When the backend enables Live Map, the meeting structure panel consumes `livemap-delta` and `livemap-state` messages from the existing live WebSocket and updates the dialogue tree in real time. No frontend environment variable is required; when Live Map is disabled or unavailable, live captions continue normally and the panel simply receives no live structure updates.

To use another backend:

```bash
VOICE_PARTITION_API_ORIGIN=http://localhost:3001 npm run dev
```

Production API origin:

```bash
VITE_API_ORIGIN=https://api.example.com npm run build
```

```bash
npm test
npm run build
npm run preview
```
