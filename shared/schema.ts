import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  height: decimal("height", { precision: 5, scale: 2 }),
  startingWeight: decimal("starting_weight", { precision: 5, scale: 2 }),
  activityLevel: text("activity_level"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const clientIntake = pgTable("client_intake", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  dietType: text("diet_type"),
  foodAllergies: text("food_allergies").array(),
  foodDislikes: text("food_dislikes"),
  cuisinePreferences: text("cuisine_preferences"),
  mealsPerDay: integer("meals_per_day"),
  cookingSkill: text("cooking_skill"),
  weeklyBudget: decimal("weekly_budget", { precision: 8, scale: 2 }),
  sleepHours: decimal("sleep_hours", { precision: 3, scale: 1 }),
  stressLevel: integer("stress_level"),
  waterIntake: decimal("water_intake", { precision: 4, scale: 1 }),
  smokingStatus: text("smoking_status"),
  alcoholConsumption: text("alcohol_consumption"),
  jobType: text("job_type"),
  medicalConditions: text("medical_conditions").array(),
  injuries: text("injuries"),
  medications: text("medications"),
  fitnessLevel: text("fitness_level"),
  workoutsPerWeek: integer("workouts_per_week"),
  sessionDurationMinutes: integer("session_duration_minutes"),
  availableEquipment: text("available_equipment").array(),
  targetWeight: decimal("target_weight", { precision: 5, scale: 2 }),
  primaryGoal: text("primary_goal"),
  secondaryGoals: text("secondary_goals").array(),
  targetDate: text("target_date"),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const progressLogs = pgTable("progress_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  bodyFat: decimal("body_fat", { precision: 4, scale: 1 }),
  chest: decimal("chest", { precision: 5, scale: 2 }),
  waist: decimal("waist", { precision: 5, scale: 2 }),
  hips: decimal("hips", { precision: 5, scale: 2 }),
  arms: decimal("arms", { precision: 5, scale: 2 }),
  thighs: decimal("thighs", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const workoutPlans = pgTable("workout_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  daysPerWeek: integer("days_per_week"),
  durationWeeks: integer("duration_weeks"),
  content: jsonb("content"),
  notes: text("notes"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const sessionNotes = pgTable("session_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  sessionNotes: text("session_notes"),
  clientMood: text("client_mood"),
  exercisesCompleted: text("exercises_completed"),
  nextSessionGoals: text("next_session_goals"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Schemas
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertClientIntakeSchema = createInsertSchema(clientIntake).omit({ id: true, updatedAt: true });
export const insertProgressLogSchema = createInsertSchema(progressLogs).omit({ id: true, createdAt: true });
export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans).omit({ id: true, createdAt: true });
export const insertSessionNoteSchema = createInsertSchema(sessionNotes).omit({ id: true, createdAt: true });

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientIntake = typeof clientIntake.$inferSelect;
export type InsertClientIntake = z.infer<typeof insertClientIntakeSchema>;
export type ProgressLog = typeof progressLogs.$inferSelect;
export type InsertProgressLog = z.infer<typeof insertProgressLogSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type SessionNote = typeof sessionNotes.$inferSelect;
export type InsertSessionNote = z.infer<typeof insertSessionNoteSchema>;

// Legacy user table (kept for compat)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
