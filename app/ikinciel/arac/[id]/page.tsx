import { notFound } from "next/navigation";
import { VehicleDetailDemo } from "@/components/used-cars/VehicleDetailDemo";
import { findDemoUsedCar } from "@/features/used-cars/demo/catalog";

export default async function UsedCarDetailDemoPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = findDemoUsedCar(id);
  if (!car) notFound();
  return <VehicleDetailDemo car={car}/>;
}
