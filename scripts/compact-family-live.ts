/** Real public-route capture for the compact/family evidence closure. */
export {};
const base = process.argv[2] ?? "http://127.0.0.1:4041";
type Message = { id: string; role: "user" | "assistant"; content: string };
async function journey(id: string, turns: string[]) {
  const messages: Message[] = []; let conversation: unknown; const transcript: unknown[] = [];
  for (let index = 0; index < turns.length; index++) {
    const user = turns[index]; messages.push({ id: `u-${index}`, role: "user", content: user });
    const response = await fetch(`${base}/api/cars/conversation`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.88.${id.charCodeAt(0)}.${index + 1}` }, body: JSON.stringify({ conversationId: `compact-family-${id}`, messages, conversation }) });
    const payload = await response.json() as Record<string, any>;
    if (!response.ok) throw new Error(`${id}:${index}:HTTP_${response.status}:${JSON.stringify(payload)}`);
    transcript.push({ user, assistant: payload.message, kind: payload.kind, selectedModel: payload.conversation?.turnProvenance?.selectedModel, requestedModel: payload.conversation?.turnProvenance?.requestedModel, candidate: payload.decision?.selectedRuntimeVehicleCandidateId, card: payload.recommendations?.[0]?.car && { brand: payload.recommendations[0].car.brand, model: payload.recommendations[0].car.model, price: payload.recommendations[0].car.price } });
    conversation = payload.conversation; messages.push({ id: `a-${index}`, role: "assistant", content: String(payload.message ?? "") });
  }
  return transcript;
}
void (async () => { const results = {
  clio: await journey("A", ["İlk arabam olacak.", "Şehir içinde işe gidip geleceğim.", "Otomatik olsun, park ederken zorlamasın.", "Arkadaşlarım Clio önerdi; sen ne düşünüyorsun?", "Clio dışında net bir alternatif söyle.", "Küçük dış ölçüler daha önemli.", "Tamam, göster."]),
  family: await journey("B", ["Dört kişilik aile için şehir içinde rahat, yazın uzun yolda da üzmeyecek sıfır bir araç arıyorum. Bagajı küçük olmasın.", "Bütçem en fazla 3 milyon.", "SUV/crossover.", "Konfor öncelikli olsun.", "Senin önerin nedir?", "Tamam, göster."]),
  compactBudget: await journey("C", ["İlk sıfır aracımı arıyorum; bütçem en fazla 2 milyon 150 bin TL.", "Otomatik ve şehir içinde kompakt dış ölçülü olsun.", "Senin önerin nedir?", "Tamam, göster."]),
  sevenSeat: await journey("D", ["Sıfır araçta en az 7 koltuk ve 300 litre bagaj istiyorum.", "Tamam, göster."]),
};
console.log(JSON.stringify({ base, capturedAt: new Date().toISOString(), results }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
