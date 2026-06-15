# Cluster Protocol Blog CMS

Express.js backend + admin UI for blogs, tweets, FAQs, jobs, and creator showcase.

## Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:5001** — manager at `/manager`, editor at `/editor`.

> **Note:** macOS uses port 5000 for AirPlay Receiver, so local dev defaults to **5001**. Set `PORT=8000` in `.env` if you prefer another port.

Environment variables live in `.env` at the repo root (see `.env.example`).

## Tests

```bash
npm run dev          # in one terminal
npm test             # route tests (backend-js-test/)
```

## Project layout

| Path | Purpose |
|------|---------|
| `server.js` | Express entry point |
| `routes/` | API route modules |
| `config/` | MongoDB connection |
| `utils/` | Helpers + blog cache |
| `site/` | Admin UI (white theme) |
| `backend-js-test/` | API route tests |
| `deprecated-python-backend/` | Legacy Flask app (archived) |

## Production

The live API is served from this Node backend (e.g. `blog.server.clusterprotocol.ai`).

The public site frontend is in [`prompt-protocol-frontend`](https://github.com/clusterprotocol/prompt-protocol-frontend) (separate repo).

## Legacy Python backend

See `deprecated-python-backend/README.md`. Not used for new development.




instance at https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1#InstanceDetails:instanceId=i-02e55270619aead73




PORT=8000 pm2 start server.js --name blog-backend
(env is manaully set)