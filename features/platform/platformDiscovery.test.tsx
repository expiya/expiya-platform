import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpiyaInfo } from "@/components/platform/ExpiyaInfo";
import { ACTIVE_PLATFORM_DISCOVERY, SECRETARY_SEARCH_SUGGESTIONS, buildActivePlatformDiscovery, buildSecretarySearchSuggestions } from "./platformDiscovery";
import type { DepartmentRegistryEntry } from "./departmentRegistry";
import { SECRETARY_DAILY_LIFE_EXAMPLES, validateSecretaryDailyLifeExamples, type SecretaryDailyLifeExampleSet } from "./secretaryDailyLifeExamples";

const demoExamples: SecretaryDailyLifeExampleSet = [
  { key: "demo-daily-one", text: "Evde günlük işimi kolaylaştıracak bir deneme ürünü arıyorum.", signals: ["PURPOSE", "OUTCOME"] },
  { key: "demo-daily-two", text: "Dar alanda rahat kullanabileceğim bir deneme ürünü arıyorum.", signals: ["CONTEXT", "OUTCOME"] },
  { key: "demo-daily-three", text: "Hafta sonu kullanıp kolay kaldıracağım bir deneme ürünü arıyorum.", signals: ["PURPOSE", "CONTEXT"] },
];
const renamedDemoExamples = (prefix: string, replacement: string): SecretaryDailyLifeExampleSet => [
  {...demoExamples[0],key:`${prefix}-${demoExamples[0].key}`,text:demoExamples[0].text.replace("deneme",replacement)},
  {...demoExamples[1],key:`${prefix}-${demoExamples[1].key}`,text:demoExamples[1].text.replace("deneme",replacement)},
  {...demoExamples[2],key:`${prefix}-${demoExamples[2].key}`,text:demoExamples[2].text.replace("deneme",replacement)},
];

describe("registry-driven platform discovery",()=>{
  it("lists exactly active departments and active categories with direct links",()=>{
    expect(ACTIVE_PLATFORM_DISCOVERY).toHaveLength(6);
    expect(ACTIVE_PLATFORM_DISCOVERY.flatMap(item=>item.categories)).toHaveLength(54);
    expect(ACTIVE_PLATFORM_DISCOVERY.find(item=>item.id==="TOOLS")?.categories).toEqual([expect.objectContaining({id:"CORDLESS_DRILL",href:"/tools?entry=secretary&category=CORDLESS_DRILL"})]);
    const html=renderToStaticMarkup(<ExpiyaInfo/>);
    for(const department of ACTIVE_PLATFORM_DISCOVERY){expect(html).toContain(`href="${department.href}`);for(const category of department.categories)expect(html).toContain(`href="${category.href.replaceAll("&","&amp;")}"`);}
    expect(html).not.toMatch(/HOTELS|EVENTS|FUTURE|NOT_READY/u);
  });
  it("gives every active category three unique stable daily-life examples",()=>{
    const categories=ACTIVE_PLATFORM_DISCOVERY.flatMap(item=>item.categories);
    expect(categories.every(category=>category.examples.length===3)).toBe(true);
    expect(SECRETARY_SEARCH_SUGGESTIONS).toHaveLength(categories.length*3);
    expect(new Set(SECRETARY_SEARCH_SUGGESTIONS.map(item=>item.id)).size).toBe(SECRETARY_SEARCH_SUGGESTIONS.length);
    expect(new Set(SECRETARY_SEARCH_SUGGESTIONS.map(item=>item.label)).size).toBe(SECRETARY_SEARCH_SUGGESTIONS.length);
    expect(SECRETARY_SEARCH_SUGGESTIONS.every(item=>item.label.endsWith(" arıyorum.")&&!/[A-Z]{3,}_/u.test(item.label))).toBe(true);
    expect(validateSecretaryDailyLifeExamples(categories.map(category=>{
      const department=ACTIVE_PLATFORM_DISCOVERY.find(item=>item.categories.includes(category));
      return `${department?.id}:${category.id}`;
    }))).toEqual([]);
  });
  it("fails closed when an active registry category has no example contract",()=>{
    const capability={status:"ACTIVE",publicLabelTr:"Deneme ürünü",destination:"/demo?category=DEMO"} as const;
    const active={departmentId:"DEMO",publicLabelTr:"Deneme",canonicalPath:"/demo",status:"ACTIVE",capabilities:{DEMO:capability}} satisfies DepartmentRegistryEntry;
    const inactive={...active,departmentId:"OFF",status:"NOT_READY"} satisfies DepartmentRegistryEntry;
    expect(()=>buildActivePlatformDiscovery([active,inactive],{})).toThrow("SECRETARY_EXAMPLES_MISSING:DEMO:DEMO");
    expect(buildActivePlatformDiscovery([active,inactive],{"DEMO:DEMO":demoExamples})).toEqual([{id:"DEMO",label:"Deneme",href:"/demo",categories:[{id:"DEMO",label:"Deneme ürünü",href:"/demo?category=DEMO",examples:demoExamples}]}]);
    expect(buildActivePlatformDiscovery([{...active,capabilities:{DEMO:{...capability,status:"NOT_READY"}}}],{"DEMO:DEMO":demoExamples})).toEqual([{id:"DEMO",label:"Deneme",href:"/demo",categories:[]}]);
  });
  it("interleaves registry additions deterministically across departments",()=>{
    const discovery=buildActivePlatformDiscovery([
      {departmentId:"FIRST",publicLabelTr:"Birinci",canonicalPath:"/first",status:"ACTIVE",capabilities:{A:{status:"ACTIVE",publicLabelTr:"A ürünü",destination:"/first/a"},B:{status:"ACTIVE",publicLabelTr:"B ürünü",destination:"/first/b"}}},
      {departmentId:"SECOND",publicLabelTr:"İkinci",canonicalPath:"/second",status:"ACTIVE",capabilities:{C:{status:"ACTIVE",publicLabelTr:"C ürünü",destination:"/second/c"},D:{status:"ACTIVE",publicLabelTr:"D ürünü",destination:"/second/d"}}},
    ] as readonly DepartmentRegistryEntry[],{
      "FIRST:A":demoExamples,
      "FIRST:B":renamedDemoExamples("b","ikinci"),
      "SECOND:C":renamedDemoExamples("c","üçüncü"),
      "SECOND:D":renamedDemoExamples("d","dördüncü"),
    });
    expect(buildSecretarySearchSuggestions(discovery).slice(0,4).map(item=>item.id)).toEqual(["demo-daily-one","c-demo-daily-one","b-demo-daily-one","d-demo-daily-one"]);
    expect(buildSecretarySearchSuggestions(discovery)).toEqual(buildSecretarySearchSuggestions(discovery));
  });
  it("keeps inactive catalog entries outside public rotation",()=>{
    const activeKeys=ACTIVE_PLATFORM_DISCOVERY.flatMap(department=>department.categories.map(category=>`${department.id}:${category.id}`));
    expect(Object.keys(SECRETARY_DAILY_LIFE_EXAMPLES).sort()).toEqual([...activeKeys].sort());
    const inactiveRegistry=[{departmentId:"DEMO",publicLabelTr:"Deneme",canonicalPath:"/demo",status:"ACTIVE",capabilities:{DEMO:{status:"NOT_READY",publicLabelTr:"Deneme ürünü",destination:"/demo?category=DEMO"}}}] as const;
    const inactiveCatalog={"DEMO:DEMO":demoExamples};
    const inactiveDiscovery=buildActivePlatformDiscovery(inactiveRegistry,inactiveCatalog);
    expect(inactiveDiscovery[0]?.categories).toEqual([]);
    expect(buildSecretarySearchSuggestions(inactiveDiscovery)).toEqual([]);
    expect(validateSecretaryDailyLifeExamples([],inactiveCatalog)).toEqual([]);
  });
});
