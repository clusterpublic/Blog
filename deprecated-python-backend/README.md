# Deprecated Python Backend

This folder contains the **legacy Flask backend** (`index.py`) and the old admin `site/` UI.

The main backend is now the **Express.js app at the repo root** (`server.js`).

## If you still need to run the old Python server

```bash
cd deprecated-python-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn python-dotenv

# From deprecated-python-backend (uses ../.env)
python index.py
# or production:
# gunicorn --bind 0.0.0.0:8000 index:app
```

Do not use this for new features. It is kept for reference and rollback only.
