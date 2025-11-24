# Deployment Guide for Netlify

## Problem
Netlify only serves static files and doesn't run Node.js servers. Your API endpoints (`/api/*`) need a backend server.

## Solution: Deploy Backend Separately

### Step 1: Deploy Backend Server

Deploy your `server.js` to a service that supports Node.js:

**Option A: Railway (Recommended - Free tier available)**
1. Go to https://railway.app
2. Create a new project
3. Connect your GitHub repository
4. Add a new service → Deploy from GitHub repo
5. Set the root directory to your project root
6. Railway will auto-detect Node.js and run `node server.js`
7. Copy the generated URL (e.g., `https://your-app.railway.app`)

**Option B: Render (Free tier available)**
1. Go to https://render.com
2. Create a new Web Service
3. Connect your repository
4. Set:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Copy the service URL

**Option C: Heroku**
1. Follow Heroku's Node.js deployment guide
2. Deploy and get your app URL

### Step 2: Update Netlify Configuration

1. Open `netlify.toml`
2. Replace `YOUR_BACKEND_URL` with your actual backend URL
3. Example:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://your-app.railway.app/api/:splat"
     status = 200
     force = true
   ```

### Step 3: Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Netlify will automatically use the `netlify.toml` configuration
4. Your API calls will be proxied to your backend server

## Alternative: Use Environment Variables

If you prefer to set the backend URL via Netlify's environment variables:

1. In Netlify dashboard → Site settings → Environment variables
2. Add: `API_BASE_URL` = `https://your-backend.railway.app`
3. The frontend code will automatically use this via `window.API_BASE_URL`

## Testing

After deployment:
- Frontend: Your Netlify URL (e.g., `https://your-site.netlify.app`)
- Backend: Your backend URL (e.g., `https://your-app.railway.app`)
- API calls from frontend will be proxied to backend automatically

