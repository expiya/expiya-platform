import type { AppliancesProductType } from "./contracts";
import { domainAdvisory, xpyTermsMatch } from "@/features/xpy/advisory";

export interface AppliancesAdvisoryPlan {
  readonly advisory: ReturnType<typeof domainAdvisory>;
  readonly invitation: string;
  readonly questionKey: string;
  readonly question: string;
  readonly intentQuestion: string;
}

export interface AppliancesCategoryKnowledge {
  readonly productType: AppliancesProductType;
  readonly publicName: string;
  readonly generalCulture: string;
  readonly consumerNeedGuidance: readonly string[];
  readonly preferenceQuestionKey: string;
  readonly preferenceQuestion: string;
}

const plans: Readonly<Record<AppliancesProductType, Omit<AppliancesAdvisoryPlan, "advisory" | "intentQuestion"> & { readonly orientation: string; readonly publicName: string }>> = {
  WASHING_MACHINE: {
    publicName: "çamaşır makinesi", orientation: "Tabii. Çamaşır makinesine başlarken gerçek yıkama düzenini, yerleşeceği boşluğu, sık kullanılan bakım programlarını ve uzaktan kontrol, otomatik dozaj ile ses gibi günlük kolaylıkları ayrı düşünmek işe yarar. Hane sayısı tek başına kilogram seçmez; yalnız kullanım düzenini anlamama yardım eder.",
    invitation: "İstersen önce evde kaç kişi olduğunuzdan başlayabiliriz.",
    questionKey: "appliances.wm.householdContext", question: "Evde düzenli olarak kaç kişi yaşıyor?",
  },
  DRYER: {
    publicName: "kurutma makinesi", orientation: "Tabii. Kurutma makinesinde bir seferdeki gerçek yük, yerleşeceği boşluk, sık kurutulan kumaşlar, kurutma programları ve bakım düzeni temel ayrımlardır. Daha büyük kapasite tek seferde daha çok yükü karşılayabilir; hassas kumaşlar ise uygun program ve bakım gerektirir. Isı pompası bir teknoloji türüdür; enerji kullanımı ve ses ancak aynı ölçüm koşullarında karşılaştırılabilir, tek başına düşük fatura, sessizlik veya kumaş sonucu garanti etmez.",
    invitation: "İstersen önce tek seferde kurutmak istediğin yükten başlayabiliriz.",
    questionKey: "appliances.dryer.capacity", question: "Bir seferde en az kaç kg çamaşır kurutmak istersin?",
  },
  REFRIGERATOR: {
    publicName: "buzdolabı", orientation: "Tabii. Buzdolabında taze gıda ve dondurucu için ayrı net hacim, dondurucunun yeri, mutfaktaki boşluk ile ses ve enerji bilgileri birlikte düşünülür. Dondurucunun altta veya üstte olması günlük erişimi değiştirir. Brüt hacim net hacmin yerine geçmez; tazelik adları da saklama süresi garantisi değildir.",
    invitation: "İstersen önce dondurucu yerleşiminden başlayabiliriz.",
    questionKey: "appliances.refrigerator.freezerArrangement", question: "Dondurucu bölmesini altta mı, üstte mi istersin?",
  },
  DISHWASHER: {
    publicName: "bulaşık makinesi", orientation: "Tabii. Bulaşık makinesinde sofra kapasitesi, yerleşeceği boşluk, kurutma düzeni, çatal-bıçak yerleşimi ve aynı program koşulundaki su, enerji ile ses bilgileri önemlidir. Otomatik kapı açma kurutma düzenini, ayrı çekmece ise doldurma ve boşaltma biçimini değiştirir.",
    invitation: "İstersen önce günlük kullanımda fark yaratan iki kolaylıktan başlayabiliriz.",
    questionKey: "appliances.dishwasher.material", question: "Otomatik kapı açma mı, ayrı çatal-bıçak çekmecesi mi senin için daha önemli?",
  },
  VACUUM: {
    publicName: "süpürge", orientation: "Tabii. Kablolu süpürgede priz değiştirmeden erişim, hazne, filtreleme ve evcil hayvan tüyüne uygun başlıklar günlük kullanımı belirler. Özel başlık tüy toplamayı, HEPA beyanı ise filtreleme ihtiyacını farklı biçimde karşılar. Motor giriş gücü tek başına temizlik veya emiş sonucu değildir.",
    invitation: "İstersen önce evcil hayvan ve filtreleme ihtiyacından başlayabiliriz.",
    questionKey: "appliances.vacuum.material", question: "Evcil hayvan başlığı mı, HEPA filtre mi senin için daha önemli?",
  },
  ROBOT_VACUUM: {
    publicName: "robot süpürge", orientation: "Tabii. Robot süpürgede mobilya altına giriş, eşikler, istasyon için yer, otomatik boşaltma, halıda paspas yönetimi ve haritalama günlük deneyimi belirler. Otomatik boşaltma bakımı, paspas kaldırma ise halı geçişini kolaylaştırabilir. Pascal değeri tek başına evdeki temizlik sonucunu göstermez.",
    invitation: "İstersen önce bakım kolaylığı ile halı kullanımından başlayabiliriz.",
    questionKey: "appliances.robot.material", question: "Otomatik toz boşaltma mı, halıda paspas kaldırma mı senin için daha önemli?",
  },
  FREEZER: { publicName:"derin dondurucu",orientation:"Tabii. Derin dondurucuda form, net dondurucu hacmi, yerleşim ölçüsü, buz çözme düzeni ve aynı etiket rejimindeki enerji bilgisi ayrı değerlendirilir.",invitation:"İstersen önce saklama düzeninden başlayabiliriz.",questionKey:"appliances.freezer.material",question:"Dikey çekmeceli form mu, sandık tipi form mu istiyorsun?" },
  BUILT_IN_OVEN: { publicName:"ankastre fırın",orientation:"Tabii. Ankastre fırında kabin ölçüsü, elektrik bağlantısı, cavity, pişirme modları ve temizlik düzeni birlikte değerlendirilir; işlev adları sonuç garantisi değildir.",invitation:"İstersen önce pişirme düzeninden başlayabiliriz.",questionKey:"appliances.oven.material",question:"Günlük kullanımda temizlik kolaylığı mı, pişirme modu çeşitliliği mi daha önemli?" },
  FREESTANDING_COOKER: { publicName:"solo fırınlı ocak",orientation:"Tabii. Solo fırınlı ocakta gaz ve elektrik yapılandırması ürün kimliğinin parçasıdır; bağlantı uygunluğu yetkili uzman tarafından doğrulanmalıdır.",invitation:"İstersen önce yakıt düzeninden başlayabiliriz.",questionKey:"appliances.cooker.material",question:"Gazlı ocak ve elektrikli fırın birleşimi mevcut tesisatına uygun mu?" },
  HOB: { publicName:"ankastre ocak",orientation:"Tabii. Ankastre ocakta teknoloji, tezgâh kesimi, elektrik veya gaz bağlantısı ve kap uyumu temel ayrımlardır; kurulum uzman doğrulaması gerektirir.",invitation:"İstersen önce ocak teknolojisinden başlayabiliriz.",questionKey:"appliances.hob.material",question:"İndüksiyon teknolojisi ve uyumlu kap kullanımı senin için uygun mu?" },
  RANGE_HOOD: { publicName:"davlumbaz",orientation:"Tabii. Davlumbazda form, genişlik, baca veya resirkülasyon düzeni, nominal debi ve ses aynı kurulum bağlamında düşünülür; nominal debi gerçek çekiş garantisi değildir.",invitation:"İstersen önce hava çıkış düzeninden başlayabiliriz.",questionKey:"appliances.hood.material",question:"Kurulum bacalı mı, resirkülasyonlu mu olacak?" },
  COUNTERTOP_MICROWAVE_OVEN: { publicName:"tezgâh üstü mikrodalga",orientation:"Tabii. Tezgâh üstü mikrodalgada dış ölçü, havalandırma boşluğu, hacim ve mikrodalga çıkış gücü ayrı değerlendirilir. Watt pişirme sonucu değildir; kapı, kilit veya RF güvenliği belirsizse kullanım önerilmez.",invitation:"İstersen önce yerleşim güvenliğinden başlayabiliriz.",questionKey:"appliances.countertop-microwave.material",question:"Tezgâhta ürün kılavuzundaki havalandırma boşluklarını sağlayabiliyor musun?" },
  BUILT_IN_MICROWAVE_OVEN: { publicName:"ankastre mikrodalga",orientation:"Tabii. Ankastre mikrodalgada ürünün niş ölçüsü, havalandırma ve elektrik bağlantısı önemlidir; tezgâh üstü ürünle veya ayrı çerçeveyle karıştırılamaz.",invitation:"İstersen önce niş uygunluğundan başlayabiliriz.",questionKey:"appliances.built-in-microwave.material",question:"Dolap nişi seçilecek modelin kurulum çizimine göre doğrulandı mı?" },
  AIR_PURIFIER: { publicName:"hava temizleyici",orientation:"Tabii. Hava temizleyicide CADR, filtre test metriği, gürültü ve filtre bakım düzeni aynı test bağlamında değerlendirilir. Laboratuvar yakalama oranı gerçek evde sağlık sonucu veya tıbbi koruma değildir.",invitation:"İstersen önce kullanılacağı odanın alanından başlayabiliriz.",questionKey:"appliances.air-purifier.room-area",question:"Hava temizleyiciyi kullanacağın oda yaklaşık kaç m²?" },
  FULLY_AUTOMATIC_ESPRESSO_MACHINE: { publicName:"tam otomatik espresso makinesi",orientation:"Tabii. Tam otomatik makinede çekirdek haznesi, dahili öğütücü, demleme grubu, süt sistemi ve bunların temizlik ile kireç çözme düzeni tek bir çekirdekten fincana iş akışı olarak değerlendirilir. Basınç, watt ve içecek adı tat, krema veya ekstraksiyon sonucu değildir.",invitation:"İstersen önce bakım ve süt düzeninden başlayabiliriz.",questionKey:"appliances.fully-automatic-espresso.material",question:"Dahili öğütücü, demleme grubu ve süt sisteminin kılavuzdaki günlük bakımını üstlenebilir misin?" },
  MANUAL_ESPRESSO_MACHINE: { publicName:"manuel espresso makinesi",orientation:"Tabii. Manuel espresso makinesinde portafiltre, sepet, basınçlı demleme, buhar çubuğu ve kutu içeriği birlikte değerlendirilir. Harici öğütücü var sayılmaz; bar ve watt tat, krema veya ekstraksiyon kalitesi değildir.",invitation:"İstersen önce manuel hazırlama düzeninden başlayabiliriz.",questionKey:"appliances.manual-espresso.material",question:"Öğütücüyü ayrı değerlendireceğimiz manuel portafiltre ve buhar çubuğu düzeni senin için uygun mu?" },
  FILTER_COFFEE_MACHINE: { publicName:"filtre kahve makinesi",orientation:"Tabii. Filtre kahve makinesinde demleme miktarı, filtre türü, sıcak tutma düzeni ile cam veya termal karaf kimliği birlikte değerlendirilir. Watt, aroma adı ve sıcak tutma süresi tat veya demleme kalitesi garantisi değildir.",invitation:"İstersen önce demleme miktarı ve karaf düzeninden başlayabiliriz.",questionKey:"appliances.filter-coffee.material",question:"Demleme miktarı ile cam veya termal karaf düzeninden hangisi senin için vazgeçilmez?" },
  TURKISH_COFFEE_MACHINE: { publicName:"Türk kahvesi makinesi",orientation:"Tabii. Türk kahvesi makinesinde tek seferde fincan sayısı, cezve veya hazne kimliği, pişirme teknolojisi, taşma yönetimi ve temizlik düzeni ayrı değerlendirilir. Köpük, lezzet, kıvam veya dayanıklılık pazarlama ifadelerinden çıkarılmaz.",invitation:"İstersen önce fincan ve taşma düzeninden başlayabiliriz.",questionKey:"appliances.turkish-coffee.material",question:"Tek seferde fincan sayısı ile taşma yönetiminden hangisi senin için vazgeçilmez?" },
  AIR_FRYER: { publicName:"airfryer",orientation:"Tabii. Airfryer seçiminde ürüne ait sepet ve pişirme bölmesi düzeni, çıkarılabilir parçalar, ölçüler ve elektrik sınırları birlikte değerlendirilir. Litre ve watt tek başına pişirme sonucu, sağlık yararı veya aile uygunluğu göstermez.",invitation:"İstersen önce sepet düzeninden başlayabiliriz.",questionKey:"appliances.air-fryer.material",question:"Tek sepet mi, ayrı kontrol edilen çift sepet mi istiyorsun?" },
  BLENDER: { publicName:"blender",orientation:"Tabii. Blender seçiminde ürüne ait sürahi malzemesi ve hacmi, bıçak düzeni ve kutudan çıkan aksesuarlar kimliğin parçasıdır. Watt veya devir sayısı tek başına karıştırma kalitesi ya da dayanıklılık göstermez.",invitation:"İstersen önce sürahi ve kullanım düzeninden başlayabiliriz.",questionKey:"appliances.blender.material",question:"Cam sürahi mi, kişisel şişe aksesuarı mı senin için önemli?" },
  FOOD_PROCESSOR: { publicName:"mutfak robotu",orientation:"Tabii. Mutfak robotunda ürüne ait kase, disk, bıçak ve kutudan çıkan aksesuar paketi ürün kimliğidir. Listelenmeyen doğrama, rendeleme veya yoğurma işlevleri varsayılmaz.",invitation:"İstersen önce gereken hazırlama işlevlerinden başlayabiliriz.",questionKey:"appliances.food-processor.material",question:"Dilimleme, rendeleme ve yoğurma aksesuarlarından hangileri vazgeçilmez?" },
  ELECTRIC_STORAGE_WATER_HEATER: { publicName:"elektrikli termosifon",orientation:"Tabii. Elektrikli termosifon seçiminde depo, güç, basınç, koruma, montaj ve su bağlantısı birlikte değerlendirilir. Litre veya watt hane uygunluğunu göstermez; seçilecek modelin saha uygunluğu yetkili servis ya da nitelikli uzman tarafından doğrulanmadan öneri verilemez.",invitation:"Önce güvenli saha doğrulamasını netleştirelim.",questionKey:"appliances.storage-water-heater.site-verification",question:"Seçilecek modelin elektrik, montaj ve su tesisatı koşulları uzman tarafından yerinde doğrulandı mı?" },
  INSTANTANEOUS_ELECTRIC_WATER_HEATER: { publicName:"elektrikli şofben",orientation:"Tabii. Elektrikli ani su ısıtıcısında güç kademeleri, debi beyanı, basınç, koruma ve elektrik-su tesisatı birlikte değerlendirilir. Watt, debi veya sıcaklık beyanı gerçek sahadaki performansı ve uygunluğu göstermez; uzman saha doğrulaması olmadan öneri verilemez.",invitation:"Önce güvenli saha doğrulamasını netleştirelim.",questionKey:"appliances.instant-water-heater.site-verification",question:"Seçilecek modelin elektrik, montaj ve su tesisatı koşulları uzman tarafından yerinde doğrulandı mı?" },
  SPLIT_AIR_CONDITIONER: { publicName:"ev tipi split klima",orientation:"Tabii. Split klimada karar kimliği iç ünite ve dış ünite kodlarının birlikte doğrulanmış çiftidir. BTU veya perakende aile adı eşleşmeyi ya da oda uygunluğunu göstermez. Oda ısı yükü, elektrik, soğutucu akışkan, borulama, drenaj ve montaj yetkili servis veya nitelikli iklimlendirme uzmanı tarafından yerinde doğrulanmadan öneri verilemez; sağlık, verim, konfor ve ses sonucu vaat edilmez.",invitation:"Önce ünite çifti ve güvenli saha doğrulamasını netleştirelim.",questionKey:"appliances.split-ac.site-verification",question:"İç ve dış ünite çifti için oda yükü ve tüm kurulum koşulları uzman tarafından yerinde doğrulandı mı?" },
};

const informationTopics: Readonly<Record<AppliancesProductType, readonly { readonly terms: readonly string[]; readonly answer: string }[]>> = {
  WASHING_MACHINE: [
    { terms: ["kapasite", "kg", "kilo"], answer: "Kapasiteyi yalnız hane sayısından çıkarmak doğru olmaz; bir seferdeki gerçek yükü, yıkama sıklığını ve sık yıkanan hacimli parçaları birlikte düşünmek gerekir." },
    { terms: ["uzaktan kontrol", "uygulama", "wifi"], answer: "Uzaktan kontrol program durumunu görme veya desteklenen işlemleri uygulamadan yönetme kolaylığı sağlayabilir; herkes için gerekli değildir ve temel yıkama uygunluğunun yerine geçmez." },
    { terms: ["otomatik dozaj", "dozaj"], answer: "Otomatik dozaj deterjan kullanımını günlük rutinde kolaylaştırabilir; değerli olup olmadığı deterjanı ne sıklıkta ve nasıl kullandığına bağlıdır." },
    { terms: ["ses", "sessiz", "gurultu"], answer: "Ses bilgisi özellikle yaşam alanına yakın kullanımda anlamlı olabilir; karşılaştırma ancak aynı çalışma aşaması ve ölçüm koşulu için yapılmalıdır." },
  ],
  DRYER: [
    { terms: ["isi pompasi", "ısı pompası"], answer: "Isı pompası bir kurutma teknolojisidir; enerji kullanımı, süre, program ve bakım düzeniyle birlikte değerlendirilir ve tek başına düşük fatura ya da kumaş sonucu garantilemez." },
    { terms: ["kapasite", "kg", "kilo"], answer: "Kapasite bir seferde kurutulacak gerçek yükle ilgilidir; sık kullanılan yükleri ve hacimli tekstilleri düşünmek, yalnız hane sayısına bakmaktan daha anlamlıdır." },
    { terms: ["ses", "enerji", "verim"], answer: "Enerji ve ses değerleri ancak aynı ölçüm rejimi ve program bağlamında karşılaştırılabilir; farklı koşullardaki sayılar doğrudan sıralama için kullanılamaz." },
  ],
  REFRIGERATOR: [
    { terms: ["no frost", "nofrost"], answer: "No Frost buzlanma yönetimiyle ilgilidir; net hacim, dondurucu yerleşimi, alan ve enerji bilgisinin yerine geçmez." },
    { terms: ["hacim", "litre", "kapasite"], answer: "Taze gıda, dondurucu ve toplam net hacim ayrı anlam taşır; brüt hacmi net kullanım alanı gibi değerlendirmemek gerekir." },
    { terms: ["dondurucu", "altta", "ustte", "üstte"], answer: "Dondurucunun altta veya üstte olması günlük erişimi değiştirir; bu düzeni kapı sayısından varsaymak yerine açıkça netleştirmek gerekir." },
  ],
  DISHWASHER: [
    { terms: ["otomatik kapi", "otomatik kapı", "kurutma"], answer: "Otomatik kapı açma program sonundaki kurutma düzenini etkileyebilir; sonuç program, yükleme ve ürünün doğrulanmış işlevine bağlıdır." },
    { terms: ["cekmece", "çekmece", "catal", "çatal"], answer: "Ayrı çatal-bıçak çekmecesi alt sepet kullanımını ve boşaltma düzenini değiştirebilir; herkes için zorunlu değildir." },
    { terms: ["kisilik", "kişilik", "kapasite"], answer: "Kişilik kapasitesi sofra yükünü anlatır; günlük bulaşık miktarı ve yerleşim düzeniyle birlikte düşünülmelidir." },
  ],
  VACUUM: [
    { terms: ["hepa", "filtre"], answer: "HEPA beyanı filtreleme ihtiyacıyla ilgilidir; başlık, erişim ve hazne kullanımının yerine geçmez." },
    { terms: ["evcil", "tuy", "tüy", "pet"], answer: "Evcil hayvan tüyüne yönelik doğrulanmış bir başlık, tüy toplama rutininde anlamlı olabilir; genel motor gücü bu işlevi tek başına göstermez." },
    { terms: ["watt", "motor gucu", "motor gücü"], answer: "Motor giriş gücü enerji çekişini anlatır; tek başına emiş veya evdeki temizlik sonucu değildir." },
  ],
  ROBOT_VACUUM: [
    { terms: ["pa", "pascal", "emis", "emiş"], answer: "Pascal değeri tek başına evdeki temizlik sonucunu göstermez; başlık, rota, yüzey ve bakım düzeni de etkilidir." },
    { terms: ["otomatik bosalt", "otomatik boşalt", "istasyon"], answer: "Otomatik boşaltma istasyonu hazne bakım sıklığını azaltabilir; karşılığında istasyon için yer ve sarf düzeni gerekir." },
    { terms: ["paspas", "hali", "halı"], answer: "Halıda paspas kaldırma, ıslak bezin halıya temasını yönetmeye yardımcı olabilir; eşik ve mobilya açıklığı gibi fiziksel koşullar yine ayrı değerlendirilir." },
  ],
  FREEZER: [{terms:["hacim","no frost","çekmece"],answer:"Dondurucu hacmi, form ve buz çözme düzeni birlikte değerlendirilir; buzdolabı dondurucu bölmesi ayrı bir ürün değildir."}],
  BUILT_IN_OVEN: [{terms:["hacim","mod","temizlik"],answer:"Fırın hacmi, kabin ölçüsü, elektrik bağlantısı ve pişirme işlevleri birlikte değerlendirilir; mod adı sonuç garantisi değildir."}],
  FREESTANDING_COOKER: [{terms:["gaz","elektrik","yakıt"],answer:"Gazlı ocak ve elektrikli fırın yapılandırması exact kimliğin parçasıdır; tesisat uygunluğu uzman tarafından doğrulanır."}],
  HOB: [{terms:["indüksiyon","gaz","elektrik"],answer:"Ocak teknolojisi, kesim ölçüsü, devre ve kap uyumu birlikte değerlendirilir; bağlantı için uzman doğrulaması gerekir."}],
  RANGE_HOOD: [{terms:["debi","baca","ses"],answer:"Nominal hava debisi gerçek mutfak çekişi değildir; kanal ve resirkülasyon düzeni sonucu etkiler."}],
  COUNTERTOP_MICROWAVE_OVEN: [{terms:["watt","rf","hacim"],answer:"Mikrodalga çıkış wattı pişirme sonucu değildir; yalnız exact kılavuzdaki kap, kilit, kap ve havalandırma kurallarıyla güvenli kullanım değerlendirilir."}],
  BUILT_IN_MICROWAVE_OVEN: [{terms:["niş","ankastre","ızgara"],answer:"Ankastre mikrodalga için kesin niş ölçüsü ve havalandırma talimatı esas alınır; tezgâh üstü kimliği veya ayrı çerçeve bunun yerine geçmez."}],
  AIR_PURIFIER: [{terms:["cadr","filtre","alerji","virüs"],answer:"CADR ve filtre yakalama oranı belirtilen test koşullarına aittir; hastalık önleme, tedavi veya gerçek ev sağlık sonucu garantisi değildir."}],
  FULLY_AUTOMATIC_ESPRESSO_MACHINE: [{terms:["bar","öğütücü","süt","krema"],answer:"Dahili öğütücü ve süt sistemi exact iş akışının parçasıdır; basınç ve watt tat, krema veya ekstraksiyon sonucu değildir. Temizlik ve kireç çözme exact kılavuza bağlıdır."}],
  MANUAL_ESPRESSO_MACHINE: [{terms:["bar","portafiltre","buhar","öğütücü"],answer:"Portafiltre, sepet ve buhar donanımı exact kutu içeriğiyle değerlendirilir; harici öğütücü var sayılmaz, bar değeri kahve kalitesi değildir."}],
  FILTER_COFFEE_MACHINE: [{terms:["karaf","filtre","watt","sıcak tutma"],answer:"Cam ve termal karaf farklı kullanım kimlikleridir; watt veya aroma adı tat ve demleme sonucu değildir."}],
  TURKISH_COFFEE_MACHINE: [{terms:["fincan","taşma","köz","köpük"],answer:"Fincan kapasitesi, pişirme teknolojisi ve taşma yönetimi exact model beyanıdır; köpük, lezzet veya kıvam sonucu garanti etmez."}],
  AIR_FRYER: [{terms:["litre","watt","sepet","sağlık"],answer:"Sepet ve cavity exact yapılandırmadır; litre ve watt pişirme sonucu, sağlık yararı veya aile uygunluğu garantisi değildir."}],
  BLENDER: [{terms:["sürahi","bıçak","watt","devir"],answer:"Sürahi, bıçak ve aksesuar exact yapılandırmadır; watt ve devir karıştırma kalitesi veya dayanıklılık garantisi değildir."}],
  FOOD_PROCESSOR: [{terms:["kase","disk","bıçak","aksesuar"],answer:"Yalnız exact SKU ile birlikte verilen kase, disk, bıçak ve aksesuarların işlevleri kullanılabilir; bulunmayan işlev varsayılmaz."}],
  ELECTRIC_STORAGE_WATER_HEATER: [{terms:["litre","watt","basınç","montaj"],answer:"Depo hacmi ve güç yalnız exact model özellikleridir; hane uygunluğu, devre, kablo, koruma, topraklama, montaj yüzeyi, su basıncı veya tesisat uygunluğu bunlardan çıkarılamaz. Yerinde uzman doğrulaması zorunludur."}],
  INSTANTANEOUS_ELECTRIC_WATER_HEATER: [{terms:["debi","watt","sıcaklık","basınç"],answer:"Güç, kademe ve üretici debi beyanı saha performansı veya tesisat uygunluğu garantisi değildir. Elektrik ve su koşulları exact model için yetkili servis ya da nitelikli uzman tarafından yerinde doğrulanmalıdır."}],
  SPLIT_AIR_CONDITIONER: [{terms:["btu","kapasite","metrekare","oda","ses","verim"],answer:"BTU, kapasite, aile adı, ses ve etiket verileri exact iç/dış ünite çiftini ya da oda uygunluğunu kanıtlamaz. Oda ısı yükü ve elektrik, soğutucu, borulama, drenaj ile montaj koşulları uzman tarafından yerinde doğrulanmalıdır."}],
};

export function appliancesAdvisoryPlan(type: AppliancesProductType): AppliancesAdvisoryPlan {
  const plan = plans[type];
  return { advisory: domainAdvisory(plan.orientation), invitation: plan.invitation, questionKey: plan.questionKey, question: plan.question, intentQuestion: `Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için bir ${plan.publicName} seçmeyi de düşünüyor musun?` };
}

/**
 * Catalog-entry companion knowledge. Adding a product type to AppliancesProductType
 * cannot compile without both a category plan and consumer guidance entries.
 */
export function appliancesCategoryKnowledge(type: AppliancesProductType): AppliancesCategoryKnowledge {
  const plan = plans[type];
  return {
    productType: type,
    publicName: plan.publicName,
    generalCulture: plan.orientation,
    consumerNeedGuidance: informationTopics[type].map((topic) => topic.answer),
    preferenceQuestionKey: plan.questionKey,
    preferenceQuestion: plan.question,
  };
}

export function appliancesOpeningGreeting(type: AppliancesProductType, secretaryHandoff = false): string {
  const knowledge = appliancesCategoryKnowledge(type);
  const orientation = knowledge.generalCulture.replace(/^Tabii\.\s*/u, "");
  const opening = secretaryHandoff
    ? `Merhaba, ${knowledge.publicName} almak istediğini öğrendim.`
    : `Merhaba, ${knowledge.publicName} seçimini birlikte netleştirebiliriz.`;
  return `${opening} ${orientation} Tercihlerini birlikte netleştirelim. ${knowledge.preferenceQuestion}`;
}

export function appliancesInformationAnswer(type: AppliancesProductType, message: string): string {
  const topic = informationTopics[type].find(item => xpyTermsMatch(message, item.terms));
  return topic ? `Tabii. ${topic.answer}` : appliancesAdvisoryPlan(type).advisory.message;
}
