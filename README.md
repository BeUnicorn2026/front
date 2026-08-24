# Voice Partition Frontend

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:3000` and proxies `/api` to `http://localhost:3001`.

To use another backend:

```bash
VOICE_PARTITION_API_ORIGIN=http://localhost:3001 npm run dev
```

```bash
npm test
npm run build
npm run preview
```
