import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "please_set_a_secret_in_env";

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

    (req as any).user = user;
    res.locals.user = user;
    return next();
  } catch (err) {
    console.error("jwt middleware error", err);
    return next();
  }
}

export default jwtMiddleware;
