// Analytics event tracking
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Console log for development - replace with actual analytics service in production
  console.log(`Analytics event: ${eventName}`, properties);
  
  // Example implementation for various analytics services:
  
  // Google Analytics 4
  // gtag('event', eventName, properties);
  
  // Mixpanel
  // mixpanel.track(eventName, properties);
  
  // Segment
  // analytics.track(eventName, properties);
  
  // Custom analytics endpoint
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ event: eventName, properties })
  // });
};

// Predefined event types from specification
export const analyticsEvents = {
  CLICK_CTA_PRIMARY: 'click_cta_primary',
  CLICK_CTA_SECONDARY: 'click_cta_secondary',
  SCROLLED_50: 'scrolled_50',
  OPEN_PRICING: 'open_pricing',
  START_DEMO: 'start_demo',
  FAQ_OPEN: (questionId: string) => `faq_open_${questionId}`,
} as const;