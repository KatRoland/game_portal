import { Request, Response, NextFunction } from "express";

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "unauthenticated" });
    if (!user.isAdmin) return res.status(403).json({ error: "forbidden" });
    next();
};
