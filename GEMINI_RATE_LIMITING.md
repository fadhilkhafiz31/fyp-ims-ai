# Gemini API Rate Limiting Guide

## Overview
This document explains the rate limiting system implemented to prevent exceeding Gemini API free tier credits.

## Rate Limits Configuration

The rate limits are configured in `function-ai/index.js`:

```javascript
const RATE_LIMITS = {
  DAILY_LIMIT: 50,        // Max requests per day
  MONTHLY_LIMIT: 1000,    // Max requests per month
  PER_MINUTE_LIMIT: 5,    // Max requests per minute (per user)
  PER_HOUR_LIMIT: 20,     // Max requests per hour (per user)
};
```

## How It Works

### 1. Global Usage Tracking (Firestore)
- Tracks daily and monthly request counts in Firestore collection `gemini_usage`
- Document ID: `global`
- Automatically resets daily limits at midnight
- Monthly limits reset at the start of each month

### 2. Per-User Rate Limiting
- In-memory cache tracks requests per user
- Limits:
  - **5 requests per minute** per user
  - **20 requests per hour** per user
- Cache resets when Firebase Functions restart

### 3. Error Responses
When limits are exceeded, the API returns:
- **HTTP 429 (Too Many Requests)**
- Error message explaining which limit was reached

## Adjusting Limits

To change the limits, edit the `RATE_LIMITS` object in `function-ai/index.js`:

```javascript
const RATE_LIMITS = {
  DAILY_LIMIT: 100,       // Increase daily limit
  MONTHLY_LIMIT: 2000,    // Increase monthly limit
  PER_MINUTE_LIMIT: 10,   // Increase per-minute limit
  PER_HOUR_LIMIT: 50,     // Increase per-hour limit
};
```

After making changes, redeploy:
```bash
firebase deploy --only functions
```

## Monitoring Usage

### View Usage in Firestore
1. Go to Firebase Console → Firestore Database
2. Navigate to `gemini_usage` collection
3. Open `global` document
4. View daily/monthly counts

### Usage Data Structure
```json
{
  "2025-01-15": 25,           // Daily count for Jan 15
  "2025-01": 450,              // Monthly count for January
  "lastRequest": "timestamp",  // Last request timestamp
  "totalRequests": 5000        // Total requests ever
}
```

### API Response Includes Usage Info
Each successful API response includes usage information:
```json
{
  "response": "AI response text...",
  "model": "gemini-2.5-flash",
  "timestamp": "2025-01-15T10:30:00Z",
  "usage": {
    "dailyRemaining": 25,
    "monthlyRemaining": 550,
    "dailyUsed": 25,
    "monthlyUsed": 450
  }
}
```

## Free Tier Considerations

### Google Gemini Free Tier Limits
- **15 requests per minute** (RPM)
- **1,500 requests per day** (RPD)
- **50 requests per minute per user** (RPMU)

### Recommended Settings for Free Tier
```javascript
const RATE_LIMITS = {
  DAILY_LIMIT: 50,        // Conservative: 50/day (well below 1,500)
  MONTHLY_LIMIT: 1000,    // Conservative: 1,000/month
  PER_MINUTE_LIMIT: 5,    // Conservative: 5/min (well below 15)
  PER_HOUR_LIMIT: 20,     // Conservative: 20/hour
};
```

## Troubleshooting

### "Rate limit exceeded" errors
1. Check Firestore `gemini_usage` collection
2. Verify daily/monthly counts
3. Wait for reset (daily at midnight, monthly at month start)
4. Adjust limits if needed

### Reset Usage Counters
To manually reset counters:
1. Go to Firestore Console
2. Delete or update `gemini_usage/global` document
3. Or delete specific date/month keys

### Disable Rate Limiting (Not Recommended)
To temporarily disable rate limiting, comment out the checks in `geminiHandler`:
```javascript
// Comment out these lines:
// checkUserRateLimit(userId);
// usageInfo = await checkAndUpdateUsage();
```

**Warning**: This may cause you to exceed free tier limits and incur charges.

## Best Practices

1. **Monitor regularly**: Check Firestore usage weekly
2. **Set conservative limits**: Start lower, increase if needed
3. **Use caching**: Consider caching common responses
4. **Optimize prompts**: Shorter prompts = lower costs
5. **Track costs**: Monitor Google Cloud Console for actual API usage

## Support

If you need to adjust limits or have questions:
1. Review this document
2. Check Firestore usage data
3. Adjust `RATE_LIMITS` as needed
4. Redeploy functions

