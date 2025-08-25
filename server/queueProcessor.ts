import { log } from "./vite";

// Queue processor that runs in development environments
export function startQueueProcessor() {
  log("🚀 Starting background queue processor...");
  
  // Process queue every 10 seconds for faster response
  const PROCESSING_INTERVAL = 10 * 1000;
  
  setInterval(async () => {
    try {
      // Make a request to our internal processing endpoint
      const response = await fetch('http://localhost:5000/api/internal/scanning-queue/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Queue processing failed:', response.statusText);
      }
    } catch (error) {
      // Silent fail - don't spam logs if server isn't ready yet
      // console.error('Queue processor error:', error);
    }
  }, PROCESSING_INTERVAL);
  
  log(`✅ Queue processor started - checking every ${PROCESSING_INTERVAL / 1000}s`);
}