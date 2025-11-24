# Quick Deployment Guide

## The Problem
Netlify only serves static files. Your login and other API calls need a backend server running.

## Solution: Deploy Backend Separately

### Step 1: Deploy Backend to Railway (Easiest - Free)

1. **Go to Railway**: https://railway.app
2. **Sign up** with GitHub
3. **Create New Project** → Deploy from GitHub repo
4. **Select your repository**
5. **Railway will auto-detect Node.js** - it will run `node server.js` automatically
6. **Copy the generated URL** (e.g., `https://your-app.railway.app`)

### Step 2: Update Netlify Configuration

1. Open `netlify.toml`
2. Uncomment the redirect section
3. Replace `YOUR_BACKEND_URL` with your Railway URL:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://your-app.railway.app/api/:splat"
     status = 200
     force = true
   ```

### Step 3: Redeploy

1. Commit and push your changes
2. Netlify will automatically redeploy
3. Your API calls will now work!

## Alternative: Use Environment Variable

Instead of hardcoding the URL in `netlify.toml`, you can:

1. In Netlify Dashboard → Site settings → Environment variables
2. Add: `API_BASE_URL` = `https://your-backend.railway.app`
3. The frontend code will automatically use this

## Testing

- **Frontend**: Your Netlify URL (e.g., `https://your-site.netlify.app`)
- **Backend**: Your Railway URL (e.g., `https://your-app.railway.app`)
- **API calls**: Will be automatically proxied from Netlify to Railway

## Important Notes

- Make sure your `database.json` is committed to your repo (Railway will use it)
- The backend server needs to be running 24/7 (Railway free tier allows this)
- CORS is already configured in `server.js` to accept requests from any origin

