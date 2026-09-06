import { describe, expect, it } from "vitest";
import { classifyContextualAnswer, preflightTurn, recordAskedQuestion, validateBeforeMutation } from "./lifecycle";

describe("domain-independent conversation kernel",()=>{
  it.each([["evet","AFFIRM"],["gerek yok","DECLINE"],["önemli değil","DECLINE"]] as const)("classifies contextual answer %s",(message,kind)=>expect(classifyContextualAnswer(message)).toBe(kind));
  it("keeps question history unique while moving the live pointer",()=>expect(recordAskedQuestion({askedQuestionKeys:["a"],lastQuestionKey:"a"},"b")).toEqual({askedQuestionKeys:["a","b"],lastQuestionKey:"b"}));
  it("orders replay and payload checks ahead of revision checks",()=>{expect(preflightTurn({expectedRevision:1,currentRevision:2,priorPayloadFingerprint:"x",payloadFingerprint:"x"}).kind).toBe("REPLAY");expect(preflightTurn({expectedRevision:1,currentRevision:2,priorPayloadFingerprint:"x",payloadFingerprint:"y"}).kind).toBe("PAYLOAD_CONFLICT");expect(preflightTurn({expectedRevision:1,currentRevision:2,payloadFingerprint:"x"}).kind).toBe("REVISION_CONFLICT");});
  it("never exposes proposals before adapter validation",()=>{expect(validateBeforeMutation([{concept:"foreign"}],()=>false)).toEqual({kind:"INVALID"});expect(validateBeforeMutation([{concept:"owned"}],()=>true)).toEqual({kind:"VALID",proposals:[{concept:"owned"}]});});
});
