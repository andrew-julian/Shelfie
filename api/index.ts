import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import path from "path";
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Webhook needs raw body, so handle it BEFORE other body parsers
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the client build
const clientDistPath = path.join(__dirname, '../client/dist');
console.log('Serving static files from:', clientDistPath);
app.use(express.static(clientDistPath));

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Catch-all handler: send back client's index.html file for SPA routing
  app.get('*', (_req: Request, res: Response) => {
    const indexPath = path.join(clientDistPath, 'index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  });
})();

// Export the app for Vercel
export default app;