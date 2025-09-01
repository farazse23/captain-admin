@echo off
REM Firebase Cloud Functions Deployment Script for Windows
REM Run this script to deploy the functions to Firebase

echo 🚀 Deploying Firebase Cloud Functions for Captain Truck...

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Firebase CLI is not installed. Please install it first:
    echo npm install -g firebase-tools
    pause
    exit /b 1
)

REM Login to Firebase (if not already logged in)
echo 📝 Checking Firebase authentication...
firebase projects:list >nul 2>&1
if errorlevel 1 (
    echo 🔑 Please login to Firebase:
    firebase login
)

REM Navigate to functions directory
cd functions

REM Install dependencies
echo 📦 Installing function dependencies...
call npm install

REM Navigate back to root
cd ..

REM Set Firebase project (replace with your actual project ID)
echo 🎯 Setting Firebase project...
firebase use captain-truck-242e5

REM Deploy functions
echo 🚀 Deploying Cloud Functions...
firebase deploy --only functions

echo ✅ Deployment completed!
echo.
echo 📊 Your Cloud Functions are now running and will:
echo    • ✅ Automatically sync dispatch statuses when drivers update status
echo    • ✅ Send real-time notifications to customers and drivers
echo    • ✅ Keep assignment records synchronized
echo    • ✅ Run scheduled checks every 5 minutes
echo    • ✅ Work even when admin panel is offline
echo.
echo 🔗 Functions deployed:
echo    1. updateDispatchStatusOnDriverChange (Firestore trigger)
echo    2. updateDriverStatus (HTTP callable)
echo    3. scheduledStatusSync (Scheduled task)
echo.
echo 🎉 Real-time updates are now active!

pause
