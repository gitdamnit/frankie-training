import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateWorkoutPlan, calculateBMR } from "./openai";
import { insertClientSchema, insertClientIntakeSchema, insertProgressLogSchema, insertWorkoutPlanSchema, insertSessionNoteSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // --- AUTH ---
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const validUser = process.env.FRANKIE_USERNAME || "FRANKIE";
    const validPass = process.env.FRANKIE_PASSWORD || "TESTING123";
    if (username === validUser && password === validPass) {
      req.session.authenticated = true;
      return res.json({ ok: true });
    }
    return res.status(401).json({ error: "Invalid credentials" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.authenticated) return res.json({ authenticated: true });
    return res.status(401).json({ authenticated: false });
  });

  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth/")) return next();
    if (!req.session.authenticated) return res.status(401).json({ error: "Unauthorized" });
    next();
  });

  // --- CLIENTS ---
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ error: "Client not found" });
      res.json(client);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const data = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      if (!client) return res.status(404).json({ error: "Client not found" });
      res.json(client);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // --- INTAKE ---
  app.get("/api/clients/:id/intake", async (req, res) => {
    try {
      const intake = await storage.getClientIntake(req.params.id);
      res.json(intake || null);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch intake" });
    }
  });

  app.post("/api/clients/:id/intake", async (req, res) => {
    try {
      const data = insertClientIntakeSchema.parse({ ...req.body, clientId: req.params.id });
      const intake = await storage.upsertClientIntake(data);
      res.json(intake);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to save intake" });
    }
  });

  // --- BMR/TDEE ---
  app.get("/api/clients/:id/bmr", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ error: "Client not found" });
      const intake = await storage.getClientIntake(req.params.id);
      const result = calculateBMR(client, intake || null);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Failed to calculate BMR" });
    }
  });

  // --- PROGRESS ---
  app.get("/api/clients/:id/progress", async (req, res) => {
    try {
      const logs = await storage.getProgressLogs(req.params.id);
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  app.post("/api/clients/:id/progress", async (req, res) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(req.body).map(([k, v]) => [k, v === "" ? undefined : v])
      );
      const data = insertProgressLogSchema.parse({ ...cleaned, clientId: req.params.id });
      const log = await storage.createProgressLog(data);
      res.status(201).json(log);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      console.error("Progress log error:", e);
      res.status(500).json({ error: "Failed to create progress log" });
    }
  });

  app.delete("/api/progress/:id", async (req, res) => {
    try {
      await storage.deleteProgressLog(req.params.id);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: "Failed to delete progress log" });
    }
  });

  // --- WORKOUT PLANS ---
  app.get("/api/clients/:id/workout-plans", async (req, res) => {
    try {
      const plans = await storage.getWorkoutPlans(req.params.id);
      res.json(plans);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch workout plans" });
    }
  });

  app.get("/api/workout-plans/:id", async (req, res) => {
    try {
      const plan = await storage.getWorkoutPlan(req.params.id);
      if (!plan) return res.status(404).json({ error: "Workout plan not found" });
      res.json(plan);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch workout plan" });
    }
  });

  app.post("/api/clients/:id/workout-plans/generate", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ error: "Client not found" });
      const intake = await storage.getClientIntake(req.params.id);
      const content = await generateWorkoutPlan(client, intake || null);
      const plan = await storage.createWorkoutPlan({
        clientId: req.params.id,
        name: `Workout Plan - ${new Date().toLocaleDateString()}`,
        daysPerWeek: content.overview?.daysPerWeek || intake?.workoutsPerWeek || 3,
        durationWeeks: 4,
        content,
        notes: content.overview?.notes || null,
        status: "draft",
      });
      res.status(201).json(plan);
    } catch (e: any) {
      console.error("Workout plan generation error:", e);
      res.status(500).json({ error: e.message || "Failed to generate workout plan" });
    }
  });

  app.patch("/api/workout-plans/:id", async (req, res) => {
    try {
      const data = insertWorkoutPlanSchema.partial().parse(req.body);
      const plan = await storage.updateWorkoutPlan(req.params.id, data);
      if (!plan) return res.status(404).json({ error: "Workout plan not found" });
      res.json(plan);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to update workout plan" });
    }
  });

  app.delete("/api/workout-plans/:id", async (req, res) => {
    try {
      await storage.deleteWorkoutPlan(req.params.id);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: "Failed to delete workout plan" });
    }
  });

  // --- SESSION NOTES ---
  app.get("/api/clients/:id/sessions", async (req, res) => {
    try {
      const notes = await storage.getSessionNotes(req.params.id);
      res.json(notes);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch session notes" });
    }
  });

  app.post("/api/clients/:id/sessions", async (req, res) => {
    try {
      const data = insertSessionNoteSchema.parse({ ...req.body, clientId: req.params.id });
      const note = await storage.createSessionNote(data);
      res.status(201).json(note);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to create session note" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      await storage.deleteSessionNote(req.params.id);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: "Failed to delete session note" });
    }
  });

  return httpServer;
}
