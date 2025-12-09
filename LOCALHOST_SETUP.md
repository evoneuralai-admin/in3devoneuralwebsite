# Localhost Development Setup Guide

This guide will help you set up and run the application on localhost.

## Prerequisites

1. **Node.js** (v22 or higher)
2. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Firebase Login**:
   ```bash
   firebase login
   ```

## Step 1: Install Dependencies

### Install Functions Dependencies
```bash
cd functions
npm install
```

### Install Client Dependencies
```bash
cd server/client
npm install
```

## Step 2: Set Up Environment Variables

### For Firebase Functions (Backend)

Create a `.env` file in the `functions/` directory:

```bash
cd functions
touch .env
```

Add your API keys to `functions/.env`:

```env
# BlockadeLabs API Key (required for skybox generation)
BLOCKADE_API_KEY=your_blockadelabs_api_key_here

# Meshy AI API Key (for 3D asset generation)
MESHY_API_KEY=msy_GDVX6JfREmutHSSwrZAh47APqE0JvW4pFxMW

# Razorpay Configuration (optional, for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here
```

**Important:** Get your BlockadeLabs API key from: https://www.blockadelabs.com/

### For Client (Frontend)

Create a `.env.local` file in the `server/client/` directory:

```bash
cd server/client
touch .env.local
```

Add your configuration to `server/client/.env.local`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyBo9VsJMft4Qqap5oUmQowwbjiMQErloqU
VITE_FIREBASE_AUTH_DOMAIN=in3devoneuralai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=in3devoneuralai
VITE_FIREBASE_STORAGE_BUCKET=in3devoneuralai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=708037023303
VITE_FIREBASE_APP_ID=1:708037023303:web:f0d5b319b05aa119288362
VITE_FIREBASE_MEASUREMENT_ID=G-FNENMQ3BMF

# API Configuration - Use localhost for development
VITE_API_BASE_URL=http://localhost:5001/in3devoneuralai/us-central1/api

# Use Firebase Functions Emulator
VITE_USE_FUNCTIONS_EMULATOR=true

# Optional: Meshy AI API Key (for 3D asset generation)
# Note: If not set, will use backend proxy which uses MESHY_API_KEY from functions/.env
VITE_MESHY_API_KEY=msy_GDVX6JfREmutHSSwrZAh47APqE0JvW4pFxMW
```

## Step 3: Install dotenv for Functions (if not already installed)

```bash
cd functions
npm install dotenv --save-dev
```

## Step 4: Update Functions to Load .env File

The functions code will automatically load `.env` file in development. Make sure `dotenv` is installed.

## Step 5: Start Firebase Emulators

From the project root directory:

```bash
# Start all emulators (Functions, Firestore, Auth, Storage)
firebase emulators:start

# Or start only Functions emulator
firebase emulators:start --only functions
```

The emulators will start on:
- **Functions**: http://localhost:5001
- **Firestore**: http://localhost:8080
- **Auth**: http://localhost:9099
- **Storage**: http://localhost:9199
- **Emulator UI**: http://localhost:4000

## Step 6: Start the Client (Frontend)

In a new terminal, from the `server/client/` directory:

```bash
cd server/client
npm run dev
```

The client will start on: http://localhost:3000

## Step 7: Verify Setup

1. **Check Functions Emulator**:
   - Visit: http://localhost:5001/in3devoneuralai/us-central1/api/health
   - Should return: `{"status":"healthy",...}`

2. **Check Environment Variables**:
   - Visit: http://localhost:5001/in3devoneuralai/us-central1/api/env-check
   - Should show: `"blockadelabs": true` if BLOCKADE_API_KEY is set

3. **Check Styles Endpoint**:
   - Visit: http://localhost:5001/in3devoneuralai/us-central1/api/skybox/styles
   - Should return styles array if API key is configured

4. **Test in Browser**:
   - Open: http://localhost:3000
   - Navigate to Create page or Explore page
   - Styles should load in the dropdown/selector

## Troubleshooting

### Issue: "BLOCKADE_API_KEY not found"

**Solution**: Make sure you've created `functions/.env` file with your API key:
```env
BLOCKADE_API_KEY=your_actual_api_key_here
```

### Issue: "Cannot connect to Functions emulator"

**Solution**: 
1. Make sure Firebase emulators are running: `firebase emulators:start`
2. Check that port 5001 is not in use
3. Verify `VITE_USE_FUNCTIONS_EMULATOR=true` in `server/client/.env.local`

### Issue: "Styles not loading"

**Solution**:
1. Check Functions emulator logs for errors
2. Verify BLOCKADE_API_KEY is set correctly in `functions/.env`
3. Test the endpoint directly: http://localhost:5001/in3devoneuralai/us-central1/api/skybox/styles
4. Check browser console for errors

### Issue: "CORS errors"

**Solution**: 
- Make sure you're using `http://localhost:5001` (not `https://`)
- Verify `VITE_API_BASE_URL` in client `.env.local` points to localhost

### Issue: "Firebase Functions not connecting"

**Solution**:
1. Check `server/client/src/config/firebase.ts` - it should connect to emulator in dev mode
2. Verify `VITE_USE_FUNCTIONS_EMULATOR=true` is set
3. Restart both emulators and client

## Quick Start Commands

```bash
# Terminal 1: Start Firebase Emulators
firebase emulators:start

# Terminal 2: Start Client
cd server/client && npm run dev

# Terminal 3: Build Functions (if you make changes)
cd functions && npm run build
```

## Development Workflow

1. **Make changes to Functions**:
   - Edit `functions/src/index.ts`
   - Run `npm run build` in `functions/` directory
   - Emulator will auto-reload

2. **Make changes to Client**:
   - Edit files in `server/client/src/`
   - Vite will auto-reload in browser

3. **View Logs**:
   - Functions logs: Check the terminal running `firebase emulators:start`
   - Client logs: Check browser console

## Next Steps

Once localhost is working:
1. Test skybox generation
2. Test style loading
3. Test 3D asset generation (if Meshy API key is set)
4. Test user authentication

## Notes

- `.env` files are gitignored - never commit them
- Use `.env.example` files as templates
- For production, use Firebase Secrets instead of .env files

