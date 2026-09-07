import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  clearRootConversationReference,
  formatRootBudget,
  nextRootPlaceholderState,
  rootPlaceholderValue,
  rootQuickReplies,
  ROOT_INPUT_MAX_HEIGHT_PX,
  ROOT_PLACEHOLDER_DELETE_MS,
  ROOT_PLACEHOLDER_HOLD_MS,
  ROOT_PLACEHOLDER_MAX_HEIGHT_PX,
  ROOT_PLACEHOLDER_TYPE_MS,
  ROOT_ROUTE_DELAY_MS,
  RootStageOneExperience,
  shouldPauseRootPlaceholder,
  shouldRecoverRootConversation,
} from "./RootStageOneExperience";

describe("RootStageOneExperience", () => {
  it("keeps the root entry minimal, keyboard-ready and free of a chat panel", () => {
    const html = renderToStaticMarkup(<RootStageOneExperience suggestions={[{ id: "car", label: "Otomobil arıyorum" }]} adapters={[]}/>);
    expect(html).toContain('id="secretary-message"');
    expect(html).toContain('aria-label="Mesajı gönder"');
    expect(html).toContain("Ne satın almak istiyorsunuz?");
    expect(html).not.toContain("role=\"log\"");
    expect(html).not.toContain("bg-neutral-950");
    expect(html).not.toMatch(/[A-Z]{3,}_[A-Z_]+/u);
  });

  it("uses the governed three-second routing gate and Turkish numeric grouping", () => {
    expect(ROOT_ROUTE_DELAY_MS).toBe(3000);
    expect(formatRootBudget("₺ 0050000")).toBe("50.000");
    expect(formatRootBudget("")).toBe("");
  });

  it("projects only public Domain Pack labels as smart replies", () => {
    expect(rootQuickReplies({ outcome: { questionKey: "usage", choices: [
      { value: "FAMILY_USE", label: "Aile kullanımı" },
      { value: "RAW_KEY", label: "RAW_ENUM_VALUE" },
    ] } })).toEqual([{ questionKey: "usage", value: "FAMILY_USE", label: "Aile kullanımı" }]);
    expect(rootQuickReplies({ choices: { questionKey: "budget", source: "DOMAIN_PACK", options: [{ value: "UNKNOWN", label: "Henüz bilmiyorum" }] } })).toEqual([{ questionKey: "budget", value: "UNKNOWN", label: "Henüz bilmiyorum" }]);
  });

  it("recovers only an active reference on a same-tab refresh", () => {
    expect(shouldRecoverRootConversation("reload", '{"session":{"conversationId":"owned"}}')).toBe(true);
    expect(shouldRecoverRootConversation("navigate", '{"session":{"conversationId":"stale"}}')).toBe(false);
    expect(shouldRecoverRootConversation("back_forward", '{"session":{"conversationId":"stale"}}')).toBe(false);
    expect(shouldRecoverRootConversation("reload", null)).toBe(false);
  });

  it("isolates recovery to session storage and clears the active reference", () => {
    const removed: string[] = [];
    clearRootConversationReference({ removeItem: key => removed.push(key) });
    expect(removed).toEqual(["expiya.root.xpy-stage1.v1"]);
    const source=readFileSync(path.join(process.cwd(),"components/platform/RootStageOneExperience.tsx"),"utf8");
    expect(source).not.toContain("localStorage");
  });

  it("applies a valid formatted budget on blur without a separate apply button", () => {
    const source=readFileSync(path.join(process.cwd(),"components/platform/RootStageOneExperience.tsx"),"utf8");
    expect(source).toContain("onBlur={()=>void applyBudgetOnBlur()}");
    expect(source).toContain("amount<=0");
    expect(source).not.toContain(">Uygula</button>");
    expect(source).toContain("checked:bg-black");
  });

  it("keeps the destructive-looking reset and composer controls accessible", () => {
    const html = renderToStaticMarkup(<RootStageOneExperience suggestions={[]} adapters={[]}/>);
    expect(html).toContain('type="submit"');
    expect(html).toContain('rows="1"');
    expect(html).toContain('maxLength="1000"');
  });

  it("rotates one placeholder deterministically through type, hold and delete phases", () => {
    expect([ROOT_PLACEHOLDER_TYPE_MS,ROOT_PLACEHOLDER_HOLD_MS,ROOT_PLACEHOLDER_DELETE_MS]).toEqual([55,1200,30]);
    expect([ROOT_INPUT_MAX_HEIGHT_PX,ROOT_PLACEHOLDER_MAX_HEIGHT_PX]).toEqual([144,224]);
    const typed=nextRootPlaceholderState({suggestionIndex:0,text:"",phase:"TYPING"},"AB",2);
    expect(typed).toEqual({suggestionIndex:0,text:"A",phase:"TYPING"});
    const complete=nextRootPlaceholderState({...typed,text:"AB"},"AB",2);
    expect(complete.phase).toBe("HOLDING");
    const deleting=nextRootPlaceholderState(complete,"AB",2);
    expect(deleting.phase).toBe("DELETING");
    expect(nextRootPlaceholderState({...deleting,text:""},"AB",2)).toEqual({suggestionIndex:1,text:"",phase:"TYPING"});
  });

  it("pauses for focus and input, resumes after blur, and hides connected Root XPY placeholders", () => {
    expect(shouldPauseRootPlaceholder({focused:true,draft:"",connected:false})).toBe(true);
    expect(shouldPauseRootPlaceholder({focused:false,draft:"Kendi metnim",connected:false})).toBe(true);
    expect(shouldPauseRootPlaceholder({focused:false,draft:"",connected:false})).toBe(false);
    expect(shouldPauseRootPlaceholder({focused:false,draft:"",connected:true})).toBe(true);
    const state={suggestionIndex:0,text:"Kullanıcı metnini değiştirme",phase:"HOLDING"} as const;
    expect(rootPlaceholderValue(state,false)).toBe(state.text);
    expect(rootPlaceholderValue(state,true)).toBe("");
  });

  it("keeps focus, blur, reduced-motion and placeholder auto-grow wired to the controlled textarea", () => {
    const source=readFileSync(path.join(process.cwd(),"components/platform/RootStageOneExperience.tsx"),"utf8");
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("setMessageFocused(true)");
    expect(source).toContain("setMessageFocused(false)");
    expect(source).toContain("rootPlaceholderValue(placeholderState");
    expect(source).toContain("placeholderState.text");
    expect(source).toContain("value={draft}");
  });
});
