#!/bin/bash

# Localhost Setup Script
# This script helps set up the development environment for localhost

echo "🚀 Setting up localhost development environment..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if logged in to Firebase
echo "📋 Checking Firebase login status..."
if ! firebase projects:list &> /dev/null; then
    echo "⚠️ Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

echo "✅ Firebase CLI ready"
echo ""

# Install Functions dependencies
echo "📦 Installing Functions dependencies..."
cd functions
if [ ! -f "package-lock.json" ]; then
    npm install
else
    npm install
fi
cd ..

# Install dotenv if not already installed
echo "📦 Checking for dotenv..."
cd functions
if ! npm list dotenv &> /dev/null; then
    echo "Installing dotenv..."
    npm install dotenv --save-dev
fi
cd ..

# Install Client dependencies
echo "📦 Installing Client dependencies..."
cd server/client
if [ ! -f "package-lock.json" ]; then
    npm install
else
    npm install
fi
cd ../..

echo ""
echo "✅ Dependencies installed!"
echo ""

# Check for .env files
echo "🔍 Checking environment files..."

if [ ! -f "functions/.env" ]; then
    echo "⚠️ functions/.env not found"
    echo "📝 Creating functions/.env.example..."
    cat > functions/.env << EOF
# BlockadeLabs API Key (required for skybox generation)
BLOCKADE_API_KEY=your_blockadelabs_api_key_here

# Meshy AI API Key (for 3D asset generation)
MESHY_API_KEY=msy_GDVX6JfREmutHSSwrZAh47APqE0JvW4pFxMW

# Razorpay Configuration (optional, for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here
EOF
    echo "⚠️ Please edit functions/.env and add your API keys"
else
    echo "✅ functions/.env exists"
fi

if [ ! -f "server/client/.env.local" ]; then
    echo "⚠️ server/client/.env.local not found"
    echo "📝 Creating server/client/.env.local.example..."
    cat > server/client/.env.local << EOF
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
EOF
    echo "✅ Created server/client/.env.local"
else
    echo "✅ server/client/.env.local exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit functions/.env and add your BLOCKADE_API_KEY"
echo "2. Start Firebase emulators: firebase emulators:start"
echo "3. In another terminal, start client: cd server/client && npm run dev"
echo ""
echo "📖 For more details, see LOCALHOST_SETUP.md"

