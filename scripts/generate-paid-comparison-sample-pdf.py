#!/usr/bin/env python3
import json
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/production/catalog/releases/v0.55.4/catalog.json"
OUT = ROOT / "output/pdf/expiya-cars-ornek-karsilastirma-raporu-hyundai-i20.pdf"
IDS = [
    "786724ef-1a07-5888-9e78-3ffe22635e60",
    "ab1eeac7-0954-5c11-8c8c-d2cbd9e3c229",
    "f4f85dca-db7b-58c7-8049-08158325bec9",
]

NAVY = colors.HexColor("#13263D")
BLUE = colors.HexColor("#2167D5")
PALE = colors.HexColor("#EEF4FC")
MINT = colors.HexColor("#DDF5E8")
INK = colors.HexColor("#17212B")
MUTED = colors.HexColor("#5D6A78")
LINE = colors.HexColor("#D8E0E8")
EMPTY = "Doğrulanmış veri yok"

pdfmetrics.registerFont(TTFont("Arial", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BodyTR", fontName="Arial", fontSize=8.3, leading=11, textColor=INK))
styles.add(ParagraphStyle(name="SmallTR", fontName="Arial", fontSize=6.7, leading=8.5, textColor=MUTED))
styles.add(ParagraphStyle(name="TitleTR", fontName="Arial-Bold", fontSize=25, leading=29, textColor=colors.white))
styles.add(ParagraphStyle(name="H1TR", fontName="Arial-Bold", fontSize=17, leading=21, textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name="H2TR", fontName="Arial-Bold", fontSize=11, leading=14, textColor=NAVY, spaceBefore=5, spaceAfter=4))
styles.add(ParagraphStyle(name="CellTR", fontName="Arial", fontSize=6.7, leading=8.2, textColor=INK))
styles.add(ParagraphStyle(name="CellBoldTR", fontName="Arial-Bold", fontSize=6.7, leading=8.2, textColor=INK))
styles.add(ParagraphStyle(name="WhiteTR", fontName="Arial", fontSize=8.5, leading=11, textColor=colors.white))

def v(field):
    return field.get("value") if isinstance(field, dict) else field

def money(n):
    return f"{n:,.0f} TL".replace(",", ".")

def p(text, style="CellTR"):
    text = EMPTY if text in (None, "", []) else str(text)
    return Paragraph(text.replace("&", "&amp;"), styles[style])

def load():
    raw = json.loads(CATALOG.read_text())
    by_id = {r["variant"]["id"]: r for r in raw["records"]}
    return [by_id[i] for i in IDS]

records = load()
cars = []
for rec in records:
    x, pr = rec["variant"], rec["activeNewPrice"]
    cars.append({
        "id": x["id"], "brand": v(x["brand"]), "model": v(x["model"]), "trim": v(x["trim"]),
        "year": v(x["modelYear"]), "body": v(x["bodyStyle"]), "price": pr["amountTry"],
        "price_type": pr["priceType"], "valid": pr["validFrom"][:10],
        "fuel": v(x["powertrain"]["fuelType"]), "cc": v(x["powertrain"]["engineDisplacementCc"]),
        "kw": v(x["powertrain"]["powerKw"]), "torque": v(x["powertrain"]["torqueNm"]),
        "drive": v(x["powertrain"]["drivenWheels"]), "trans": v(x["powertrain"]["transmission"]),
        "cons": v(x["efficiency"]["combinedLitresPer100Km"]), "protocol": v(x["efficiency"]["protocol"]),
        "dims": {k: v(z) for k,z in x["dimensions"].items()},
        "safety": [v(z) for z in x["safetyFeatureCodes"]],
    })

labels = ["Karar aracı\nDCT Jump", "Alternatif 1\nMT Jump", "Alternatif 2\nDCT Elite"]
abbr = {
 "ABS":"Kilitlenme önleyici fren", "BAS":"Fren destek sistemi", "DAW":"Sürücü dikkat uyarısı",
 "EBD":"Elektronik fren gücü dağılımı", "ECALL":"Acil çağrı", "ESP":"Elektronik denge kontrolü",
 "ESS":"Acil fren sinyali", "FCA":"Önden çarpışma önleme asistanı", "FRONT_AIRBAGS":"Ön hava yastıkları",
 "HAC":"Yokuş kalkış desteği", "HBA":"Uzun far asistanı", "ICC":"Akıllı hız sabitleyici / katalog kodu",
 "ISLA":"Akıllı hız limiti asistanı", "LFA":"Şerit takip asistanı", "LKA":"Şeritte kalma asistanı",
 "MCB":"Çoklu çarpışma freni", "REAR_CAMERA":"Geri görüş kamerası", "SIDE_CURTAIN_AIRBAGS":"Yan ve perde hava yastıkları",
 "TCS":"Çekiş kontrol sistemi", "TPMS":"Lastik basınç izleme", "VSM":"Araç denge yönetimi"
}

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.line(15*mm, 10*mm, 282*mm, 10*mm)
    canvas.setFont("Arial", 6.5); canvas.setFillColor(MUTED)
    canvas.drawString(15*mm, 6.2*mm, "Expiya Cars - Örnek ücretli karşılaştırma raporu - Satın alma talimatı veya ekspertiz değildir")
    canvas.drawRightString(282*mm, 6.2*mm, f"Sayfa {doc.page}")
    canvas.restoreState()

def section(title, intro=None):
    out = [Paragraph(title, styles["H1TR"])]
    if intro: out += [Paragraph(intro, styles["BodyTR"]), Spacer(1, 3*mm)]
    return out

def table(rows, widths=None, header=True, font=6.7):
    cooked = [[c if hasattr(c, "wrap") else p(c) for c in row] for row in rows]
    t = Table(cooked, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("FONTNAME", (0,0), (-1,-1), "Arial"), ("FONTSIZE", (0,0), (-1,-1), font),
        ("VALIGN", (0,0), (-1,-1), "TOP"), ("GRID", (0,0), (-1,-1), .35, LINE),
        ("LEFTPADDING", (0,0), (-1,-1), 4), ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("ROWBACKGROUNDS", (0,1 if header else 0), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]
    if header:
        commands += [("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("FONTNAME", (0,0), (-1,0), "Arial-Bold")]
    t.setStyle(TableStyle(commands)); return t

def matrix(title, rows):
    data = [[title] + [p(x.replace("\n", "<br/>"), "CellBoldTR") for x in labels]]
    data += [[p(name, "CellBoldTR")] + [p(vals[i]) for i in range(3)] for name, vals in rows]
    assert all(len(row) == 4 for row in data), f"Karşılaştırma matrisi 4 sütunlu olmalı: {title}"
    return table(data, [52*mm, 71*mm, 71*mm, 71*mm])

story=[]
# Cover
cover = Table([[Paragraph("EXPIYA CARS", styles["WhiteTR"])], [Paragraph("3 araç karşılaştırma<br/>analizi", styles["TitleTR"])],
               [Paragraph("Kişiselleştirilmiş örnek rapor | Hyundai i20 | 2026 Türkiye varyantları", styles["WhiteTR"])],
               [Spacer(1, 32*mm)], [Paragraph("Karar aracı: 1.0 T-GDI 90PS DCT Jump<br/>Alternatifler: MT Jump ve DCT Elite", styles["WhiteTR"])],
               [Paragraph("Veri kesiti: 16 Ağustos 2026  |  Katalog: v0.55.4  |  Rapor: 29 Ağustos 2026", styles["WhiteTR"])],],
              colWidths=[267*mm], rowHeights=[10*mm, 30*mm, 13*mm, 34*mm, 20*mm, 12*mm])
cover.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),NAVY),("BOX",(0,0),(-1,-1),1.2,BLUE),("LEFTPADDING",(0,0),(-1,-1),14*mm),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
story += [Spacer(1,5*mm), cover, Spacer(1,4*mm), Paragraph("ÖNEMLİ", styles["H2TR"]), Paragraph("Bu örnek, ücretli ürünün içerik kapsamını test eder. Doğrulanamayan bilgi üretilmemiş; ilgili alanlar boş bırakılmıştır. Fiyatlar resmi distribütörün gözlenen kampanya fiyatlarıdır, bayi teklifi değildir.", styles["BodyTR"]), PageBreak()]

story += section("1. İhtiyaç özeti ve karar", "Bu bölüm gerçek üründe Expiya Cars sohbetinden otomatik oluşur. Aşağıdaki profil yalnızca örnektir.")
profile = [["Örnek ihtiyaç", "Tanım"], ["Kullanım", "Ağırlıklı şehir içi, günlük ulaşım ve dönemsel uzun yol"], ["Öncelikler", "Otomatik şanzıman, güvenlik, bütçe disiplini, kolay kullanım"], ["Bütçe", "1.900.000 TL üst sınır (örnek)"], ["Karşılaştırma sınırı", "Aynı gövde sınıfı; Türkiye'de satışta; sıfır km; exact varyant"]]
story += [table(profile,[55*mm,210*mm]), Spacer(1,5*mm)]
decision = Table([[p("KARAR", "CellBoldTR"), p("DCT Jump, otomatik şanzımanı korurken Elite'e göre 155.610 TL daha düşük gözlenen kampanya fiyatıyla örnek profil için en dengeli seçenek.", "BodyTR")], [p("Ne zaman MT Jump?", "CellBoldTR"), p("Manuel şanzıman kabul ediliyorsa ve 174.000 TL fiyat farkı belirleyiciyse.")], [p("Ne zaman DCT Elite?", "CellBoldTR"), p("Daha yüksek donanım paketinin exact-varyant içeriği resmi kaynakla tamamlandığında ve ek 155.610 TL bütçe uygunsa.")]], colWidths=[50*mm,215*mm])
decision.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),MINT),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
story += [decision, Spacer(1,6*mm), Paragraph("Karar güveni: ORTA", styles["H2TR"]), Paragraph("Temel teknik, boyut, tüketim, güvenlik ve fiyat verileri yüksek güvenli resmi kaynaklara dayanıyor. Buna karşılık donanım paketi ayrıntıları, renkler, garanti ve exact-varyant kullanım kılavuzu henüz tamamlanmadığı için karar güveni 'yüksek' değildir.", styles["BodyTR"]), PageBreak()]

story += section("2. Araç kimliği ve fiyat karşılaştırması")
story += [matrix("Başlık", [
    ("Tam varyant", [c["trim"] for c in cars]), ("Model yılı", [c["year"] for c in cars]), ("Gövde", [c["body"] for c in cars]),
    ("Satış durumu", ["Türkiye'de satışta"]*3), ("Fiyat", [money(c["price"]) for c in cars]),
    ("Fiyat türü", ["Kampanya fiyatı"]*3), ("Fiyat tarihi", ["16.08.2026"]*3),
    ("Karar aracına fark", ["-", "-174.000 TL", "+155.610 TL"]), ("Exact varyant kimliği", [c["id"] for c in cars]),
])]
story += [Spacer(1,5*mm), Paragraph("Fiyat uyarısı", styles["H2TR"]), Paragraph("Kampanya fiyatı stok ve bayi katılımına bağlı olabilir, önceden haber verilmeksizin değişebilir. Nihai fiyat, teslim tarihi ve opsiyonlar için satış noktasından yazılı teklif alınmalıdır.", styles["BodyTR"]), PageBreak()]

story += section("3. Motor, aktarma, performans ve verimlilik")
story += [matrix("Teknik alan", [
    ("Yakıt / enerji", ["Benzin"]*3), ("Motor hacmi", [f'{c["cc"]} cc' for c in cars]), ("Güç", [f'{c["kw"]} kW / yaklaşık 90 PS' for c in cars]),
    ("Tork", [f'{c["torque"]} Nm' for c in cars]), ("Şanzıman", [c["trans"] for c in cars]), ("Çekiş", ["Önden çekiş"]*3),
    ("Birleşik tüketim", [f'{c["cons"]} l/100 km' for c in cars]), ("Ölçüm standardı", [c["protocol"] for c in cars]),
    ("0-100 km/s", [EMPTY]*3), ("Azami hız", [EMPTY]*3), ("CO2 emisyonu", [EMPTY]*3), ("Yakıt deposu", [EMPTY]*3),
    ("Boş / azami yüklü ağırlık", [EMPTY]*3), ("Römork çekme kapasitesi", [EMPTY]*3), ("Dönüş çapı", [EMPTY]*3),
])]
story += [Spacer(1,4*mm), Paragraph("Yorum", styles["H2TR"]), Paragraph("Üç varyantın doğrulanmış motor, güç, tork ve WLTP birleşik tüketim değerleri aynı. Temel ayrım şanzıman ve donanım seviyesinde; gerçek tüketim sürüş, trafik, hava ve yük koşullarına göre değişir.", styles["BodyTR"]), PageBreak()]

story += section("4. Boyutlar, kapasite ve günlük kullanım")
story += [table([["Ölçü", "Üç varyant için doğrulanmış ortak değer"],
    ["Uzunluk", "4065 mm"], ["Genişlik", "1775 mm"], ["Yükseklik", "1450 mm"],
    ["Aks mesafesi", "2580 mm"], ["Bagaj hacmi", "352 litre"], ["Koltuk sayısı", EMPTY],
    ["Kapı sayısı", EMPTY], ["Arka koltuk düzeni", EMPTY], ["Yerden yükseklik", EMPTY],
    ["Tavan yük limiti", EMPTY],
], [70*mm,195*mm])]
story += [Spacer(1,4*mm), Paragraph("Kullanım senaryosu değerlendirmesi", styles["H2TR"]), Paragraph("Ortak ölçüler nedeniyle park, kabin ve bagaj kullanımı bakımından doğrulanmış bir varyant farkı yok. 352 litrelik doğrulanmış bagaj hacmi şehir içi ve gündelik aile kullanımı için karşılaştırmanın ortak tabanıdır; koltuk yatırıldığındaki hacim doğrulanmamıştır.", styles["BodyTR"]), PageBreak()]

story += section("5. Güvenlik ve sürüş destek sistemleri", "Aşağıdaki öğeler Temmuz 2026 Türkiye broşüründen exact varyanta bağlanan yüksek güvenli katalog verileridir.")
srows=[]
for code in cars[0]["safety"]:
    srows.append((f"{abbr.get(code, code)} ({code})", ["Var"]*3))
srows += [("Adaptif hız sabitleyici", [EMPTY]*3), ("Kör nokta izleme", [EMPTY]*3), ("360° kamera", [EMPTY]*3), ("Euro NCAP sonucu", [EMPTY]*3)]
story += [matrix("Sistem", srows), PageBreak()]

story += section("6. Konfor, kabin ve multimedya", "Şablon tüm hedef alanları gösterir. Katalogda exact varyanta bağlanmamış alanlar bilinmiyor olarak bırakılmıştır.")
comfort = ["Klima türü ve bölge sayısı","Ön / arka park sensörü","Anahtarsız giriş ve çalıştırma","Hız sabitleyici türü","Elektrikli / ısıtmalı aynalar","Yağmur ve far sensörü","Elektrikli camlar","Direksiyon ayarı ve ısıtma","Ön koltuk ayarı","Isıtmalı / havalandırmalı koltuklar","Döşeme malzemesi ve rengi","Arka kol dayama","Ambiyans aydınlatması","12V priz","Kablosuz telefon şarjı","USB girişleri","Ekran boyutu","Dijital gösterge","Apple CarPlay / Android Auto","Bluetooth","Hoparlör sayısı","Navigasyon","Bağlantılı araç servisleri","Yazılım güncelleme yöntemi"]
story += [matrix("Donanım alanı", [(x,[EMPTY]*3) for x in comfort]), PageBreak()]

story += section("7. Dış donanım, aydınlatma, jant ve lastik")
exterior=["Far teknolojisi","Gündüz farı","Otomatik uzun far","Viraj aydınlatması","Arka aydınlatma teknolojisi","Sis farları","Jant ölçüsü ve tasarımı","Lastik ölçüsü","Stepne / tamir kiti","Tavan penceresi","Arka cam karartma","Gövde renkli parçalar","Tavan rengi","Tavan rayı","Metalik renk farkı","Standart dış renkler","Opsiyonel dış renkler","İç renk / döşeme kombinasyonları"]
story += [matrix("Alan", [(x,[EMPTY]*3) for x in exterior]), Spacer(1,4*mm), Paragraph("Renk ve görsel durumu", styles["H2TR"]), Paragraph("Exact Türkiye varyantına bağlı doğrulanmış renk paleti ve lisans/kullanım hakkı doğrulanmış araç fotoğrafı katalogda yoktur. Ürün bu alanları gizlemeyecek; veri geldiğinde renk örnekleri, dış/iç görseller, jant ve döşeme seçenekleri aynı bölüme eklenecektir.", styles["BodyTR"]), PageBreak()]

story += section("8. Garanti, servis ve sahip olma maliyeti")
cost=["Araç garantisi (süre / km)","Boya / paslanma garantisi","Yol yardım kapsamı","Bakım aralığı","Yetkili servis sayısı / erişim göstergesi","Periyodik bakım fiyatı","Motorlu Taşıtlar Vergisi","Trafik sigortası","Kasko göstergesi","Yıllık yakıt maliyeti","Lastik maliyeti","Değer kaybı göstergesi","3 yıllık toplam sahip olma maliyeti"]
story += [matrix("Maliyet alanı", [(x,[EMPTY]*3) for x in cost]), Spacer(1,4*mm), Paragraph("Hesaplama ilkesi", styles["H2TR"]), Paragraph("Vergi, sigorta, bakım ve yakıt maliyeti ancak tarihli resmi tarife veya kullanıcı girdileriyle hesaplanacaktır. Bu örnekte doğrulanmış girdi seti tamamlanmadığı için tahmini rakam üretilmemiştir.", styles["BodyTR"]), PageBreak()]

story += section("9. Kullanım kılavuzu ve derin özellik kanıtı")
manual = [["Kaynak katmanı","Durum","Rapora etkisi"], ["Türkiye exact varyant kullanım kılavuzu",EMPTY,"Kılavuzdan varyant donanımı çıkarılmadı"], ["i20 model ailesi kullanım kılavuzu","İngiltere MY25 aile kılavuzu araştırmada mevcut","Türkiye 2026 trim standardı olarak aktarılmadı"], ["Exact TR köprü sonucu","Araştırıldı - sonuçsuz","Adaptif hız sabitleme, kör nokta, ısıtmalı koltuk, ISOFIX, geri kamera, tavan yükü ve kablosuz şarj kılavuzdan doğrulanamadı"], ["Fail-closed kuralı","Etkin","Aile kılavuzundaki özellik exact varyanta sessizce taşınmaz"]]
story += [table(manual,[65*mm,70*mm,130*mm]), Spacer(1,5*mm), Paragraph("Hedef veri akışı", styles["H2TR"]), Paragraph("Üreticiden kullanım kılavuzu alındığında belge sürümü, pazar, model yılı, varyant/paket bağı ve sayfa referansı saklanacak; özellik yalnızca bağ doğrulanırsa 'var' olarak gösterilecektir.", styles["BodyTR"]), PageBreak()]

story += section("10. Fotoğraflar, renkler ve belge galerisi")
gallery=[]
for title in ["Ön 3/4 dış görünüm","Arka 3/4 dış görünüm","Yan profil","Kokpit","Ön koltuklar","Arka koltuklar","Bagaj","Jant","Dış renk paleti","İç döşeme paleti"]:
    box=Table([[p(title,"CellBoldTR")],[p("Exact varyant görseli bekleniyor")]], colWidths=[126*mm], rowHeights=[12*mm,18*mm])
    box.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),PALE),("BOX",(0,0),(-1,-1),.6,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ALIGN",(0,0),(-1,-1),"CENTER")]))
    gallery.append(box)
for i in range(0,len(gallery),2):
    if i == 8:
        story += [PageBreak(), Paragraph("10. Fotoğraflar, renkler ve belge galerisi - devam", styles["H1TR"])]
    story += [Table([[gallery[i],gallery[i+1]]], colWidths=[132*mm,132*mm]), Spacer(1,3*mm)]
story += [Paragraph("Görsel ilkesi: Model ailesi görseli kullanılacaksa bunun exact varyantı temsil etmeyebileceği açıkça yazılır; görsel lisansı ve kaynak URL'si saklanır.", styles["SmallTR"]), PageBreak()]

story += section("11. Farklar, tavizler ve hangi koşulda hangisi?")
story += [table([["Varyant","Öne çıkan koşul","Taviz / belirsizlik","Fiyat etkisi"],
    [labels[0],"Şehir içinde otomatik rahatlığı ve bütçe dengesi","Jump ile Elite donanım farkı exact veriyle henüz doğrulanmadı","Referans"],
    [labels[1],"En düşük satın alma bedeli; manuel kabulü","Otomatik şanzımandan vazgeçilir","174.000 TL daha düşük"],
    [labels[2],"Elite donanım farkı doğrulanıp kullanıcı için değerliyse","Donanım içeriği henüz tamamlanmadı","155.610 TL daha yüksek"],
],[45*mm,77*mm,93*mm,50*mm]), Spacer(1,5*mm), Paragraph("Sonuç", styles["H2TR"]), Paragraph("Örnek profil için DCT Jump öne çıkıyor. Bunun nedeni, temel motor-güvenlik-boyut değerleri aynı görünürken otomatik şanzımanı sunması ve Elite'e göre daha düşük kampanya fiyatında kalmasıdır. Elite'in ek bedelini haklı çıkaracak exact donanım farkları doğrulanana kadar bu sonuç koşulludur; kesin 'al' talimatı değildir.", styles["BodyTR"]), PageBreak()]

story += section("12. Kapsamlı veri tamamlama listesi")
groups=[("Kimlik", "Pazar, model yılı, gövde, varyant, paket, satış durumu"),("Fiyat", "Liste/kampanya, opsiyon, teslim, tarih, bayi koşulu"),("Motor", "Hacim, güç, tork, silindir, emisyon, performans"),("Elektrik", "Batarya, AC/DC güç, süre, menzil, ısı pompası"),("Boyut", "Dış ölçüler, kabin, bagaj, ağırlık, çekme, dönüş"),("Güvenlik", "Hava yastığı, fren, ADAS, çocuk güvenliği, test sonucu"),("Konfor", "Klima, koltuk, cam, ayna, anahtar, saklama"),("Multimedya", "Ekran, telefon entegrasyonu, ses, navigasyon, OTA"),("Dış", "Far, jant, lastik, tavan, renk, kaplama"),("Sahiplik", "Garanti, servis, bakım, vergi, sigorta, yakıt/enerji"),("Belgeler", "Broşür, fiyat listesi, kılavuz, garanti, aksesuar"),("Medya", "Dış/iç fotoğraf, renk, jant, döşeme, lisans")]
story += [table([["Veri grubu","Hedef alanlar","Bu örnekte durum"]]+[[a,b,"Kısmi / veri bekleniyor"] for a,b in groups],[45*mm,145*mm,75*mm]), Spacer(1,4*mm), Paragraph("Boş alan, özelliğin araçta olmadığı anlamına gelmez; yalnızca mevcut kaynaklarla exact varyant için doğrulanamadığını gösterir.", styles["BodyTR"]), PageBreak()]

story += section("13. Kaynaklar, veri tarihi ve metodoloji")
sources=[["Kaynak","Belge / erişim","Kullanılan veri","Güven"],
 ["Hyundai Türkiye","Hyundai i20 Türkiye broşürü, Temmuz 2026; erişim 16.08.2026","Kimlik, teknik, tüketim, boyut, güvenlik","Yüksek"],
 ["Hyundai Türkiye","Resmi fiyat listesi / HppPriceListTR API gözlemi; 16.08.2026","Kampanya fiyatı","Yüksek"],
 ["Expiya üretim kataloğu","v0.55.4; fingerprint 4330b303...b3b9","Exact varyant bağları ve provenance","Sürüm kontrollü"],
 ["Kullanım kılavuzu araştırması","Owner-manual exact-TR bridge v4; 26.08.2026","Sonuçsuz alanların görünür tutulması","Düşük / sonuçsuz"]]
story += [table(sources,[55*mm,95*mm,80*mm,35*mm]), Spacer(1,5*mm), Paragraph("Karşılaştırma yöntemi", styles["H2TR"]), Paragraph("Önce exact varyant kimliği sabitlenir; resmi üretici/distribütör kaynağı önceliklendirilir; değişken bilgiye tarih eklenir; aile seviyesi bilgi exact varyanta aktarılmaz; çelişki veya eksik bağ varsa alan boş bırakılır. Bu örnekte sayısal kullanıcı puanı üretilmemiştir çünkü donanım ve sahiplik verileri tamamlanmamıştır.", styles["BodyTR"]), Spacer(1,4*mm), Paragraph("Resmi bağlantılar", styles["H2TR"]), Paragraph("Broşür: https://dmassets.hyundai.com/is/content/hyundaiautoever/i20-dijital-brosurpdf<br/>Fiyat: https://www.hyundai.com/tr/tr/satis/fiyat-listesi.html", styles["BodyTR"]), PageBreak()]

story += section("14. Satış aksiyonları ve önemli notlar")
actions=[["Araç","Kullanıcı aksiyonları"],[labels[0],"Fiyat teklifi iste | Test sürüşü talep et | Satıcıyla görüş"],[labels[1],"Fiyat teklifi iste | Test sürüşü talep et | Satıcıyla görüş"],[labels[2],"Fiyat teklifi iste | Test sürüşü talep et | Satıcıyla görüş"]]
story += [table(actions,[70*mm,195*mm]), Spacer(1,6*mm), Paragraph("Dijital teslim", styles["H2TR"]), Paragraph("Ürün hedefi: rapor site içinde PDF görüntüleyicide açılır, telefon veya bilgisayara indirilebilir ve kullanıcının talebiyle verdiği e-posta adresine gönderilir. Bu örnek dosya tasarım ve içerik onayı içindir; e-posta gönderimi yapılmamıştır.", styles["BodyTR"]), Spacer(1,5*mm), Paragraph("Sınırlar", styles["H2TR"]), Paragraph("Bu rapor ekspertiz, hukuki/finansal danışmanlık veya kesin satın alma talimatı değildir. Fiyat ve donanım teslim anında değişebilir. Satın almadan önce üretici/distribütör belgesi ile bayi teklifini kontrol edin. Sponsor veya satıcı ilişkisi organik kararı değiştiremez.", styles["BodyTR"]), Spacer(1,5*mm), Paragraph("Ücretli ürün notu", styles["H2TR"]), Paragraph("Planlanan tek paket: karar kartındaki araç + kullanıcının aynı sınıftan seçtiği 2 araç; 349 TL KDV dahil. İade koşulları satış öncesi bilgilendirmede ve detay sayfasında sunulur.", styles["BodyTR"])]

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUT), pagesize=landscape(A4), rightMargin=15*mm, leftMargin=15*mm, topMargin=14*mm, bottomMargin=14*mm, title="Expiya Cars Örnek 3 Araç Karşılaştırma Raporu", author="Expiya")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
