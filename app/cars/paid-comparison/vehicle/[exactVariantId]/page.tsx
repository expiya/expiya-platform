import UnlockedVehicleView from "./UnlockedVehicleView";

export const metadata = { title: "Karşılaştırmayla açılan araç | Expiya Cars", robots: { index: false, follow: false } };
export default async function UnlockedVehiclePage({ params }: { params: Promise<{ exactVariantId: string }> }) { const { exactVariantId } = await params; return <UnlockedVehicleView exactVariantId={decodeURIComponent(exactVariantId)} />; }
