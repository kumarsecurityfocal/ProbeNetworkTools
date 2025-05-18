
# 🧪 ProbeOps Frontend-Backend Integration Debug Summary (May 18, 2025)

## 📌 Summary

ProbeOps frontend appears functional **even when the backend is down**, causing **misleading UI behavior** like:
- Fake login success
- Dashboards loading without real API data
- Many pages failing with 404s due to missing backend routes

---

## ✅ Working Pages

| Page                | Status     | Notes                                      |
|---------------------|------------|--------------------------------------------|
| Dashboard           | ✅ OK       | Some static content rendered from mock data |
| Diagnostic          | ✅ OK       | Basic probe data fetches work               |
| Reports             | ✅ OK       | Likely cached or uses minimal backend       |
| Subscription Page   | 🟡 Partial | Appears but some dynamic parts may fail     |

---

## ❌ Failing Pages and Errors

| Page                       | Issue                                                                      |
|----------------------------|-----------------------------------------------------------------------------|
| Schedule Probe             | ❌ "Error: The requested resource was not found"                            |
| API Tokens Page            | ❌ Failed to load/create API tokens - `404 Not Found`                       |
| Admin Panel (Users/Tiers)  | ❌ User creation fails, tier updates fail - `404`                           |
| Probe Management           | ❌ Blank screen, dev tools show `Request failed with status code 404`       |
| Troubleshooting Page       | ❌ Toggle debug gives `Failed to toggle debug mode`                         |
| Database Admin             | ❌ `Failed to fetch tables` - `404`                                         |

---

## 🔍 Root Cause

### ❗ Fake Working UI When Backend is Down
- Frontend **does not talk directly to FastAPI (port 8000)**.
- Instead, it talks to `server.js` (Express) via `window.location.origin/api/...`
- **Express server is returning mock or partial responses**, giving the illusion of a working system.

### ❌ Incomplete Forwarding in `server.js`
- Only selected routes are proxied to FastAPI backend.
- Missing endpoints like `/api/tokens`, `/api/probes`, `/api/admin/users`, etc., are not forwarded.
- Hence: 404 errors on those requests.

---

## 🔧 Recommended Fix

### 1. Add API Proxy in `server.js`

Update `server.js` to **forward all /api requests** to FastAPI backend on `localhost:8000`:

```js
app.use("/api", createProxyMiddleware({
  target: "http://localhost:8000",
  changeOrigin: true,
  pathRewrite: {
    "^/api": "", // remove /api prefix
  },
}));
```

Make sure `http-proxy-middleware` is installed:
```bash
npm install http-proxy-middleware
```

### 2. Ensure NGINX Routes All /api to Express (Not Directly to FastAPI)

In `nginx.conf`, confirm:

```nginx
location /api/ {
  proxy_pass http://probeops-backend:8000; # or to Express if routing through Node
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

Or if routing through `server.js`:
```nginx
location /api/ {
  proxy_pass http://probeops-server:5000; # Express port
}
```

### 3. Rebuild Frontend After All Fixes

```bash
cd frontend
npm run build
```

And ensure the contents of `frontend/dist/` are copied into the correct `public/` folder mounted by NGINX.

---

## 🔁 Dev Tip: Docker Rebuild Triggers

Every time you rebuild using `./deploy.sh`, make sure to:
- Confirm FastAPI backend is reachable on `localhost:8000`
- Restart the Express container to reload any updated proxy rules
- Clear browser localStorage if stale tokens exist

---

## 📎 Attached Files & Logs Reviewed
- `docker-compose.yml`
- `nginx.conf`
- `server.js`
- `api.js`
- Backend container logs (probeops-backend)
- HAR network trace: `probeops.com.har`

---

## ✅ Status Tracker (May 18, 2025)

| Component          | Status         |
|--------------------|----------------|
| Frontend Build     | ✅ Successful   |
| FastAPI Backend    | ✅ Running on :8000 |
| NGINX              | ✅ Running with SSL |
| Proxy (Express)    | 🟡 Partially working |
| Authentication     | ✅ Fixed for admin login |
| API Pages          | ❌ Still returning 404 on direct backend routes |

---

## 📬 Next Steps

- [ ] Apply full proxy middleware fix to `server.js`
- [ ] Rebuild containers
- [ ] Validate `/api/tokens`, `/api/probes`, `/api/admin/users`
- [ ] Enable debug flags for better backend trace
- [ ] Optional: Consider direct frontend→FastAPI communication if Express is not adding value

---

Built with ❤️ by [Ignited Minds / ProbeOps Team]
