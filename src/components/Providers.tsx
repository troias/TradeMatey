// ./src/components/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useContext, ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Add imports

// Create a QueryClient instance
const queryClient = new QueryClient();

// Job Context
interface JobContextType {
  jobs: any[];
  addJob: (job: any) => void;
  updateJob: (jobId: string, updates: any) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<any[]>([]);

  const addJob = (job: any) => {
    setJobs((prevJobs) => [...prevJobs, job]);
  };

  const updateJob = (jobId: string, updates: any) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
    );
  };

  return (
    <JobContext.Provider value={{ jobs, addJob, updateJob }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobContext);
  if (!context) throw new Error("useJobs must be used within a JobProvider");
  return context;
}

// Combined Providers
interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {" "}
        {/* Add QueryClientProvider */}
        <JobProvider>{children}</JobProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
