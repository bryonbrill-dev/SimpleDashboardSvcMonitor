import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("x-api-key") || req.header("authorization")?.replace("Bearer ", "");
  if (!key || key !== env.apiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
