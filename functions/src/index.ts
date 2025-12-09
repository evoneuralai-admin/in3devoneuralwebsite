/**
 * Firebase Functions with Blockade Labs SDK Integration
 * Handles skybox generation, status checking, and user management
 */

// Load environment variables from .env file in local development
// This only runs in local development (not in production)
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development') {
  try {
    // Try to load dotenv if available (for local development)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv');
    dotenv.config();
    console.log('✅ Loaded .env file for local development');
  } catch (error) {
    // dotenv not installed or .env file not found - that's okay
    console.log('ℹ️ dotenv not available, using environment variables');
  }
}

import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import Razorpay from 'razorpay';

// Global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin
admin.initializeApp();

const app = express();

// CORS middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined,
    headers: {
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
    }
  });
  
  (req as any).requestId = requestId;
  next();
});

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  { method: 'GET', path: '/skybox/styles' },
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/env-check' },
  { method: 'POST', path: '/skybox/generate' },
  { method: 'GET', path: '/skybox/status' },
  { method: 'GET', path: '/skybox/history' },
  { method: 'POST', path: '/payment/create-order' },
  { method: 'POST', path: '/payment/verify' },
  { method: 'POST', path: '/razorpay/plan/create' },
  { method: 'POST', path: '/subscription/checkout' },
  { method: 'POST', path: '/subscription/create' },
  { method: 'GET', path: '/subscription' },
  { method: 'GET', path: '/subscription/user' },
  { method: 'POST', path: '/user/subscription-status' },
  { method: 'POST', path: '/subscription/sync' },
  { method: 'POST', path: '/subscription/cancel' },
  { method: 'POST', path: '/razorpay/webhook' },
  { method: 'GET', path: '/proxy-asset' },
  { method: 'HEAD', path: '/proxy-asset' },
  { method: 'POST', path: '/meshy/generate' },
  { method: 'GET', path: '/meshy/status' },
  { method: 'GET', path: '/meshy/task' }
];

const isPublicEndpoint = (req: Request) => {
  const isPublic = PUBLIC_ENDPOINTS.some(
    ep => ep.method === req.method && req.path.startsWith(ep.path)
  );
  console.log(`[${(req as any).requestId}] Checking public endpoint: ${req.method} ${req.path} -> ${isPublic}`);
  return isPublic;
};

// Authentication middleware
const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  console.log(`[${requestId}] Auth check for ${req.method} ${req.path}`);
  
  if (isPublicEndpoint(req)) {
    console.log(`[${requestId}] Public endpoint, skipping auth`);
    return next();
  }

  console.log(`[${requestId}] Private endpoint, checking auth`);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'AUTH_REQUIRED', 
      message: 'No token provided',
      requestId: (req as any).requestId 
    });
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ 
      error: 'INVALID_TOKEN', 
      message: 'Invalid or expired token',
      requestId: (req as any).requestId 
    });
  }
};

app.use(authenticateUser);

// Initialize services
let BLOCKADE_API_KEY = '';
let MESHY_API_KEY = '';
let razorpay: Razorpay | null = null;

try {
  BLOCKADE_API_KEY = process.env.BLOCKADE_API_KEY || '';
  if (BLOCKADE_API_KEY) {
    // Clean the API key (remove any invalid characters)
    BLOCKADE_API_KEY = BLOCKADE_API_KEY.replace(/[^\w\-]/g, '');
    console.log('BlockadeLabs API key configured successfully');
  } else {
    console.warn('BLOCKADE_API_KEY not found in environment variables');
  }
} catch (error) {
  console.error('Failed to configure BlockadeLabs API key:', error);
}

try {
  MESHY_API_KEY = process.env.MESHY_API_KEY || '';
  if (MESHY_API_KEY) {
    console.log('✅ Meshy API key configured successfully');
  } else {
    console.warn('⚠️ MESHY_API_KEY not found in environment variables (optional)');
  }
} catch (error) {
  console.error('❌ Failed to configure Meshy API key:', error);
}

try {
  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    console.log('Razorpay initialized successfully');
  } else {
    console.warn('Razorpay credentials not found in environment variables');
  }
} catch (error) {
  console.error('Failed to initialize Razorpay:', error);
}

// Environment check endpoint
app.get('/env-check', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  
  console.log(`[${requestId}] Environment check requested`);
  
      res.json({
      environment: 'production',
      firebase: true,
      blockadelabs: !!BLOCKADE_API_KEY,
      meshy: !!MESHY_API_KEY,
      razorpay: !!razorpay,
      env_debug: {
        blockadelabs_key_length: process.env.BLOCKADE_API_KEY?.length || 0,
        meshy_key_length: process.env.MESHY_API_KEY?.length || 0,
        razorpay_key_length: process.env.RAZORPAY_KEY_ID?.length || 0,
        razorpay_secret_length: process.env.RAZORPAY_KEY_SECRET?.length || 0
      },
      timestamp: new Date().toISOString(),
      requestId
    });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      firebase: true,
      blockadelabs: !!BLOCKADE_API_KEY,
      razorpay: !!razorpay
    },
    requestId
  });
});

// Skybox Styles API
app.get('/skybox/styles', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  
  try {
    console.log(`[${requestId}] Fetching skybox styles, page: ${page}, limit: ${limit}`);
    console.log(`[${requestId}] BLOCKADE_API_KEY configured: ${!!BLOCKADE_API_KEY}, length: ${BLOCKADE_API_KEY?.length || 0}`);
    
    // Try BlockadeLabs API first if API key is available
    if (BLOCKADE_API_KEY) {
      try {
        console.log(`[${requestId}] Attempting to fetch from BlockadeLabs API...`);
        const response = await axios.get('https://backend.blockadelabs.com/api/v1/skybox/styles', {
          headers: {
            'x-api-key': BLOCKADE_API_KEY,
            'Content-Type': 'application/json'
          },
          params: { page, limit },
          timeout: 10000
        });
        
        // Handle different response formats from BlockadeLabs
        let stylesData = response.data;
        if (Array.isArray(stylesData)) {
          // Response is directly an array
          console.log(`[${requestId}] Successfully fetched ${stylesData.length} styles from BlockadeLabs (array format)`);
          
          return res.json({
            success: true,
            data: stylesData,
            styles: stylesData, // Also provide as 'styles' for compatibility
            pagination: {
              page,
              limit,
              total: stylesData.length
            },
            requestId
          });
        } else if (stylesData?.data && Array.isArray(stylesData.data)) {
          // Response has data property
          console.log(`[${requestId}] Successfully fetched ${stylesData.data.length} styles from BlockadeLabs (nested format)`);
          
          return res.json({
            success: true,
            data: stylesData.data,
            styles: stylesData.data, // Also provide as 'styles' for compatibility
            pagination: {
              page,
              limit,
              total: stylesData.data.length,
              ...(stylesData.pagination || {})
            },
            requestId
          });
        } else {
          console.warn(`[${requestId}] Unexpected response format from BlockadeLabs:`, typeof stylesData);
          // Fall through to Firebase fallback
        }
      } catch (error: any) {
        console.error(`[${requestId}] BlockadeLabs API error:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        // Fall through to Firebase fallback
      }
    } else {
      console.warn(`[${requestId}] BLOCKADE_API_KEY not configured, using Firebase fallback`);
    }
    
    // Fallback: Get styles from Firebase
    try {
      const db = admin.firestore();
      const stylesRef = db.collection('skyboxStyles');
      
      // Firestore doesn't support offset, use startAfter for pagination
      // For now, just get all styles (or limit to reasonable number)
      const snapshot = await stylesRef
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      const styles = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`[${requestId}] Successfully fetched ${styles.length} styles from Firebase fallback`);
      
      return res.json({
        success: true,
        data: styles,
        styles: styles, // Also provide as 'styles' for compatibility
        pagination: {
          page,
          limit,
          total: styles.length
        },
        requestId
      });
    } catch (firestoreError: any) {
      console.error(`[${requestId}] Firebase fallback error:`, firestoreError);
      // If Firebase also fails, return empty array with success
      return res.json({
        success: true,
        data: [],
        styles: [],
        pagination: {
          page,
          limit,
          total: 0
        },
        requestId,
        warning: 'Both BlockadeLabs API and Firebase fallback failed. Returning empty styles array.'
      });
    }
  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error fetching skybox styles:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch skybox styles',
      message: error.message || 'Unknown error',
      requestId
    });
  }
});

// Skybox Generation API
app.post('/skybox/generate', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { prompt, style_id, negative_prompt, userId } = req.body;
  
  try {
    console.log(`[${requestId}] Skybox generation requested:`, { prompt, style_id, userId });
    
    if (!BLOCKADE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'BlockadeLabs API not configured',
        requestId
      });
    }
    
    if (!prompt || !style_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt and style_id',
        requestId
      });
    }
    
    // Create generation using BlockadeLabs API
    const response = await axios.post('https://backend.blockadelabs.com/api/v1/skybox', {
      prompt,
      style_id,
      negative_prompt: negative_prompt || '',
      webhook_url: null
    }, {
      headers: {
        'x-api-key': BLOCKADE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const generation = response.data;
    console.log(`[${requestId}] Generation created:`, generation.id);
    
    // Validate generation ID
    if (!generation.id) {
      console.error(`[${requestId}] No generation ID returned from BlockadeLabs API`);
      return res.status(500).json({
        success: false,
        error: 'No generation ID returned from API',
        requestId
      });
    }
    
    // Store generation in Firestore
    const db = admin.firestore();
    const skyboxData: any = {
      generationId: generation.id,
      prompt,
      style_id,
      negative_prompt: negative_prompt || '',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const resolvedUserId = userId || (req as any).user?.uid;
    if (resolvedUserId) {
      skyboxData.userId = resolvedUserId;
    }
    await db.collection('skyboxes').doc(generation.id.toString()).set(skyboxData);
    
    console.log(`[${requestId}] Skybox data stored in Firestore`);
    
    return res.json({
      success: true,
      data: {
        generationId: generation.id,
        status: 'pending',
        ...generation
      },
      requestId
    });
      } catch (error: any) {
      console.error(`[${requestId}] Error generating skybox:`, error);
      
      // Handle specific Blockade Labs API errors
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 403) {
          // Handle quota exceeded or API disabled
          let errorMessage = 'Generation quota exceeded';
          if (data && data.error) {
            if (data.error.includes('used every generation')) {
              errorMessage = 'API quota has been exhausted. Please contact support or try again later.';
            } else if (data.error.includes('generations are disabled')) {
              errorMessage = 'Skybox generation is temporarily disabled. Please try again later.';
            } else {
              errorMessage = data.error;
            }
          }
          
          return res.status(403).json({
            success: false,
            error: errorMessage,
            code: 'QUOTA_EXCEEDED',
            requestId
          });
        }
        
        if (status === 400) {
          return res.status(400).json({
            success: false,
            error: data?.error || 'Invalid request parameters',
            code: 'INVALID_REQUEST',
            requestId
          });
        }
        
        if (status === 401) {
          return res.status(401).json({
            success: false,
            error: 'Invalid API key or authentication failed',
            code: 'AUTH_ERROR',
            requestId
          });
        }
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to generate skybox',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
    }
});

// Skybox Status API
app.get('/skybox/status/:generationId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { generationId } = req.params;
  
  try {
    console.log(`[${requestId}] Checking status for generation: ${generationId}`);
    
    if (!BLOCKADE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'BlockadeLabs API not configured',
        requestId
      });
    }
    
    if (!generationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing generation ID',
        requestId
      });
    }
    
    // Get generation status from BlockadeLabs API
    const response = await axios.get(`https://backend.blockadelabs.com/api/v1/skybox/generations/${generationId}`, {
      headers: {
        'x-api-key': BLOCKADE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const generation = response.data;
    console.log(`[${requestId}] Generation status:`, generation.status);
    
    // Update Firestore with latest status
    const db = admin.firestore();
    const updateData: any = {
      status: generation.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (generation.status === 'complete' && generation.file_url) {
      updateData.fileUrl = generation.file_url;
      updateData.thumbnailUrl = generation.thumbnail_url;
    }
    
    await db.collection('skyboxes').doc(generationId).update(updateData);
    
    return res.json({
      success: true,
      data: generation,
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error checking skybox status:`, error);
    
    // Check if it's a 404 error (generation not found)
    if (error instanceof Error && error.message.includes('404')) {
      return res.status(404).json({
        success: false,
        error: 'Generation not found',
        requestId
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to check skybox status',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// Skybox History API
app.get('/skybox/history', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const userId = (req as any).user?.uid;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  try {
    console.log(`[${requestId}] Fetching skybox history for user: ${userId}`);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
        requestId
      });
    }
    
    const db = admin.firestore();
    const skyboxesRef = db.collection('skyboxes');
    const snapshot = await skyboxesRef
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();
    
    const skyboxes = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
    }));
    
    console.log(`[${requestId}] Found ${skyboxes.length} skyboxes for user`);
    
    return res.json({
      success: true,
      data: skyboxes,
      pagination: {
        page,
        limit,
        total: skyboxes.length
      },
      requestId
    });
      } catch (error) {
      console.error(`[${requestId}] Error fetching skybox history:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch skybox history',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
    }
});

// Payment APIs
app.post('/payment/create-order', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { amount, currency = 'INR', receipt, notes, userId } = req.body;
  
  try {
    console.log(`[${requestId}] Creating payment order:`, { amount, currency, userId });
    
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured',
        requestId
      });
    }
    
    const options = {
      amount: amount, // Client already sends amount in paise
      currency,
      receipt,
      notes: { ...notes, userId }
    };
    
    const order = await razorpay.orders.create(options);
    
    // Store order in Firebase
    const db = admin.firestore();
    await db.collection('orders').doc(order.id).set({
      ...order,
      userId: userId || (req as any).user?.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'created'
    });
    
    console.log(`[${requestId}] Order created:`, order.id);
    
    return res.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      },
      requestId
    });
      } catch (error) {
      console.error(`[${requestId}] Error creating payment order:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment order',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
    }
});

app.post('/payment/verify', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  try {
    console.log(`[${requestId}] Verifying payment:`, { razorpay_order_id, razorpay_payment_id });
    
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured',
        requestId
      });
    }
    
    // Verify signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
        requestId
      });
    }
    
    // Update order status in Firebase
    const db = admin.firestore();
    await db.collection('orders').doc(razorpay_order_id).update({
      status: 'paid',
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[${requestId}] Payment verified successfully`);
    
    return res.json({
      success: true,
      data: {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        status: 'verified'
      },
      requestId
    });
      } catch (error) {
      console.error(`[${requestId}] Error verifying payment:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify payment',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
    }
});

// Razorpay Plan Management APIs
// Map internal plan IDs to Razorpay plan IDs
// Note: These Razorpay plan IDs need to be created in Razorpay dashboard first
const RAZORPAY_PLAN_MAP: Record<string, { monthly?: string; yearly?: string }> = {
  'pro': {
    monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY || 'plan_pro_monthly',
    yearly: process.env.RAZORPAY_PLAN_PRO_YEARLY || 'plan_pro_yearly'
  },
  'team': {
    monthly: process.env.RAZORPAY_PLAN_TEAM_MONTHLY || 'plan_team_monthly',
    yearly: process.env.RAZORPAY_PLAN_TEAM_YEARLY || 'plan_team_yearly'
  }
};

// Create Razorpay plan (one-time setup, can be called from admin)
app.post('/razorpay/plan/create', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { name, amount, currency = 'INR', interval = 1, period = 'monthly', description } = req.body;
  
  try {
    console.log(`[${requestId}] Creating Razorpay plan:`, { name, amount, interval, period });
    
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured',
        requestId
      });
    }
    
    if (!name || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Name and amount are required',
        requestId
      });
    }
    
    // Convert amount to paise if needed
    const amountInPaise = amount * 100;
    
    const planOptions: any = {
      period: period === 'yearly' ? 'yearly' : 'monthly',
      interval: interval,
      item: {
        name,
        amount: amountInPaise,
        currency,
        description: description || name
      }
    };
    
    const plan = await razorpay.plans.create(planOptions);
    
    console.log(`[${requestId}] Razorpay plan created:`, plan.id);
    
    return res.json({
      success: true,
      data: {
        plan_id: plan.id,
        name: plan.item.name,
        amount: plan.item.amount,
        currency: plan.item.currency,
        period: plan.period,
        interval: plan.interval
      },
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error creating Razorpay plan:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create Razorpay plan',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// Create subscription checkout
app.post('/subscription/checkout', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { userId, planId, billingCycle = 'monthly', customerEmail, customerName, customerContact } = req.body;
  
  try {
    console.log(`[${requestId}] Creating subscription checkout:`, { userId, planId, billingCycle });
    
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured',
        requestId
      });
    }
    
    if (!userId || !planId) {
      return res.status(400).json({
        success: false,
        error: 'userId and planId are required',
        requestId
      });
    }
    
    // Get Razorpay plan ID from mapping
    const razorpayPlanId = RAZORPAY_PLAN_MAP[planId]?.[billingCycle === 'yearly' ? 'yearly' : 'monthly'];
    
    if (!razorpayPlanId) {
      return res.status(400).json({
        success: false,
        error: `Razorpay plan not configured for ${planId} (${billingCycle})`,
        message: 'Please create the Razorpay plan first using /razorpay/plan/create',
        requestId
      });
    }
    
    // Create customer if email provided
    let customerId: string | undefined;
    if (customerEmail) {
      try {
        const customer = await razorpay.customers.create({
          email: customerEmail,
          name: customerName,
          contact: customerContact
        });
        customerId = customer.id;
        console.log(`[${requestId}] Customer created:`, customerId);
      } catch (error) {
        console.warn(`[${requestId}] Error creating customer (may already exist):`, error);
        // Try to find existing customer by email
        try {
          const customers = await razorpay.customers.all({ count: 100 });
          const existingCustomer = customers.items.find((c: any) => c.email === customerEmail);
          if (existingCustomer) {
            customerId = existingCustomer.id;
            console.log(`[${requestId}] Using existing customer:`, customerId);
          }
        } catch (err) {
          console.warn(`[${requestId}] Could not find existing customer`);
        }
      }
    }
    
    // Create subscription
    const subscriptionOptions: any = {
      plan_id: razorpayPlanId,
      customer_notify: 1,
      total_count: billingCycle === 'yearly' ? 1 : 12, // 1 year or 12 months
      notes: {
        userId,
        planId,
        billingCycle
      }
    };
    
    if (customerId) {
      subscriptionOptions.customer_id = customerId;
    }
    
    const subscription = await razorpay.subscriptions.create(subscriptionOptions);
    
    // Store subscription in Firebase
    const db = admin.firestore();
    await db.collection('razorpay_subscriptions').doc(subscription.id).set({
      ...subscription,
      userId,
      planId,
      billingCycle,
      customerId: customerId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: subscription.status
    });
    
    console.log(`[${requestId}] Subscription checkout created:`, subscription.id);
    
    return res.json({
      success: true,
      data: {
        subscription_id: subscription.id,
        status: subscription.status,
        razorpay_plan_id: razorpayPlanId,
        key_id: process.env.RAZORPAY_KEY_ID,
        checkout_url: subscription.short_url || null
      },
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error creating subscription checkout:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create subscription checkout',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// Subscription Management APIs
app.post('/subscription/create', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { userId, planId, planName, razorpaySubscriptionId } = req.body;
  
  try {
    console.log(`[${requestId}] Creating subscription:`, { userId, planId, planName, razorpaySubscriptionId });
    
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured',
        requestId
      });
    }
    
    // If razorpaySubscriptionId is provided, fetch the subscription from Razorpay
    let razorpaySubscription = null;
    if (razorpaySubscriptionId) {
      try {
        razorpaySubscription = await razorpay.subscriptions.fetch(razorpaySubscriptionId);
        console.log(`[${requestId}] Fetched Razorpay subscription:`, razorpaySubscription.id);
      } catch (error) {
        console.warn(`[${requestId}] Could not fetch Razorpay subscription:`, error);
      }
    }
    
    // Store subscription in Firebase (user's subscription record)
    const db = admin.firestore();
    const subscriptionData: any = {
      userId,
      planId,
      planName: planName || planId,
      status: razorpaySubscription?.status || 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      usage: {
        skyboxGenerations: 0
      }
    };
    
    if (razorpaySubscriptionId) {
      subscriptionData.razorpaySubscriptionId = razorpaySubscriptionId;
      subscriptionData.razorpayStatus = razorpaySubscription?.status;
      subscriptionData.currentStart = razorpaySubscription?.current_start;
      subscriptionData.currentEnd = razorpaySubscription?.current_end;
      subscriptionData.endedAt = razorpaySubscription?.ended_at;
    }
    
    // Update or create user subscription
    await db.collection('subscriptions').doc(userId).set(subscriptionData, { merge: true });
    
    console.log(`[${requestId}] Subscription created/updated for user:`, userId);
    
    return res.json({
      success: true,
      data: {
        userId,
        planId,
        planName: planName || planId,
        razorpaySubscriptionId: razorpaySubscriptionId || null,
        status: subscriptionData.status,
        key_id: process.env.RAZORPAY_KEY_ID
      },
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error creating subscription:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

app.get('/subscription/:subscriptionId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { subscriptionId } = req.params;
  
  try {
    console.log(`[${requestId}] Fetching subscription:`, subscriptionId);
    
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured',
        requestId
      });
    }
    
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    
    return res.json({
      success: true,
      data: subscription,
      requestId
    });
      } catch (error) {
      console.error(`[${requestId}] Error fetching subscription:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
    }
});

// ============================================
// COMPREHENSIVE SUBSCRIPTION MANAGEMENT APIs
// ============================================

// 1. GET User Subscription (Primary endpoint)
app.get('/subscription/user/:userId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { userId } = req.params;
  
  try {
    console.log(`[${requestId}] Fetching subscription for user:`, userId);
    
    const db = admin.firestore();
    
    // Get subscription from Firebase (using userId as document ID)
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    if (!subscriptionDoc.exists) {
      // Return default free subscription
      return res.json({
        success: true,
        data: {
          userId,
          planId: 'free',
          status: 'active',
          usage: {
            skyboxGenerations: 0
          },
          isDefault: true
        },
        requestId
      });
    }
    
    const subscriptionData = subscriptionDoc.data();
    
    // If Razorpay subscription ID exists, sync status from Razorpay
    if (subscriptionData?.razorpaySubscriptionId && razorpay) {
      try {
        const razorpaySub = await razorpay.subscriptions.fetch(
          subscriptionData.razorpaySubscriptionId
        );
        
        // Update Firebase with latest Razorpay status
        const updatedData: any = {
          razorpayStatus: razorpaySub.status,
          currentStart: razorpaySub.current_start,
          currentEnd: razorpaySub.current_end,
          endedAt: razorpaySub.ended_at,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Map Razorpay status to our status
        if (razorpaySub.status === 'active' || razorpaySub.status === 'authenticated') {
          updatedData.status = 'active';
        } else if (razorpaySub.status === 'cancelled' || razorpaySub.status === 'expired') {
          updatedData.status = razorpaySub.status === 'cancelled' ? 'cancelled' : 'expired';
        }
        
        await subscriptionRef.update(updatedData);
        Object.assign(subscriptionData, updatedData);
      } catch (error) {
        console.warn(`[${requestId}] Could not sync Razorpay status:`, error);
      }
    }
    
    return res.json({
      success: true,
      data: subscriptionData,
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error fetching user subscription:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// 2. POST User Subscription Status (Alternative endpoint - fixed)
app.post('/user/subscription-status', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { userId } = req.body;
  
  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
        requestId
      });
    }
    
    console.log(`[${requestId}] Checking subscription status for user:`, userId);
    
    const db = admin.firestore();
    
    // Use document ID instead of query
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    if (!subscriptionDoc.exists) {
      return res.json({
        success: true,
        data: {
          hasActiveSubscription: false,
          subscription: null,
          defaultPlan: 'free'
        },
        requestId
      });
    }
    
    const subscription = subscriptionDoc.data();
    
    // Check if subscription is active
    const isActive = subscription?.status === 'active' || 
                     subscription?.razorpayStatus === 'active' ||
                     subscription?.razorpayStatus === 'authenticated';
    
    return res.json({
      success: true,
      data: {
        hasActiveSubscription: isActive,
        subscription,
        status: subscription?.status || 'inactive'
      },
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error checking subscription status:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check subscription status',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// 3. Sync Subscription from Razorpay
app.post('/subscription/sync/:subscriptionId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { subscriptionId } = req.params;
  
  try {
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured',
        requestId
      });
    }
    
    console.log(`[${requestId}] Syncing subscription:`, subscriptionId);
    
    // Fetch from Razorpay
    const razorpaySub = await razorpay.subscriptions.fetch(subscriptionId);
    
    // Find user subscription by Razorpay subscription ID
    const db = admin.firestore();
    const subscriptionsRef = db.collection('subscriptions');
    const snapshot = await subscriptionsRef
      .where('razorpaySubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found in Firebase',
        requestId
      });
    }
    
    const subscriptionDoc = snapshot.docs[0];
    const userId = subscriptionDoc.data().userId;
    
    // Update subscription with latest Razorpay data
    const updateData: any = {
      razorpayStatus: razorpaySub.status,
      currentStart: razorpaySub.current_start,
      currentEnd: razorpaySub.current_end,
      endedAt: razorpaySub.ended_at,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Map Razorpay status
    if (razorpaySub.status === 'active' || razorpaySub.status === 'authenticated') {
      updateData.status = 'active';
    } else if (razorpaySub.status === 'cancelled') {
      updateData.status = 'cancelled';
    } else if (razorpaySub.status === 'expired' || razorpaySub.status === 'completed') {
      updateData.status = 'expired';
    }
    
    await subscriptionDoc.ref.update(updateData);
    
    // Also update in razorpay_subscriptions collection
    await db.collection('razorpay_subscriptions').doc(subscriptionId).set({
      ...razorpaySub,
      syncedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    return res.json({
      success: true,
      data: {
        subscriptionId,
        userId,
        status: updateData.status,
        razorpayStatus: razorpaySub.status
      },
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error syncing subscription:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync subscription',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// 4. Cancel Subscription
app.post('/subscription/cancel', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { userId, cancelAtPeriodEnd = true } = req.body;
  
  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
        requestId
      });
    }
    
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured',
        requestId
      });
    }
    
    console.log(`[${requestId}] Cancelling subscription for user:`, userId);
    
    const db = admin.firestore();
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    if (!subscriptionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
        requestId
      });
    }
    
    const subscription = subscriptionDoc.data();
    const razorpaySubscriptionId = subscription?.razorpaySubscriptionId;
    
    if (!razorpaySubscriptionId) {
      // No Razorpay subscription, just update Firebase
      await subscriptionRef.update({
        status: 'cancelled',
        cancelAtPeriodEnd: false,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return res.json({
        success: true,
        data: {
          userId,
          status: 'cancelled',
          message: 'Subscription cancelled'
        },
        requestId
      });
    }
    
    // Cancel in Razorpay
    if (cancelAtPeriodEnd) {
      // Cancel at period end (pass 1 as second parameter)
      await razorpay.subscriptions.cancel(razorpaySubscriptionId, 1);
    } else {
      // Cancel immediately (no second parameter or pass 0)
      await razorpay.subscriptions.cancel(razorpaySubscriptionId, 0);
    }
    
    // Update Firebase
    await subscriptionRef.update({
      status: cancelAtPeriodEnd ? 'active' : 'cancelled',
      cancelAtPeriodEnd,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.json({
      success: true,
      data: {
        userId,
        razorpaySubscriptionId,
        status: cancelAtPeriodEnd ? 'active' : 'cancelled',
        cancelAtPeriodEnd,
        message: cancelAtPeriodEnd 
          ? 'Subscription will be cancelled at period end' 
          : 'Subscription cancelled immediately'
      },
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error cancelling subscription:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// 5. Razorpay Webhook Handler
app.post('/razorpay/webhook', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(req.body);
    
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.warn(`[${requestId}] Webhook secret not configured`);
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    
    // Verify webhook signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');
    
    if (expectedSignature !== webhookSignature) {
      console.error(`[${requestId}] Invalid webhook signature`);
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const event = req.body.event;
    const payload = req.body.payload;
    
    console.log(`[${requestId}] Webhook received:`, event);
    
    const db = admin.firestore();
    
    // Handle subscription events
    if (event.startsWith('subscription.')) {
      const subscriptionId = payload.subscription?.entity?.id || payload.subscription?.id;
      
      if (!subscriptionId) {
        console.warn(`[${requestId}] No subscription ID in webhook`);
        return res.status(400).json({ error: 'No subscription ID' });
      }
      
      // Find user subscription
      const subscriptionsRef = db.collection('subscriptions');
      const snapshot = await subscriptionsRef
        .where('razorpaySubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.warn(`[${requestId}] Subscription not found:`, subscriptionId);
        return res.json({ received: true });
      }
      
      const subscriptionDoc = snapshot.docs[0];
      const userId = subscriptionDoc.data().userId;
      
      // Handle different subscription events
      switch (event) {
        case 'subscription.activated':
        case 'subscription.charged':
          await subscriptionDoc.ref.update({
            status: 'active',
            razorpayStatus: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          break;
          
        case 'subscription.cancelled':
          await subscriptionDoc.ref.update({
            status: 'cancelled',
            razorpayStatus: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          break;
          
        case 'subscription.completed':
        case 'subscription.expired':
          await subscriptionDoc.ref.update({
            status: 'expired',
            razorpayStatus: 'expired',
            endedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          break;
          
        case 'subscription.paused':
          await subscriptionDoc.ref.update({
            status: 'limited',
            razorpayStatus: 'paused',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          break;
      }
      
      // Store webhook event for audit
      await db.collection('webhook_events').add({
        event,
        subscriptionId,
        userId,
        payload,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: true
      });
    }
    
    // Always return 200 to acknowledge webhook
    return res.json({ received: true });
  } catch (error) {
    console.error(`[${requestId}] Webhook error:`, error);
    // Still return 200 to prevent Razorpay from retrying
    return res.json({ received: true, error: 'Processing failed' });
  }
});

// 6. Get Subscription History
app.get('/subscription/:userId/history', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { userId } = req.params;
  
  try {
    const db = admin.firestore();
    
    // Get subscription document (since we use userId as doc ID, there's only one)
    // But we can also check razorpay_subscriptions for historical data
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    const subscriptions = [];
    
    if (subscriptionDoc.exists) {
      subscriptions.push({
        id: subscriptionDoc.id,
        ...subscriptionDoc.data()
      });
    }
    
    // Also get Razorpay subscription history if exists
    const subscriptionData = subscriptionDoc.data();
    if (subscriptionDoc.exists && subscriptionData?.razorpaySubscriptionId) {
      const razorpaySubRef = db.collection('razorpay_subscriptions')
        .doc(subscriptionData.razorpaySubscriptionId);
      const razorpaySubDoc = await razorpaySubRef.get();
      
      if (razorpaySubDoc.exists && subscriptions.length > 0) {
        (subscriptions[0] as any).razorpayDetails = razorpaySubDoc.data();
      }
    }
    
    return res.json({
      success: true,
      data: subscriptions,
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Error fetching subscription history:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription history',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// Proxy route for Meshy assets to handle CORS
app.get('/proxy-asset', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { url } = req.query;
  
  try {
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'URL parameter is required',
        requestId 
      });
    }

    console.log(`[${requestId}] Proxying asset request:`, url);

    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'In3D.ai-WebApp/1.0',
      },
      timeout: 30000, // 30 second timeout
    });

    if (!response.data) {
      console.error(`[${requestId}] Asset proxy failed: No data received`);
      return res.status(500).json({ 
        error: 'Failed to fetch asset: No data received',
        requestId 
      });
    }

    // Get the content type
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the response
    response.data.pipe(res);
    
    console.log(`[${requestId}] Asset proxy successful`);
    return; // Explicit return for TypeScript
  } catch (error: any) {
    console.error(`[${requestId}] Asset proxy error:`, error);
    
    if (error.response) {
      // Forward the error status from the target server
      return res.status(error.response.status).json({ 
        error: `Failed to fetch asset: ${error.response.status} ${error.response.statusText}`,
        requestId 
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error during asset proxy',
      details: error.message,
      requestId 
    });
  }
});

// Meshy AI API Proxy Endpoints
// POST /meshy/generate - Generate a 3D asset
app.post('/meshy/generate', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { prompt, negative_prompt, art_style, seed, ai_model, topology, target_polycount, should_remesh, symmetry_mode, moderation } = req.body;
  
  try {
    console.log(`[${requestId}] Meshy generation requested:`, { prompt, art_style, ai_model });
    
    if (!MESHY_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Meshy API not configured',
        requestId
      });
    }
    
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt',
        requestId
      });
    }
    
    // Create generation using Meshy API
    const payload = {
      mode: 'preview',
      prompt: prompt.trim(),
      art_style: art_style || 'realistic',
      seed: seed || Math.floor(Math.random() * 1000000),
      ai_model: ai_model || 'meshy-4',
      topology: topology || 'triangle',
      target_polycount: target_polycount || 30000,
      should_remesh: should_remesh !== false,
      symmetry_mode: symmetry_mode || 'auto',
      moderation: moderation || false,
    };
    
    if (negative_prompt) {
      (payload as any).negative_prompt = negative_prompt.trim();
    }
    
    const response = await axios.post('https://api.meshy.ai/openapi/v2/text-to-3d', payload, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'In3D.ai-WebApp/1.0'
      },
      timeout: 30000
    });
    
    const generation = response.data;
    console.log(`[${requestId}] Meshy generation created:`, generation.result);
    
    if (!generation.result) {
      console.error(`[${requestId}] No task ID returned from Meshy API`);
      return res.status(500).json({
        success: false,
        error: 'No task ID returned from API',
        requestId
      });
    }
    
    return res.json({
      success: true,
      data: generation,
      requestId
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error generating Meshy asset:`, error);
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401 || status === 403) {
        return res.status(status).json({
          success: false,
          error: 'Invalid Meshy API key or authentication failed',
          code: 'AUTH_ERROR',
          requestId
        });
      }
      
      if (status === 400) {
        return res.status(400).json({
          success: false,
          error: data?.error?.message || data?.message || 'Invalid request parameters',
          code: 'INVALID_REQUEST',
          requestId
        });
      }
      
      if (status === 429) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT',
          requestId
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate 3D asset',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// GET /meshy/status/:taskId - Get generation status
app.get('/meshy/status/:taskId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { taskId } = req.params;
  
  try {
    console.log(`[${requestId}] Checking Meshy status for task: ${taskId}`);
    
    if (!MESHY_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Meshy API not configured',
        requestId
      });
    }
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing task ID',
        requestId
      });
    }
    
    // Get generation status from Meshy API
    const response = await axios.get(`https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'In3D.ai-WebApp/1.0'
      },
      timeout: 30000
    });
    
    const taskStatus = response.data;
    console.log(`[${requestId}] Meshy task status:`, taskStatus.status);
    
    return res.json({
      success: true,
      data: taskStatus,
      requestId
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error checking Meshy status:`, error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        code: 'TASK_NOT_FOUND',
        requestId
      });
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(error.response.status).json({
        success: false,
        error: 'Invalid Meshy API key or authentication failed',
        code: 'AUTH_ERROR',
        requestId
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get task status',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// GET /meshy/task/:taskId - Alias for status endpoint
app.get('/meshy/task/:taskId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { taskId } = req.params;
  
  // Use the same logic as status endpoint
  try {
    console.log(`[${requestId}] Checking Meshy task: ${taskId}`);
    
    if (!MESHY_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Meshy API not configured',
        requestId
      });
    }
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing task ID',
        requestId
      });
    }
    
    const response = await axios.get(`https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'In3D.ai-WebApp/1.0'
      },
      timeout: 30000
    });
    
    const taskStatus = response.data;
    console.log(`[${requestId}] Meshy task status:`, taskStatus.status);
    
    return res.json({
      success: true,
      data: taskStatus,
      requestId
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error checking Meshy task:`, error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        code: 'TASK_NOT_FOUND',
        requestId
      });
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(error.response.status).json({
        success: false,
        error: 'Invalid Meshy API key or authentication failed',
        code: 'AUTH_ERROR',
        requestId
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get task status',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  console.error(`[${requestId}] Unhandled error:`, error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId
  });
});

// Export the Express app as a Firebase Function v2
export const api = onRequest({
  memory: '512MiB',
  timeoutSeconds: 60,
  maxInstances: 10,
  cors: true,
  region: 'us-central1',
  invoker: 'public',
  secrets: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'BLOCKADE_API_KEY', 'MESHY_API_KEY']
}, app);
