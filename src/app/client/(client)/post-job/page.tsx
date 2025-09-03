"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

// UI helpers
const Label = ({
  htmlFor,
  children,
  className,
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    htmlFor={htmlFor}
    className={`block text-sm font-medium text-gray-700 mb-1 ${
      className || ""
    }`}
  >
    {children}
  </label>
);
const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-white shadow-md rounded-lg p-6 ${className || ""}`}>
    {children}
  </div>
);
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b pb-2 mb-4">{children}</div>
);
const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-800">{children}</h2>
);
const CardContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;
const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      className || ""
    }`}
    {...props}
  />
);
const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      className || ""
    }`}
    {...props}
  />
);

const supabase = createClient();

type JobForm = {
  title: string;
  description: string;
  budget: string;
  milestones: {
    title: string;
    description: string;
    percentage: string;
    due_date: string;
  }[];
};

export default function PostJob() {
  const [region, setRegion] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    trigger,
    getValues,
    reset,
  } = useForm<JobForm>({
    defaultValues: {
      title: "",
      description: "",
      budget: "",
      milestones: [
        { title: "", description: "", percentage: "", due_date: "" },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "milestones",
  });

  const budget = watch("budget");
  const milestonesWatch = watch("milestones");
  const usedPercent = useMemo(
    () =>
      (milestonesWatch || []).reduce(
        (s, m) => s + (Number(m.percentage) || 0),
        0
      ),
    [milestonesWatch]
  );
  const remainingPercent = Math.max(0, 100 - usedPercent);

  useEffect(() => {
    // fetch region for commission logic
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("users")
          .select("region")
          .eq("id", user.id)
          .single();
        setRegion((data as unknown as { region?: string })?.region || "");
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Draft autosave
  useEffect(() => {
    const draft = localStorage.getItem("post-job-draft");
    if (draft) {
      try {
        reset(JSON.parse(draft));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const sub = watch((value) => {
      try {
        localStorage.setItem("post-job-draft", JSON.stringify(value));
      } catch {
        /* ignore */
      }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  // Leave guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isSubmitting]);

  const calculateCommission = () => {
    const n = Number(budget);
    if (!Number.isFinite(n)) return "0.00";
    let c = n * 0.0333;
    if (region === "Regional") c = Math.min(c, 25);
    return c.toFixed(2);
  };

  const goNext = async () => {
    if (step === 1) {
      const valid = await trigger(["title", "description", "budget"]);
      if (valid) setStep(2);
      return;
    }
    if (step === 2) {
      const valid = await trigger([
        ...fields.map((_, i) => `milestones.${i}.title` as const),
        ...fields.map((_, i) => `milestones.${i}.percentage` as const),
      ]);
      const total = (getValues("milestones") || []).reduce(
        (s, m) => s + (Number(m.percentage) || 0),
        0
      );
      if (total !== 100) {
        toast.error("Milestone percentages must sum to 100%");
        return;
      }
      if (valid) setStep(3);
      return;
    }
  };
  const goBack = () => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)));

  const onSubmit = async (data: JobForm) => {
    const total = data.milestones.reduce(
      (s, m) => s + (Number(m.percentage) || 0),
      0
    );
    if (total !== 100) {
      toast.error("Milestone percentages must sum to 100%");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in to post a job");
      return;
    }

    const jobBudget = Number(data.budget);
    const milestones = data.milestones.map((m) => {
      const pct = Number(m.percentage) || 0;
      const amt = Math.round(((jobBudget * pct) / 100) * 100) / 100;
      return {
        title: m.title,
        description: m.description,
        amount: Number.isFinite(jobBudget) ? amt : 0,
        due_date: m.due_date,
      };
    });

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        // Ensure cookies are sent so server-side auth (supabase auth.getUser)
        // can read the session on the server. Use 'include' to be explicit.
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          budget: Number(data.budget),
          client_id: user.id,
          payment_type: "milestone",
          milestones,
        }),
      });

      if (res.ok) {
        try {
          localStorage.removeItem("post-job-draft");
        } catch {
          /* ignore */
        }
        toast.success("Job posted!");
        router.push("/client/dashboard");
        return;
      }

      // Try to read server-provided JSON error for more detail
      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        // ignore JSON parse errors
      }
      const bodyError =
        payload &&
        typeof payload === "object" &&
        "error" in (payload as Record<string, unknown>)
          ? String((payload as Record<string, unknown>).error)
          : null;
      const msg = bodyError || `Failed to post job: ${res.status}`;
      console.warn("Post job failed", { status: res.status, body: payload });
      toast.error(msg);
    } catch (err: unknown) {
      // Network or CORS error ('Failed to fetch')
      console.error("Network error when posting job:", err);
      toast.error(
        "Network error: failed to reach server. Check your connection or dev server."
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Post a Job</h1>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-6" aria-label="Form progress">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= i
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
              aria-current={step === i ? "step" : undefined}
            >
              {i}
            </div>
            {i < 3 && (
              <div
                className={`w-10 h-1 ${
                  step > i ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        aria-live="polite"
      >
        {/* Step 1 */}
        <Card className={step === 1 ? "" : "opacity-50 pointer-events-none"}>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Controller
                name="title"
                control={control}
                rules={{
                  required: "Job title is required",
                  minLength: { value: 3, message: "Minimum 3 characters" },
                  maxLength: { value: 100, message: "Maximum 100 characters" },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="title"
                    placeholder="e.g., Build a website"
                    className="mt-1"
                    aria-invalid={!!errors.title}
                  />
                )}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.title.message as string}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Controller
                name="description"
                control={control}
                rules={{
                  required: "Description is required",
                  minLength: { value: 20, message: "Minimum 20 characters" },
                  maxLength: {
                    value: 2000,
                    message: "Maximum 2000 characters",
                  },
                }}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="description"
                    placeholder="Describe the job in detail..."
                    className="mt-1 min-h-[150px]"
                    aria-invalid={!!errors.description}
                  />
                )}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description.message as string}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="budget">Budget (A$)</Label>
              <Controller
                name="budget"
                control={control}
                rules={{
                  required: "Budget is required",
                  validate: (v) => {
                    const n = Number(v);
                    if (!Number.isFinite(n)) return "Enter a valid number";
                    if (n <= 0) return "Budget must be greater than 0";
                    if (n > 10000000) return "Budget too large";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="budget"
                    type="number"
                    placeholder="Enter budget"
                    className="mt-1"
                    aria-invalid={!!errors.budget}
                  />
                )}
              />
              {errors.budget && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.budget.message as string}
                </p>
              )}
            </div>

            <p className="text-sm text-gray-600">
              Estimated platform fee: A${calculateCommission()} (
              {region === "Regional" ? "capped at A$25" : "3.33%"})
            </p>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className={step === 2 ? "" : "opacity-50 pointer-events-none"}>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Allocated: {isNaN(usedPercent) ? 0 : usedPercent}%</span>
                <span>Remaining: {remainingPercent}%</span>
              </div>
              <div
                className="h-3 w-full rounded bg-gray-200 overflow-hidden"
                aria-label={`Allocated ${usedPercent}% out of 100%`}
              >
                <div
                  className={`h-full ${
                    usedPercent <= 100 ? "bg-blue-600" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(usedPercent, 100)}%` }}
                />
              </div>
              <p
                className={`text-xs ${
                  usedPercent > 100 ? "text-red-600" : "text-gray-500"
                }`}
              >
                {usedPercent}% of 100%
              </p>
            </div>

            <AnimatePresence>
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border p-4 rounded-lg"
                >
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`milestones.${index}.title`}>
                        Milestone Title
                      </Label>
                      <Controller
                        name={`milestones.${index}.title`}
                        control={control}
                        rules={{
                          required: "Milestone title is required",
                          minLength: {
                            value: 2,
                            message: "Minimum 2 characters",
                          },
                          maxLength: {
                            value: 100,
                            message: "Maximum 100 characters",
                          },
                        }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id={`milestones.${index}.title`}
                            placeholder="e.g., Complete design phase"
                            className="mt-1"
                            aria-invalid={!!errors.milestones?.[index]?.title}
                          />
                        )}
                      />
                      {errors.milestones?.[index]?.title && (
                        <p className="text-red-500 text-sm mt-1">
                          {
                            (
                              errors.milestones?.[index]?.title as unknown as {
                                message?: string;
                              }
                            )?.message as string
                          }
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`milestones.${index}.description`}>
                        Description
                      </Label>
                      <Controller
                        name={`milestones.${index}.description`}
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            id={`milestones.${index}.description`}
                            placeholder="Describe the milestone..."
                            className="mt-1 min-h-[100px]"
                          />
                        )}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`milestones.${index}.percentage`}>
                        Percentage (%)
                      </Label>
                      <Controller
                        name={`milestones.${index}.percentage`}
                        control={control}
                        rules={{
                          required: "Percentage is required",
                          min: { value: 1, message: "Minimum 1%" },
                          max: { value: 100, message: "Maximum 100%" },
                          validate: (value) => {
                            const val = Number(value);
                            if (!Number.isFinite(val))
                              return "Enter a valid number";
                            const others = (milestonesWatch || []).reduce(
                              (sum, m, i) =>
                                i === index
                                  ? sum
                                  : sum + (Number(m.percentage) || 0),
                              0
                            );
                            return (
                              others + val <= 100 || "Total cannot exceed 100%"
                            );
                          },
                        }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id={`milestones.${index}.percentage`}
                            type="number"
                            placeholder="e.g., 25"
                            className="mt-1"
                            aria-invalid={
                              !!errors.milestones?.[index]?.percentage
                            }
                          />
                        )}
                      />
                      {errors.milestones?.[index]?.percentage && (
                        <p className="text-red-500 text-sm mt-1">
                          {
                            (
                              errors.milestones?.[index]
                                ?.percentage as unknown as {
                                message?: string;
                              }
                            )?.message as string
                          }
                        </p>
                      )}
                      {Number.isFinite(Number(budget)) && (
                        <p className="text-xs text-gray-500 mt-1">
                          ≈ A$
                          {(
                            ((Number(budget) || 0) *
                              Number(
                                milestonesWatch?.[index]?.percentage || 0
                              )) /
                            100
                          ).toFixed(2)}{" "}
                          of A${Number(budget || 0).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`milestones.${index}.due_date`}>
                        Due Date
                      </Label>
                      <Controller
                        name={`milestones.${index}.due_date`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id={`milestones.${index}.due_date`}
                            type="date"
                            className="mt-1"
                            aria-invalid={
                              !!errors.milestones?.[index]?.due_date
                            }
                          />
                        )}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2"
                      onClick={() => remove(index)}
                    >
                      Remove Milestone
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <Button
              type="button"
              variant="outline"
              className="mt-2"
              disabled={usedPercent >= 100}
              onClick={() =>
                append({
                  title: "",
                  description: "",
                  percentage: remainingPercent ? String(remainingPercent) : "",
                  due_date: "",
                })
              }
            >
              Add Milestone
            </Button>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className={step === 3 ? "" : "opacity-50 pointer-events-none"}>
          <CardHeader>
            <CardTitle>Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Title</span>
                <span className="font-medium">{getValues("title") || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Budget</span>
                <span className="font-medium">
                  A${Number(budget || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated platform fee</span>
                <span className="font-medium">A${calculateCommission()}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Milestones</h3>
              <ul className="space-y-1 text-sm">
                {(milestonesWatch || []).map((m, i) => {
                  const pct = Number(m.percentage) || 0;
                  const amt = ((Number(budget) || 0) * pct) / 100;
                  return (
                    <li key={i} className="flex justify-between">
                      <span className="truncate mr-2">
                        {m.title || `Milestone ${i + 1}`}
                      </span>
                      <span className="tabular-nums">
                        {pct}% • A${amt.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
          )}
          {step < 3 && (
            <Button type="button" onClick={goNext} disabled={isSubmitting}>
              Next
            </Button>
          )}
          {step === 3 && (
            <Button
              type="submit"
              className="sm:ml-auto"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Post Job
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset({
                title: "",
                description: "",
                budget: "",
                milestones: [
                  { title: "", description: "", percentage: "", due_date: "" },
                ],
              });
              try {
                localStorage.removeItem("post-job-draft");
              } catch {
                /* ignore */
              }
              setStep(1);
            }}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
