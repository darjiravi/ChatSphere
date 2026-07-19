# ChatSphere — Real-Time Chat App (MERN)

A simple, real-time one-to-one chat application built with MongoDB, Express, React, Node.js, Tailwind CSS, and Socket.IO.

## Features
- Register / Login with a **unique username** (no phone number) + secure session-based auth (bcrypt + express-session + MongoDB session store)
- Real-time messaging with Socket.IO — **no page refresh needed**
- Full CRUD on messages: create (send), read (conversation history), update (edit), delete
- Online/offline status and a typing indicator
- Unread message badges per contact
- Clean, professional blue & off-white UI built with Tailwind CSS

## Tech Stack
- **Frontend:** React (Vite), React Router, Tailwind CSS, Socket.IO client, Axios
- **Backend:** Node.js, Express, Mongoose, Socket.IO, express-session + connect-mongo, bcryptjs
- **Database:** MongoDB

## Project Structure
```
chat-app/
  server/     # Express API + Socket.IO server
  client/     # React + Vite frontend
```

## Prerequisites
- Node.js 18+
- A running MongoDB instance (local install or MongoDB Atlas)

## Setup

### 1. Backend
```bash
cd server
cp .env.example .env
# edit .env: set MONGO_URI, SESSION_SECRET, CLIENT_URL
npm install
npm run dev        # starts on http://localhost:5000
```

### 2. Frontend
```bash
cd client
cp .env.example .env
# edit .env if your API isn't on http://localhost:5000
npm install
npm run dev         # starts on http://localhost:5173
```

Open http://localhost:5173, register two different accounts (e.g. in two browser windows/incognito), and start chatting — messages appear instantly on both sides without refreshing.

## Deployment

The most common cause of "works locally, breaks in production" for this kind of app is the
session cookie: browsers apply much stricter rules to cookies once the frontend and backend
live on different domains. Follow these steps in order.

### 1. Create a MongoDB Atlas database (if you haven't)
1. Go to https://www.mongodb.com/cloud/atlas, create a free (M0) cluster.
2. Database Access → add a database user with a password.
3. Network Access → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`). Your host's
   servers use dynamic IPs, so anything narrower will randomly fail to connect.
4. Get your connection string (Connect → Drivers) — it looks like:
   `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/chat-app`

### 2. Deploy the backend (example: Render — Railway/Fly work the same way)
1. Push this repo to GitHub.
2. On Render: New → Web Service → connect the repo, root directory `server`.
3. Build command: `npm install`  ·  Start command: `npm start`
4. Add environment variables in the dashboard (**not** in a committed `.env` file):
   ```
   MONGO_URI      = <your Atlas connection string>
   SESSION_SECRET = <a long random string>
   CLIENT_URL     = <your deployed frontend URL, no trailing slash>
   NODE_ENV       = production
   ```
5. Deploy. Confirm it's alive: visit `https://your-backend.onrender.com/api/health` → should
   return `{"status":"ok"}`.

### 3. Deploy the frontend (example: Vercel/Netlify)
1. Root directory `client`. Build command `npm run build`, output dir `dist`.
2. Environment variable: `VITE_API_URL = https://your-backend.onrender.com`
3. Deploy, then copy the final frontend URL.

### 4. Connect the two
Go back to the backend's environment variables and set `CLIENT_URL` to the **exact** frontend
URL from step 3 (protocol + domain, no trailing slash), then redeploy the backend so CORS and
cookies are scoped to the right origin.

### Why "works on localhost, fails when deployed" almost always happens
| Symptom | Cause | Fix |
|---|---|---|
| Login succeeds (200 OK) but `/api/auth/me` immediately returns 401 | Cookie isn't being sent back cross-site | Backend must set `sameSite: "none"` + `secure: true` in production (already handled — see `server.js`), and the frontend must call the API with `axios`'s `withCredentials: true` (already set in `client/src/api/axios.js`) |
| Cookie never gets set at all, even though the response looks fine | Host sits behind a reverse proxy, so Express doesn't see the request as HTTPS | `app.set("trust proxy", 1)` — already added in `server.js` |
| `CORS policy: No 'Access-Control-Allow-Origin'` in the browser console | `CLIENT_URL` on the backend doesn't exactly match the frontend's URL (missing/extra trailing slash, http vs https, wrong subdomain) | Copy-paste the frontend URL exactly into `CLIENT_URL` and redeploy |
| Socket.IO never connects / stays in a reconnect loop | Same CORS/cookie issue, or the host doesn't support WebSockets on the free tier | Confirm `CLIENT_URL` is correct; most hosts (Render, Railway, Fly) support WebSockets by default, but double-check your specific host's docs |
| `MongoServerError` / connection timeout on the host but not locally | Atlas Network Access list doesn't include the host's IP | Set Atlas Network Access to `0.0.0.0/0` |
| Everything looks right but login "does nothing" | `SESSION_SECRET` or `MONGO_URI` missing/misspelled in the host's env var dashboard | Re-check the exact variable names in step 2 |

### If it's still failing
Open your browser's DevTools → Network tab, retry login, and check:
1. Does the `/api/auth/login` request return **200** with a `Set-Cookie` header?
2. Does the *next* request (e.g. `/api/auth/me`) actually send a `Cookie` header?
If (1) succeeds but (2) has no cookie, it's the cross-site cookie issue above. If (1) itself
fails, check the response body/status and the CORS table above.

## How auth works
On login/register, the server creates an Express session and stores the session ID in an **httpOnly cookie**. The session itself is persisted in MongoDB (via `connect-mongo`), and the same session is shared with Socket.IO so every socket connection is authenticated to a specific user — no JWTs, no tokens in localStorage.

## Notes
- Only 1:1 chat is implemented (no group chat / calls, per requirements).
- CRUD on messages is exposed both over REST (`/api/messages`) and over Socket.IO events (`message:send`, `message:edit`, `message:delete`) — the UI uses the socket events for instant updates.
