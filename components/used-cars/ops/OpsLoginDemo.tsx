"use client";

import Link from "next/link";
import { useState } from "react";

type Step="IDENTITY"|"MFA"|"VERIFIED";
export function OpsLoginDemo(){
  const [step,setStep]=useState<Step>("IDENTITY");
  const [method,setMethod]=useState<"PASSKEY"|"HARDWARE_SECURITY_KEY"|"TOTP">("PASSKEY");
  return <div className="ops-panel mx-auto mt-10 max-w-xl rounded-3xl border p-8">
    <div className="flex items-center justify-between"><p className="ops-kicker text-xs font-semibold uppercase tracking-[.2em]">Sentetik giriş simülasyonu</p><span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200">Production kapalı</span></div>
    <h2 className="mt-4 text-2xl font-semibold">Expiya Ops’a güvenli giriş</h2>
    <div className="mt-6 flex gap-2 text-xs">{["Kimlik","2FA","Hazır"].map((label,index)=><span key={label} className={`flex-1 rounded-full px-3 py-2 text-center ${index<=(step==="IDENTITY"?0:step==="MFA"?1:2)?"bg-zinc-100 text-zinc-950":"bg-zinc-800 text-zinc-400"}`}>{label}</span>)}</div>
    {step==="IDENTITY"&&<div className="mt-7"><label className="text-sm text-zinc-300" htmlFor="ops-email">Kurumsal kimlik</label><input id="ops-email" value="serdar@expiya.com" readOnly className="ops-input mt-2 w-full rounded-xl border p-3 text-sm"/><p className="ops-muted mt-3 text-xs">Sentetik Platform Sahibi kimliği · gerçek hesap oluşturulmadı</p><button onClick={()=>setStep("MFA")} className="ops-button-primary mt-6 w-full rounded-xl px-4 py-3 font-semibold">2FA yöntemini seç</button></div>}
    {step==="MFA"&&<div className="mt-7 space-y-3">{[["PASSKEY","Passkey / WebAuthn","Önerilen · phishing-resistant"],["HARDWARE_SECURITY_KEY","Donanım güvenlik anahtarı","Yedek phishing-resistant yöntem"],["TOTP","Authenticator uygulaması","Yalnız kontrollü kurtarma"]].map(([value,title,note])=><button key={value} onClick={()=>setMethod(value as typeof method)} className={`w-full rounded-xl border p-4 text-left text-zinc-100 ${method===value?"border-violet-400 bg-violet-400/10":"border-zinc-700 bg-zinc-900"}`}><span className="block font-medium">{title}</span><span className="ops-muted mt-1 block text-xs">{note}</span></button>)}<p className="text-xs text-red-200">SMS ve e-posta OTP kabul edilmez. TOTP kritik işlem step-up için kullanılamaz.</p><button onClick={()=>setStep("VERIFIED")} className="ops-button-primary w-full rounded-xl px-4 py-3 font-semibold">Sentetik doğrulamayı tamamla</button></div>}
    {step==="VERIFIED"&&<div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5"><p className="font-semibold text-emerald-200">AAL2 doğrulama simülasyonu tamamlandı</p><p className="mt-2 text-sm text-zinc-300">Yöntem: {method}. Bu işlem session veya credential üretmedi.</p><Link href="/ops-demo" className="ops-button-primary mt-5 block rounded-xl px-4 py-3 text-center font-semibold">Komuta merkezine dön</Link></div>}
  </div>;
}
