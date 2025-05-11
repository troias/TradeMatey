// import { supabase } from "@/lib/supabase";
// import { Card } from "@/components/ui/card";

export default async function Dashboard() {
  //   const { data: jobs } = await supabase
  //     .from("jobs")
  //     .select("*")
  //     .eq("client_id", user.id);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Client Dashboard</h1>
      <div className="grid grid-cos-1 md:grid-cols-2 gap-4 mt-4">
        {/* {jobs?.map((job) => (
        //   <Card key={job.id} className="p-4">
        //     <h2 className="text-xl">{job.title}</h2>
        //     <p>{job.status}</p>
        //   </Card>
        ))} */}
      </div>
    </div>
  );
}
