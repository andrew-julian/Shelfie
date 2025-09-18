import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage.js";

// Only require REPLIT_DOMAINS in development environment
if (process.env.NODE_ENV === 'development' && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
): Promise<any> {
  // Use email-based identification - don't pass provider-specific ID
  return await storage.upsertUser({
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Only setup Replit OAuth in development
  if (process.env.NODE_ENV === 'development' && process.env.REPLIT_DOMAINS) {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      const dbUser = await upsertUser(tokens.claims());
      verified(null, dbUser);
    };

    // Register strategies for all configured domains
    const domains = process.env.REPLIT_DOMAINS.split(",").map(d => d.trim());
    for (const domain of domains) {
      // Ensure domain doesn't already include protocol
      const cleanDomain = domain.replace(/^https?:\/\//, '');
      const callbackURL = `https://${cleanDomain}/api/callback`;
      
      const strategy = new Strategy(
        {
          name: `replitauth:${cleanDomain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL,
        },
        verify,
      );
      passport.use(strategy);
      console.log(`Registered auth strategy for domain: ${cleanDomain}, callback: ${callbackURL}`);
    }
    
    // Also register a fallback strategy for any hostname
    const firstDomain = process.env.REPLIT_DOMAINS.split(",")[0].trim().replace(/^https?:\/\//, '');
    const fallbackCallbackURL = `https://${firstDomain}/api/callback`;
    const fallbackStrategy = new Strategy(
      {
        name: "replitauth:fallback",
        config,
        scope: "openid email profile offline_access",
        callbackURL: fallbackCallbackURL,
      },
      verify,
    );
    passport.use(fallbackStrategy);
    console.log(`Registered fallback auth strategy, callback: ${fallbackCallbackURL}`);
    console.log("✓ Replit OAuth configured for development");
  }

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User ${id} not found during session deserialization`);
        return cb(null, false);
      }
      cb(null, user);
    } catch (error) {
      console.error(`Failed to deserialize user ${id}:`, error instanceof Error ? error.message : error);
      cb(null, false);
    }
  });

  app.get("/api/login", (req, res, next) => {
    // In development, use Replit OAuth
    if (process.env.NODE_ENV === 'development' && process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(",").map(d => d.trim().replace(/^https?:\/\//, ''));
      const hostname = req.hostname;
      const strategyName = domains.includes(hostname) 
        ? `replitauth:${hostname}` 
        : "replitauth:fallback";
      
      console.log(`Login attempt for hostname: ${hostname}, configured domains: ${domains.join(', ')}, using strategy: ${strategyName}`);
      
      passport.authenticate(strategyName, {
        prompt: "login consent select_account",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } else {
      // In production, redirect to Google OAuth
      res.redirect('/api/auth/google');
    }
  });

  app.get("/api/callback", (req, res, next) => {
    // Only handle Replit callback in development
    if (process.env.NODE_ENV === 'development' && process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(",").map(d => d.trim().replace(/^https?:\/\//, ''));
      const hostname = req.hostname;
      const strategyName = domains.includes(hostname) 
        ? `replitauth:${hostname}` 
        : "replitauth:fallback";
      
      console.log(`Callback for hostname: ${hostname}, using strategy: ${strategyName}`);
      
      passport.authenticate(strategyName, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    } else {
      // In production, this should be handled by Google OAuth routes
      res.status(404).json({ message: "Callback not available in production" });
    }
  });

  app.get("/api/logout", (req, res) => {
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
        
        if (process.env.NODE_ENV === 'development' && process.env.REPLIT_DOMAINS) {
          // Development logout with Replit
          res.redirect("/");
        } else {
          // Production logout - redirect to home
          res.redirect("/");
        }
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For Replit OAuth, we rely on session-based auth without token expiration
  // Only check token expiration if expires_at exists (for other OAuth providers)
  if (user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      // Token expired, try to refresh
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
      } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
    }
  }

  return next();
};