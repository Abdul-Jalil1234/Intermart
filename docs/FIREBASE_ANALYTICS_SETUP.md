# Firebase Analytics Implementation Guide

## Overview

This project now includes comprehensive Firebase Analytics tracking for all major e-commerce events. The analytics system tracks user behavior both in development and production environments.

## Setup Instructions

### 1. Firebase Configuration

Add the following environment variables to your `.env.local` file:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-your_measurement_id
```

### 2. Environment Variable for Base URL

For server-side analytics tracking, add:

```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
# For development: http://localhost:3000
```

## Tracked Events

### Cart Events

- **add_to_cart**: When user adds product to cart
- **remove_from_cart**: When user removes product from cart
- **view_cart**: When user views cart page
- **begin_checkout**: When user starts checkout process

### Order Events

- **order_placed**: When order is successfully created
- **order_status_update**: When admin updates order status

### User Events

- **user_registration**: When new user registers/applies for premium
- **user_login**: When user signs in (can be added to sign-in flow)

### Product Events

- **view_product**: When user views product detail page
- **view_category**: When user views category page
- **search**: When user performs search

### Wishlist Events

- **add_to_wishlist**: When user adds product to wishlist
- **remove_from_wishlist**: When user removes product from wishlist

## Implementation Details

### Client-Side Tracking

Client-side events are tracked using the Firebase Analytics SDK:

```typescript
import { trackAddToCart } from "@/lib/analytics";

trackAddToCart({
  productId: product._id,
  name: product.name,
  price: product.price,
  quantity: 1,
});
```

### Server-Side Tracking

Server-side events are tracked via API calls to `/api/analytics/track`:

```typescript
await fetch("/api/analytics/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    eventName: "order_placed",
    eventParams: {
      orderId: order._id,
      amount: totalAmount,
      status: "pending",
      userId: userId,
    },
  }),
});
```

## Files Modified

### Core Analytics Files

- `lib/firebase.ts` - Firebase configuration and initialization
- `lib/analytics.ts` - Central analytics service with all tracking functions
- `app/api/analytics/track/route.ts` - Server-side analytics tracking API

### Cart Tracking

- `components/AddToCartButton.tsx` - Tracks add to cart from product pages
- `components/QuantityButtons.tsx` - Tracks add/remove from quantity controls
- `components/cart/ClientCartContent.tsx` - Tracks cart views
- `components/cart/CheckoutButton.tsx` - Tracks checkout started

### Order Tracking

- `app/api/orders/route.ts` - Tracks order placement
- `app/api/admin/orders/[id]/route.ts` - Tracks order status updates

### Product Tracking

- `components/ProductContent.tsx` - Tracks product views

### User Tracking

- `app/api/user/status/route.ts` - Tracks user registration

## Event Parameters

### Standard Parameters

- `userId` - User ID when available
- `timestamp` - Automatically added by Firebase

### Product Events

- `productId` - Product ID
- `name` - Product name
- `price` - Product price
- `quantity` - Quantity (for cart events)

### Order Events

- `orderId` - Order ID
- `orderNumber` - Human-readable order number
- `amount` - Order total amount
- `status` - Order status
- `paymentMethod` - Payment method used
- `itemCount` - Number of items in order

### Cart Events

- `cartValue` - Total cart value
- `itemCount` - Number of items in cart

## Development vs Production

### Development Mode

- Events are logged to console for debugging
- All tracking functions work normally
- Firebase Analytics may not capture events until project is properly configured

### Production Mode

- Events are sent to Firebase Analytics
- Console logging is disabled
- Real-time analytics data appears in Firebase Console

## Viewing Analytics Data

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Analytics > Events
4. View real-time and historical event data
5. Create custom audiences and funnels based on events

## Custom Events

To add new custom events:

1. Add type definitions in `lib/analytics.ts`
2. Create tracking function in `lib/analytics.ts`
3. Call the function where the event occurs
4. Test in development mode via console logs

Example:

```typescript
export function trackCustomEvent(params: {
  eventParam: string;
  userId?: string;
}) {
  trackEvent("custom_event", params);
}
```

## Troubleshooting

### Events Not Appearing in Firebase

- Check environment variables are set correctly
- Verify Firebase project configuration
- Ensure Analytics is enabled in Firebase Console
- Check browser console for errors

### Development Issues

- Events should appear in console logs in development
- Check network tab for failed API calls to `/api/analytics/track`
- Verify Firebase SDK is loading properly

### Production Issues

- Check Firebase project permissions
- Verify NEXT_PUBLIC_BASE_URL is set correctly
- Monitor server logs for analytics API errors

## Best Practices

1. **Privacy**: Only track necessary data and respect user privacy
2. **Performance**: Analytics tracking is non-blocking and won't affect UX
3. **Data Quality**: Use consistent naming and parameter structures
4. **Testing**: Test all events in development before deploying
5. **Monitoring**: Set up alerts for critical events like orders and registrations
