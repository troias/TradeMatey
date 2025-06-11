"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      const role = session.user.role;
      const hasCompletedOnboarding =
        session.user.has_completed_onboarding ?? false;
      if (hasCompletedOnboarding) {
        router.push(`/${role}/dashboard`);
      } else {
        router.push(`/${role}/onboarding`);
      }
    }
  }, [session, router]);

  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <section className="relative bg-blue-600 py-20">
          <div className="container mx-auto text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Find Trusted Tradies with TradeMatey
            </h1>
            <p className="text-xl mb-6">
              Post jobs, pay securely with milestones, and resolve disputes with
              QBCC support.
            </p>
            <div className="space-x-4">
              <Link href="/client/post-job">
                <Button className="bg-blue-500 hover:bg-blue-600">
                  Post a Job
                </Button>
              </Link>
              <Link href="/tradie/login">
                <Button variant="outline">Join as a Tradie</Button>
              </Link>
            </div>
          </div>
        </section>
        <section className="py-16 bg-gray-100">
          <div className="container mx-auto grid grid-cols-3 gap-8">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold">Milestone Payments</h2>
              <p className="mt-2">
                Pay only for completed work with our secure milestone system.
              </p>
            </Card>
            <Card className="p-6">
              <h2 className="text-2xl font-semibold">AI Tradie Matching</h2>
              <p className="mt-2">
                Our AI matches you with top tradies based on skills, location,
                and ratings.
              </p>
            </Card>
            <Card className="p-6">
              <h2 className="text-2xl font-semibold">QBCC Compliance</h2>
              <p className="mt-2">
                14+14 day payment timelines and dispute escalation to QBCC.
              </p>
            </Card>
          </div>
        </section>
        {analytics && (
          <section className="py-16 text-center">
            <h2 className="text-3xl font-bold mb-8">
              TradeMatey by the Numbers
            </h2>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-4xl font-bold">{analytics.totalJobs}</p>
                <p>Jobs Completed</p>
              </div>
              <div>
                <p className="text-4xl font-bold">{analytics.newUsers}</p>
                <p>New Users (30 Days)</p>
              </div>
              <div>
                <p className="text-4xl font-bold">
                  {analytics.completionRate}%
                </p>
                <p>Completion Rate</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
