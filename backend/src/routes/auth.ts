import { Router } from "express";
import prisma from "../db/prisma";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 30 * 24 * 60 * 60 * 1000); // default 30 days
const ACCESS_TOKEN_EXP = process.env.ACCESS_TOKEN_EXP ?? "15m"; // JWT access token expiry
import { JWT_SECRET } from "../config";

const router = Router();

// GET /auth/discord/login - Initiates the OAuth flow securely
router.get("/discord/login", (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: "discord_oauth_not_configured" });
  }

  const state = crypto.randomBytes(16).toString("hex");

  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
  });

  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : "";
  if (returnTo && returnTo.startsWith("/")) {
    res.cookie("oauth_redirect", returnTo, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 5 * 60 * 1000,
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    state: state,
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// GET /auth/discord/callback?code=... - Discord OAuth callback, létrehozza a felhasználót és bejelentkezteti
router.get("/discord/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    if (!code) return res.status(400).json({ error: "missing_code" });
    if (!state) return res.status(400).json({ error: "missing_state" });

    const storedState = getCookie(req, "oauth_state");
    if (!storedState || storedState !== state) {
      return res.status(403).json({ error: "invalid_state" });
    }

    res.clearCookie("oauth_state");

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).json({ error: "discord_oauth_not_configured" });
    }

    // auth code -> access token
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);

    const tokenResp = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      return res.status(502).json({ error: "token_exchange_failed", details: text });
    }

    const tokenJson = await tokenResp.json();
    const discordAccessToken = tokenJson.access_token as string;

    // fiók lekérése
    const userResp = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${discordAccessToken}` },
    });

    if (!userResp.ok) {
      const text = await userResp.text();
      return res.status(502).json({ error: "fetch_user_failed", details: text });
    }

    const discordUser = await userResp.json();

    // DB Upsert
    const dbUser = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar ?? null,
        email: discordUser.email ?? null,
      },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar ?? null,
        email: discordUser.email ?? null,
        isAdmin: false
      },
    });

    // session létrehozása
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await prisma.session.create({
      data: {
        token: crypto.randomBytes(16).toString("hex"),
        refreshToken: hashedRefresh,
        userId: dbUser.id,
        expiresAt
      }
    });

    // refresh cookie - format: sessionId:refreshToken
    const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
    const cookieParts = [
      `refresh=${encodeURIComponent(`${session.id}:${refreshToken}`)}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${maxAgeSec}`,
    ];
    if (process.env.COOKIE_SECURE === "true") cookieParts.push("Secure");
    res.setHeader("Set-Cookie", cookieParts.join("; "));

    // JWT access token
    const accessTokenJwt = (jwt as any).sign({ sub: String(dbUser.id) }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });

    // redirect
    // redirect
    const FRONTEND_REDIRECT = process.env.FRONTEND_REDIRECT;
    let redirectTo: string | null = null;

    // Retrieve original redirect path from cookie
    const storedRedirect = getCookie(req, "oauth_redirect");
    res.clearCookie("oauth_redirect");

    if (FRONTEND_REDIRECT) {
      if (storedRedirect && storedRedirect.startsWith("/")) {
        redirectTo = `${FRONTEND_REDIRECT.replace(/\/$/, "")}${storedRedirect}`;
      } else {
        redirectTo = FRONTEND_REDIRECT;
      }
    }

    if (redirectTo) {
      // Redirect without sensitive token in URL.
      // The client works by having the 'refresh_token' cookie set (HttpOnly).
      // The client will automatically call /auth/refresh to get the access token.
      return res.redirect(redirectTo);
    }

    return res.json({ user: dbUser, accessToken: accessTokenJwt, scope: tokenJson.scope });
  } catch (err) {
    console.error("Discord callback error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// POST /auth/refresh - refresh token frissítése, JWT access token adás
router.post("/refresh", async (req, res) => {
  try {
    const cookies = req.headers.cookie?.split(";").map((s) => s.trim()).reduce<Record<string, string>>((acc, cur) => {
      const idx = cur.indexOf("=");
      if (idx > -1) acc[cur.slice(0, idx)] = decodeURIComponent(cur.slice(idx + 1));
      return acc;
    }, {}) ?? {};
    const refreshCookie = cookies["refresh"];
    if (!refreshCookie) return res.status(401).json({ error: "missing_refresh" });

    // Parse session_id:token
    const parts = refreshCookie.split(':');
    if (parts.length !== 2) return res.status(401).json({ error: "invalid_refresh_format" });

    const sessionId = parseInt(parts[0]);
    const refreshToken = parts[1];

    if (isNaN(sessionId)) return res.status(401).json({ error: "invalid_session_id" });

    // Find session by ID
    const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });

    if (!session || session.revoked) return res.status(401).json({ error: "invalid_refresh" });

    // Verify hash
    const isValid = await bcrypt.compare(refreshToken, session.refreshToken);
    if (!isValid) return res.status(401).json({ error: "invalid_refresh_token" });

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => { });
      return res.status(401).json({ error: "expired_refresh" });
    }

    // Rotate refresh token
    const newRefresh = crypto.randomBytes(48).toString("hex");
    const newHash = await bcrypt.hash(newRefresh, 10);

    // Update session with new hash
    await prisma.session.update({ where: { id: session.id }, data: { refreshToken: newHash } });

    // New cookie
    const maxAgeSec2 = Math.floor(SESSION_TTL_MS / 1000);
    const cookieParts2 = [
      `refresh=${encodeURIComponent(`${session.id}:${newRefresh}`)}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${maxAgeSec2}`,
    ];
    if (process.env.COOKIE_SECURE === "true") cookieParts2.push("Secure");
    res.setHeader("Set-Cookie", cookieParts2.join("; "));

    // issue new access token
    const accessToken2 = (jwt as any).sign({ sub: String(session.userId) }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
    return res.json({ accessToken: accessToken2 });
  } catch (err) {
    console.error("refresh error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// POST /auth/logout - session törlése, cookie törlése
router.post("/logout", async (req, res) => {
  try {
    const cookies = req.headers.cookie?.split(";").map((s) => s.trim()).reduce<Record<string, string>>((acc, cur) => {
      const idx = cur.indexOf("=");
      if (idx > -1) acc[cur.slice(0, idx)] = decodeURIComponent(cur.slice(idx + 1));
      return acc;
    }, {}) ?? {};
    const refreshCookie = cookies["refresh"];
    if (refreshCookie) {
      const parts = refreshCookie.split(':');
      if (parts.length === 2 && !isNaN(parseInt(parts[0]))) {
        await prisma.session.delete({ where: { id: parseInt(parts[0]) } }).catch(() => { });
      }
    }
    // clear cookie
    res.setHeader("Set-Cookie", [`refresh=; Path=/; HttpOnly; Max-Age=0`]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("logout error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Helper to parse cookies from header
function getCookie(req: any, name: string): string | undefined {
  const cookies = req.headers.cookie?.split(";").map((s: string) => s.trim()).reduce((acc: Record<string, string>, cur: string) => {
    const idx = cur.indexOf("=");
    if (idx > -1) acc[cur.slice(0, idx)] = decodeURIComponent(cur.slice(idx + 1));
    return acc;
  }, {}) ?? {};
  return cookies[name];
}

export default router;
