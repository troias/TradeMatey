// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login"); // fallback if middleware missed it
  }

  const role = session.user.role;

  // Only allow "tradie" or "client"
  if (role !== "tradie" && role !== "client") {
    redirect("/auth/post-signin"); // back to flow to complete onboarding
  }

  // Sample data for demo purposes (e.g., for tracking jobs, tasks, etc.)
  const upcomingTasks = [
    { task: "Fix bathroom sink", dueDate: "May 10, 2025", status: "Pending" },
    { task: "Deliver supplies", dueDate: "May 12, 2025", status: "Completed" },
    { task: "Install new tiles", dueDate: "May 15, 2025", status: "Pending" },
  ];

  const clientData = {
    totalProjects: 5,
    activeProjects: 2,
    completedProjects: 3,
  };

  const tradieData = {
    totalJobs: 15,
    completedJobs: 10,
    pendingJobs: 5,
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Welcome to your Dashboard
        </h1>
        <p className="text-lg text-center">Email: {session.user.email}</p>
        <p className="text-lg text-center">Role: {session.user.role}</p>
        <p className="text-lg text-center">User ID: {session.user.id}</p>
      </div>

      {/* Role-based Dashboard Content */}
      <div className="mt-10">
        {role === "tradie" ? (
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-blue-100 p-6 rounded-lg shadow">
              <h2 className="text-2xl font-semibold mb-4">Job Overview</h2>
              <p className="text-lg mb-2">Total Jobs: {tradieData.totalJobs}</p>
              <p className="text-lg mb-2">
                Completed Jobs: {tradieData.completedJobs}
              </p>
              <p className="text-lg">Pending Jobs: {tradieData.pendingJobs}</p>
            </div>

            <div className="bg-gray-100 p-6 rounded-lg shadow">
              <h2 className="text-2xl font-semibold mb-4">Upcoming Tasks</h2>
              <ul className="space-y-4">
                {upcomingTasks.map((task, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>{task.task}</span>
                    <span
                      className={`px-3 py-1 rounded-lg ${
                        task.status === "Completed"
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                    >
                      {task.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-teal-100 p-6 rounded-lg shadow">
              <h2 className="text-2xl font-semibold mb-4">Project Overview</h2>
              <p className="text-lg mb-2">
                Total Projects: {clientData.totalProjects}
              </p>
              <p className="text-lg mb-2">
                Active Projects: {clientData.activeProjects}
              </p>
              <p className="text-lg">
                Completed Projects: {clientData.completedProjects}
              </p>
            </div>

            <div className="bg-gray-100 p-6 rounded-lg shadow">
              <h2 className="text-2xl font-semibold mb-4">Client Dashboard</h2>
              <p className="text-lg">
                Here, you can manage and monitor your projects.
              </p>
              {/* Add more client-specific features, like project tracking, billing, etc. */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
