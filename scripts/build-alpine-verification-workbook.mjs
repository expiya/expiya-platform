import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outDir = "/Users/serdarakgul/Projects/expiya-platform/outputs/01a02920-5e9f-7750-805c-6b719e37d28b";
const workbook = Workbook.create();
const catalog = workbook.worksheets.add("Katalog Doğrulama");
const equipment = workbook.worksheets.add("Donanım Doğrulama");
const images = workbook.worksheets.add("Görsel İzinleri");
const guide = workbook.worksheets.add("Açıklamalar");

const navy = "#071B33";
const blue = "#176BFF";
const pale = "#EAF2FF";
const amber = "#FFF4D6";
const gray = "#667085";
const border = "#CFD8E6";

catalog.showGridLines = false;
catalog.mergeCells("A1:T1");
catalog.getRange("A1").values = [["ALPINE — KATALOG VERİ DOĞRULAMA FORMU"]];
catalog.getRange("A1:T1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 34, verticalAlignment: "center" };
catalog.mergeCells("A2:T2");
catalog.getRange("A2").values = [["Mavi alanlar Expiya Cars'taki mevcut kaydı, sarı alanlar Alpine Türkiye / MAİS yanıtını gösterir. Her satırda doğrulama durumunu seçiniz."]];
catalog.getRange("A2:T2").format = { fill: pale, font: { color: navy, size: 10 }, wrapText: true, rowHeight: 34, verticalAlignment: "center" };

const headers = ["Kayıt ID", "Model", "Varyant", "Model yılı", "Kasa", "Yakıt", "Güç (kW)", "Tork (Nm)", "Şanzıman", "Çekiş", "Menzil (km)", "Tüketim", "Batarya (kWh)", "Mevcut fiyat (TRY)", "Fiyat niteliği", "Kaynak URL", "Doğrulama durumu", "Düzeltilmiş / eksik bilgi", "Yetkili notu", "Son geçerlilik tarihi"];
catalog.getRange("A4:T4").values = [headers];
catalog.getRange("A4:T4").format = { fill: blue, font: { bold: true, color: "#FFFFFF", size: 9 }, wrapText: true, rowHeight: 42, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: border } };

const rows = [
 ["35a63f96-c05b-5d9c-8f9e-f427461dbfc4","A290","GT Performance",2026,"Hatchback","Elektrik",160,300,"Tek oranlı otomatik","Önden çekiş","","","","","Firma bilgisi bekleniyor","https://www.alpinecars.com.tr/elektrikli-modeler/a290/konfigurator.html","Kontrol edilmedi","","",""],
 ["82d670d8-fc16-5d18-8106-cfeb987c3fba","A290","GTS",2026,"Hatchback","Elektrik",160,300,"Tek oranlı otomatik","Önden çekiş","","","","","Firma bilgisi bekleniyor","https://www.alpinecars.com.tr/elektrikli-modeler/a290.html","Kontrol edilmedi","","",""],
 ["43175d0e-3667-5e76-ae83-ebd56173495e","A390","GT",2026,"SUV","Elektrik",295,661,"Tek oranlı otomatik","Dört tekerlekten çekiş","","","","","Firma bilgisi bekleniyor","https://www.alpinecars.com.tr/elektrikli-modeler/a390/konfigurator.html","Kontrol edilmedi","","",""],
];
const catalogLastRow = rows.length + 4;
catalog.getRange(`A5:T${catalogLastRow}`).values = rows;
catalog.getRange(`A5:P${catalogLastRow}`).format = { fill: pale, font: { color: navy, size: 9 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: border } };
catalog.getRange(`Q5:T${catalogLastRow}`).format = { fill: amber, font: { color: navy, size: 9 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: border } };
catalog.getRange(`Q5:Q${catalogLastRow}`).dataValidation = { rule: { type: "list", values: ["Kontrol edilmedi", "Doğru", "Düzeltme gerekli", "Satışta değil", "Eksik varyant var"] } };
catalog.getRange(`N5:N${catalogLastRow}`).format.numberFormat = "#,##0";
catalog.getRange(`T5:T${catalogLastRow}`).format.numberFormat = "yyyy-mm-dd";
catalog.freezePanes.freezeRows(4);
catalog.getRange("A:T").format.columnWidth = 14;
catalog.getRange("A:A").format.columnWidth = 20;
catalog.getRange("B:C").format.columnWidth = 17;
catalog.getRange("I:J").format.columnWidth = 24;
catalog.getRange("L:L").format.columnWidth = 19;
catalog.getRange("O:O").format.columnWidth = 22;
catalog.getRange("P:P").format.columnWidth = 40;
catalog.getRange("Q:Q").format.columnWidth = 22;
catalog.getRange("R:S").format.columnWidth = 34;
catalog.getRange("T:T").format.columnWidth = 20;
catalog.getRange(`5:${catalogLastRow}`).format.rowHeight = 64;
catalog.tables.add(`A4:T${catalogLastRow}`, true, "AlpineCatalogVerification").style = "TableStyleMedium2";

const equipmentVocabularyPath = "/Users/serdarakgul/Projects/expiya-platform/data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20/equipment-evidence.json";
const equipmentVocabulary = JSON.parse(await fs.readFile(equipmentVocabularyPath, "utf8")).featureDefinitions;
const variants = rows.map((row) => ({ recordId: row[0], model: row[1], trim: row[2], modelYear: row[3] }));
const equipmentRows = variants.flatMap((variant) => equipmentVocabulary.map((feature) => [
  variant.recordId,
  variant.model,
  variant.trim,
  variant.modelYear,
  feature.category,
  feature.featureCode,
  feature.labelTr,
  "Bilinmiyor — firma doğrulaması bekleniyor",
  "Kontrol edilmedi",
  "",
  "",
  "",
  "",
  "",
]));
const equipmentLastRow = equipmentRows.length + 4;
equipment.showGridLines = false;
equipment.mergeCells("A1:N1");
equipment.getRange("A1").values = [["ALPINE — VARYANT BAZLI DONANIM DOĞRULAMA MATRİSİ"]];
equipment.getRange("A1:N1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 34, verticalAlignment: "center" };
equipment.mergeCells("A2:N2");
equipment.getRange("A2").values = [["Her donanımın ilgili model yılı ve varyanttaki sunum biçimini seçiniz. Bilinmeyen alanlar Expiya Cars tarafından mevcut kabul edilmeyecek ve karar motorunda kullanılmayacaktır."]];
equipment.getRange("A2:N2").format = { fill: pale, font: { color: navy, size: 10 }, wrapText: true, rowHeight: 34, verticalAlignment: "center" };
const equipmentHeaders = ["Kayıt ID", "Model", "Varyant", "Model yılı", "Kategori", "Özellik kodu", "Donanım özelliği", "Mevcut Expiya durumu", "Firma doğrulaması", "Paket / opsiyon adı", "Koşul veya açıklama", "Resmî kaynak URL", "Geçerlilik tarihi", "Yetkili notu"];
equipment.getRange("A4:N4").values = [equipmentHeaders];
equipment.getRange("A4:N4").format = { fill: blue, font: { bold: true, color: "#FFFFFF", size: 9 }, wrapText: true, rowHeight: 42, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: border } };
equipment.getRangeByIndexes(4, 0, equipmentRows.length, equipmentHeaders.length).values = equipmentRows;
equipment.getRange(`A5:H${equipmentLastRow}`).format = { fill: pale, font: { color: navy, size: 9 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: border } };
equipment.getRange(`I5:N${equipmentLastRow}`).format = { fill: amber, font: { color: navy, size: 9 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: border } };
equipment.getRange(`I5:I${equipmentLastRow}`).dataValidation = { rule: { type: "list", values: ["Kontrol edilmedi", "Standart", "Opsiyon", "Paketle sunuluyor", "Sunulmuyor", "Bu varyanta uygulanamaz", "Bilgi verilemiyor"] } };
equipment.getRange(`M5:M${equipmentLastRow}`).format.numberFormat = "yyyy-mm-dd";
equipment.freezePanes.freezeRows(4);
equipment.freezePanes.freezeColumns(4);
equipment.getRange("A:A").format.columnWidth = 20;
equipment.getRange("B:D").format.columnWidth = 16;
equipment.getRange("E:E").format.columnWidth = 20;
equipment.getRange("F:F").format.columnWidth = 34;
equipment.getRange("G:G").format.columnWidth = 32;
equipment.getRange("H:I").format.columnWidth = 30;
equipment.getRange("J:J").format.columnWidth = 28;
equipment.getRange("K:K").format.columnWidth = 38;
equipment.getRange("L:L").format.columnWidth = 44;
equipment.getRange("M:M").format.columnWidth = 20;
equipment.getRange("N:N").format.columnWidth = 34;
equipment.getRange(`5:${equipmentLastRow}`).format.rowHeight = 38;
equipment.tables.add(`A4:N${equipmentLastRow}`, true, "AlpineEquipmentVerification").style = "TableStyleMedium2";

images.showGridLines = false;
images.mergeCells("A1:J1");
images.getRange("A1").values = [["ALPINE — GÖRSEL KULLANIM İZNİ"]];
images.getRange("A1:J1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 34, verticalAlignment: "center" };
images.mergeCells("A2:J2");
images.getRange("A2").values = [["Her model/varyant için kullanım kapsamını belirtiniz. Yazılı izin verilmemiş görseller Expiya Cars'ta yayımlanmayacaktır."]];
images.getRange("A2:J2").format = { fill: pale, font: { color: navy }, wrapText: true, rowHeight: 30 };
const imageHeaders = ["Model", "Varyant", "Görsel kaynağı / teslim yöntemi", "Katalogda kullanım", "Kişiselleştirilmiş öneride kullanım", "Sosyal medya / tanıtım", "İzin süresi", "Zorunlu atıf / telif ibaresi", "Kısıtlar", "Yetkili onayı"];
images.getRange("A4:J4").values = [imageHeaders];
images.getRange("A4:J4").format = { fill: blue, font: { bold: true, color: "#FFFFFF", size: 9 }, wrapText: true, rowHeight: 42, borders: { preset: "all", style: "thin", color: border } };
const imageRows = rows.map(r => [r[1], r[2], "", "Belirtilmedi", "Belirtilmedi", "Belirtilmedi", "", "", "", ""]);
images.getRange(`A5:J${catalogLastRow}`).values = imageRows;
images.getRange(`A5:B${catalogLastRow}`).format = { fill: pale, borders: { preset: "all", style: "thin", color: border } };
images.getRange(`C5:J${catalogLastRow}`).format = { fill: amber, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: border } };
for (const col of ["D", "E", "F"]) images.getRange(`${col}5:${col}${catalogLastRow}`).dataValidation = { rule: { type: "list", values: ["Belirtilmedi", "İzin verildi", "İzin verilmedi", "Koşullu izin"] } };
images.freezePanes.freezeRows(4);
images.getRange("A:B").format.columnWidth = 18;
images.getRange("C:C").format.columnWidth = 38;
images.getRange("D:F").format.columnWidth = 24;
images.getRange("G:J").format.columnWidth = 28;
images.getRange(`5:${catalogLastRow}`).format.rowHeight = 60;
images.tables.add(`A4:J${catalogLastRow}`, true, "AlpineImagePermissions").style = "TableStyleMedium2";

guide.showGridLines = false;
guide.mergeCells("A1:F1");
guide.getRange("A1").values = [["DOLDURMA VE İADE TALİMATI"]];
guide.getRange("A1:F1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 34 };
const guideRows = [
 ["1", "Katalog Doğrulama", "Her satırda 'Doğrulama durumu' alanını seçin. Düzeltme gerekiyorsa doğru değeri ve açıklamayı sarı alanlara yazın."],
 ["2", "Donanım doğrulama", "Her varyant ve özellik için sunum biçimini seçin: standart, opsiyon, paketle sunulan, sunulmayan veya uygulanamaz. Opsiyon ve paketlerde adını, koşulunu ve resmî kaynak URL'sini belirtin."],
 ["3", "Eksik modeller", "Listede bulunmayan güncel model veya varyantları yeni satır olarak ekleyin; resmî kaynak URL'sini belirtin."],
 ["4", "Fiyat bilgisi", "Tahmini fiyatlar forma dahil edilmemiştir. Fiyat alanları bu doğrulama turunda boş bırakılmıştır; fiyat paylaşılması zorunlu değildir."],
 ["5", "Görsel izinleri", "İzin verilen kullanım kanallarını, süreyi, atıf metnini ve kısıtları her satır için doldurun; görselleri ek veya indirme bağlantısı olarak paylaşın."],
 ["6", "Yetkili bilgisi", "Aşağıdaki kurumsal yetkili alanlarını doldurun ve dosyayı yanıt e-postasına ekleyin."],
];
guide.getRange("A3:C8").values = guideRows;
guide.getRange("A3:C8").format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: border } };
guide.getRange("A3:A8").format = { fill: blue, font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };
guide.getRange("B3:B8").format = { fill: pale, font: { bold: true, color: navy } };
guide.getRange("A10:B14").values = [["Yetkili adı soyadı", ""], ["Unvan / birim", ""], ["Kurumsal e-posta", ""], ["Telefon", ""], ["Onay tarihi", ""]];
guide.getRange("A10:A14").format = { fill: pale, font: { bold: true, color: navy }, borders: { preset: "all", style: "thin", color: border } };
guide.getRange("B10:B14").format = { fill: amber, borders: { preset: "all", style: "thin", color: border } };
guide.getRange("B14").format.numberFormat = "yyyy-mm-dd";
guide.getRange("A:A").format.columnWidth = 20;
guide.getRange("B:B").format.columnWidth = 24;
guide.getRange("C:C").format.columnWidth = 85;
guide.getRange("3:8").format.rowHeight = 52;

const meta = workbook.worksheets.add("Kaynaklar");
meta.showGridLines = false;
meta.getRange("A1:C1").values = [["Kaynak", "URL", "Not"]];
meta.getRange("A1:C1").format = { fill: navy, font: { bold: true, color: "#FFFFFF" } };
meta.getRange("A2:C6").values = [
 ["Expiya Cars aktif katalog", "data/production/catalog/releases/v0.55.4/catalog.json", "Alpine A290 GT Performance, A290 GTS ve A390 GT; toplam 3 aktif varyant"],
 ["Expiya Cars aktif katalog işaretçisi", "data/production/catalog/active.json", "Aktif katalog sürümü 0.55.4; 50 marka ve 549 varyant"],
 ["Expiya Cars donanım sözlüğü", "data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20/equipment-evidence.json", "51 kontrollü donanım özelliği; Alpine için mevcut durum bilinmiyor ve firma doğrulaması bekleniyor"],
 ["Alpine Türkiye yasal bilgiler", "https://www.alpinecars.com.tr/yasal-bilgiler.html", "İçerik ve görseller için yazılı izin gerekliliği"],
 ["ETBİS işletme kaydı", "https://etbis.ticaret.gov.tr/", "MAİS şirket ve KEP bilgisi; site sorgusunda satinal.renault.com.tr kaydı"],
 ];
meta.getRange("A1:C6").format.wrapText = true;
meta.getRange("A:A").format.columnWidth = 28;
meta.getRange("B:B").format.columnWidth = 72;
meta.getRange("C:C").format.columnWidth = 48;

await fs.mkdir(outDir, { recursive: true });
const check = await workbook.inspect({ kind: "table", range: `Katalog Doğrulama!A1:T${catalogLastRow}`, include: "values,formulas", tableMaxRows: 12, tableMaxCols: 20 });
console.log(check.ndjson);
const equipmentCheck = await workbook.inspect({ kind: "table", range: `Donanım Doğrulama!A1:N${equipmentLastRow}`, include: "values,formulas", tableMaxRows: 12, tableMaxCols: 14 });
console.log(equipmentCheck.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula errors" });
console.log(errors.ndjson);
for (const [sheetName, range, file] of [["Katalog Doğrulama", `A1:T${catalogLastRow}`, "preview-catalog.png"], ["Donanım Doğrulama", "A1:N30", "preview-equipment-top.png"], ["Donanım Doğrulama", `A${equipmentLastRow - 28}:N${equipmentLastRow}`, "preview-equipment-bottom.png"], ["Görsel İzinleri", `A1:J${catalogLastRow}`, "preview-images.png"], ["Açıklamalar", "A1:F14", "preview-guide.png"], ["Kaynaklar", "A1:C6", "preview-sources.png"]]) {
  const blob = await workbook.render({ sheetName, range, scale: 1 });
  await fs.writeFile(path.join(outDir, file), new Uint8Array(await blob.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outDir, "Alpine_Katalog_Dogrulama_Formu.xlsx"));
