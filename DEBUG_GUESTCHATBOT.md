# Debugging GuestChatbot.jsx - DevTools Guide

## Step 1: Open DevTools
- Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Or right-click → "Inspect"

## Step 2: Check Console Tab
1. Click the **Console** tab
2. Look for **RED errors** - these will tell you what's wrong
3. Common errors to look for:
   - "Cannot read property of undefined"
   - "Module not found"
   - "Firestore permission denied"
   - Any React errors

## Step 3: Check Network Tab
1. Click the **Network** tab
2. Refresh the page (`Ctrl+R` or `F5`)
3. Look for:
   - Files with **RED status** (404, 500 errors)
   - Check if `guest-chatbot` or `GuestChatbot.jsx` is loading
   - Look for any failed requests

## Step 4: Check Sources Tab
1. Click the **Sources** tab
2. In the left panel, expand:
   - `top` → `localhost:5173` → `src` → `pages`
3. Find `GuestChatbot.jsx` or `guest-chatbot`
4. Click on it to see the actual code being executed
5. **Check line 350-360** - do you see the new code with `TopNavigation` and `SideNavigation`?

## Step 5: Verify the Component is Loading
1. In Console, type:
   ```javascript
   window.location.pathname
   ```
   Should return: `/guest-chatbot`

2. Check if React is rendering:
   - In Console, type:
   ```javascript
   document.querySelector('[data-testid]') || document.querySelector('main')
   ```
   - This should return an element if React is working

## Step 6: Check for Caching Issues
1. **Hard Refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Disable Cache**:
   - Open DevTools
   - Go to Network tab
   - Check "Disable cache" checkbox
   - Keep DevTools open
   - Refresh the page

## Step 7: Check Application Tab (for localStorage)
1. Click **Application** tab
2. Check **Local Storage** → `http://localhost:5173`
3. Look for any cached data that might be interfering

## Step 8: Check React DevTools (if installed)
1. Install React DevTools extension if you haven't
2. In DevTools, you'll see "Components" tab
3. Search for "GuestChatbot" component
4. Check its props and state

## Common Issues:

### Issue 1: File Not Loading
- **Symptom**: 404 error in Network tab
- **Solution**: Restart dev server

### Issue 2: Old Code Still Running
- **Symptom**: Sources tab shows old code
- **Solution**: 
  - Stop dev server (`Ctrl+C`)
  - Delete `node_modules/.vite` folder
  - Restart: `npm run dev`

### Issue 3: Build Error
- **Symptom**: Red errors in Console
- **Solution**: Check terminal where dev server is running

### Issue 4: Component Not Rendering
- **Symptom**: Blank page or error boundary
- **Solution**: Check Console for React errors

## Quick Test - Add a Console Log
Add this at the top of GuestChatbot component to verify it's loading:
```javascript
console.log('GuestChatbot component loaded!', new Date().toISOString());
```

