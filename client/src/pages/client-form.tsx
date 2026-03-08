import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, User } from "lucide-react";
import { Link } from "wouter";
import type { Client } from "@shared/schema";
import { insertClientSchema } from "@shared/schema";
import { useEffect } from "react";

// Imperial ↔ metric conversion helpers
function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches };
}
function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54 * 10) / 10;
}
function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}
function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

const formSchema = insertClientSchema.extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  heightFt: z.coerce.number().int().min(0).max(8).optional(),
  heightIn: z.coerce.number().int().min(0).max(11).optional(),
  weightLbs: z.coerce.number().positive().optional(),
}).omit({ height: true, startingWeight: true });

type FormData = z.infer<typeof formSchema>;

export default function ClientForm() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const isEditing = !!id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: existing, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", id],
    enabled: isEditing,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", email: "", phone: "", dateOfBirth: "", gender: "",
      heightFt: undefined, heightIn: undefined, weightLbs: undefined,
      activityLevel: "", status: "active", notes: "",
    },
  });

  useEffect(() => {
    if (existing) {
      const imperial: Partial<FormData> = {
        name: existing.name,
        email: existing.email || "",
        phone: existing.phone || "",
        dateOfBirth: existing.dateOfBirth || "",
        gender: existing.gender || "",
        activityLevel: existing.activityLevel || "",
        status: existing.status || "active",
        notes: existing.notes || "",
      };
      if (existing.height) {
        const { ft, inches } = cmToFtIn(parseFloat(String(existing.height)));
        imperial.heightFt = ft;
        imperial.heightIn = inches;
      }
      if (existing.startingWeight) {
        imperial.weightLbs = kgToLbs(parseFloat(String(existing.startingWeight)));
      }
      form.reset(imperial as any);
    }
  }, [existing, form]);

  const buildPayload = (data: FormData) => {
    const { heightFt, heightIn, weightLbs, ...rest } = data;
    const payload: Record<string, any> = {
      ...rest,
      email: data.email || null,
      phone: data.phone || null,
    };
    if (heightFt !== undefined || heightIn !== undefined) {
      payload.height = String(ftInToCm(heightFt ?? 0, heightIn ?? 0));
    }
    if (weightLbs !== undefined) {
      payload.startingWeight = String(lbsToKg(weightLbs));
    }
    return payload;
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/clients", buildPayload(data)),
    onSuccess: async (res) => {
      const client = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client added successfully!" });
      navigate(`/clients/${client.id}`);
    },
    onError: () => toast({ title: "Failed to add client", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("PATCH", `/api/clients/${id}`, buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", id] });
      toast({ title: "Client updated!" });
      navigate(`/clients/${id}`);
    },
    onError: () => toast({ title: "Failed to update client", variant: "destructive" }),
  });

  const onSubmit = (data: FormData) => {
    if (isEditing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  if (isEditing && isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={isEditing ? `/clients/${id}` : "/"}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{isEditing ? "Edit Client" : "Add New Client"}</h1>
          <p className="text-sm text-muted-foreground">{isEditing ? "Update client information" : "Enter client details to get started"}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input placeholder="Jane Smith" {...field} data-testid="input-client-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="jane@example.com" type="email" {...field} data-testid="input-client-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="(555) 000-0000" {...field} data-testid="input-client-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-client-dob" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger data-testid="select-client-gender"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Physical */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Physical Details</CardTitle>
              <CardDescription className="text-xs">Used for BMR/TDEE calculations. Stored internally in metric.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <FormLabel className="mb-2 block">Height</FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="heightFt" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number" min="0" max="8" placeholder="5"
                            {...field} value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                            data-testid="input-client-height-ft"
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ft</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="heightIn" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number" min="0" max="11" placeholder="8"
                            {...field} value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                            data-testid="input-client-height-in"
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">in</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
              <FormField control={form.control} name="weightLbs" render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Weight</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number" step="0.1" placeholder="155.0"
                        {...field} value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        data-testid="input-client-weight"
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">lbs</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="activityLevel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Activity Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger data-testid="select-activity-level"><SelectValue placeholder="Select activity level..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (desk job, little exercise)</SelectItem>
                      <SelectItem value="light">Lightly Active (1-3 days/week)</SelectItem>
                      <SelectItem value="moderate">Moderately Active (3-5 days/week)</SelectItem>
                      <SelectItem value="active">Very Active (6-7 days/week)</SelectItem>
                      <SelectItem value="very_active">Extremely Active (twice/day)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Status & Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "active"}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Notes / Medical Variables</FormLabel>
                  <FormDescription className="text-xs">Injuries, surgeries, medical conditions, anything important to know</FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Had knee surgery 2 months ago, cleared for low-impact exercise. Manages Type 2 diabetes. Diastasis recti post-pregnancy..."
                      className="min-h-24 resize-none"
                      {...field}
                      data-testid="textarea-client-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end pb-6">
            <Button type="button" variant="outline" asChild>
              <Link href={isEditing ? `/clients/${id}` : "/"}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-save-client">
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Saving..." : (isEditing ? "Update Client" : "Add Client")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
