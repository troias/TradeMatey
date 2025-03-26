import BookingForm from "@/components/BookingForm";

export default function BookPage() {
  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Book a Tradie</h1>
      <BookingForm />
    </div>
  );
}
