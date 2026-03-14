import { Dashboard } from "@/components/Dashboard";

export default async function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <Dashboard tripId={tripId} />;
}
