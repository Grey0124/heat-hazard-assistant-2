# AR Setup Guide for Heat Hazard Assistant

## 🎯 Overview
This guide will help you set up and test the AR functionality for the Heat Hazard Assistant app.

## 📱 Requirements

### Device Requirements
- **Smartphone or Tablet** with AR capabilities
- **Modern browser** (Chrome, Safari, Edge)
- **Camera access** permission
- **HTTPS connection** (required for WebXR)

### Browser Support
- ✅ **Chrome** (Android, Desktop)
- ✅ **Safari** (iOS 13+, macOS)
- ✅ **Edge** (Windows, Android)
- ❌ **Firefox** (limited WebXR support)

## 🚀 Quick Start

### 1. Test AR Support
Visit: `http://localhost:3000/ar-test`

This will:
- Check if your device supports AR
- Test WebXR functionality
- Verify camera access
- Start a basic AR session

### 2. Use Full AR Experience
Visit: `http://localhost:3000/ar-mode`

This provides:
- Real-world camera feed
- Hit-testing for surface detection
- Object placement in AR
- GPS integration

## 🔧 Setup Steps

### Step 1: Development Environment
```bash
# Ensure you're in the project directory
cd heat-hazard-assistant-2

# Install dependencies
npm install

# Start development server
npm start
```

### Step 2: HTTPS Setup (Required for AR)
WebXR requires a secure context (HTTPS). For development:

#### Option A: Use ngrok (Recommended)
```bash
# Install ngrok globally
npm install -g ngrok

# Start your React app
npm start

# In another terminal, create HTTPS tunnel
ngrok http 3000
```

#### Option B: Use localhost with flags
```bash
# Chrome with insecure localhost
chrome --allow-insecure-localhost --disable-web-security --user-data-dir=/tmp/chrome_dev

# Or use localhost with HTTPS
npm run build
npx serve -s build -l 3000
```

### Step 3: Test AR Functionality

1. **Open AR Test Page**
   - Navigate to `/ar-test`
   - Check if AR is supported
   - Click "Start AR" to test camera access

2. **Test Full AR Experience**
   - Navigate to `/ar-mode`
   - Click "Start AR Experience"
   - Grant camera permissions when prompted
   - Point camera at surfaces to see reticle
   - Tap to place objects

## 🐛 Troubleshooting

### Issue: "AR Not Supported"
**Solutions:**
1. **Check HTTPS**: Ensure you're using HTTPS or localhost
2. **Update Browser**: Use latest Chrome/Safari/Edge
3. **Check Device**: Ensure device has AR capabilities
4. **Enable WebXR**: Check browser settings for WebXR

### Issue: "Camera Not Accessing"
**Solutions:**
1. **Grant Permissions**: Allow camera access when prompted
2. **Check Settings**: Ensure camera isn't blocked in browser settings
3. **Restart Browser**: Close and reopen browser
4. **Clear Cache**: Clear browser cache and cookies

### Issue: "WebXR Error"
**Solutions:**
1. **Check Console**: Look for specific error messages
2. **Update Three.js**: Ensure Three.js version supports WebXR
3. **Check Dependencies**: Verify all AR-related packages are installed
4. **Test on Different Device**: Try on another AR-capable device

### Issue: "No Real World Visible"
**Solutions:**
1. **Check AR Session**: Ensure AR session started successfully
2. **Verify Hit-Testing**: Look for reticle on surfaces
3. **Move Device**: Slowly move device to detect surfaces
4. **Check Lighting**: Ensure good lighting for surface detection

## 📋 Testing Checklist

### Basic AR Test (`/ar-test`)
- [ ] AR support detected
- [ ] AR session starts without errors
- [ ] Camera feed visible
- [ ] Session can be ended properly

### Full AR Experience (`/ar-mode`)
- [ ] AR session starts
- [ ] Camera shows real world
- [ ] Reticle appears on surfaces
- [ ] Objects can be placed
- [ ] GPS coordinates are captured
- [ ] Temperature calculations work

## 🔍 Debug Information

### Console Logs to Check
```javascript
// AR Support Check
console.log('AR Support:', supported);

// Session Start
console.log('AR session started successfully:', session);

// Hit Testing
console.log('Hit test results:', hitTestResults);

// Object Placement
console.log('Adding intervention:', type, 'at position:', position);
```

### Common Error Messages
- `"WebXR not available"` → Browser doesn't support WebXR
- `"AR not supported"` → Device doesn't support AR
- `"Camera permission denied"` → Camera access blocked
- `"Session creation failed"` → WebXR session couldn't start

## 🌐 Production Deployment

### Vercel/Netlify Setup
```bash
# Build the app
npm run build

# Deploy (HTTPS will be automatic)
vercel --prod
# or
netlify deploy --prod
```

### Environment Variables
```env
# Ensure HTTPS is enabled
HTTPS=true
```

## 📞 Support

If you're still experiencing issues:

1. **Check Browser Console** for error messages
2. **Test on Different Device** to isolate device-specific issues
3. **Verify HTTPS** is working correctly
4. **Check Network Tab** for failed requests
5. **Test AR Test Page** first before full experience

## 🎉 Success Indicators

When AR is working correctly, you should see:
- ✅ Camera feed showing real world
- ✅ Reticle appearing on detected surfaces
- ✅ Objects placed in real-world positions
- ✅ GPS coordinates captured for placed objects
- ✅ Temperature calculations based on location

---

**Note**: AR functionality requires a physical device with camera access. Desktop browsers may not support AR features even with WebXR enabled. 