import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { sendOtpEmail } from "./mailer";

const scryptAsync = promisify(scrypt);

/* ================= PASSWORD UTILS ================= */

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/* ================= AUTH SETUP ================= */

export function setupAuth(app: Express) {
  /* ---------- SESSION (MySQL-safe) ---------- */
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "docmind_dev_secret",
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  /* ---------- PASSPORT STRATEGY ---------- */

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  /* ================= ROUTES ================= */

  /* ---------- SIGNUP ---------- */
  app.post("/api/auth/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedPassword = await hashPassword(password);

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        isVerified: false,
        otp,
      });

      // ✅ SEND REAL EMAIL OTP
      await sendOtpEmail(user.email, otp);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          message: "OTP sent to your email. Please verify.",
          email: user.email,
        });
      });
    } catch (err) {
      next(err);
    }
  });

  /* ---------- LOGIN ---------- */
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({
          message: info?.message || "Authentication failed",
        });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        const u = user as User;
        res.json({
          id: u.id,
          email: u.email,
          name: u.name,
          isVerified: u.isVerified,
        });
      });
    })(req, res, next);
  });

  /* ---------- VERIFY OTP ---------- */
  app.post("/api/auth/verify-otp", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { otp } = req.body;
    const user = req.user as User;

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    if (user.otp === otp) {
      await storage.verifyUser(user.id);
      res.json({ message: "Email verified successfully" });
    } else {
      res.status(400).json({ message: "Invalid OTP" });
    }
  });

  /* ---------- LOGOUT ---------- */
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  /* ---------- CURRENT USER ---------- */
  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send();
    }
    const user = req.user as User;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
    });
  });
}
