## Deployment (recommended split)

This repo contains:

- `client/`: Vite + React frontend
- `server/`: Express API backend
- `server/shared/`: shared TypeScript models/schemas used by both

### Frontend (Vercel)

- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`

The frontend makes requests to `/api/*`. Configure Vercel rewrites in `vercel.json`
to forward `/api/*` to your backend URL.

### Backend (Railway — recommended)

Use the standalone repo **`Samuelkato13/SMS-server`** (not this monorepo root).

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start` (runs `node dist/index.js`; set `NODE_ENV=production` in Variables)

See `SMS-server/RAILWAY.md` in that repo for step-by-step Railway setup.

### Backend (other hosts)

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

Set environment variables in your host:

- `DATABASE_URL`: Supabase Transaction Pooler connection string
- `NODE_ENV`: `production`
- `SESSION_SECRET`: long random string

