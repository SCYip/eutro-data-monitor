# Local Development Setup

## Running the Project Locally

### Step 1: Start the Backend Server

Open a terminal and run:
```bash
node server.js
```

The server will start on `http://localhost:3000`

### Step 2: Start Netlify Dev Server

Open another terminal and run:
```bash
netlify dev
```

The frontend will be available at `http://localhost:8888`

### How It Works

- The `netlify.toml` file is configured to proxy `/api/*` requests to `http://localhost:3000`
- When you make API calls from the frontend, they'll be automatically forwarded to your local backend
- Both servers need to be running simultaneously

### Troubleshooting

**Error: "Proxying to https://your_backend_url"**
- Make sure your backend server is running on port 3000
- Check that `netlify.toml` has the correct localhost URL

**Error: "Cannot connect to backend"**
- Verify the backend is running: `curl http://localhost:3000/api/user`
- Check that port 3000 is not being used by another application

### For Production Deployment

1. Deploy your backend to Railway/Render/etc.
2. Update `netlify.toml` to use your production backend URL
3. Or set `API_BASE_URL` environment variable in Netlify Dashboard

