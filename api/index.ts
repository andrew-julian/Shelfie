// Vercel serverless function entry point
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes.js";

// Create app instance
const app = express();

// Set trust proxy for Vercel
app.set('trust proxy', 1);

// Webhook needs raw body, so handle it BEFORE other body parsers
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize routes
let routesRegistered = false;

const initializeApp = async () => {
  if (!routesRegistered) {
    await registerRoutes(app);
    routesRegistered = true;
  }
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error('Server error:', err);
  });
};

// Vercel handler function
export default async function handler(req: Request, res: Response) {
  await initializeApp();
  return app(req, res);
}