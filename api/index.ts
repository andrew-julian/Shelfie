// Vercel serverless function entry point
import "../server/index.js";

// Export the app that was initialized in server/index.ts
export default (global as any).app;