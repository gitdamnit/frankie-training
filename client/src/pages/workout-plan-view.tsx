import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Printer, Check, Dumbbell, ChevronDown, ChevronUp, Edit2, Timer, Repeat } from "lucide-react";
import type { WorkoutPlan, Client } from "@shared/schema";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  tempo?: string;
  notes?: string;
  muscles?: string[];
  equipment?: string;
}

interface Day {
  dayNumber: number;
  dayName: string;
  focus: string;
  warmUp?: string;
  exercises: Exercise[];
  coolDown?: string;
  estimatedTime?: string;
}

interface WorkoutPlanContent {
  overview: {
    daysPerWeek: number;
    sessionDuration: number;
    fitnessLevel: string;
    focus: string;
    notes: string;
  };
  days: Day[];
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-md">
      <button
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">{exercise.name}</p>
            <p className="text-xs text-muted-foreground">{exercise.sets} sets × {exercise.reps}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Rest: {exercise.rest}</p>
            {exercise.equipment && <p className="text-xs text-muted-foreground">{exercise.equipment}</p>}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-border bg-muted/20 space-y-2">
          <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
            {exercise.tempo && <span><strong className="text-foreground">Tempo:</strong> {exercise.tempo}</span>}
            {exercise.muscles?.length ? <span><strong className="text-foreground">Muscles:</strong> {exercise.muscles.join(", ")}</span> : null}
            {exercise.equipment && <span><strong className="text-foreground">Equipment:</strong> {exercise.equipment}</span>}
          </div>
          {exercise.notes && <p className="text-xs text-muted-foreground italic">{exercise.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function WorkoutPlanView() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));

  const { data: plan, isLoading } = useQuery<WorkoutPlan>({
    queryKey: ["/api/workout-plans", id],
  });

  useEffect(() => {
    if (plan) setNotes(plan.notes || "");
  }, [plan]);

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", plan?.clientId],
    enabled: !!plan?.clientId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<WorkoutPlan>) => apiRequest("PATCH", `/api/workout-plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-plans", id] });
      toast({ title: "Plan updated!" });
      setEditingNotes(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/workout-plans/${id}`, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-plans", id] });
      toast({ title: "Plan approved!" });
    },
  });

  const toggleDay = (i: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handlePrint = () => {
    if (!plan || !client) return;
    const content = plan.content as WorkoutPlanContent;
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Workout Plan - ${client.name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #111; }
    .frankie-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6d28d9; padding-bottom: 12px; margin-bottom: 24px; }
    .frankie-logo { font-size: 22px; font-weight: 900; letter-spacing: 4px; color: #6d28d9; }
    .frankie-tagline { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
    h1 { color: #6d28d9; } h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; }
    .overview { background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-size: 12px; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .section-label { color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 16px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="frankie-header">
    <div>
      <div class="frankie-logo">FRANKIE</div>
      <div class="frankie-tagline">Your Intelligent Training Engine</div>
    </div>
    <div style="text-align:right; font-size: 12px; color: #6b7280;">
      <div>${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</div>
      <div>Prepared for: <strong>${client.name}</strong></div>
    </div>
  </div>
  <h1>Workout Plan: ${plan.name}</h1>
  <p style="color:#6b7280; font-size:13px;">FRANKIE generated this program based on ${client.name}'s full intake profile and training objectives.</p>
  <div class="overview">
    <strong>Program Overview:</strong> ${content?.overview?.focus || ""}<br/>
    ${content?.overview?.daysPerWeek ? `${content.overview.daysPerWeek} days/week` : ""} 
    ${content?.overview?.sessionDuration ? `• ${content.overview.sessionDuration} min sessions` : ""}
    ${content?.overview?.fitnessLevel ? `• ${content.overview.fitnessLevel} level` : ""}
    ${content?.overview?.notes ? `<br/><em>${content.overview.notes}</em>` : ""}
  </div>
  ${(content?.days || []).map(day => `
    <h2>${day.dayName}</h2>
    <p><em>Focus: ${day.focus}</em></p>
    ${day.warmUp ? `<div class="section-label">Warm-Up</div><p>${day.warmUp}</p>` : ""}
    <div class="section-label">Exercises</div>
    <table>
      <tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Rest</th><th>Notes</th></tr>
      ${day.exercises?.map(ex => `
        <tr>
          <td><strong>${ex.name}</strong>${ex.equipment ? `<br/><small>${ex.equipment}</small>` : ""}</td>
          <td>${ex.sets}</td><td>${ex.reps}</td><td>${ex.rest}</td>
          <td>${ex.notes || ""}</td>
        </tr>
      `).join("")}
    </table>
    ${day.coolDown ? `<div class="section-label">Cool-Down</div><p>${day.coolDown}</p>` : ""}
  `).join("")}
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!plan) return <div className="p-6"><p>Plan not found.</p></div>;

  const content = plan.content as WorkoutPlanContent;
  const days = content?.days || [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={client ? `/clients/${plan.clientId}` : "/"}><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="font-bold text-xl">{plan.name}</h1>
            {client && <p className="text-sm text-muted-foreground">{client.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={plan.status === "approved" ? "default" : "secondary"}>{plan.status}</Badge>
          {plan.status !== "approved" && (
            <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} data-testid="button-approve-plan">
              <Check className="w-4 h-4 mr-1" />Approve
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handlePrint} data-testid="button-print-plan">
            <Printer className="w-4 h-4 mr-1" />Print / Export
          </Button>
        </div>
      </div>

      {/* Overview */}
      {content?.overview && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-1 mb-4">
              <Dumbbell className="w-4 h-4 text-violet-500" />
              <h2 className="font-semibold text-base">Program Overview</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {content.overview.daysPerWeek && (
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-md px-3 py-2 text-center">
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{content.overview.daysPerWeek}</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400">Days/Week</p>
                </div>
              )}
              {content.overview.sessionDuration && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md px-3 py-2 text-center">
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{content.overview.sessionDuration}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Min/Session</p>
                </div>
              )}
              {plan.durationWeeks && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-md px-3 py-2 text-center">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{plan.durationWeeks}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Weeks</p>
                </div>
              )}
              {content.overview.fitnessLevel && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-md px-3 py-2 text-center">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300 capitalize">{content.overview.fitnessLevel}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Level</p>
                </div>
              )}
            </div>
            {content.overview.focus && <p className="text-sm font-medium">{content.overview.focus}</p>}
            {content.overview.notes && <p className="text-sm text-muted-foreground mt-1">{content.overview.notes}</p>}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">Trainer Notes</p>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingNotes(!editingNotes)}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="resize-none min-h-20 text-sm" placeholder="Add trainer notes..." />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateMutation.mutate({ notes })}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{plan.notes || "No notes added."}</p>
          )}
        </CardContent>
      </Card>

      {/* Workout Days */}
      {days.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No workout days found in this plan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {days.map((day, di) => (
            <Card key={di}>
              <CardHeader className="pb-0">
                <button
                  className="w-full flex items-center justify-between gap-2 py-1"
                  onClick={() => toggleDay(di)}
                  data-testid={`button-expand-day-${di}`}
                >
                  <div className="text-left">
                    <CardTitle className="text-base">{day.dayName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{day.focus}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {day.estimatedTime && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="w-3 h-3" />{day.estimatedTime}
                      </div>
                    )}
                    {day.exercises && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Repeat className="w-3 h-3" />{day.exercises.length} exercises
                      </div>
                    )}
                    {expandedDays.has(di) ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
              </CardHeader>
              {expandedDays.has(di) && (
                <CardContent className="pt-3 space-y-3">
                  {day.warmUp && (
                    <div className="text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                      <span className="font-semibold text-amber-700 dark:text-amber-400 text-xs uppercase">Warm-Up: </span>
                      <span className="text-amber-900 dark:text-amber-200">{day.warmUp}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {day.exercises?.map((ex, ei) => <ExerciseRow key={ei} exercise={ex} />)}
                  </div>
                  {day.coolDown && (
                    <div className="text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
                      <span className="font-semibold text-blue-700 dark:text-blue-400 text-xs uppercase">Cool-Down: </span>
                      <span className="text-blue-900 dark:text-blue-200">{day.coolDown}</span>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
