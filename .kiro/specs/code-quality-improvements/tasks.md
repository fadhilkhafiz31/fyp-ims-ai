# Implementation Plan

This plan breaks down the demo-ready improvements into **individual, independent tasks**. Complete them **one at a time**, testing after each before moving to the next. If you run out of time, the earlier tasks are the most critical.

---

## Priority 1: Critical Improvements (Must Complete)

### Task 1: Add Error Handling with Toast Messages

- [ ] 1.1 Add error handling to Inventory.jsx save operations
  - Wrap `handleSubmit` in try-catch
  - Show toast.error() instead of console.error
  - Display user-friendly messages like "Failed to save item. Please try again."
  - _Requirements: 1.1, 1.2_

- [ ] 1.2 Add error handling to Inventory.jsx delete operations
  - Wrap `handleDelete` in try-catch
  - Show toast.error() on failure
  - _Requirements: 1.1_

- [ ] 1.3 Add error handling to store selector
  - Show helpful message when storeOptions is empty
  - Display "No stores available. Please contact administrator." instead of empty dropdown
  - _Requirements: 1.4_

- [ ] 1.4 Test error handling
  - Disconnect network and try to save an item
  - Verify toast message appears
  - Verify app doesn't crash
  - _Requirements: 1.1, 1.2_

---

### Task 2: Add Button Loading States

- [ ] 2.1 Add loading state to Inventory form submit button
  - Show spinner icon when `saving` is true
  - Change button text to "Saving..." during save
  - Disable button with `disabled={saving}`
  - _Requirements: 1.5, 2.2_

- [ ] 2.2 Add loading state to ChatbotPanel send button
  - Button should show "Sending..." when `sending` is true
  - Disable button during send operation
  - _Requirements: 1.5, 2.2_

- [ ] 2.3 Test button loading states
  - Click save button and verify it disables
  - Verify button re-enables after save completes
  - Try clicking multiple times quickly - should only submit once
  - _Requirements: 1.5_

---

### Task 3: Handle Mock Features with "Coming Soon" Toasts

- [ ] 3.1 Verify mock menu items show toast
  - Check SideNavigation.jsx has `handleMockClick` function
  - Verify items with `isMock: true` show toast when clicked
  - Test "My Profile", "Settings", "Help & Support" menu items
  - _Requirements: 4.1_

- [ ] 3.2 Add mock handling to TopNavigation heart icon
  - Add onClick handler to heart button
  - Show toast.info("Favorites - Coming soon!")
  - Prevent any navigation
  - _Requirements: 4.1_

- [ ] 3.3 Test mock feature handling
  - Click each mock menu item
  - Verify "Coming soon" toast appears
  - Verify no navigation occurs
  - _Requirements: 4.1_

---

## Priority 2: High Impact Improvements (Should Complete)

### Task 4: Add Mobile Responsiveness

- [ ] 4.1 Make sidebar collapsible on mobile
  - Sidebar should be hidden by default on screens < 1024px
  - Initialize `sidebarOpen` based on window width
  - Add: `const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)`
  - _Requirements: 3.1, 3.2_

- [ ] 4.2 Make inventory table scrollable on mobile
  - Wrap table in `<div className="overflow-x-auto">`
  - Add `min-w-full` to table element
  - _Requirements: 3.4_

- [ ] 4.3 Test mobile responsiveness
  - Open browser dev tools
  - Set viewport to 375px width (mobile)
  - Verify sidebar is hidden by default
  - Verify hamburger button works
  - Verify table scrolls horizontally
  - _Requirements: 3.1, 3.2, 3.4_

---

### Task 5: Add Visual Feedback for Item Changes

- [ ] 5.1 Add row highlighting for new/updated items
  - The code already has `highlightedItems` state and highlighting logic
  - Verify the blue highlight appears when items are added/updated
  - If not working, check that `highlightedItems` Set is being populated correctly
  - _Requirements: 2.1_

- [ ] 5.2 Improve success toast messages
  - Verify toast.success() is called after add/update/delete
  - Messages should be: "Item added successfully!", "Item updated successfully!", "Item deleted successfully!"
  - _Requirements: 2.5_

- [ ] 5.3 Test visual feedback
  - Add a new item - verify row highlights in blue for 2 seconds
  - Edit an item - verify row highlights after save
  - Delete an item - verify success toast appears
  - _Requirements: 2.1, 2.5_

---

## Priority 3: Polish Improvements (If Time Permits)

### Task 6: Secure Firebase Configuration

- [ ] 6.1 Move Firebase config to environment variables
  - Create `.env.local` file in project root
  - Add Firebase config values as `VITE_FIREBASE_*` variables
  - Update `src/lib/firebase.js` to use `import.meta.env.VITE_FIREBASE_*`
  - _Requirements: 5.1_

- [ ] 6.2 Update .gitignore
  - Verify `.env.local` is in .gitignore
  - Verify `.env` is in .gitignore
  - _Requirements: 5.3_

- [ ] 6.3 Document security in README
  - Add section about API key restrictions
  - Mention domain restrictions should be configured in Firebase Console
  - _Requirements: 5.5_

---

### Task 7: Improve UI Labeling Consistency

- [ ] 7.1 Standardize store selector label
  - Change label to "Store Location:" consistently
  - Update both Inventory.jsx and LocationSelector.jsx
  - _Requirements: 6.3_

- [ ] 7.2 Add helpful empty states
  - When inventory is empty, show: "No items yet. Add your first item using the form above."
  - When search returns no results, show: "No items found matching '[query]'. Try a different search term."
  - _Requirements: 6.4_

- [ ] 7.3 Review all button labels
  - Verify all buttons use action verbs: "Save", "Add", "Delete", "Send", etc.
  - Update any unclear labels
  - _Requirements: 6.2_

---

### Task 8: Improve Chatbot Reliability

- [ ] 8.1 Verify typing indicator works
  - Check that animated dots appear when `sending` is true
  - Code already exists in ChatbotPanel.jsx
  - _Requirements: 8.1_

- [ ] 8.2 Improve error messages
  - Update catch block to show: "I'm having trouble connecting. Please try again in a moment."
  - Add check for missing webhook URL with clear message
  - _Requirements: 8.3, 8.4_

- [ ] 8.3 Test chatbot
  - Send a message and verify typing indicator appears
  - Verify response displays correctly
  - Test with network disconnected - verify error message
  - _Requirements: 8.1, 8.2, 8.4_

---

### Task 9: Enhance Page Transitions

- [ ] 9.1 Verify page transitions are consistent
  - Check that all routes in main.jsx use motion.div with fade/slide
  - Code already exists - just verify it works
  - _Requirements: 9.1_

- [ ] 9.2 Verify list animations work
  - Check that inventory table rows have staggered animation
  - Code already exists in Inventory.jsx
  - _Requirements: 9.2_

- [ ] 9.3 Test animations
  - Navigate between pages - verify smooth transitions
  - Load inventory page - verify rows animate in
  - Verify animations complete quickly (under 300ms)
  - _Requirements: 9.1, 9.2, 9.4_

---

### Task 10: Polish Dashboard KPIs

- [ ] 10.1 Verify KPIs are displayed
  - Check Dashboard shows: Total Items, Total Qty, Categories
  - Code already exists in Inventory.jsx
  - _Requirements: 10.1_

- [ ] 10.2 Add low stock indicator
  - Show low stock count prominently
  - Highlight in red if > 0
  - _Requirements: 10.2_

- [ ] 10.3 Test dashboard
  - Add/delete items and verify KPIs update in real-time
  - Verify different roles see appropriate content
  - _Requirements: 10.4, 10.5_

---

## Final Testing & Demo Preparation

### Task 11: End-to-End Testing

- [ ] 11.1 Test complete user flow
  - Login as admin
  - Select a store location
  - Add a new inventory item
  - Edit the item
  - Delete the item
  - Use chatbot to query inventory
  - Test on mobile viewport

- [ ] 11.2 Prepare demo data
  - Add 10-15 sample inventory items
  - Include some low stock items (qty <= 5)
  - Use realistic product names and categories

- [ ] 11.3 Create demo script
  - Write down the exact steps you'll demonstrate
  - Practice the demo flow 2-3 times
  - Time yourself - aim for 5-7 minutes

---

## Notes

- **Work on ONE task at a time**
- **Test after each task** before moving to the next
- **Commit after each task** with clear message like "feat: add error handling to inventory save"
- **If something breaks**, revert that commit and move on
- **Priority 1 tasks are critical** - complete these first
- **Priority 2 tasks are high impact** - do if you have time
- **Priority 3 tasks are polish** - only if you have extra time
- **Don't stress** - even completing Priority 1 tasks will significantly improve your demo
