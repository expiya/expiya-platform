import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = process.argv[2] ?? "http://127.0.0.1:4055";
const outputDirectory = "outputs/all-category-p-runtime-consumer-closure-01/browser";
const viewports = [
  { name: "desktop", width: 1280, height: 844 },
  { name: "mobile", width: 390, height: 844 },
];
const expectedCandidates = [
  "Samsung QE75QN90FATXTK",
  "LG OLED55B65LA",
  "Next YE-55GFSG8-QLED",
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const materialityRequests = [];
    page.on("request", request => {
      if (request.url().includes("/api/platform/p-materiality")) materialityRequests.push(request.postData() ?? "");
    });

    await page.goto(baseURL, { waitUntil: "networkidle" });
    const composer = page.getByLabel("Ne seçmek istediğinizi anlatın");
    await composer.fill("televizyon arıyorum");
    await page.getByRole("button", { name: "Mesajı gönder" }).click();
    const visibleQuestion = page.getByTestId("root-response-reserve").locator("p").filter({ hasText: "İzleme mesafeniz için ekranın en az 65 inç olması önemli mi?" });
    await visibleQuestion.waitFor({ state: "visible", timeout: 15_000 });
    const yes = page.getByRole("button", { name: "Evet, önemli" });
    await yes.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find(item => item.textContent?.trim() === "Evet, önemli");
      return button && !button.disabled;
    });

    const orientation = await page.locator("aside").innerText();
    const question = await visibleQuestion.innerText();
    const quickReplies = await page.locator("#root-quick-reply-reserve button").allTextContents();

    await composer.fill("75 inç istiyorum");
    await page.getByRole("button", { name: "Mesajı gönder" }).click();
    await page.getByRole("button", { name: expectedCandidates[0], exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForFunction(label => {
      const button = [...document.querySelectorAll("#root-quick-reply-reserve button")].find(item => item.textContent?.trim() === label);
      return button && !button.disabled;
    }, expectedCandidates[0]);

    const candidateButtons = await page.locator("#root-quick-reply-reserve button").allTextContents();
    const candidates = candidateButtons.filter(label => expectedCandidates.includes(label.trim())).map(label => label.trim());
    const responseBeforeSelection = await page.getByTestId("root-response-reserve").innerText();
    const requestsBeforeSelection = materialityRequests.length;
    await page.getByRole("button", { name: expectedCandidates[0], exact: true }).click();
    await page.waitForTimeout(100);
    const composerAfterSelection = await composer.inputValue();
    const responseAfterSelection = await page.getByTestId("root-response-reserve").innerText();

    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const response = document.querySelector('[data-testid="root-response-reserve"]');
      const replies = document.querySelector('[data-testid="root-quick-reply-reserve"]');
      const composer = document.querySelector("#secretary-message");
      const dimensions = element => element ? {
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      } : null;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: dimensions(root),
        response: dimensions(response),
        replies: dimensions(replies),
        composer: composer ? { ...dimensions(composer), rows: composer.getAttribute("rows") } : null,
        bodyText: document.body.innerText,
      };
    });

    const assertions = {
      exactViewport: layout.viewport.width === viewport.width && layout.viewport.height === viewport.height,
      categoryWelcomeSeparate: orientation.length > 0 && !orientation.includes(question),
      materialQuestionFirst: question.endsWith("?"),
      quickRepliesAfterTypewriter: quickReplies.includes("Evet, önemli"),
      exactCandidateOrder: JSON.stringify(candidates) === JSON.stringify(expectedCandidates),
      selectionFillsComposer: composerAfterSelection === expectedCandidates[0],
      selectionDoesNotSubmit: materialityRequests.length === requestsBeforeSelection && responseAfterSelection === responseBeforeSelection,
      noHorizontalOverflow: layout.document.scrollWidth <= layout.document.clientWidth,
      noResponseScrollbar: layout.response.scrollHeight <= layout.response.clientHeight && layout.response.scrollWidth <= layout.response.clientWidth,
      noReplyScrollbarForThreeCandidates: layout.replies.scrollHeight <= layout.replies.clientHeight && layout.replies.scrollWidth <= layout.replies.clientWidth,
      composerIs64PxTwoRows: layout.composer.clientHeight === 64 && layout.composer.rows === "2",
      noRawIdentity: !/(electronics:television:|\b[a-f0-9]{40,64}\b)/i.test(layout.bodyText),
    };
    if (Object.values(assertions).some(value => !value)) throw new Error(`${viewport.name}: ${JSON.stringify(assertions)}`);

    const screenshot = `${outputDirectory}/television-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    evidence.push({ viewport, orientation, question, quickReplies, candidates, composerAfterSelection, requestCount: materialityRequests.length, layout: { ...layout, bodyText: undefined }, assertions, screenshot });
    await context.close();
  }

  const api = await (await fetch(`${baseURL}/api/platform/p-materiality`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseURL },
    body: JSON.stringify({ action: "CREATE", conversationId: crypto.randomUUID(), messageId: crypto.randomUUID(), departmentId: "APPLIANCES", categoryId: "WASHING_MACHINE" }),
  })).json();
  if (api.kind !== "CLARIFY" || api.artifactReadiness !== "INFORMATION_ONLY" || api.runtimeConsumption !== "NO_MATERIAL_QUESTION" || api.questionKey !== "NON_DOMINATED_SET") throw new Error(`information-only: ${JSON.stringify(api)}`);

  const result = { generatedAt: new Date().toISOString(), baseURL, evidence, informationOnly: { categoryId: "WASHING_MACHINE", kind: api.kind, questionKey: api.questionKey, artifactReadiness: api.artifactReadiness, runtimeConsumption: api.runtimeConsumption, candidatePoolUnchanged: api.candidatePoolUnchanged, yAuthority: api.yAuthority } };
  await writeFile(`${outputDirectory}/browser-evidence.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
