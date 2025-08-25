import { OAuth2Client } from 'google-auth-library';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import type { User } from '@shared/schema';

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing required environment variable: GOOGLE_CLIENT_ID');
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing required environment variable: GOOGLE_CLIENT_SECRET');
}

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
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(profile: any): Promise<User> {
  const userData = {
    id: profile.id,
    email: profile.emails?.[0]?.value || null,
    firstName: profile.name?.givenName || null,
    lastName: profile.name?.familyName || null,
    profileImageUrl: profile.photos?.[0]?.value || null,
  };

  return await storage.upsertUser(userData);
}

export async function setupGoogleAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Determine callback URL based on environment
  const getCallbackURL = (req: any) => {
    if (process.env.NODE_ENV === 'production') {
      // For production (Vercel), use the request host
      return `https://${req.get('host')}/api/auth/google/callback`;
    } else {
      // For development (Replit), use the dev domain
      return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
    }
  };

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: '/api/auth/google/callback', // This will be dynamically set
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await upsertUser(profile);
      return done(null, user);
    } catch (error) {
      console.error('Error during Google OAuth:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Auth routes
  app.get('/api/login', (req, res, next) => {
    const callbackURL = getCallbackURL(req);
    const authenticator = passport.authenticate('google', {
      scope: ['profile', 'email'],
      callbackURL
    });
    authenticator(req, res, next);
  });

  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      // Successful authentication, redirect to home
      res.redirect('/');
    }
  );

  app.get('/api/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};