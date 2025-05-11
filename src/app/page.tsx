import Link from "next/link";
// import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center">Find Top Tradies</h1>
      <div className="flex justify-center gap-4 mt-8">
        <Link href="/post-job">{/* <Button>Post a Job</Button> */}</Link>
        <Link href="/browse-tradies">
          {/* <Button variant="outline">Browse Tradies</Button> */}
        </Link>
      </div>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Testimonials</h2>
        {/* Add testimonials */}
      </section>
    </div>
  );
}
