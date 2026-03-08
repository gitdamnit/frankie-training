import OpenAI from "openai";
import type { Client, ClientIntake } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Load exercise library (a subset for AI prompting)
let exerciseLibrary: any[] = [];
try {
  const exerciseFile = path.join(process.cwd(), "data", "exercises_canonical_1772475505329.jsonl");
  if (fs.existsSync(exerciseFile)) {
    const lines = fs.readFileSync(exerciseFile, "utf-8").split("\n").filter(Boolean);
    exerciseLibrary = lines.slice(0, 300).map(l => JSON.parse(l));
  }
} catch (e) {
  console.log("Exercise library not loaded:", e);
}

function buildClientContext(client: Client, intake: ClientIntake | null): string {
  const age = client.dateOfBirth
    ? `${new Date().getFullYear() - parseInt(client.dateOfBirth.split("-")[0])} years old`
    : "age unknown";

  const lines = [
    `Client: ${client.name}`,
    `Gender: ${client.gender || "not specified"}, Age: ${age}`,
    `Height: ${client.height ? client.height + " cm" : "not specified"}`,
    `Starting Weight: ${client.startingWeight ? client.startingWeight + " kg" : "not specified"}`,
    `Activity Level: ${client.activityLevel || "not specified"}`,
    `Notes/Special Conditions: ${client.notes || "none"}`,
  ];

  if (intake) {
    if (intake.primaryGoal) lines.push(`Primary Goal: ${intake.primaryGoal}`);
    if (intake.targetWeight) lines.push(`Target Weight: ${intake.targetWeight} kg`);
    if (intake.fitnessLevel) lines.push(`Fitness Level: ${intake.fitnessLevel}`);
    if (intake.workoutsPerWeek) lines.push(`Desired Workouts Per Week: ${intake.workoutsPerWeek}`);
    if (intake.sessionDurationMinutes) lines.push(`Session Duration: ${intake.sessionDurationMinutes} minutes`);
    if (intake.availableEquipment?.length) lines.push(`Available Equipment: ${intake.availableEquipment.join(", ")}`);
    if (intake.injuries) lines.push(`Injuries/Limitations: ${intake.injuries}`);
    if (intake.medicalConditions?.length) lines.push(`Medical Conditions: ${intake.medicalConditions.join(", ")}`);
    if (intake.medications) lines.push(`Medications: ${intake.medications}`);
    if (intake.dietType) lines.push(`Diet Type: ${intake.dietType}`);
    if (intake.foodAllergies?.length) lines.push(`Food Allergies: ${intake.foodAllergies.join(", ")}`);
    if (intake.foodDislikes) lines.push(`Food Dislikes: ${intake.foodDislikes}`);
    if (intake.mealsPerDay) lines.push(`Meals Per Day: ${intake.mealsPerDay}`);
    if (intake.weeklyBudget) lines.push(`Weekly Food Budget: $${intake.weeklyBudget}`);
    if (intake.sleepHours) lines.push(`Sleep: ${intake.sleepHours} hours/night`);
    if (intake.stressLevel) lines.push(`Stress Level: ${intake.stressLevel}/10`);
    if (intake.jobType) lines.push(`Job Type: ${intake.jobType}`);
  }

  return lines.join("\n");
}

export async function generateWorkoutPlan(client: Client, intake: ClientIntake | null): Promise<any> {
  const clientContext = buildClientContext(client, intake);

  const daysPerWeek = intake?.workoutsPerWeek || 3;
  const duration = intake?.sessionDurationMinutes || 60;
  const equipment = intake?.availableEquipment || [];
  const injuries = intake?.injuries || client.notes || "";

  const relevantExercises = exerciseLibrary
    .filter(ex => {
      if (!equipment.length) return true;
      const eq = ex.equipment?.toLowerCase() || "";
      return equipment.some((e: string) => eq.includes(e.toLowerCase())) || eq.includes("body only") || !eq;
    })
    .slice(0, 80)
    .map(ex => `${ex.name} (${ex.category}, ${ex.level}, muscles: ${ex.primaryMuscles?.join(",")}, equipment: ${ex.equipment || "none"})`);

  const exerciseContext = relevantExercises.length > 0
    ? `\n\nAVAILABLE EXERCISES FROM LIBRARY:\n${relevantExercises.slice(0, 50).join("\n")}`
    : "";

  const prompt = `You are an expert personal trainer. Based on the following client profile, create a ${daysPerWeek}-day per week workout plan.

CLIENT PROFILE:
${clientContext}
${exerciseContext}

Create a structured workout plan that:
1. Is appropriate for the client's fitness level and goals
2. Works around any injuries or medical limitations
3. Uses available equipment
4. Each session fits within ${duration} minutes
5. Follows proper progressive overload principles
6. Includes warm-up and cool-down recommendations

Return ONLY a valid JSON object with this exact structure:
{
  "overview": {
    "daysPerWeek": ${daysPerWeek},
    "sessionDuration": ${duration},
    "fitnessLevel": "beginner/intermediate/advanced",
    "focus": "Primary training focus",
    "notes": "Important notes about the program"
  },
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Day 1 - Push",
      "focus": "Chest, Shoulders, Triceps",
      "warmUp": "5-10 min light cardio + dynamic stretching",
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": "8-12",
          "rest": "60-90 seconds",
          "tempo": "2-1-2",
          "notes": "Form cues or modifications",
          "muscles": ["primary muscle"],
          "equipment": "equipment needed"
        }
      ],
      "coolDown": "5-10 min static stretching",
      "estimatedTime": "${duration} minutes"
    }
  ]
}

Include ${daysPerWeek} workout days with rest day recommendations. Be specific with exercise names and consider the client's limitations.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

export function calculateBMR(client: Client, intake: ClientIntake | null): { bmr: number; tdee: number; recommendedCalories: number } {
  const weight = parseFloat(client.startingWeight as string) || 0;
  const height = parseFloat(client.height as string) || 0;
  const dob = client.dateOfBirth;
  const age = dob ? new Date().getFullYear() - parseInt(dob.split("-")[0]) : 30;
  const gender = client.gender || "male";

  // Mifflin-St Jeor Equation
  let bmr = 0;
  if (gender.toLowerCase() === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const multiplier = activityMultipliers[client.activityLevel || "moderate"] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  const goal = intake?.primaryGoal || "maintain";
  let recommended = tdee;
  if (goal.includes("loss") || goal.includes("lose")) recommended = tdee - 500;
  else if (goal.includes("gain") || goal.includes("muscle") || goal.includes("bulk")) recommended = tdee + 300;

  return { bmr: Math.round(bmr), tdee, recommendedCalories: recommended };
}
