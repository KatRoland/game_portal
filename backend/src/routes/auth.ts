import { Router } from "express";
import prisma from "../db/prisma";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 30 * 24 * 60 * 60 * 1000); // default 30 days
const ACCESS_TOKEN_EXP = process.env.ACCESS_TOKEN_EXP ?? "15m"; // JWT access token expiry
import { JWT_SECRET } from "../config";

const router = Router();

// GET /auth/discord/callback?code=... - Discord OAuth callback, létrehozza a felhasználót és bejelentkezteti
router.get("/discord/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    if (!code) return res.status(400).json({ error: "missing_code" });

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
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.create({ data: { token: crypto.randomBytes(16).toString("hex"), refreshToken, userId: dbUser.id, expiresAt } });

    // refresh cookie
    const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
    const cookieParts = [
      `refresh=${encodeURIComponent(refreshToken)}`,
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
    const FRONTEND_REDIRECT = process.env.FRONTEND_REDIRECT;
    let redirectTo: string | null = null;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    if (FRONTEND_REDIRECT) {
      if (state && state.startsWith("/")) {
        redirectTo = `${FRONTEND_REDIRECT.replace(/\/$/, "")}${state}`;
      } else {
        redirectTo = FRONTEND_REDIRECT;
      }
    }

    if (redirectTo) {
      // redirect with access token
      const frag = `access_token=${encodeURIComponent(accessTokenJwt)}&scope=${encodeURIComponent(tokenJson.scope ?? "")}`;
      return res.redirect(`${redirectTo}#${frag}`);
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
    const refresh = cookies["refresh"];
    if (!refresh) return res.status(401).json({ error: "missing_refresh" });

    const session = await prisma.session.findUnique({ where: { refreshToken: refresh }, include: { user: true } });
    if (!session || session.revoked) return res.status(401).json({ error: "invalid_refresh" });
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => { });
      return res.status(401).json({ error: "expired_refresh" });
    }

    // rotate refresh token -- Ideiglenesen nem használt
    // const newRefresh = crypto.randomBytes(48).toString("hex");
    // await prisma.session.update({ where: { id: session.id }, data: { refreshToken: newRefresh } });

    // // új cookie
    // const maxAgeSec2 = Math.floor(SESSION_TTL_MS / 1000);
    // const cookieParts2 = [
    //   `refresh=${encodeURIComponent(newRefresh)}`,
    //   `Path=/`,
    //   `HttpOnly`,
    //   `SameSite=Lax`,
    //   `Max-Age=${maxAgeSec2}`,
    // ];
    // if (process.env.COOKIE_SECURE === "true") cookieParts2.push("Secure");
    // res.setHeader("Set-Cookie", cookieParts2.join("; "));

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
    const refresh = cookies["refresh"];
    if (refresh) {
      await prisma.session.deleteMany({ where: { refreshToken: refresh } }).catch(() => { });
    }
    // clear cookie
    res.setHeader("Set-Cookie", [`refresh=; Path=/; HttpOnly; Max-Age=0`]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("logout error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
