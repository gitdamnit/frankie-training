import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Users, Dumbbell, Apple, TrendingUp, MoreVertical, Trash2, Edit, Eye } from "lucide-react";
import type { Client } from "@shared/schema";
import { useState } from "react";

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

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAge(dob: string | null | undefined) {
  if (!dob) return null;
  const age = new Date().getFullYear() - parseInt(dob.split("-")[0]);
  return age;
}

function avatarColor(name: string) {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-amber-500", "bg-indigo-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client removed" });
    },
  });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const active = clients.filter(c => c.status === "active").length;
  const inactive = clients.filter(c => c.status !== "active").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FRANKIE</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your intelligent training engine</p>
        </div>
        <Button asChild data-testid="button-add-client">
          <Link href="/clients/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Clients" value={clients.length} color="bg-blue-500" />
        <StatCard icon={TrendingUp} label="Active" value={active} color="bg-emerald-500" />
        <StatCard icon={Apple} label="Meal Plans" value={0} color="bg-orange-500" />
        <StatCard icon={Dumbbell} label="Programs" value={0} color="bg-violet-500" />
      </div>

      {/* Search + Client List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">All Clients</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-clients"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Users className="w-10 h-10 opacity-30" />
              <div className="text-center">
                <p className="font-medium">{search ? "No clients found" : "No clients yet"}</p>
                <p className="text-sm">{search ? "Try a different search" : "Add your first client to get started"}</p>
              </div>
              {!search && (
                <Button variant="outline" asChild size="sm" className="mt-1">
                  <Link href="/clients/new"><Plus className="w-4 h-4 mr-1" />Add Client</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((client) => (
                <div key={client.id} className="flex items-center justify-between px-5 py-3.5 hover-elevate cursor-pointer group" data-testid={`card-client-${client.id}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => navigate(`/clients/${client.id}`)}>
                    <div className={`w-10 h-10 rounded-full ${avatarColor(client.name)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                      {getInitials(client.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{client.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {client.email && <span className="text-xs text-muted-foreground truncate">{client.email}</span>}
                        {client.dateOfBirth && <span className="text-xs text-muted-foreground">{getAge(client.dateOfBirth)} yrs</span>}
                        {client.gender && <span className="text-xs text-muted-foreground capitalize">{client.gender}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                      {client.startingWeight && (
                        <span className="text-xs bg-muted rounded-md px-2 py-0.5 text-muted-foreground">
                          {kgToLbs(client.startingWeight)} lbs
                        </span>
                      )}
                      {client.height && (
                        <span className="text-xs bg-muted rounded-md px-2 py-0.5 text-muted-foreground">
                          {cmToFtInStr(client.height)}
                        </span>
                      )}
                      {client.activityLevel && (
                        <span className="text-xs bg-muted rounded-md px-2 py-0.5 text-muted-foreground capitalize hidden md:inline">
                          {client.activityLevel}
                        </span>
                      )}
                    </div>
                    <Badge variant={client.status === "active" ? "default" : "secondary"} className="text-xs">
                      {client.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-client-menu-${client.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}><Eye className="w-4 h-4 mr-2" />View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}/edit`}><Edit className="w-4 h-4 mr-2" />Edit</Link>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete the client and all their data including meal plans, workout plans, and progress records.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(client.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
