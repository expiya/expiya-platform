import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpiyaInfo } from "@/components/platform/ExpiyaInfo";
import { ACTIVE_PLATFORM_DISCOVERY, SECRETARY_SEARCH_SUGGESTIONS, buildActivePlatformDiscovery, buildSecretarySearchSuggestions } from "./platformDiscovery";
import type { DepartmentRegistryEntry } from "./departmentRegistry";

describe("registry-driven platform discovery",()=>{
  it("lists exactly active departments and active categories with direct links",()=>{
    expect(ACTIVE_PLATFORM_DISCOVERY).toHaveLength(5);
    expect(ACTIVE_PLATFORM_DISCOVERY.flatMap(item=>item.categories)).toHaveLength(52);
    const html=renderToStaticMarkup(<ExpiyaInfo/>);
    for(const department of ACTIVE_PLATFORM_DISCOVERY){expect(html).toContain(`href="${department.href}`);for(const category of department.categories)expect(html).toContain(`href="${category.href.replaceAll("&","&amp;")}"`);}
    expect(html).not.toMatch(/HOTELS|EVENTS|FUTURE|NOT_READY/u);
  });
  it("gives every active category a unique stable natural Turkish example",()=>{
    const categories=ACTIVE_PLATFORM_DISCOVERY.flatMap(item=>item.categories);
    expect(SECRETARY_SEARCH_SUGGESTIONS).toHaveLength(categories.length+ACTIVE_PLATFORM_DISCOVERY.filter(item=>item.categories.length===0).length);
    expect(new Set(SECRETARY_SEARCH_SUGGESTIONS.map(item=>item.id)).size).toBe(SECRETARY_SEARCH_SUGGESTIONS.length);
    expect(new Set(SECRETARY_SEARCH_SUGGESTIONS.map(item=>item.label)).size).toBe(SECRETARY_SEARCH_SUGGESTIONS.length);
    expect(categories.every(category=>category.example.endsWith(" arıyorum")&&!/[A-Z]{3,}_/u.test(category.example))).toBe(true);
    expect(SECRETARY_SEARCH_SUGGESTIONS.every(item=>item.label.endsWith(" arıyorum")&&!/[A-Z]{3,}_/u.test(item.label))).toBe(true);
    expect(SECRETARY_SEARCH_SUGGESTIONS.slice(1).every((item,index)=>item.id.split(":")[0]!==SECRETARY_SEARCH_SUGGESTIONS[index]?.id.split(":")[0])).toBe(true);
  });
  it("automatically follows registry activation and removal",()=>{
    const capability={status:"ACTIVE",publicLabelTr:"Deneme ürünü",destination:"/demo?category=DEMO"} as const;
    const active={departmentId:"DEMO",publicLabelTr:"Deneme",canonicalPath:"/demo",status:"ACTIVE",capabilities:{DEMO:capability}} satisfies DepartmentRegistryEntry;
    const inactive={...active,departmentId:"OFF",status:"NOT_READY"} satisfies DepartmentRegistryEntry;
    expect(buildActivePlatformDiscovery([active,inactive])).toEqual([{id:"DEMO",label:"Deneme",href:"/demo",categories:[{id:"DEMO",label:"Deneme ürünü",href:"/demo?category=DEMO",example:"Deneme ürünü arıyorum"}]}]);
    expect(buildActivePlatformDiscovery([{...active,capabilities:{DEMO:{...capability,status:"NOT_READY"}}}])).toEqual([{id:"DEMO",label:"Deneme",href:"/demo",categories:[]}]);
  });
  it("interleaves registry additions deterministically across departments",()=>{
    const discovery=buildActivePlatformDiscovery([
      {departmentId:"FIRST",publicLabelTr:"Birinci",canonicalPath:"/first",status:"ACTIVE",capabilities:{A:{status:"ACTIVE",publicLabelTr:"A ürünü",destination:"/first/a"},B:{status:"ACTIVE",publicLabelTr:"B ürünü",destination:"/first/b"}}},
      {departmentId:"SECOND",publicLabelTr:"İkinci",canonicalPath:"/second",status:"ACTIVE",capabilities:{C:{status:"ACTIVE",publicLabelTr:"C ürünü",destination:"/second/c"},D:{status:"ACTIVE",publicLabelTr:"D ürünü",destination:"/second/d"}}},
    ] as readonly DepartmentRegistryEntry[]);
    expect(buildSecretarySearchSuggestions(discovery).map(item=>item.id)).toEqual(["FIRST:A","SECOND:C","FIRST:B","SECOND:D"]);
  });
});
