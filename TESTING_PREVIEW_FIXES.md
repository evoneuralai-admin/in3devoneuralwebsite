# 🧪 Testing Guide: Preview URL Fixes

## Quick Test Checklist

### ✅ 1. Access Preview URL
1. Open your preview URL (e.g., `https://in3devoneuralai--preview-test-27s4si3k.web.app`)
2. **Clear browser cache first**: Press `Ctrl+Shift+Delete` → Clear cached images and files
3. Or use **Incognito/Private mode** for clean testing

---

## 🔍 Step-by-Step Testing

### **Test 1: Check 3D Generation Styles Loading**

1. **Open Browser DevTools**
   - Press `F12` or `Right-click → Inspect`
   - Go to **Console** tab

2. **Look for these logs:**
   ```
   ✅ Good signs:
   🌅 Fetching skybox styles from API...
   ✅ Skybox styles API response: {success: true, hasData: true, ...}
   ✅ Fetched In3D.Ai styles: [X] styles loaded
   
   ❌ Bad signs:
   ❌ Skybox styles fetch failed
   ⚠️ Preview environment detected - API might be unreachable
   ```

3. **Check Network Tab:**
   - Go to **Network** tab in DevTools
   - Filter by `skybox/styles`
   - Look for request to: `https://us-central1-in3devoneuralai.cloudfunctions.net/api/skybox/styles`
   - Status should be `200 OK`
   - Response should have `success: true` and `data: [...]`

4. **Visual Check:**
   - On the main page, you should see styles loaded in the "IN3D.AI STYLE" section
   - No red error banner saying "Unable to load 3D generation styles"

---

### **Test 2: Check 3D Asset Loading**

1. **Navigate to a page with 3D preview:**
   - Go to `/preview/:jobId` or `/history`
   - Click on a 3D asset to preview

2. **Check Console for:**
   ```
   ✅ Good signs:
   🔄 Loading via proxy: https://us-central1-in3devoneuralai.cloudfunctions.net/api/proxy-asset?url=...
   ✅ Model loaded successfully
   ✅ 3D asset loaded in preview
   
   ❌ Bad signs:
   ❌ Model loading failed
   ⚠️ Strategy failed
   All loading strategies failed
   ```

3. **Visual Check:**
   - 3D model should render in the viewer
   - No error message saying "Failed to load 3D model"
   - Model should be visible and rotatable

---

### **Test 3: Check Skybox Loading**

1. **Navigate to preview scene:**
   - Go to `/preview/:jobId` or main page with skybox

2. **Check Console for:**
   ```
   ✅ Good signs:
   🔄 Loading skybox texture via: [URL]
   ✅ Skybox texture loaded successfully
   
   ❌ Bad signs:
   ⚠️ Skybox loading strategy failed
   All skybox loading strategies failed
   ```

3. **Visual Check:**
   - Skybox should display as background environment
   - No black/empty background
   - Image should wrap around the scene

---

### **Test 4: Check Razorpay Integration**

1. **Navigate to subscription/upgrade page:**
   - Go to `/profile` or click upgrade button

2. **Check Console for:**
   ```
   ✅ Good signs:
   ✅ Razorpay script loaded successfully
   (No errors about Razorpay)
   
   ❌ Bad signs:
   Failed to load Razorpay script
   Razorpay SDK not loaded
   Payment is not available
   ```

3. **Test Payment Flow:**
   - Click on a plan to upgrade
   - Razorpay payment modal should open
   - If it doesn't open, check console for errors

4. **Check Network Tab:**
   - Look for `checkout.razorpay.com/v1/checkout.js` loading
   - Status should be `200 OK`

---

## 🔧 Advanced Debugging

### **Check API Base URL**

In browser console, run:
```javascript
// Check current API base URL
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'Using default');

// Check if preview environment
console.log('Is Preview:', window.location.hostname.includes('--'));

// Check axios base URL
import api from './config/axios';
console.log('Axios Base URL:', api.defaults.baseURL);
```

### **Test API Endpoints Directly**

In browser console:
```javascript
// Test skybox styles endpoint
fetch('https://us-central1-in3devoneuralai.cloudfunctions.net/api/skybox/styles?page=1&limit=20')
  .then(r => r.json())
  .then(data => console.log('✅ Styles API:', data))
  .catch(err => console.error('❌ Styles API Error:', err));
```

### **Check Authentication**

In browser console:
```javascript
// Check if user is authenticated
import { auth } from './config/firebase';
console.log('Current User:', auth.currentUser);
console.log('User Token:', await auth.currentUser?.getIdToken());
```

---

## 📊 Network Tab Checklist

Open **Network** tab and check:

1. **API Calls:**
   - ✅ `/skybox/styles` → Status 200
   - ✅ `/proxy-asset` → Status 200 (when loading 3D assets)
   - ✅ All requests go to `us-central1-in3devoneuralai.cloudfunctions.net`

2. **Asset Loading:**
   - ✅ 3D model files (`.glb`, `.gltf`) load successfully
   - ✅ Skybox images load successfully
   - ✅ No CORS errors

3. **Razorpay:**
   - ✅ `checkout.razorpay.com/v1/checkout.js` loads
   - ✅ Status 200

---

## 🐛 Common Issues & Solutions

### **Issue: Styles not loading**
**Check:**
1. Network tab → Is `/skybox/styles` request successful?
2. Console → Any error messages?
3. Try hard refresh: `Ctrl+F5`

**Solution:**
- Check if API is accessible
- Verify Firebase Functions are deployed
- Check browser console for specific error

### **Issue: 3D assets not loading**
**Check:**
1. Console → Look for loading strategy logs
2. Network tab → Check proxy-asset requests
3. Check if asset URL is valid

**Solution:**
- Verify asset URLs are accessible
- Check CORS settings
- Try direct URL vs proxy URL

### **Issue: Skybox not displaying**
**Check:**
1. Console → Skybox texture loading logs
2. Network tab → Image requests
3. Check if skybox URL is valid

**Solution:**
- Verify skybox image URL
- Check texture loading strategies
- Try different loading method

### **Issue: Razorpay not working**
**Check:**
1. Console → Script loading errors
2. Network tab → Razorpay script request
3. Check environment variables

**Solution:**
- Verify Razorpay key is configured
- Check script loading
- Try in different browser

---

## ✅ Success Criteria

All fixes are working if:

1. ✅ **Styles Load:** No error banner, styles appear in UI
2. ✅ **3D Assets Load:** Models render in preview viewer
3. ✅ **Skybox Displays:** Background environment shows correctly
4. ✅ **Razorpay Works:** Payment modal opens when clicking upgrade
5. ✅ **No Console Errors:** Only informational logs, no red errors
6. ✅ **Network Requests:** All API calls return 200 status

---

## 📝 Testing Checklist

- [ ] Preview URL loads without errors
- [ ] 3D generation styles load successfully
- [ ] No error banner about API configuration
- [ ] 3D assets preview correctly
- [ ] Skybox displays as background
- [ ] Razorpay script loads
- [ ] Payment modal opens
- [ ] All network requests return 200
- [ ] No CORS errors in console
- [ ] Console shows success logs

---

## 🚀 Quick Test Commands

### Test in Browser Console:
```javascript
// 1. Check API base URL
console.log('API:', import.meta.env.VITE_API_BASE_URL || 'default');

// 2. Test styles endpoint
fetch('https://us-central1-in3devoneuralai.cloudfunctions.net/api/skybox/styles')
  .then(r => r.json())
  .then(d => console.log('Styles:', d));

// 3. Check Razorpay
console.log('Razorpay:', window.Razorpay ? 'Loaded' : 'Not loaded');

// 4. Check preview environment
console.log('Preview:', window.location.hostname.includes('--'));
```

---

## 📞 Need Help?

If something doesn't work:
1. **Screenshot the console errors**
2. **Screenshot the Network tab** (filtered by failed requests)
3. **Note the preview URL** you're testing
4. **Check Firebase Functions logs:** `firebase functions:log`

