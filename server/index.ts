import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { setupPassport } from "./auth";

const app = express();
// Trust the first reverse proxy (Codespaces / Cloud IDE) so secure cookies work
// when the app is behind a proxy that terminates TLS. This allows
// `cookie.secure = true` to function correctly when proxied from HTTPS.
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cast middleware results to `any` to avoid TypeScript overload mismatch
// errors caused by duplicate express type definitions in some environments.
app.use((session({
  secret:
    process.env.SESSION_SECRET ||
    "default-dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}) as unknown) as any);

app.use((passport.initialize() as unknown) as any);
app.use((passport.session() as unknown) as any);

setupPassport();

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Seed example data
  storage.seedExampleData();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Stále používame port 3000
  const port = parseInt(process.env.PORT || "3000", 10);
  
  // === OPRAVA KROK 3: Zjednodušenie volania .listen() ===
  // Odstránili sme 'host', 'reusePort' a objektovú notáciu.
  // Použijeme najzákladnejšiu formu: server.listen(port, host, callback)
  // '127.0.0.1' je dôležité pre Windows
  server.listen(port, "127.0.0.1", () => {
      log(`serving on http://localhost:${port}`);
    }
  );
})();
