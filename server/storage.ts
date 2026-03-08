import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  clients, clientIntake, progressLogs, workoutPlans, sessionNotes,
  type Client, type InsertClient,
  type ClientIntake, type InsertClientIntake,
  type ProgressLog, type InsertProgressLog,
  type WorkoutPlan, type InsertWorkoutPlan,
  type SessionNote, type InsertSessionNote,
  type User, type InsertUser, users,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;

  // Intake
  getClientIntake(clientId: string): Promise<ClientIntake | undefined>;
  upsertClientIntake(intake: InsertClientIntake): Promise<ClientIntake>;

  // Progress
  getProgressLogs(clientId: string): Promise<ProgressLog[]>;
  createProgressLog(log: InsertProgressLog): Promise<ProgressLog>;
  deleteProgressLog(id: string): Promise<void>;

  // Workout Plans
  getWorkoutPlans(clientId: string): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined>;
  createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan>;
  updateWorkoutPlan(id: string, plan: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined>;
  deleteWorkoutPlan(id: string): Promise<void>;

  // Session Notes
  getSessionNotes(clientId: string): Promise<SessionNote[]>;
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  deleteSessionNote(id: string): Promise<void>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }
  async getClient(id: string): Promise<Client | undefined> {
    const [c] = await db.select().from(clients).where(eq(clients.id, id));
    return c;
  }
  async createClient(client: InsertClient): Promise<Client> {
    const [c] = await db.insert(clients).values(client).returning();
    return c;
  }
  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [c] = await db.update(clients).set(client).where(eq(clients.id, id)).returning();
    return c;
  }
  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getClientIntake(clientId: string): Promise<ClientIntake | undefined> {
    const [i] = await db.select().from(clientIntake).where(eq(clientIntake.clientId, clientId));
    return i;
  }
  async upsertClientIntake(intake: InsertClientIntake): Promise<ClientIntake> {
    const existing = await this.getClientIntake(intake.clientId);
    if (existing) {
      const [i] = await db.update(clientIntake).set({ ...intake, updatedAt: new Date() }).where(eq(clientIntake.clientId, intake.clientId)).returning();
      return i;
    }
    const [i] = await db.insert(clientIntake).values(intake).returning();
    return i;
  }

  async getProgressLogs(clientId: string): Promise<ProgressLog[]> {
    return db.select().from(progressLogs).where(eq(progressLogs.clientId, clientId)).orderBy(desc(progressLogs.date));
  }
  async createProgressLog(log: InsertProgressLog): Promise<ProgressLog> {
    const [l] = await db.insert(progressLogs).values(log).returning();
    return l;
  }
  async deleteProgressLog(id: string): Promise<void> {
    await db.delete(progressLogs).where(eq(progressLogs.id, id));
  }

  async getWorkoutPlans(clientId: string): Promise<WorkoutPlan[]> {
    return db.select().from(workoutPlans).where(eq(workoutPlans.clientId, clientId)).orderBy(desc(workoutPlans.createdAt));
  }
  async getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined> {
    const [p] = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
    return p;
  }
  async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const [p] = await db.insert(workoutPlans).values(plan).returning();
    return p;
  }
  async updateWorkoutPlan(id: string, plan: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined> {
    const [p] = await db.update(workoutPlans).set(plan).where(eq(workoutPlans.id, id)).returning();
    return p;
  }
  async deleteWorkoutPlan(id: string): Promise<void> {
    await db.delete(workoutPlans).where(eq(workoutPlans.id, id));
  }

  async getSessionNotes(clientId: string): Promise<SessionNote[]> {
    return db.select().from(sessionNotes).where(eq(sessionNotes.clientId, clientId)).orderBy(desc(sessionNotes.date));
  }
  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    const [n] = await db.insert(sessionNotes).values(note).returning();
    return n;
  }
  async deleteSessionNote(id: string): Promise<void> {
    await db.delete(sessionNotes).where(eq(sessionNotes.id, id));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }
  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const [u] = await db.insert(users).values({ ...user, id }).returning();
    return u;
  }
}

export const storage = new DatabaseStorage();
