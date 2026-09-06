"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "./OpsShell";

const seed=[
  {id:"USR-001",name:"Serdar Akgül",role:"Platform sahibi / Super Admin",status:"Aktif",mfa:"2 passkey",owner:true},
  {id:"USR-014",name:"Deniz Kaya (sentetik)",role:"Firma doğrulama uzmanı",status:"Aktif",mfa:"Passkey",owner:false},
  {id:"USR-021",name:"Ece Yılmaz (sentetik)",role:"İlan moderatörü",status:"Askıda",mfa:"Kayıt bekliyor",owner:false},
];
export function OpsAccessManagementDemo(){
  const [query,setQuery]=useState(""); const [selected,setSelected]=useState(seed[0]); const [notice,setNotice]=useState("");
  const rows=useMemo(()=>seed.filter(user=>`${user.name} ${user.role}`.toLowerCase().includes(query.toLowerCase())),[query]);
  return <div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="ops-kicker text-sm">Erişim kontrolü</p><h2 className="mt-1 text-3xl font-semibold">Kullanıcı ve rol yönetimi</h2><p className="ops-muted mt-2 text-sm">Tek yönetici: Serdar Akgül. Değişiklikler bu prototipte yalnız simüle edilir.</p></div><button onClick={()=>setNotice("Kullanıcı daveti taslak olarak simüle edildi; e-posta gönderilmedi.")} className="ops-button-primary rounded-xl px-4 py-3 font-semibold">+ Kullanıcı ata</button></div>
  {notice&&<div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-200">{notice}</div>}
  <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><section className="ops-panel rounded-2xl border p-5"><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Kullanıcı veya rol ara" className="ops-input w-full rounded-xl border p-3 text-sm"/><div className="ops-divider mt-4 divide-y">{rows.map(user=><button key={user.id} onClick={()=>setSelected(user)} className="grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-2 py-4 text-left text-zinc-100 hover:bg-zinc-800/70"><span><span className="block font-medium">{user.name}</span><span className="ops-muted mt-1 block text-xs">{user.role} · {user.mfa}</span></span><StatusPill tone={user.status==="Aktif"?"emerald":"amber"}>{user.status}</StatusPill></button>)}</div></section><aside className="ops-panel rounded-2xl border p-5"><p className="ops-kicker text-xs font-mono">{selected.id}</p><h3 className="mt-2 text-lg font-semibold">{selected.name}</h3><p className="ops-muted mt-1 text-sm">{selected.role}</p><div className="mt-5 space-y-3 text-sm text-zinc-300"><p>2FA: <b className="text-zinc-100">{selected.mfa}</b></p><p>Rol kaynağı: <b className="text-zinc-100">Authoritative Ops Store</b></p><p>Token rol claim’i: <b className="text-red-200">yok sayılır</b></p></div><div className="mt-6 space-y-2"><button onClick={()=>setNotice(`${selected.name} için rol değişikliği taslağı oluşturuldu; kalıcı mutation yapılmadı.`)} className="ops-button-secondary w-full rounded-lg p-3 text-sm">Rol değişikliği taslağı</button><button disabled={selected.owner} className="ops-button-danger w-full rounded-lg p-3 text-sm">Erişimi askıya al</button></div>{selected.owner&&<p className="mt-4 text-xs text-amber-200">Platform sahibi kendi erişimini bu ekrandan askıya alamaz. Recovery/security süreci gerekir.</p>}</aside></div></div>;
}
