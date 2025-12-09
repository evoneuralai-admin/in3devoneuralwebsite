# Quick Fix: Start Firebase Emulators

## ❌ Error You're Seeing

```
GET http://localhost:5001/in3devoneuralai/us-central1/api/skybox/styles?page=1&limit=100 
net::ERR_CONNECTION_REFUSED
```

## ✅ Solution

The Firebase Functions emulator is not running. You need to start it before the create page will work.

### Step 1: Open a Terminal

Open a terminal/PowerShell in the project root directory:
```
D:\in3devoneuralwebsite
```

### Step 2: Start Firebase Emulators

Run this command:
```bash
firebase emulators:start
```

### Step 3: Wait for Emulators to Start

You should see output like:
```
✔  functions[api]: http function initialized (http://localhost:5001/in3devoneuralai/us-central1/api).
✔  All emulators ready! It is now safe to connect.
```

### Step 4: Refresh Your Browser

Once you see "All emulators ready!", refresh your browser page. The create page should now work!

## 🔍 Verify It's Working

1. **Check Emulator UI**: Visit http://localhost:4000
2. **Check Functions**: Visit http://localhost:5001/in3devoneuralai/us-central1/api/health
   - Should return: `{"status":"healthy",...}`
3. **Check Styles**: Visit http://localhost:5001/in3devoneuralai/us-central1/api/skybox/styles
   - Should return styles array

## 📝 Development Workflow

**Terminal 1** - Keep Firebase Emulators Running:
```bash
firebase emulators:start
```

**Terminal 2** - Run Client Dev Server:
```bash
cd server/client
npm run dev
```

## 🐛 Troubleshooting

### Port 5001 Already in Use

If you get an error about port 5001 being in use:

1. Find what's using it:
   ```powershell
   netstat -ano | findstr :5001
   ```

2. Kill the process (replace PID with the number from above):
   ```powershell
   taskkill /PID <PID> /F
   ```

3. Try starting emulators again:
   ```bash
   firebase emulators:start
   ```

### Emulators Start But Still Getting Errors

1. Make sure you're using the correct API URL:
   - Should be: `http://localhost:5001/in3devoneuralai/us-central1/api`
   - Check browser console for: `🌐 API Configuration:`

2. Verify `.env.local` has:
   ```env
   VITE_API_BASE_URL=http://localhost:5001/in3devoneuralai/us-central1/api
   VITE_USE_FUNCTIONS_EMULATOR=true
   ```

3. Restart the client dev server after changing `.env.local`

### Functions Not Building

If you see build errors:

1. Build functions manually:
   ```bash
   cd functions
   npm run build
   ```

2. Then start emulators:
   ```bash
   cd ..
   firebase emulators:start
   ```

## ✅ Success Indicators

When everything is working, you should see in the browser console:
- ✅ `🔧 Connected to Functions emulator on localhost:5001`
- ✅ `🌐 API Configuration: {baseURL: 'http://localhost:5001/...', isLocalhost: true}`
- ✅ Styles loading without errors
- ✅ No `ERR_CONNECTION_REFUSED` errors

