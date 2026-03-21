# Deployment Guide 🚀

This document covers how to transition BlindVault from a local development environment to a live, scalable production application.

## 1. Backend Deployment

The backend is a standard Node.js Express application that connects to MongoDB. It is highly compatible with platforms like **Render**, **Fly.io**, **Heroku**, or **DigitalOcean**.

### Steps (Example using Render.com):
1. Push your project to a GitHub repository.
2. Create an account on [Render](https://render.com/) or a similar Platform as a Service (PaaS).
3. Select **New Web Service** and link your GitHub repo.
4. Set the **Root Directory** to `backend`.
5. Set the **Build Command** to `npm install`.
6. Set the **Start Command** to `node server.js` (or `npm start`).
7. Create a free MongoDB Atlas cluster and get the connection string.
8. Add the following **Environment Variables** in Render:
   - `PORT`: Automatically set by Render.
   - `MONGO_URI`: `mongodb+srv://<your-creds>...`
9. Deploy! Render will give you a public URL (e.g., `https://blindvault-api.onrender.com`).

---

## 2. Extension Configuration

Before building the extension, you must point it to your new live backend server and silence debugging logs.

1. Open `extension/scripts/config.js`.
2. Change `ENV` to `'production'`.
3. Change `API_URL` to your live API endpoint (e.g., `'https://blindvault-api.onrender.com/api'`).

### Important: CORS & Manifest Permissions
- **Backend:** In `server.js`, you should eventually restrict the `cors()` middleware origin.
- **Manifest:** Open `extension/manifest.json` and change `http://localhost:5000/*` in `host_permissions` to match your live API URL (e.g., `https://blindvault-api.onrender.com/*`).

---

## 3. Packaging & Publishing the Extension

To publish to the Chrome Web Store, you need to compress the `extension` folder into a `.zip` archive.

### Using the Builder Script (Windows)
1. Open PowerShell in the project root (`c:\Users\hp\Documents\NITK\PROJECT`).
2. Run the script: `.\build.ps1`
3. This creates `blindvault-v1.0.0.zip` in the root folder.

### Uploading to Chrome Web Store
1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Click **New Item**.
3. Upload `blindvault-v1.0.0.zip`.
4. Fill out the store listing details, screenshots, and privacy rationale (explain you use `crypto` and `storage`).
5. Submit for Review!
