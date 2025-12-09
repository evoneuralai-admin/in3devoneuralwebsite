# Firebase Deployment Fix Guide

This guide covers the fixes applied to ensure the Create Page works flawlessly on both localhost and deployed Firebase environment.

## Changes Made

### 1. Firebase Functions - Meshy API Integration

Added Meshy AI API proxy endpoints to Firebase Functions to handle CORS and secure API key management:

- **POST `/meshy/generate`** - Generate 3D assets via Meshy API
- **GET `/meshy/status/:taskId`** - Check generation status
- **GET `/meshy/task/:taskId`** - Alias for status endpoint

### 2. Meshy API Service Updates

Updated `meshyApiService.ts` to:
- Automatically use Firebase Functions proxy in production
- Fall back to direct API calls in development (if API key is available)
- Handle both proxy and direct API response structures
- Improve error handling for proxy responses

### 3. Environment Variable Configuration

#### Firebase Functions Secrets

The following secrets need to be configured in Firebase:

```bash
# Set BlockadeLabs API key
firebase functions:secrets:set BLOCKADE_API_KEY

# Set Meshy API key
firebase functions:secrets:set MESHY_API_KEY

# Set Razorpay credentials (if not already set)
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

#### Client Environment Variables

For the client build, set these in Firebase Hosting environment variables or `.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=in3devoneuralai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=in3devoneuralai
VITE_FIREBASE_STORAGE_BUCKET=in3devoneuralai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=708037023303
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# API Configuration
VITE_API_BASE_URL=https://us-central1-in3devoneuralai.cloudfunctions.net/api

# Optional: Meshy API Key (for direct calls in development)
# In production, the proxy will be used automatically
VITE_MESHY_API_KEY=your_meshy_api_key_here

# Optional: Force proxy usage
VITE_USE_MESHY_PROXY=true
```

## Deployment Steps

### 1. Set Firebase Functions Secrets

```bash
# Navigate to functions directory
cd functions

# Set each secret (you'll be prompted to enter the value)
firebase functions:secrets:set BLOCKADE_API_KEY
firebase functions:secrets:set MESHY_API_KEY
```

### 2. Build and Deploy Functions

```bash
# Build functions
cd functions
npm run build

# Deploy functions
firebase deploy --only functions
```

### 3. Configure Client Environment Variables

#### Option A: Using Firebase Hosting Environment Variables

1. Go to Firebase Console → Hosting → Environment Variables
2. Add all `VITE_*` variables listed above

#### Option B: Using .env file (for local development)

1. Create `.env` file in `server/client/` directory
2. Add all environment variables
3. Rebuild the client: `npm run build`

### 4. Build and Deploy Client

```bash
# Navigate to client directory
cd server/client

# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Verification

### 1. Check Environment Configuration

Visit: `https://us-central1-in3devoneuralai.cloudfunctions.net/api/env-check`

Expected response:
```json
{
  "environment": "production",
  "firebase": true,
  "blockadelabs": true,
  "meshy": true,
  "razorpay": true,
  ...
}
```

### 2. Test Skybox Generation

1. Navigate to Create Page (`/main`)
2. Enter a prompt
3. Select a style
4. Click Generate
5. Verify generation completes successfully

### 3. Test Meshy 3D Asset Generation

1. Navigate to Create Page
2. Enter a prompt that includes 3D objects
3. Enable 3D asset generation
4. Click Generate
5. Verify asset generation completes successfully

## Troubleshooting

### Issue: "BlockadeLabs API not configured"

**Solution:**
```bash
firebase functions:secrets:set BLOCKADE_API_KEY
firebase deploy --only functions
```

### Issue: "Meshy API not configured"

**Solution:**
```bash
firebase functions:secrets:set MESHY_API_KEY
firebase deploy --only functions
```

### Issue: CORS errors when calling Meshy API

**Solution:** The proxy endpoints should handle CORS automatically. If you still see CORS errors:
1. Verify the proxy endpoints are deployed
2. Check that `VITE_USE_MESHY_PROXY=true` is set
3. Clear browser cache and try again

### Issue: Environment variables not loading in production

**Solution:**
1. Verify variables are set in Firebase Hosting environment variables
2. Rebuild the client: `npm run build`
3. Redeploy: `firebase deploy --only hosting`

### Issue: API calls failing with 404

**Solution:**
1. Verify Firebase Functions are deployed: `firebase deploy --only functions`
2. Check the API base URL is correct in environment variables
3. Verify the endpoint paths match in both client and functions

## API Endpoints

### Skybox Endpoints
- `POST /api/skybox/generate` - Generate skybox
- `GET /api/skybox/status/:generationId` - Check status
- `GET /api/skybox/styles` - Get available styles

### Meshy Endpoints (New)
- `POST /api/meshy/generate` - Generate 3D asset
- `GET /api/meshy/status/:taskId` - Check generation status
- `GET /api/meshy/task/:taskId` - Alias for status

### Proxy Endpoints
- `GET /api/proxy-asset?url=...` - Proxy asset requests (CORS handling)

## Notes

- The Meshy API service automatically uses the Firebase Functions proxy in production
- In development, it will use direct API calls if `VITE_MESHY_API_KEY` is set
- All API keys are stored securely in Firebase Secrets (not exposed to client)
- CORS is handled automatically by Firebase Functions proxy endpoints

