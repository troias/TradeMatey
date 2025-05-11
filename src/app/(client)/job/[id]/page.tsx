export default function JobDetail({ params }: { params: { id: string } }) {
  return <div>Job ID: {params.id}</div>;
}
