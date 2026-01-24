import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma";

import { JWT_SECRET } from "../config";

export async function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return next();
    const token = auth.slice(7).trim();
    let payload: any;
    try {
      payload = (jwt as any).verify(token, JWT_SECRET);
    } catch (err) {
      return next();
    }

    if (!payload || typeof payload.sub === "undefined") return next();
    const userId = Number(payload.sub);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next();

    console.log("jwt middleware", user);

    (req as any).user = user;
    res.locals.user = user;
    return next();
  } catch (err) {
    console.error("jwt middleware error", err);
    return next();
  }
}


export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user) return res.status(401).json({ error: "unauthenticated" });
  next();
};

export default jwtMiddleware;
