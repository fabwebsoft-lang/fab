import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "../../shared/const";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/dev-login", async (req: Request, res: Response) => {
    try {
      const devOpenId = "dev-owner-asfaq";
      const devName = "Ashfaq";
      const devEmail = "asfaq94.md@gmail.com";

      await db.upsertUser({
        openId: devOpenId,
        name: devName,
        email: devEmail,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(devOpenId, {
        name: devName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (err: any) {
      console.error("[OAuth] Dev login error:", err);
      res.status(500).json({ error: "Dev login failed" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const { nonce, redirectUri } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(OAUTH_STATE_COOKIE, { ...cookieOptions, maxAge: -1 });

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
      const callbackUrl = redirectUri || `${req.protocol}://${req.get("host")}/api/oauth/callback`;

      // 1. Exchange code for access token
      const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      });

      const accessToken = tokenRes.data.access_token;

      // 2. Fetch profile from Google OIDC UserInfo
      const userRes = await axios.get("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const googleUser = userRes.data;
      const openId = googleUser.sub;
      if (!openId) {
        res.status(400).json({ error: "sub missing from user info" });
        return;
      }

      const userName = googleUser.name || googleUser.email?.split("@")[0] || "Shop Owner";
      const userEmail = googleUser.email || null;

      await db.upsertUser({
        openId,
        name: userName,
        email: userEmail,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error: any) {
      console.error("[OAuth] Google OAuth callback failed:", error?.response?.data || error.message || error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

