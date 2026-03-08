import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation, Link } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ArrowLeft, Edit, Dumbbell, TrendingUp, ClipboardList, Sparkles,
  Plus, Trash2, Activity, Scale, Ruler, Heart, ChevronRight, Flame, Zap,
  FileText, Printer
} from "lucide-react";
import type { Client, ClientIntake, ProgressLog, WorkoutPlan, SessionNote } from "@shared/schema";
import { insertClientIntakeSchema, insertProgressLogSchema, insertSessionNoteSchema } from "@shared/schema";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function cmToFtInStr(cm: number | string): string {
  const val = parseFloat(String(cm));
  const totalInches = val / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${ft}'${inches}"`;
}
function kgToLbs(kg: number | string): string {
  return (parseFloat(String(kg)) * 2.20462).toFixed(1);
}

// Inspired by SparkyFitness EnergyProgressCircle — pure SVG ring, no Recharts needed
function CalorieRing({ calories, label = "Daily Target", subLabel = "kcal/day", color = "text-orange-500" }: {
  calories: number; label?: string; subLabel?: string; color?: string;
}) {
  const progress = Math.min(75, 100); // decorative fill at ~75% to show it's a target
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
          <path className="text-muted stroke-current" strokeWidth="2.5" fill="transparent"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className={`${color} stroke-current`} strokeWidth="2.5" fill="transparent"
            strokeDasharray={`${progress}, 100`} strokeLinecap="round"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-lg font-bold leading-tight">{calories.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground leading-tight">{subLabel}</p>
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

const moodEmoji: Record<string, string> = {
  great: "😄",
  good: "🙂",
  okay: "😐",
  tired: "😴",
  struggling: "😟",
};
function getAge(dob: string | null | undefined) {
  if (!dob) return null;
  return new Date().getFullYear() - parseInt(dob.split("-")[0]);
}
function avatarColor(name: string) {
  const colors = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-pink-500","bg-teal-500"];
  return colors[name.charCodeAt(0) % colors.length];
}

// ---- INTAKE FORM ----
const intakeSchema = insertClientIntakeSchema.omit({ clientId: true });
type IntakeData = z.infer<typeof intakeSchema>;

function IntakeForm({ clientId, existing }: { clientId: string; existing: ClientIntake | null }) {
  const { toast } = useToast();
  const form = useForm<IntakeData>({
    defaultValues: {
      dietType: existing?.dietType || "",
      foodAllergies: existing?.foodAllergies || [],
      foodDislikes: existing?.foodDislikes || "",
      cuisinePreferences: existing?.cuisinePreferences || "",
      mealsPerDay: existing?.mealsPerDay || 3,
      cookingSkill: existing?.cookingSkill || "",
      weeklyBudget: existing?.weeklyBudget ? String(existing.weeklyBudget) : undefined,
      sleepHours: existing?.sleepHours ? String(existing.sleepHours) : undefined,
      stressLevel: existing?.stressLevel || undefined,
      waterIntake: existing?.waterIntake ? String(existing.waterIntake) : undefined,
      smokingStatus: existing?.smokingStatus || "",
      alcoholConsumption: existing?.alcoholConsumption || "",
      jobType: existing?.jobType || "",
      medicalConditions: existing?.medicalConditions || [],
      injuries: existing?.injuries || "",
      medications: existing?.medications || "",
      fitnessLevel: existing?.fitnessLevel || "",
      workoutsPerWeek: existing?.workoutsPerWeek || undefined,
      sessionDurationMinutes: existing?.sessionDurationMinutes || undefined,
      availableEquipment: existing?.availableEquipment || [],
      targetWeight: existing?.targetWeight ? kgToLbs(existing.targetWeight) : undefined,
      primaryGoal: existing?.primaryGoal || "",
      secondaryGoals: existing?.secondaryGoals || [],
      targetDate: existing?.targetDate || "",
    } as any,
  });

  const mutation = useMutation({
    mutationFn: (data: IntakeData) => {
      const payload = { ...data };
      if (payload.targetWeight) {
        payload.targetWeight = String(Math.round((parseFloat(String(payload.targetWeight)) / 2.20462) * 10) / 10) as any;
      }
      return apiRequest("POST", `/api/clients/${clientId}/intake`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "intake"] });
      toast({ title: "Intake saved!" });
    },
    onError: () => toast({ title: "Failed to save intake", variant: "destructive" }),
  });

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );

  const TagInput = ({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) => {
    const [text, setText] = useState("");
    const add = () => {
      if (text.trim() && !value.includes(text.trim())) {
        onChange([...value, text.trim()]);
        setText("");
      }
    };
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); }}} placeholder={placeholder} />
          <Button type="button" variant="outline" onClick={add} size="sm">Add</Button>
        </div>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.map(v => (
              <Badge key={v} variant="secondary" className="gap-1">
                {v}
                <button type="button" onClick={() => onChange(value.filter(x => x !== v))} className="text-muted-foreground">×</button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-8">
        <Section title="Goals">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="primaryGoal" render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Goal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="muscle_gain">Muscle Gain / Bulk</SelectItem>
                    <SelectItem value="body_recomposition">Body Recomposition</SelectItem>
                    <SelectItem value="general_fitness">General Fitness</SelectItem>
                    <SelectItem value="athletic_performance">Athletic Performance</SelectItem>
                    <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="endurance">Endurance / Cardio</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="targetWeight" render={({ field }) => (
              <FormItem>
                <FormLabel>Target Weight (lbs)</FormLabel>
                <FormControl><Input type="number" step="0.1" placeholder="145.0" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="targetDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Target Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Secondary Goals</Label>
            <FormField control={form.control} name="secondaryGoals" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TagInput value={field.value || []} onChange={field.onChange} placeholder="e.g. Improve flexibility, reduce stress..." />
                </FormControl>
              </FormItem>
            )} />
          </div>
        </Section>

        <Separator />

        <Section title="Fitness">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="fitnessLevel" render={({ field }) => (
              <FormItem>
                <FormLabel>Current Fitness Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="athlete">Athlete</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="workoutsPerWeek" render={({ field }) => (
              <FormItem>
                <FormLabel>Desired Workouts/Week</FormLabel>
                <FormControl><Input type="number" min={1} max={7} placeholder="3" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="sessionDurationMinutes" render={({ field }) => (
              <FormItem>
                <FormLabel>Session Duration (min)</FormLabel>
                <FormControl><Input type="number" placeholder="60" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
              </FormItem>
            )} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Available Equipment</Label>
            <FormField control={form.control} name="availableEquipment" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TagInput value={field.value || []} onChange={field.onChange} placeholder="e.g. dumbbells, barbell, resistance bands..." />
                </FormControl>
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="injuries" render={({ field }) => (
            <FormItem>
              <FormLabel>Injuries & Physical Limitations</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Left knee surgery 2 months ago, cleared for low-impact. Lower back pain when sitting..." className="resize-none min-h-20" {...field} />
              </FormControl>
            </FormItem>
          )} />
        </Section>

        <Separator />

        <Section title="Health & Medical">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="jobType" render={({ field }) => (
              <FormItem>
                <FormLabel>Job Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (desk job)</SelectItem>
                    <SelectItem value="light">Light (mostly standing)</SelectItem>
                    <SelectItem value="moderate">Moderate (on feet often)</SelectItem>
                    <SelectItem value="active">Active (physical labor)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="sleepHours" render={({ field }) => (
              <FormItem>
                <FormLabel>Sleep (hours/night)</FormLabel>
                <FormControl><Input type="number" step="0.5" min={0} max={24} placeholder="7.5" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="stressLevel" render={({ field }) => (
              <FormItem>
                <FormLabel>Stress Level (1-10)</FormLabel>
                <FormControl><Input type="number" min={1} max={10} placeholder="5" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="waterIntake" render={({ field }) => (
              <FormItem>
                <FormLabel>Water Intake (liters/day)</FormLabel>
                <FormControl><Input type="number" step="0.25" placeholder="2.0" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="smokingStatus" render={({ field }) => (
              <FormItem>
                <FormLabel>Smoking Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="non-smoker">Non-smoker</SelectItem>
                    <SelectItem value="ex-smoker">Ex-smoker</SelectItem>
                    <SelectItem value="smoker">Smoker</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="alcoholConsumption" render={({ field }) => (
              <FormItem>
                <FormLabel>Alcohol Consumption</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="occasional">Occasional</SelectItem>
                    <SelectItem value="moderate">Moderate (1-7/week)</SelectItem>
                    <SelectItem value="heavy">Heavy (7+/week)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Medical Conditions</Label>
            <FormField control={form.control} name="medicalConditions" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TagInput value={field.value || []} onChange={field.onChange} placeholder="e.g. Type 2 diabetes, hypertension..." />
                </FormControl>
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="medications" render={({ field }) => (
            <FormItem>
              <FormLabel>Current Medications</FormLabel>
              <FormControl><Textarea placeholder="List any medications that may affect training or nutrition..." className="resize-none min-h-16" {...field} /></FormControl>
            </FormItem>
          )} />
        </Section>

        <Separator />

        <Section title="Diet & Nutrition">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="dietType" render={({ field }) => (
              <FormItem>
                <FormLabel>Diet Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="omnivore">Omnivore</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="pescatarian">Pescatarian</SelectItem>
                    <SelectItem value="keto">Ketogenic</SelectItem>
                    <SelectItem value="paleo">Paleo</SelectItem>
                    <SelectItem value="mediterranean">Mediterranean</SelectItem>
                    <SelectItem value="gluten-free">Gluten-Free</SelectItem>
                    <SelectItem value="dairy-free">Dairy-Free</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="mealsPerDay" render={({ field }) => (
              <FormItem>
                <FormLabel>Meals Per Day</FormLabel>
                <FormControl><Input type="number" min={1} max={8} placeholder="3" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="cookingSkill" render={({ field }) => (
              <FormItem>
                <FormLabel>Cooking Skill</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner (simple meals)</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="weeklyBudget" render={({ field }) => (
              <FormItem>
                <FormLabel>Weekly Food Budget ($)</FormLabel>
                <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Food Allergies</Label>
            <FormField control={form.control} name="foodAllergies" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TagInput value={field.value || []} onChange={field.onChange} placeholder="e.g. peanuts, shellfish, lactose..." />
                </FormControl>
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="foodDislikes" render={({ field }) => (
            <FormItem>
              <FormLabel>Foods They Dislike</FormLabel>
              <FormControl><Textarea placeholder="e.g. Hates fish, dislikes cilantro, won't eat liver..." className="resize-none min-h-16" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="cuisinePreferences" render={({ field }) => (
            <FormItem>
              <FormLabel>Cuisine Preferences</FormLabel>
              <FormControl><Textarea placeholder="e.g. Loves Italian and Asian food, enjoys cooking Mexican..." className="resize-none min-h-16" {...field} /></FormControl>
            </FormItem>
          )} />
        </Section>

        <Button type="submit" disabled={mutation.isPending} className="w-full" data-testid="button-save-intake">
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? "Saving..." : "Save Intake Information"}
        </Button>
      </form>
    </Form>
  );
}

function Save({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
}

// ---- PROGRESS TAB ----
function ProgressTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const { data: logs = [], isLoading } = useQuery<ProgressLog[]>({ queryKey: ["/api/clients", clientId, "progress"] });

  const form = useForm({
    defaultValues: { date: new Date().toISOString().split("T")[0], weight: "", bodyFat: "", waist: "", hips: "", arms: "", chest: "", thighs: "", notes: "" },
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/clients/${clientId}/progress`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "progress"] });
      toast({ title: "Progress logged!" });
      setShowForm(false);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/progress/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "progress"] });
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const chartData = [...logs]
    .filter(l => l.weight)
    .reverse()
    .map(l => ({
      date: l.date,
      weight: parseFloat(l.weight as string),
      bodyFat: l.bodyFat ? parseFloat(l.bodyFat as string) : undefined,
    }));

  const latestWeight = logs[0]?.weight ? parseFloat(logs[0].weight as string) : null;
  const firstWeight = logs.length > 1 ? parseFloat(logs[logs.length - 1]?.weight as string) : null;
  const weightDiff = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Progress Tracking</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-add-progress">
          <Plus className="w-4 h-4 mr-1" />Log Measurement
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">New Measurement</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(d => addMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label className="text-xs">Date</Label><Input type="date" {...form.register("date")} /></div>
                <div><Label className="text-xs">Weight (kg)</Label><Input type="number" step="0.1" {...form.register("weight")} placeholder="70.5" /></div>
                <div><Label className="text-xs">Body Fat %</Label><Input type="number" step="0.1" {...form.register("bodyFat")} placeholder="22.0" /></div>
                <div><Label className="text-xs">Waist (cm)</Label><Input type="number" step="0.1" {...form.register("waist")} placeholder="80" /></div>
                <div><Label className="text-xs">Hips (cm)</Label><Input type="number" step="0.1" {...form.register("hips")} placeholder="95" /></div>
                <div><Label className="text-xs">Chest (cm)</Label><Input type="number" step="0.1" {...form.register("chest")} placeholder="90" /></div>
                <div><Label className="text-xs">Arms (cm)</Label><Input type="number" step="0.1" {...form.register("arms")} placeholder="30" /></div>
                <div><Label className="text-xs">Thighs (cm)</Label><Input type="number" step="0.1" {...form.register("thighs")} placeholder="55" /></div>
              </div>
              <div><Label className="text-xs">Notes</Label><Textarea {...form.register("notes")} placeholder="How are they feeling? Any observations?" className="resize-none min-h-16" /></div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Saving..." : "Log Measurement"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No measurements logged yet</p>
          <p className="text-xs mt-1">Log your first measurement to start tracking progress</p>
        </div>
      ) : (
        <>
          {/* Weight Trend Chart */}
          {chartData.length >= 2 && (
            <Card>
              <CardContent className="p-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">Weight Trend</p>
                    {weightDiff !== null && (
                      <p className={`text-xs font-medium mt-0.5 ${weightDiff < 0 ? "text-emerald-600 dark:text-emerald-400" : weightDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg since first log
                      </p>
                    )}
                  </div>
                  {latestWeight && (
                    <div className="text-right">
                      <p className="text-2xl font-bold">{latestWeight}<span className="text-sm font-normal text-muted-foreground ml-0.5">kg</span></p>
                      <p className="text-xs text-muted-foreground">Latest</p>
                    </div>
                  )}
                </div>
                <ChartContainer
                  config={{
                    weight: { label: "Weight (kg)", color: "hsl(var(--primary))" },
                    bodyFat: { label: "Body Fat %", color: "hsl(var(--chart-2, 210 40% 55%))" },
                  }}
                  className="h-44"
                >
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      fill="url(#weightGrad)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Body Measurements Summary (latest entry) */}
          {logs[0] && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { label: "Waist", val: logs[0].waist, unit: "cm" },
                { label: "Hips", val: logs[0].hips, unit: "cm" },
                { label: "Chest", val: logs[0].chest, unit: "cm" },
                { label: "Arms", val: logs[0].arms, unit: "cm" },
                { label: "Thighs", val: logs[0].thighs, unit: "cm" },
                { label: "Body Fat", val: logs[0].bodyFat, unit: "%" },
              ].filter(m => m.val).map(m => (
                <div key={m.label} className="bg-muted/50 rounded-md p-2 text-center">
                  <p className="text-sm font-bold">{parseFloat(m.val as string).toFixed(1)}<span className="text-xs font-normal ml-0.5">{m.unit}</span></p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Log History */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">History</p>
            <div className="space-y-2">
              {logs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{log.date}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {log.weight && <span className="text-xs text-muted-foreground"><strong className="text-foreground">{log.weight}</strong> kg</span>}
                          {log.bodyFat && <span className="text-xs text-muted-foreground"><strong className="text-foreground">{log.bodyFat}</strong>% BF</span>}
                          {log.waist && <span className="text-xs text-muted-foreground">Waist <strong className="text-foreground">{log.waist}</strong>cm</span>}
                          {log.hips && <span className="text-xs text-muted-foreground">Hips <strong className="text-foreground">{log.hips}</strong>cm</span>}
                          {log.chest && <span className="text-xs text-muted-foreground">Chest <strong className="text-foreground">{log.chest}</strong>cm</span>}
                        </div>
                        {log.notes && <p className="text-xs text-muted-foreground mt-1 italic">{log.notes}</p>}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="flex-shrink-0 h-7 w-7"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete this entry?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(log.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- SESSIONS TAB ----
function SessionsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const { data: notes = [], isLoading } = useQuery<SessionNote[]>({ queryKey: ["/api/clients", clientId, "sessions"] });
  const form = useForm({ defaultValues: { date: new Date().toISOString().split("T")[0], sessionNotes: "", clientMood: "", exercisesCompleted: "", nextSessionGoals: "" } });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/clients/${clientId}/sessions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "sessions"] });
      toast({ title: "Session noted!" });
      setShowForm(false);
      form.reset({ date: new Date().toISOString().split("T")[0] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "sessions"] }),
  });

  const moodColors: Record<string, string> = { great: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", good: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", okay: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", tired: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", struggling: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Session Notes</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-add-session"><Plus className="w-4 h-4 mr-1" />Log Session</Button>
      </div>
      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={form.handleSubmit(d => addMutation.mutate(d))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Date</Label><Input type="date" {...form.register("date")} /></div>
                <div>
                  <Label className="text-xs">Client Mood</Label>
                  <select className="w-full h-9 px-3 py-1 rounded-md border border-input bg-transparent text-sm" {...form.register("clientMood")}>
                    <option value="">Select mood...</option>
                    {Object.keys(moodColors).map(m => <option key={m} value={m}>{moodEmoji[m]} {m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="text-xs">Session Notes</Label><Textarea {...form.register("sessionNotes")} placeholder="What did you work on? How did the session go?" className="resize-none min-h-20" /></div>
              <div><Label className="text-xs">Exercises Completed</Label><Textarea {...form.register("exercisesCompleted")} placeholder="e.g. Squats 3x10 @ 60kg, Lunges 3x12..." className="resize-none min-h-16" /></div>
              <div><Label className="text-xs">Goals for Next Session</Label><Textarea {...form.register("nextSessionGoals")} placeholder="What to focus on next time..." className="resize-none min-h-16" /></div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addMutation.isPending}>{addMutation.isPending ? "Saving..." : "Save Session"}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No sessions logged yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <Card key={note.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{note.date}</p>
                  <div className="flex items-center gap-2">
                    {note.clientMood && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${moodColors[note.clientMood] || ""}`}>
                        {moodEmoji[note.clientMood]} {note.clientMood}
                      </span>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete session?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(note.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {note.sessionNotes && <p className="text-sm text-muted-foreground">{note.sessionNotes}</p>}
                {note.exercisesCompleted && <div className="text-xs"><span className="font-medium text-foreground">Completed:</span> {note.exercisesCompleted}</div>}
                {note.nextSessionGoals && <div className="text-xs"><span className="font-medium text-foreground">Next goals:</span> {note.nextSessionGoals}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- PLANS TAB ----
function PlansTab({ clientId, type }: { clientId: string; type: "workout" }) {
  const { toast } = useToast();
  const queryKey = ["/api/clients", clientId, "workout-plans"];
  const { data: plans = [], isLoading } = useQuery<WorkoutPlan[]>({ queryKey });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/clients/${clientId}/workout-plans/generate`, {}),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Workout plan generated!" });
    },
    onError: (e: any) => toast({ title: "Generation failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workout-plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Workout Plans</h3>
        <Button
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-workout-plan"
        >
          <Sparkles className="w-4 h-4 mr-1" />
          {generateMutation.isPending ? "FRANKIE is working..." : "Generate with FRANKIE"}
        </Button>
      </div>
      {generateMutation.isPending && (
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">FRANKIE is building the workout plan...</p>
              <p className="text-xs text-muted-foreground">Analysing client data and applying your training methodology. This takes 15–30 seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {plans.length === 0 && !generateMutation.isPending ? (
        <div className="text-center py-12 text-muted-foreground">
          <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No workout plans yet</p>
          <p className="text-xs mt-1">FRANKIE will generate a personalized program based on this client's full profile and intake data</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <Card key={plan.id} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 bg-violet-100 dark:bg-violet-900/30">
                      <Dumbbell className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{plan.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={plan.status === "approved" ? "default" : "secondary"} className="text-xs">{plan.status}</Badge>
                        {plan.daysPerWeek && <span className="text-xs text-muted-foreground">{plan.daysPerWeek} days/week</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/workout-plans/${plan.id}`}><ChevronRight className="w-4 h-4 mr-1" />View</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete plan?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(plan.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- MAIN PROFILE ----
export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading } = useQuery<Client>({ queryKey: ["/api/clients", id] });
  const { data: intake } = useQuery<ClientIntake | null>({ queryKey: ["/api/clients", id, "intake"] });
  const { data: bmr } = useQuery<{ bmr: number; tdee: number; recommendedCalories: number }>({
    queryKey: ["/api/clients", id, "bmr"],
    enabled: !!client,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!client) return <div className="p-6"><p>Client not found.</p></div>;

  const age = getAge(client.dateOfBirth);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild><Link href="/"><ArrowLeft className="w-4 h-4" /></Link></Button>
        <span className="text-sm text-muted-foreground">All Clients</span>
      </div>

      {/* Hero Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className={`w-16 h-16 rounded-full ${avatarColor(client.name)} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
              {getInitials(client.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{client.name}</h1>
                <Badge variant={client.status === "active" ? "default" : "secondary"}>{client.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {client.email && <span>{client.email}</span>}
                {client.phone && <span>{client.phone}</span>}
                {age && <span>{age} years old</span>}
                {client.gender && <span className="capitalize">{client.gender}</span>}
              </div>
              {client.notes && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Special Notes</p>
                  <p className="text-sm text-amber-900 dark:text-amber-200">{client.notes}</p>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" asChild className="flex-shrink-0">
              <Link href={`/clients/${id}/edit`}><Edit className="w-3.5 h-3.5 mr-1.5" />Edit</Link>
            </Button>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-5 border-t border-border">
            {bmr && bmr.recommendedCalories > 0 && (
              <CalorieRing calories={bmr.recommendedCalories} label="Daily Target" />
            )}
            <div className="flex flex-wrap gap-6 flex-1">
              {client.height && (
                <div>
                  <p className="text-xl font-bold">{cmToFtInStr(client.height)}</p>
                  <p className="text-xs text-muted-foreground">Height</p>
                </div>
              )}
              {client.startingWeight && (
                <div>
                  <p className="text-xl font-bold">{kgToLbs(client.startingWeight)}<span className="text-sm font-normal text-muted-foreground ml-0.5">lbs</span></p>
                  <p className="text-xs text-muted-foreground">Start Weight</p>
                </div>
              )}
              {bmr && bmr.bmr > 0 && (
                <div>
                  <p className="text-xl font-bold text-blue-500">{bmr.bmr}</p>
                  <p className="text-xs text-muted-foreground">BMR</p>
                </div>
              )}
              {bmr && bmr.tdee > 0 && (
                <div>
                  <p className="text-xl font-bold text-orange-500">{bmr.tdee}</p>
                  <p className="text-xs text-muted-foreground">TDEE</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="intake">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="intake" className="text-xs py-2">Intake</TabsTrigger>
          <TabsTrigger value="workouts" className="text-xs py-2">Workouts</TabsTrigger>
          <TabsTrigger value="progress" className="text-xs py-2">Progress</TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs py-2">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="intake" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client Intake Form</CardTitle>
              <CardDescription>Complete health, lifestyle, and nutrition profile</CardDescription>
            </CardHeader>
            <CardContent>
              <IntakeForm clientId={id!} existing={intake || null} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workouts" className="mt-4">
          <PlansTab clientId={id!} type="workout" />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <ProgressTab clientId={id!} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <SessionsTab clientId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
