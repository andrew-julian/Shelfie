import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import { storage } from './storage.js';
import type { User } from '../shared/schema.js';

// Environment variables will be checked when setupGoogleAuth is called

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(profile: any): Promise<User> {
  // Use email-based identification - don't pass provider-specific ID
  const userData = {
    email: profile.emails?.[0]?.value || null,
    firstName: profile.name?.givenName || null,
    lastName: profile.name?.familyName || null,
    profileImageUrl: profile.photos?.[0]?.value || null,
  };

  return await storage.upsertUser(userData);
}

export async function setupGoogleAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Missing required environment variable: GOOGLE_CLIENT_ID');
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing required environment variable: GOOGLE_CLIENT_SECRET');
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Determine callback URL based on environment
  const callbackURL = process.env.NODE_ENV === 'production' 
    ? '/api/auth/google/callback' // Vercel will handle the domain automatically
    : `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await upsertUser(profile);
      return done(null, user);
    } catch (error) {
      console.error('Error during Google OAuth:', error);
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User ${id} not found during session deserialization`);
        return done(null, false); // This will log out the user automatically
      }
      done(null, user);
    } catch (error) {
      console.error(`Failed to deserialize user ${id}:`, error instanceof Error ? error.message : error);
      done(null, false); // This will log out the user automatically instead of crashing
    }
  });

  // Auth routes
  app.get('/api/login', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'consent select_account'
  }));

  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      // Successful authentication, redirect to home
      res.redirect('/');
    }
  );

  app.get('/api/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
        
        // Clear all possible session cookies - mobile browsers can be finicky
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
          path: '/',
        };
        
        res.clearCookie('connect.sid', cookieOptions);
        res.clearCookie('connect.sid', { path: '/' }); // Fallback without options
        res.clearCookie('session', cookieOptions); // Alternative session cookie name
        res.clearCookie('session', { path: '/' }); // Fallback for alternative name
        
        // Clear any potential Google OAuth cookies
        res.clearCookie('oauth2_state', { path: '/' });
        res.clearCookie('oauth2_callback', { path: '/' });
        
        res.redirect('/');
      });
    });
  });

  // Force logout and session cleanup endpoint
  app.get('/api/force-logout', (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
        
        // Clear all possible session cookies - mobile browsers can be finicky
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
          path: '/',
        };
        
        res.clearCookie('connect.sid', cookieOptions);
        res.clearCookie('connect.sid', { path: '/' });
        res.clearCookie('session', cookieOptions);
        res.clearCookie('session', { path: '/' });
        res.clearCookie('oauth2_state', { path: '/' });
        res.clearCookie('oauth2_callback', { path: '/' });
        
        res.json({ message: 'Session forcefully cleared' });
      });
    });
  });
}

// Middleware with development bypass for Replit preview
// In development, auto-create a dev user for unauthenticated requests
// This allows the app to work in Replit preview (where Google OAuth fails in iframes)
// Production always requires proper Google OAuth
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // If authenticated normally via Google OAuth, allow
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Development mode: create a dev user for preview/testing
  // This is safe because:
  // - Development database is isolated from production
  // - Only accessible on Replit workspace (not public internet)
  // - Vercel/production deployment uses NODE_ENV=production
  if (process.env.NODE_ENV === 'development') {
    try {
      const devUser = await storage.upsertUser({
        email: 'dev@shelfie.local',
        firstName: 'Dev',
        lastName: 'User',
        profileImageUrl: null,
      });
      
      // Attach user to request
      (req as any).user = devUser;
      return next();
    } catch (error) {
      console.error('Failed to create dev user:', error);
    }
  }
  
  res.status(401).json({ message: 'Unauthorized' });
};