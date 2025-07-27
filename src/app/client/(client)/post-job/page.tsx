"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
// Custom Label Component
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
import Select from "react-select";

// Custom Card Component
const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-white shadow-md rounded-lg p-6 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b pb-2 mb-4">{children}</div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-800">{children}</h2>
);

const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

// Custom Input Component
const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    {...props}
  />
);

// Custom Textarea Component
const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
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
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<JobForm>({
    defaultValues: {
      title: "",
      description: "",
      budget: "",
      milestones: [
        { title: "", description: "", percentage: "", due_date: "" },
      ],
    },
    摆,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "milestones",
  });

  const budget = watch("budget");

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("users")
        .select("region")
        .eq("id", user!.id)
        .single();
      setRegion(data?.region || "");
    };
    fetchUser();
  }, []);

  const calculateCommission = () => {
    const budgetValue = Number(budget);
    if (isNaN(budgetValue)) return "0.00";
    let commission = budgetValue * 0.0333;
    if (region === "Regional") commission = Math.min(commission, 25);
    return commission.toFixed(2);
  };

  const onSubmit = async (data: JobForm) => {
    const totalPercentage = data.milestones.reduce(
      (sum, m) => sum + Number(m.percentage),
      0
    );
    if (totalPercentage !== 100) {
      toast.error("Milestone percentages must sum to 100%");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        budget: Number(data.budget),
        client_id: user!.id,
        payment_type: "milestone",
        milestones: data.milestones,
      }),
    });

    if (res.ok) {
      toast.success("Job posted!");
      router.push("/client/dashboard");
    } else {
      toast.error("Failed to post job");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Post a Job</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Controller
                  name="title"
                  control={control}
                  rules={{ required: "Job title is required" }}
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
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Controller
                  name="description"
                  control={control}
                  rules={{ required: "Description is required" }}
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
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="budget">Budget (A$)</Label>
                <Controller
                  name="budget"
                  control={control}
                  rules={{ required: "Budget is required", min: 0 }}
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
                    {errors.budget.message}
                  </p>
                )}
              </div>

              <p className="text-sm text-gray-600">
                Estimated commission: A${calculateCommission()} (
                {region === "Regional" ? "capped at A$25" : "3.33%"})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
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
                          rules={{ required: "Milestone title is required" }}
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
                            {errors.milestones[index].title.message}
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
                            min: 1,
                            max: 100,
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
                            {errors.milestones[index].percentage.message}
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
                        {errors.milestones?.[index]?.due_date && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.milestones[index].due_date.message}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
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
                className="mt-4"
                onClick={() =>
                  append({
                    title: "",
                    description: "",
                    percentage: "",
                    due_date: "",
                  })
                }
              >
                Add Milestone
              </Button>
            </CardContent>
          </Card>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Post Job
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
// This code defines a client-side component for posting a job with a form that includes job details and milestones.
