import type { Metadata } from "next";
import { DepartmentLanding } from "@/components/xpy/DepartmentLanding";
import { BABY_LANDING_PACK } from "@/features/xpy/departmentLandingPacks";
import BabyConversation from "./BabyConversation";
export const metadata: Metadata = { title: "Expiya Bebek & Çocuk — Bebek Arabası Seçimi", description: "Türkiye için doğrulanmış bebek arabası yapılandırmalarını ihtiyaçlarınıza göre değerlendirin.", alternates: { canonical: "/baby" } };
export default function BabyPage() { return <DepartmentLanding pack={BABY_LANDING_PACK} stageOne={<BabyConversation embedded/>}/>; }

