# Design Document

## Overview

This design document outlines **quick, high-impact improvements** to the SmartStockAI Inventory Management System that can be implemented within 2 days before the evaluation demo. The focus is on fixing visible bugs, enhancing user experience, and adding polish without requiring architectural changes. All improvements are designed to be low-risk and demo-ready.

## Architecture

The application follows a standard React architecture with Firebase backend:

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pages      │  │  Components  │  │   Contexts   │  │
│  │ - Dashboard  │  │ - Navigation │  │ - Auth       │  │
│  │ - Inventory  │  │ - Chatbot    │  │ - Store      │  │
│  │ - Chatbot    │  │ - Forms      │  │ - Toast      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Firebase Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Firestore DB │  │     Auth     │  │  Functions   │  │
│  │ - inventory  │  │ - Email/Pass │  │ - webhook    │  │
│  │ - users      │  │ - Anonymous  │  │ - Dialogflow │  │
│  │ - storeId    │  └──────────────┘  └──────────────┘  │
│  └──────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Error Handling Enhancement

**Component**: Error handling utilities and UI feedback

**Interface**:
```javascript
// src/lib/errorHandler.js
export function handleFirestoreError(error, context) {
  // Returns user-friendly message based on error code
  return {
    message: string,
    severity: 'error' | 'warning' | 'info',
    action: string | null
  }
}

export function getNetworkErrorMessage() {
  return "Connection lost. Please check your internet and try again."
}
```

**Changes**:
- Add try-catch blocks around all Firestore operations
- Display toast messages instead of console.error
- Disable submit buttons during save operations
- Show "Connection lost" indicator when offline

### 2. Visual Feedback Improvements

**Component**: Inventory table row highlighting and button states

**Interface**:
```javascript
// Enhanced state management
const [highlightedItems, setHighlightedItems] = useState(new Set());
const [savingStates, setSavingStates] = useState({});

// Button component with loading state
<motion.button
  disabled={saving}
  className="..."
>
  {saving ? (
    <>
      <Spinner size="sm" />
      <span>Saving...</span>
    </>
  ) : (
    "Save"
  )}
</motion.button>
```

**Changes**:
- Highlight newly added/updated rows with blue background for 2 seconds
- Show spinner and "Saving..." text on submit buttons
- Add smooth scale and shadow effects on button hover
- Display success toast with checkmark icon after operations

### 3. Mobile Responsiveness

**Component**: Responsive layout and navigation

**Interface**:
```javascript
// Responsive sidebar state
const [sidebarOpen, setSidebarOpen] = useState(() => {
  return window.innerWidth >= 1024; // Open by default on desktop
});

// Mobile-friendly table
<div className="overflow-x-auto">
  <table className="min-w-full">
    {/* Table content */}
  </table>
</div>
```

**Changes**:
- Hide sidebar by default on screens < 1024px
- Add hamburger menu button in TopNavigation
- Make inventory table horizontally scrollable on mobile
- Stack form fields vertically on small screens
- Adjust chatbot layout for mobile devices

### 4. Mock Feature Handling

**Component**: Navigation items with "Coming soon" feedback

**Interface**:
```javascript
const menuItems = [
  { label: "My Profile", path: "#", isMock: true },
  { label: "Settings", path: "#", isMock: true },
  { label: "Help & Support", path: "#", isMock: true },
];

const handleMockClick = (e, item) => {
  if (item.isMock) {
    e.preventDefault();
    toast.info(`${item.label} - Coming soon!`);
  }
};
```

**Changes**:
- Add `isMock` flag to incomplete menu items
- Show toast notification when clicked
- Keep items visible but non-functional
- Add subtle visual indicator (optional)

### 5. Firebase Security

**Component**: Environment configuration and security rules

**Interface**:
```javascript
// .env.local (not committed)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
// ... other config

// src/lib/firebase.js
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ... use env vars
};
```

**Changes**:
- Move Firebase config to environment variables
- Update .gitignore to exclude .env files
- Document API key restrictions in README
- Verify Firestore security rules are properly configured

### 6. UI Labeling Consistency

**Component**: Form labels and empty states

**Interface**:
```javascript
// Consistent label format
<label htmlFor="storeId" className="block text-sm font-medium mb-1">
  Store Location
</label>

// Empty state with guidance
{items.length === 0 && (
  <div className="text-center py-8">
    <p className="text-gray-600 mb-2">No items yet</p>
    <p className="text-sm text-gray-500">
      Add your first item using the form above
    </p>
  </div>
)}
```

**Changes**:
- Standardize "Store" vs "Location" terminology
- Use sentence case for labels
- Add helpful empty state messages
- Ensure all buttons have clear action verbs

### 7. Inventory Table Enhancements

**Component**: Table layout and interactions

**Interface**:
```javascript
// Truncate long text with tooltip
<div
  className="truncate max-w-xs"
  title={item.name}
>
  {item.name}
</div>

// Confirmation dialog
const handleDelete = async (id) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this item? This action cannot be undone."
  );
  if (!confirmed) return;
  // ... delete logic
};
```

**Changes**:
- Add `title` attribute for truncated text
- Improve column width distribution
- Add better confirmation dialog for delete
- Scroll to form when editing
- Show row count in table header

### 8. Chatbot Reliability

**Component**: ChatbotPanel with better error handling

**Interface**:
```javascript
// Typing indicator
{sending && (
  <div className="flex gap-1">
    <motion.span className="w-2 h-2 bg-gray-400 rounded-full" 
      animate={{ opacity: [0.4, 1, 0.4] }} />
    {/* ... more dots */}
  </div>
)}

// Error handling
try {
  const res = await fetch(detectUrl, { /* ... */ });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // ... process response
} catch (error) {
  setMessages(m => [...m, {
    role: "assistant",
    text: "I'm having trouble connecting. Please try again in a moment."
  }]);
}
```

**Changes**:
- Show animated typing indicator while processing
- Better error messages for different failure modes
- Add retry capability
- Display webhook configuration status
- Format multi-line responses properly

### 9. Page Transitions

**Component**: Smooth animations between routes

**Interface**:
```javascript
// Consistent page transition
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* Page content */}
</motion.div>

// Staggered list animations
<motion.div
  variants={{
    visible: {
      transition: { staggerChildren: 0.05 }
    }
  }}
>
  {items.map(item => (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
      }}
    >
      {/* Item content */}
    </motion.div>
  ))}
</motion.div>
```

**Changes**:
- Use consistent fade + slide transitions
- Stagger list item animations
- Keep animations under 300ms
- Add hover effects to interactive elements

### 10. Dashboard KPIs

**Component**: Real-time statistics display

**Interface**:
```javascript
// KPI calculation
const kpis = useMemo(() => {
  const totalItems = items.length;
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const lowStock = items.filter(item => item.qty <= 5).length;
  const categories = new Set(items.map(item => item.category)).size;
  
  return { totalItems, totalQty, lowStock, categories };
}, [items]);

// KPI display
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <KPICard label="Total Items" value={kpis.totalItems} />
  <KPICard label="Total Quantity" value={kpis.totalQty} />
  <KPICard label="Low Stock" value={kpis.lowStock} alert />
  <KPICard label="Categories" value={kpis.categories} />
</div>
```

**Changes**:
- Display 4 key metrics: Total Items, Total Qty, Low Stock, Categories
- Update in real-time with Firestore onSnapshot
- Highlight low stock count in red
- Show skeleton loaders while loading
- Add empty state with "Add sample data" button

## Data Models

No changes to existing data models. The improvements work with the current schema:

```typescript
// Inventory Item (existing)
interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  qty: number;
  reorderPoint: number;
  category: string;
  storeId: string;  // canonical
  storeName: string; // canonical
  StoreId: string;  // legacy compatibility
  StoreName: string; // legacy compatibility
  Keywords: string | string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Store (existing)
interface Store {
  id: string;
  storeName: string;
}

// User (existing)
interface User {
  uid: string;
  email: string;
  role: 'admin' | 'staff' | 'customer' | 'guest';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable properties from the prework analysis, I've identified the following consolidations:

**Redundancies to address:**
- Properties 2.1 and 2.5 both test success feedback - can be combined into one comprehensive property
- Properties 9.1, 9.2, 9.3, 9.4 all test animation behavior - can be consolidated
- Properties 3.1-3.5 are all mobile-specific examples - keep as examples, not properties

**Unique properties to keep:**
- Error handling (1.1, 1.3, 1.5)
- Visual feedback (2.2, 2.1+2.5 combined)
- Mock feature handling (4.1)
- UI consistency (6.1, 6.2, 6.4, 7.3)
- Chatbot reliability (8.2, 8.5)
- Animation consistency (9.1-9.4 combined)
- Dashboard updates (10.4, 10.5)

### Correctness Properties

Property 1: Error handling displays user-friendly messages
*For any* Firestore operation that fails, the system should display a toast message with user-friendly text and not crash the application
**Validates: Requirements 1.1**

Property 2: Form validation shows field-specific errors
*For any* form with invalid data, the system should display specific error messages for each invalid field
**Validates: Requirements 1.3**

Property 3: Submit buttons are disabled during save operations
*For any* form submission, the submit button should be disabled and show loading state until the operation completes
**Validates: Requirements 1.5**

Property 4: Successful operations show feedback
*For any* successful CRUD operation (add, update, delete), the system should show a success toast and highlight the affected row (for add/update)
**Validates: Requirements 2.1, 2.5**

Property 5: Form submissions show loading state
*For any* form being submitted, the submit button should display a spinner and "Saving..." text
**Validates: Requirements 2.2**

Property 6: Mock menu items show "Coming soon" toast
*For any* menu item marked as mock, clicking it should prevent navigation and show a "Coming soon" toast
**Validates: Requirements 4.1**

Property 7: Field labels use consistent formatting
*For any* form field label, it should use consistent capitalization (sentence case) and terminology
**Validates: Requirements 6.1**

Property 8: Buttons have clear action labels
*For any* button in the application, it should have a non-empty, action-oriented label (verb-based)
**Validates: Requirements 6.2**

Property 9: Empty states provide guidance
*For any* empty state (no data), the system should display helpful guidance text on what to do next
**Validates: Requirements 6.4**

Property 10: Long text is truncated with tooltips
*For any* text field that exceeds its container width, it should be truncated with ellipsis and show full text in a title tooltip
**Validates: Requirements 7.3**

Property 11: Chatbot responses are properly formatted
*For any* chatbot response message, it should preserve line breaks and display with proper spacing
**Validates: Requirements 8.2**

Property 12: Chatbot uses store context
*For any* chatbot inventory query, it should filter results based on the currently selected store context
**Validates: Requirements 8.5**

Property 13: Page transitions are consistent
*For any* route navigation, the system should apply consistent fade/slide animations with duration under 300ms
**Validates: Requirements 9.1, 9.4**

Property 14: Lists use staggered animations
*For any* list of items being rendered, the system should apply staggered animation delays to create a smooth appearance effect
**Validates: Requirements 9.2**

Property 15: Interactive elements have hover effects
*For any* interactive button or link, it should show scale or shadow effects on hover
**Validates: Requirements 9.3**

Property 16: Dashboard KPIs update in real-time
*For any* change to inventory data, the dashboard KPIs should recalculate and update automatically
**Validates: Requirements 10.4**

Property 17: Dashboard shows role-appropriate content
*For any* user role (admin, staff, customer), the dashboard should display content appropriate to that role's permissions
**Validates: Requirements 10.5**

## Error Handling

### Error Categories

1. **Network Errors**
   - Display: "Connection lost. Please check your internet and try again."
   - Action: Show retry button, maintain form state

2. **Firestore Errors**
   - Permission denied: "You don't have permission to perform this action."
   - Not found: "The requested item was not found."
   - Generic: "Something went wrong. Please try again."

3. **Validation Errors**
   - Display inline with red text below each field
   - Highlight invalid fields with red border
   - Prevent form submission until resolved

4. **Chatbot Errors**
   - Webhook not configured: "AI assistant is in demo mode."
   - Query failed: "I'm having trouble connecting. Please try again."
   - No results: "I couldn't find any items matching your query."

### Error Recovery

All errors should provide:
- Clear explanation of what went wrong
- Actionable next steps
- Ability to retry the operation
- Preservation of user input when possible

## Testing Strategy

### Unit Testing Approach

Since this is a demo-focused improvement with a 2-day timeline, we'll focus on **manual testing** rather than automated tests. Each improvement will be tested by:

1. **Visual Inspection**: Verify UI changes appear correctly
2. **Interaction Testing**: Click buttons, submit forms, navigate pages
3. **Error Simulation**: Test error handling by disconnecting network, entering invalid data
4. **Responsive Testing**: Check mobile view using browser dev tools
5. **Cross-browser Testing**: Test in Chrome and one other browser

### Testing Checklist for Each Improvement

**Before Demo:**
- [ ] Test happy path (normal usage)
- [ ] Test error cases (network failure, invalid input)
- [ ] Test on mobile viewport (< 768px)
- [ ] Test with empty data state
- [ ] Test with populated data

**Demo Scenarios to Prepare:**
1. Add new inventory item → Show success toast and highlight
2. Edit existing item → Show loading state, then success
3. Delete item → Show confirmation, then success
4. Search for items → Show filtered results
5. Ask chatbot about inventory → Show typing indicator, then response
6. Click mock menu item → Show "Coming soon" toast
7. View on mobile → Show responsive layout

### Property-Based Testing

Given the 2-day timeline, property-based testing is **optional**. If time permits after completing all improvements, we can add property tests for:
- Form validation logic
- Error message generation
- Animation timing calculations

However, **manual testing is sufficient** for the demo and should be prioritized.

## Implementation Priority

The improvements are ordered by impact and risk:

**Priority 1 (Critical - Do First):**
1. Error handling with toast messages (Requirement 1)
2. Button loading states (Requirement 2.2, 1.5)
3. Mock feature handling (Requirement 4)

**Priority 2 (High Impact - Do Second):**
4. Mobile responsiveness (Requirement 3)
5. Visual feedback - row highlighting (Requirement 2.1)

**Priority 3 (Polish - Do If Time Permits):**
6. Firebase security with env vars (Requirement 5)
7. UI labeling consistency (Requirement 6)
8. Chatbot improvements (Requirement 8)
9. Page transitions (Requirement 9)
10. Dashboard KPIs (Requirement 10)

## Deployment Strategy

### Pre-Demo Checklist

1. **Test locally** with `npm run dev`
2. **Build for production** with `npm run build`
3. **Test production build** with `npm run preview`
4. **Deploy to Firebase** with `firebase deploy`
5. **Verify deployed version** works correctly
6. **Prepare demo data** (sample inventory items)
7. **Test demo flow** end-to-end

### Rollback Plan

If any improvement causes issues:
1. Use git to revert the specific commit
2. Rebuild and redeploy
3. Each improvement is isolated, so reverting one won't affect others

### Demo Day Preparation

**Morning of Demo:**
- [ ] Verify site is accessible
- [ ] Check Firebase quota/limits
- [ ] Prepare demo account credentials
- [ ] Have backup slides ready
- [ ] Test internet connection

**During Demo:**
- Start with dashboard to show KPIs
- Demonstrate CRUD operations on inventory
- Show chatbot interaction
- Highlight mobile responsiveness
- Mention security best practices

## Success Metrics

The improvements will be considered successful if:

1. **No crashes during demo** - All errors handled gracefully
2. **Professional appearance** - Smooth animations, clear feedback
3. **Mobile works** - Responsive layout functions correctly
4. **Chatbot responds** - AI integration works reliably
5. **Evaluator impressed** - Positive feedback on polish and UX

## Notes for Implementation

- Each improvement is **independent** and can be implemented separately
- Test after each change before moving to the next
- Keep git commits small and focused (one improvement per commit)
- If something breaks, revert that commit and move on
- **Don't try to do everything** - prioritize based on time available
- The goal is a **working, polished demo**, not perfection
