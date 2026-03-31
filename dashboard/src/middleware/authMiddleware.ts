import { NextFunction, Request, Response } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.redirect("/login");
    return;
  }
  res.locals.currentUser = req.session.username;
  next();
}
