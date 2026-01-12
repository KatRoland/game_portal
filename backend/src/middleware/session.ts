import type { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";

function parseCookies(cookieHeader?: string | null) {
  const obj: Record<string, string> = {};
  if (!cookieHeader) return obj;
  const parts = cookieHeader.split(";").map((s) => s.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx > -1) {
      const k = decodeURIComponent(p.slice(0, idx).trim());
      const v = decodeURIComponent(p.slice(idx + 1).trim());
      obj[k] = v;
    }
  }
  return obj;
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie ?? null);
    const sid = cookies["sid"];
    console.log(`${req.method} ${req.url} ${sid}`)
    if (!sid) return next();

    const session = await prisma.session.findUnique({ where: { token: sid }, include: { user: true } });
    if (!session) return next();

    if (session.expiresAt < new Date()) {
      try {
        await prisma.session.delete({ where: { id: session.id } });
      } catch { }
      return next();
    }

    (req as any).user = session.user;
    res.locals.user = session.user;
    res.locals.session = session;
    return next();
  } catch (err) {
    console.error("session middleware error", err);
    return next();
  }
}

export default sessionMiddleware;
