"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
const intents = ["REQUEST_QUOTE", "REQUEST_TEST_DRIVE", "REQUEST_DEALER_CONTACT"] as const;
export default function PaidReportActionPage() {
  const router=useRouter(), params=useSearchParams(); const [error,setError]=useState("");
  const exactVariantId=params.get("variant")??"", intent=params.get("intent")??""; const invalid=!exactVariantId||!intents.includes(intent as never);
  useEffect(()=>{ if(invalid)return; void fetch("/api/cars/paid-comparison/sales-handoff",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({exactVariantId,intent})}).then(async response=>{const body=await response.json();if(!response.ok||!body.token)throw new Error(body.message??"Satış adımı hazırlanamadı.");router.replace(`/cars/sales-request/${intent}?handoff=${encodeURIComponent(body.token)}&returnTo=${encodeURIComponent("/cars/paid-comparison/report")}`);}).catch(reason=>setError(reason instanceof Error?reason.message:"Satış adımı hazırlanamadı."));},[exactVariantId,intent,invalid,router]);
  const visibleError=invalid?"Geçersiz rapor bağlantısı.":error;
  return <main className="mx-auto max-w-xl px-5 py-20"><h1 className="text-2xl font-semibold">Güvenli satış adımı hazırlanıyor</h1><p className="mt-3 text-neutral-600">Rapor erişiminiz, araç ve Aşama 1 karar bağlamı doğrulanıyor. Henüz bayiye veri gönderilmez.</p>{visibleError&&<p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{visibleError} Raporu aynı tarayıcıda açıp yeniden deneyin.</p>}</main>;
}
