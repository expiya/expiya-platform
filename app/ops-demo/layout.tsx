import type { Metadata } from "next";
import { OpsShell } from "@/components/used-cars/ops/OpsShell";
import "./ops-theme.css";

export const metadata:Metadata={title:"Expiya Ops · Sentetik Foundation",robots:{index:false,follow:false,nocache:true}};
export default function OpsDemoLayout({children}:{children:React.ReactNode}) { return <OpsShell>{children}</OpsShell>; }
