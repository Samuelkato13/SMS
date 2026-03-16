import type { Express } from "express";
import { authStorage } from "./storage";
import { isReplitAuthenticated } from "./replitAuth";

export function registerReplitAuthRoutes(app: Express): void {
  app.get("/api/auth/replit/user", isReplitAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching replit user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
