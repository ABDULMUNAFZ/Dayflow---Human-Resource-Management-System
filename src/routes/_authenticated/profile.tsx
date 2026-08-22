import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { 
  KeyRound, Eye, EyeOff, Loader2, Award, Briefcase, User, 
  Landmark, ShieldCheck, Plus, Trash2, Calendar, MapPin, 
  Phone, Mail, CheckCircle2, AlertTriangle 
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal, StatusPill, RoleBadge } from "@/components/ui/bits";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import type { EmploymentStatus, SalaryConfig } from "@/lib/types";
import { 
  updateMyProfile, 
  updateEmployeeExtendedInfo, 
  updateEmployeeResume, 
  changePassword, 
  getSalaryConfig, 
  saveSalaryConfig,
  calculateSalaryComponents
} from "@/lib/employees.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Dayflow HR" },
      { name: "description", content: "Your Dayflow employee profile and personal details." },
      { property: "og:title", content: "My Profile — Dayflow HR" },
      { property: "og:description", content: "Your Dayflow employee profile and personal details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session, isLoading, refresh } = useSession();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("resume");
  const [busy, setBusy] = useState(false);

  // Resume state
  const [aboutSummary, setAboutSummary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [certs, setCerts] = useState<string[]>([]);
  const [newCert, setNewCert] = useState("");

  // Private Info state
  const [privateForm, setPrivateForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    email: "",
    job_title: "",
    department_id: "",
    employment_status: "active" as EmploymentStatus,
    joining_date: "",
    company_id: "",
    date_of_birth: "",
    nationality: "",
    personal_email: "",
    gender: "",
    marital_status: "",
    bank_account_no: "",
    bank_name: "",
    ifsc_code: "",
    pan_no: "",
    uan_no: ""
  });

  // Password state
  const [pwForm, setPwForm] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Salary Configuration state
  const [wageType, setWageType] = useState<"fixed" | "monthly" | "yearly">("monthly");
  const [wageAmount, setWageAmount] = useState(0);
  const [workDays, setWorkDays] = useState(5);
  const [workHours, setWorkHours] = useState(8);
  const [pfRate, setPfRate] = useState(12);
  const [employerPfRate, setEmployerPfRate] = useState(12);
  const [profTax, setProfTax] = useState(200);
  const [salaryComponents, setSalaryComponents] = useState<any[]>([]);

  // Components edit helpers
  const [newCompName, setNewCompName] = useState("");
  const [newCompType, setNewCompType] = useState<"fixed" | "percentage">("percentage");
  const [newCompValue, setNewCompValue] = useState(0);
  const [newCompBase, setNewCompBase] = useState<string | null>("wage");

  const empId = session?.profile?.id || "";

  // Fetch salary config for Admin only
  const { data: salaryConfig, refetch: refetchSalary } = useQuery<SalaryConfig, Error>({
    queryKey: ["salary-config", empId],
    queryFn: async () => {
      const res = await getSalaryConfig({ data: { employeeId: empId } });
      return res as SalaryConfig;
    },
    enabled: Boolean(empId && session?.isAdmin),
  });

  useEffect(() => {
    if (session?.profile) {
      const p = session.profile;
      setAboutSummary(p.about_summary ?? "");
      setSkills(p.skills ?? []);
      setCerts(p.certifications ?? []);

      setPrivateForm({
        full_name: p.full_name ?? "",
        phone: p.phone ?? "",
        address: p.address ?? "",
        email: p.email ?? "",
        job_title: p.job_title ?? "",
        department_id: p.department_id ?? "",
        employment_status: p.employment_status || "active",
        joining_date: p.joining_date ?? "",
        company_id: p.company_id ?? "",
        date_of_birth: p.date_of_birth ?? "",
        nationality: p.nationality ?? "",
        personal_email: p.personal_email ?? "",
        gender: p.gender ?? "",
        marital_status: p.marital_status ?? "",
        bank_account_no: p.bank_account_no ?? "",
        bank_name: p.bank_name ?? "",
        ifsc_code: p.ifsc_code ?? "",
        pan_no: p.pan_no ?? "",
        uan_no: p.uan_no ?? ""
      });
    }
  }, [session]);

  useEffect(() => {
    if (salaryConfig) {
      setWageType(salaryConfig.wage_type);
      setWageAmount(salaryConfig.wage_amount);
      setWorkDays(salaryConfig.working_days_per_week);
      setWorkHours(salaryConfig.working_hours_per_day);
      setPfRate(salaryConfig.pf_rate);
      setEmployerPfRate(salaryConfig.employer_pf_rate);
      setProfTax(salaryConfig.professional_tax);
      setSalaryComponents(salaryConfig.components || []);
    }
  }, [salaryConfig]);

  if (isLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
  }

  const profile = session.profile;
  const isAdmin = session.isAdmin;
  const isHR = session.role === "hr";
  const isStaff = isAdmin || isHR;

  // Add / Remove resume chips
  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (s: string) => {
    setSkills(skills.filter((sk) => sk !== s));
  };

  const addCert = () => {
    if (newCert.trim() && !certs.includes(newCert.trim())) {
      setCerts([...certs, newCert.trim()]);
      setNewCert("");
    }
  };

  const removeCert = (c: string) => {
    setCerts(certs.filter((cr) => cr !== c));
  };

  // Add Salary component
  const addSalaryComponent = () => {
    if (!newCompName.trim()) {
      toast.error("Component name is required.");
      return;
    }
    const crypto = window.crypto || require("crypto");
    const newComp = {
      id: crypto.randomUUID(),
      name: newCompName.trim(),
      type: newCompType,
      value: newCompValue,
      calculation_base_id: newCompType === "percentage" ? newCompBase : null
    };
    setSalaryComponents([...salaryComponents, newComp]);
    setNewCompName("");
    setNewCompValue(0);
  };

  const removeSalaryComponent = (id: string) => {
    setSalaryComponents(salaryComponents.filter((c) => c.id !== id));
  };

  // Calculation engine execution
  const calculatedComponents = calculateSalaryComponents(wageAmount, salaryComponents);
  const calculatedYearlyWage = wageType === "monthly" ? wageAmount * 12 : wageType === "yearly" ? wageAmount : wageAmount * 30 * 12;

  // Save Operations
  const handleSaveResume = async () => {
    setBusy(true);
    try {
      await updateEmployeeResume({
        data: {
          employeeId: empId,
          about_summary: aboutSummary,
          skills,
          certifications: certs
        }
      });
      toast.success("Resume details updated.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update resume.");
    } finally {
      setBusy(false);
    }
  };

  const handleSavePrivateInfo = async () => {
    setBusy(true);
    try {
      if (isStaff) {
        // Admin or HR full update
        await updateEmployeeExtendedInfo({
          data: {
            employeeId: empId,
            full_name: privateForm.full_name,
            email: privateForm.email,
            phone: privateForm.phone,
            address: privateForm.address,
            job_title: privateForm.job_title,
            department_id: privateForm.department_id || null,
            employment_status: privateForm.employment_status,
            joining_date: privateForm.joining_date,
            company_id: privateForm.company_id || null,
            date_of_birth: privateForm.date_of_birth || null,
            nationality: privateForm.nationality || null,
            personal_email: privateForm.personal_email || null,
            gender: privateForm.gender || null,
            marital_status: privateForm.marital_status || null,
            bank_account_no: privateForm.bank_account_no || null,
            bank_name: privateForm.bank_name || null,
            ifsc_code: privateForm.ifsc_code || null,
            pan_no: privateForm.pan_no || null,
            uan_no: privateForm.uan_no || null,
          }
        });
      } else {
        // Regular employee updates address & phone only
        await updateMyProfile({
          data: {
            full_name: privateForm.full_name,
            phone: privateForm.phone,
            address: privateForm.address
          }
        });
      }
      toast.success("Private information updated.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save details.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSalary = async () => {
    setBusy(true);
    try {
      await saveSalaryConfig({
        data: {
          employeeId: empId,
          wage_type: wageType,
          wage_amount: wageAmount,
          working_days_per_week: workDays,
          working_hours_per_day: workHours,
          pf_rate: pfRate,
          employer_pf_rate: employerPfRate,
          professional_tax: profTax,
          components: salaryComponents
        }
      });
      toast.success("Salary config updated successfully.");
      refetchSalary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update salary.");
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (pwForm.new !== pwForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword({
        data: {
          currentPassword: pwForm.current,
          newPassword: pwForm.new,
          confirmPassword: pwForm.confirm
        }
      });
      toast.success("Password changed successfully.");
      setPwForm({ current: "", new: "", confirm: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* PREMIUM EDITORIAL HEADER */}
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 md:p-8 backdrop-blur-md">
            <div aria-hidden className="absolute inset-0 bg-hero-glow opacity-30" />
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              
              {/* Profile Image with subtle accent border */}
              <div className="relative group">
                <Avatar className="h-28 w-28 border-2 border-accent shadow-glow transition-all duration-300 group-hover:scale-105">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-secondary text-2xl font-bold text-muted-foreground">
                    {(profile?.full_name ?? "DF").split(" ").map((x) => x[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full border-4 border-accent/20 animate-pulse" />
              </div>

              {/* Editorial Info Layout */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
                    {profile?.full_name}
                  </h1>
                  <div className="flex justify-center gap-2">
                    <RoleBadge role={session.role} />
                    <StatusPill variant={profile?.employment_status === "active" ? "success" : "warning"}>
                      {profile?.employment_status || "Active"}
                    </StatusPill>
                  </div>
                </div>

                <p className="text-lg font-medium text-accent">
                  {profile?.job_title}
                </p>

                {/* Subtitle details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-2 gap-x-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                  <div>
                    <span className="block font-semibold uppercase tracking-wider text-[10px] text-muted-foreground/60">ID / Code</span>
                    <span className="font-data font-medium text-foreground">{profile?.employee_code}</span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase tracking-wider text-[10px] text-muted-foreground/60">Department</span>
                    <span className="font-medium text-foreground">{profile?.departments?.name || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase tracking-wider text-[10px] text-muted-foreground/60">Company</span>
                    <span className="font-medium text-foreground">{profile?.company || "Dayflow"}</span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase tracking-wider text-[10px] text-muted-foreground/60">Joined</span>
                    <span className="font-medium text-foreground">{profile?.joining_date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* TABS CONTAINER */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-secondary/60 p-1 rounded-xl border border-border/80">
            <TabsTrigger value="resume" className="rounded-lg gap-2 text-xs md:text-sm">
              <Award className="h-4 w-4" /> Resume
            </TabsTrigger>
            <TabsTrigger value="private" className="rounded-lg gap-2 text-xs md:text-sm">
              <User className="h-4 w-4" /> Private Info
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="salary" className="rounded-lg gap-2 text-xs md:text-sm">
                <Landmark className="h-4 w-4" /> Salary Info
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="rounded-lg gap-2 text-xs md:text-sm">
              <ShieldCheck className="h-4 w-4" /> Security
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* RESUME TAB */}
              <TabsContent value="resume" className="space-y-4 outline-none">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display">Resume Details</CardTitle>
                    <CardDescription>Professional summary, expertises, and certifications.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="about">About Summary</Label>
                      <Textarea 
                        id="about" 
                        value={aboutSummary} 
                        onChange={(e) => setAboutSummary(e.target.value)} 
                        placeholder="Write a brief professional summary..."
                        rows={4}
                        maxLength={1000}
                      />
                    </div>

                    {/* SKILLS CONFIG */}
                    <div className="space-y-3">
                      <Label>Skills</Label>
                      <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border bg-secondary/30 min-h-[50px]">
                        {skills.map((s) => (
                          <Badge key={s} variant="secondary" className="gap-1 bg-accent/10 border-accent/20 text-accent-foreground px-2.5 py-1">
                            {s}
                            <button type="button" onClick={() => removeSkill(s)} className="text-muted-foreground hover:text-foreground">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {skills.length === 0 && <span className="text-xs text-muted-foreground">No skills added yet.</span>}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="React, Node.js..." onKeyDown={(e) => e.key === "Enter" && addSkill()} />
                        <Button variant="outline" size="icon" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    {/* CERTIFICATIONS */}
                    <div className="space-y-3">
                      <Label>Certifications</Label>
                      <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border bg-secondary/30 min-h-[50px]">
                        {certs.map((c) => (
                          <Badge key={c} variant="secondary" className="gap-1 bg-accent/10 border-accent/20 text-accent-foreground px-2.5 py-1">
                            {c}
                            <button type="button" onClick={() => removeCert(c)} className="text-muted-foreground hover:text-foreground">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {certs.length === 0 && <span className="text-xs text-muted-foreground">No certifications added yet.</span>}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        <Input value={newCert} onChange={(e) => setNewCert(e.target.value)} placeholder="AWS Certified Architect..." onKeyDown={(e) => e.key === "Enter" && addCert()} />
                        <Button variant="outline" size="icon" onClick={addCert}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <Button onClick={handleSaveResume} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                      {busy ? "Saving..." : "Save Resume Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PRIVATE INFO TAB */}
              <TabsContent value="private" className="space-y-4 outline-none">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display">Private Information</CardTitle>
                    <CardDescription>
                      Personal identifiers, coordinates, and bank details. 
                      {!isStaff && <span className="text-amber-500 font-semibold block mt-1">⚠️ Contact HR/Admin to edit read-only fields.</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Basic Editable Fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="pri-name">Full Name</Label>
                        <Input id="pri-name" value={privateForm.full_name} onChange={(e) => setPrivateForm({ ...privateForm, full_name: e.target.value })} disabled={!isStaff} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pri-phone">Phone</Label>
                        <Input id="pri-phone" value={privateForm.phone} onChange={(e) => setPrivateForm({ ...privateForm, phone: e.target.value })} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="pri-address">Residential Address</Label>
                        <Input id="pri-address" value={privateForm.address} onChange={(e) => setPrivateForm({ ...privateForm, address: e.target.value })} />
                      </div>
                    </div>

                    <div className="border-t border-border/60 pt-4 space-y-4">
                      <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Demographics</h3>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-dob">Date of Birth</Label>
                          <input id="pri-dob" type="date" value={privateForm.date_of_birth} onChange={(e) => setPrivateForm({ ...privateForm, date_of_birth: e.target.value })} disabled={!isStaff} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm disabled:opacity-60" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-nationality">Nationality</Label>
                          <Input id="pri-nationality" value={privateForm.nationality} onChange={(e) => setPrivateForm({ ...privateForm, nationality: e.target.value })} disabled={!isStaff} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-gender">Gender</Label>
                          <Input id="pri-gender" value={privateForm.gender} onChange={(e) => setPrivateForm({ ...privateForm, gender: e.target.value })} disabled={!isStaff} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-marital">Marital Status</Label>
                          <Input id="pri-marital" value={privateForm.marital_status} onChange={(e) => setPrivateForm({ ...privateForm, marital_status: e.target.value })} disabled={!isStaff} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-pemail">Personal Email</Label>
                          <Input id="pri-pemail" value={privateForm.personal_email} onChange={(e) => setPrivateForm({ ...privateForm, personal_email: e.target.value })} disabled={!isStaff} />
                        </div>
                      </div>
                    </div>

                    {/* Bank Info Fields */}
                    <div className="border-t border-border/60 pt-4 space-y-4">
                      <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Financial & Bank Identifiers</h3>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-bankname">Bank Name</Label>
                          <Input id="pri-bankname" value={privateForm.bank_name} onChange={(e) => setPrivateForm({ ...privateForm, bank_name: e.target.value })} disabled={!isStaff} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-account">Account Number</Label>
                          <Input id="pri-account" value={privateForm.bank_account_no} onChange={(e) => setPrivateForm({ ...privateForm, bank_account_no: e.target.value })} disabled={!isStaff} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-ifsc">IFSC Code</Label>
                          <Input id="pri-ifsc" value={privateForm.ifsc_code} onChange={(e) => setPrivateForm({ ...privateForm, ifsc_code: e.target.value })} disabled={!isStaff} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-pan">PAN Number</Label>
                          <Input id="pri-pan" value={privateForm.pan_no} onChange={(e) => setPrivateForm({ ...privateForm, pan_no: e.target.value })} disabled={!isStaff} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pri-uan">UAN Number</Label>
                          <Input id="pri-uan" value={privateForm.uan_no} onChange={(e) => setPrivateForm({ ...privateForm, uan_no: e.target.value })} disabled={!isStaff} />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleSavePrivateInfo} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                      {busy ? "Saving..." : "Save Private Details"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SALARY CONFIG TAB */}
              {isAdmin && (
                <TabsContent value="salary" className="space-y-4 outline-none">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display">Salary Configuration & Structure</CardTitle>
                      <CardDescription>Define contract base wages, work schedules, and cascading components.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        <div className="space-y-1.5">
                          <Label>Wage Type</Label>
                          <Select value={wageType} onValueChange={(v: any) => setWageType(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                              <SelectItem value="fixed">Fixed Wage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label>Base Wage Amount</Label>
                          <Input 
                            type="number" 
                            value={wageAmount} 
                            onChange={(e) => setWageAmount(Number(e.target.value))} 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Working Days / Week</Label>
                          <Input 
                            type="number" 
                            value={workDays} 
                            onChange={(e) => setWorkDays(Number(e.target.value))} 
                            min={1} max={7}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Working Hours / Day</Label>
                          <Input 
                            type="number" 
                            value={workHours} 
                            onChange={(e) => setWorkHours(Number(e.target.value))} 
                            min={1} max={24}
                          />
                        </div>
                      </div>

                      {/* Display Auto Calculated Yearly Equivalent */}
                      <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest">Yearly Wage Equivalent</p>
                          <p className="font-display text-2xl font-extrabold text-accent">
                            ₹{calculatedYearlyWage.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          Schedule: {workDays} days/week, {workHours} hours/day
                        </div>
                      </div>

                      {/* PF & PT Config */}
                      <div className="border-t border-border/60 pt-4 space-y-4">
                        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Statutory Contributions</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label>Employee PF Contribution (%)</Label>
                            <Input type="number" value={pfRate} onChange={(e) => setPfRate(Number(e.target.value))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Employer PF Contribution (%)</Label>
                            <Input type="number" value={employerPfRate} onChange={(e) => setEmployerPfRate(Number(e.target.value))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Professional Tax (₹)</Label>
                            <Input type="number" value={profTax} onChange={(e) => setProfTax(Number(e.target.value))} />
                          </div>
                        </div>
                      </div>

                      {/* SALARY COMPONENTS ENGINE EDITOR */}
                      <div className="border-t border-border/60 pt-4 space-y-4">
                        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Salary Components Structure</h3>
                        
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Component Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Value / Rate</TableHead>
                                <TableHead>Calculation Base</TableHead>
                                <TableHead className="text-right">Calculated Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {calculatedComponents.map((c) => (
                                <TableRow key={c.id}>
                                  <TableCell className="font-medium">{c.name}</TableCell>
                                  <TableCell className="capitalize text-muted-foreground">{c.type}</TableCell>
                                  <TableCell className="font-data">
                                    {c.type === "percentage" ? `${c.value}%` : `₹${c.value}`}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {c.calculation_base_id === "wage" 
                                      ? "Base Wage" 
                                      : c.calculation_base_id === "basic" 
                                      ? "Basic Salary" 
                                      : c.calculation_base_id || "None"
                                    }
                                  </TableCell>
                                  <TableCell className="text-right font-data font-bold text-accent">
                                    ₹{c.calculated_amount.toLocaleString("en-IN")}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeSalaryComponent(c.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {calculatedComponents.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                                    No components added. Add HRA, Basic, or PT.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Add Component Subform */}
                        <div className="grid gap-3 p-4 rounded-xl border border-border/80 bg-secondary/30 sm:grid-cols-2 md:grid-cols-4">
                          <div className="space-y-1.5">
                            <Label>Component Name</Label>
                            <Input value={newCompName} onChange={(e) => setNewCompName(e.target.value)} placeholder="Basic Salary, HRA..." />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select value={newCompType} onValueChange={(v: any) => setNewCompType(v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label>Value</Label>
                            <Input type="number" value={newCompValue} onChange={(e) => setNewCompValue(Number(e.target.value))} />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Base Target</Label>
                            <Select value={newCompBase || "none"} onValueChange={(v) => setNewCompBase(v === "none" ? null : v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None (Independent)</SelectItem>
                                <SelectItem value="wage">Base Wage</SelectItem>
                                <SelectItem value="basic">Basic Salary</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button onClick={addSalaryComponent} className="sm:col-span-2 md:col-span-4 mt-2 bg-secondary text-foreground hover:bg-secondary/80">
                            <Plus className="mr-2 h-4 w-4" /> Add Component to Structure
                          </Button>
                        </div>
                      </div>

                      <Button onClick={handleSaveSalary} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                        {busy ? "Saving Configuration..." : "Save Salary Settings"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* SECURITY TAB */}
              <TabsContent value="security" className="space-y-4 outline-none">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display">Security Settings</CardTitle>
                    <CardDescription>Manage credentials, reset temporary keys, and view sessions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div className="space-y-1.5">
                        <Label htmlFor="sec-curr">Current Password</Label>
                        <div className="relative">
                          <Input 
                            id="sec-curr" 
                            type={showCurrent ? "text" : "password"} 
                            value={pwForm.current} 
                            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} 
                            required 
                            className="pr-10" 
                          />
                          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="sec-new">New Password</Label>
                        <div className="relative">
                          <Input 
                            id="sec-new" 
                            type={showNew ? "text" : "password"} 
                            value={pwForm.new} 
                            onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })} 
                            required 
                            className="pr-10" 
                          />
                          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="sec-conf">Confirm New Password</Label>
                        <div className="relative">
                          <Input 
                            id="sec-conf" 
                            type={showConfirm ? "text" : "password"} 
                            value={pwForm.confirm} 
                            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} 
                            required 
                            className="pr-10" 
                          />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Update Credentials
                      </Button>
                    </form>

                    {/* Session Security Details */}
                    <div className="border-t border-border/60 pt-4 space-y-3">
                      <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Session Security Information</h3>
                      <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Security Status</span>
                          <span className="font-semibold text-success flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Checked (Standard SSL Encryption)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>User UID</span>
                          <span className="font-data">{session.user.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Role Permissions</span>
                          <span className="capitalize">{session.role} access scope</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </AppShell>
  );
}
