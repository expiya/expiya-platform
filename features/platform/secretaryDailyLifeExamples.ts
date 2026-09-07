import type { ActiveAppliancesCategoryId } from "@/features/appliances/categoryRegistry";
import type { ElectronicsCategoryId } from "@/features/electronics/architectureBaseline";

export type SecretaryDailyLifeSignal = "PURPOSE" | "CONTEXT" | "OUTCOME";
export type ActiveSecretaryCategoryKey =
  | `APPLIANCES:${ActiveAppliancesCategoryId}`
  | `ELECTRONICS:${ElectronicsCategoryId}`
  | "TOOLS:CORDLESS_DRILL"
  | "CARS:NEW_CAR"
  | "BABY_AND_CHILD:STROLLER"
  | "MOBILITY:ELECTRIC_SCOOTER"
  | "MOBILITY:ELECTRIC_BICYCLE"
  | "MOBILITY:BICYCLE";

export interface SecretaryDailyLifeExample {
  readonly key: string;
  readonly text: string;
  readonly signals: readonly [SecretaryDailyLifeSignal, SecretaryDailyLifeSignal, ...SecretaryDailyLifeSignal[]];
}

export type SecretaryDailyLifeExampleSet = readonly [
  SecretaryDailyLifeExample,
  SecretaryDailyLifeExample,
  SecretaryDailyLifeExample,
];

const example = (
  key: string,
  text: string,
  signals: SecretaryDailyLifeExample["signals"],
): SecretaryDailyLifeExample => Object.freeze({ key, text, signals: Object.freeze(signals) });

const set = (
  first: SecretaryDailyLifeExample,
  second: SecretaryDailyLifeExample,
  third: SecretaryDailyLifeExample,
): SecretaryDailyLifeExampleSet => Object.freeze([first, second, third]);

const pc = ["PURPOSE", "CONTEXT"] as const;
const po = ["PURPOSE", "OUTCOME"] as const;
const co = ["CONTEXT", "OUTCOME"] as const;
const pco = ["PURPOSE", "CONTEXT", "OUTCOME"] as const;

export const SECRETARY_DAILY_LIFE_EXAMPLES = Object.freeze({
  "TOOLS:CORDLESS_DRILL": set(
    example("drill-shelf-shared-battery", "Evde duvara raf asarken zorlanmayacağım, bataryası diğer aletlerimle uyumlu bir akülü matkap arıyorum.", pco),
    example("drill-furniture-compact", "Mobilya kurarken dar köşelere rahat ulaşabileceğim, elde ağır gelmeyen bir akülü matkap arıyorum.", pco),
    example("drill-weekend-ready", "Hafta sonu küçük ev işlerinde kullanıp iş bitince kolayca kaldırabileceğim bir akülü matkap arıyorum.", pco),
  ),
  "CARS:NEW_CAR": set(
    example("car-family-luggage", "Ailece uzun yola çıkarken iki büyük bavulu birlikte taşıyabileceğimiz, şehir içinde de rahat kullanacağımız sıfır bir otomobil arıyorum.", pco),
    example("car-city-parking", "Her gün işe gidip gelirken dar sokaklarda ve park yerlerinde beni yormayacak sıfır bir otomobil arıyorum.", pco),
    example("car-weekend-camping", "Hafta içi şehirde, hafta sonu kamp yolunda kullanabileceğim ve eşyalarımıza yer açan sıfır bir otomobil arıyorum.", pco),
  ),
  "BABY_AND_CHILD:STROLLER": set(
    example("stroller-stairs-one-hand", "Merdivende sık taşıyacağım ve tek elle kolayca katlayabileceğim bir bebek arabası arıyorum.", pco),
    example("stroller-narrow-lift", "Apartmanın dar asansörüne sığacak, günlük yürüyüşlerde rahat ilerletebileceğim bir bebek arabası arıyorum.", pco),
    example("stroller-travel-trunk", "Seyahatte az yer kaplayacak biçimde katlayıp bebeğim uyurken fazla uğraşmadan kullanabileceğim bir bebek arabası arıyorum.", pco),
  ),
  "MOBILITY:ELECTRIC_SCOOTER": set(
    example("escooter-short-commute", "Evle metro arasındaki kısa yolu terlemeden geçip işe vardığımda kolayca katlayabileceğim bir elektrikli scooter arıyorum.", pco),
    example("escooter-apartment-carry", "Apartman merdiveninde taşıyabileceğim, mahalledeki günlük işlerimi pratikleştiren bir elektrikli scooter arıyorum.", pco),
    example("escooter-mixed-transit", "Toplu taşımayla birlikte kullanıp gün içinde yeniden prize ihtiyaç duymadan kısa mesafeleri tamamlayabileceğim bir elektrikli scooter arıyorum.", pco),
  ),
  "MOBILITY:ELECTRIC_BICYCLE": set(
    example("ebike-hilly-commute", "Yokuşlu işe gidiş yolunda çok yorulmadan ilerleyip eve dönebileceğim bir elektrikli bisiklet arıyorum.", pco),
    example("ebike-weekly-errands", "Haftalık alışverişte çantalarımı taşıyabileceğim, yoğun trafikte kısa işleri kolaylaştıracak bir elektrikli bisiklet arıyorum.", pco),
    example("ebike-long-leisure", "Hafta sonu uzun gezilerde eşime yetişmemi kolaylaştıracak, sürüşü doğal hissettiren bir elektrikli bisiklet arıyorum.", pco),
  ),
  "MOBILITY:BICYCLE": set(
    example("bike-city-commute", "Şehir içinde işe gidip gelirken dik oturabileceğim ve günlük bakımını kolay yapabileceğim bir bisiklet arıyorum.", pco),
    example("bike-weekend-trail", "Hafta sonu toprak yollarda gezip hafta içi mahallede de kullanabileceğim bir bisiklet arıyorum.", pc),
    example("bike-small-home", "Küçük evimde fazla yer kaplamadan saklayabileceğim, kısa şehir yolculuklarında kullanacağım bir bisiklet arıyorum.", pco),
  ),

  "APPLIANCES:WASHING_MACHINE": set(
    example("washer-family-weekly", "Kalabalık ailemin haftalık çamaşırını birkaç yıkamada bitirip akşamı makine bekleyerek geçirmeyeceğim bir çamaşır makinesi arıyorum.", pco),
    example("washer-small-flat-quiet", "Küçük evimde gece çalışırken fazla rahatsız etmeyecek, günlük kıyafetleri düzenli yıkayacağım bir çamaşır makinesi arıyorum.", pco),
    example("washer-sports-clothes", "Sık kullandığım spor kıyafetlerini biriktirmeden yıkayıp ertesi güne hazırlayabileceğim bir çamaşır makinesi arıyorum.", pco),
  ),
  "APPLIANCES:REFRIGERATOR": set(
    example("fridge-narrow-kitchen", "Haftalık alışverişimizi düzenli saklayabileceğimiz, dar mutfakta kapısı rahat açılan bir buzdolabı arıyorum.", pco),
    example("fridge-meal-prep", "Hafta başında hazırladığım yemek kaplarını kolayca yerleştirip aradığımı hemen bulabileceğim bir buzdolabı arıyorum.", pco),
    example("fridge-family-produce", "Çocuklu evimizde sebze, kahvaltılık ve büyük kapları birbirine karıştırmadan saklayabileceğimiz bir buzdolabı arıyorum.", pco),
  ),
  "APPLIANCES:DISHWASHER": set(
    example("dishwasher-family-dinner", "Ailece yediğimiz akşam yemeklerinden kalan bulaşıkları tek seferde toparlayıp mutfağı çabuk düzenleyeceğim bir bulaşık makinesi arıyorum.", pco),
    example("dishwasher-open-kitchen", "Açık mutfaklı evimde sohbeti bölmeden çalışacak ve günlük bulaşığı biriktirmeyecek bir bulaşık makinesi arıyorum.", pco),
    example("dishwasher-pots-glasses", "Hem büyük tencereleri hem bardakları yerleştirirken raflarını kolayca düzenleyebileceğim bir bulaşık makinesi arıyorum.", pco),
  ),
  "APPLIANCES:DRYER": set(
    example("dryer-winter-family", "Kışın evde çamaşır sermeden çocukların kıyafetlerini ertesi güne hazırlayabileceğim bir kurutma makinesi arıyorum.", pco),
    example("dryer-small-balcony", "Balkonu dar evimde çamaşır askısını ortadan kaldırıp günlük yükleri nazikçe kurutacak bir kurutma makinesi arıyorum.", pco),
    example("dryer-bedding", "Nevresim ve havluları evin içine nem yaymadan düzenli kurutabileceğim bir kurutma makinesi arıyorum.", pco),
  ),
  "APPLIANCES:VACUUM": set(
    example("vacuum-rugs-pet", "Halılarla koltuktaki evcil hayvan tüylerini aynı temizlikte toparlayabileceğim kablolu torbasız bir süpürge arıyorum.", pco),
    example("vacuum-long-session", "Büyük evimi temizlerken sık sık durmadan kullanabileceğim, haznesini kolay boşaltacağım kablolu bir süpürge arıyorum.", pco),
    example("vacuum-allergy-dust", "Tozu boşaltırken etrafa fazla yaymadan günlük temizliği bitirebileceğim torbasız bir elektrikli süpürge arıyorum.", co),
  ),
  "APPLIANCES:ROBOT_VACUUM": set(
    example("robot-vacuum-pet-daily", "Evcil hayvanımın her gün dökülen tüylerini ben işteyken toparlayacak bir robot süpürge arıyorum.", pco),
    example("robot-vacuum-thresholds", "Odalar arasında küçük eşikler olan evimde takılmadan dolaşıp günlük tozu azaltacak bir robot süpürge arıyorum.", pco),
    example("robot-vacuum-clutter", "Mobilyası yoğun evimde temizlik alanlarını düzenleyip istemediğim bölgelere girmeyecek bir robot süpürge arıyorum.", pco),
  ),
  "APPLIANCES:FREEZER": set(
    example("freezer-batch-cooking", "Hafta sonu hazırladığım yemekleri porsiyonlayıp ay boyunca düzenli saklayabileceğim bir derin dondurucu arıyorum.", pco),
    example("freezer-seasonal-produce", "Mevsim sebzelerini ve ailece aldığımız eti birbirine karıştırmadan saklayabileceğimiz bir derin dondurucu arıyorum.", pco),
    example("freezer-storage-room", "Kilerimdeki dar alana yerleşecek, aradığım paketi kolayca bulacağım bir derin dondurucu arıyorum.", co),
  ),
  "APPLIANCES:BUILT_IN_OVEN": set(
    example("built-in-oven-bread", "Evde ekmek ve hamur işi pişirirken tepsinin her tarafında dengeli sonuç alabileceğim bir ankastre fırın arıyorum.", pco),
    example("built-in-oven-family-meals", "Kalabalık aile yemeklerinde birden fazla tepsiyi rahatça hazırlayıp sonrasında kolay temizleyeceğim bir ankastre fırın arıyorum.", pco),
    example("built-in-oven-small-kitchen", "Mutfak dolaplarıma uyacak, günlük yemekleri uğraştırmadan pişireceğim bir ankastre fırın arıyorum.", pco),
  ),
  "APPLIANCES:FREESTANDING_COOKER": set(
    example("cooker-rental-home", "Kiralık evimde ayrı tezgâh işi çıkarmadan günlük yemekleri hazırlayabileceğim bir solo fırın arıyorum.", pco),
    example("cooker-family-trays", "Günlük tencere yemeklerini ve hafta sonu büyük tepsileri aynı cihazla hazırlayabileceğim bir fırınlı ocak arıyorum.", pco),
    example("cooker-easy-clean", "Sık yemek yaptığım mutfakta dökülenleri kolay temizleyip tepsileri rahat kullanabileceğim bir solo fırın arıyorum.", pco),
  ),
  "APPLIANCES:HOB": set(
    example("hob-busy-family", "Akşam yemeğinde birkaç tencereyi aynı anda kullanıp mutfağı geciktirmeden toparlayabileceğim bir ankastre ocak arıyorum.", pco),
    example("hob-small-counter", "Tezgâh alanım sınırlıyken günlük yemekleri rahat pişirebileceğim bir ankastre ocak arıyorum.", pc),
    example("hob-easy-wipe", "Her gün yemek yaptığım için taşan yemeği kolay silip temiz tutabileceğim bir ankastre ocak arıyorum.", co),
  ),
  "APPLIANCES:RANGE_HOOD": set(
    example("hood-open-kitchen", "Açık mutfakta yemek kokusunun salona yayılmasını azaltacak bir davlumbaz arıyorum.", co),
    example("hood-small-kitchen", "Küçük mutfağımda başıma değmeden çalışacak ve yemek buharını toparlayacak bir aspiratör arıyorum.", pco),
    example("hood-evening-quiet", "Akşam yemek yaparken konuşmaları bastırmadan kullanabileceğim bir davlumbaz arıyorum.", pc),
  ),
  "APPLIANCES:COUNTERTOP_MICROWAVE_OVEN": set(
    example("counter-microwave-leftovers", "İşten gelince kalan yemeği kısa sürede ısıtıp kolay temizleyebileceğim tezgâh üstü bir mikrodalga fırın arıyorum.", pco),
    example("counter-microwave-small-space", "Dar tezgahıma sığacak, tek kişilik öğünleri pratikçe hazırlayacağım bir tezgah üstü mikrodalga arıyorum.", pco),
    example("counter-microwave-family", "Çocukların öğünlerini bekletmeden ısıtabileceğimiz, kullanımı anlaşılır bir mikrodalga fırın arıyorum.", pco),
  ),
  "APPLIANCES:BUILT_IN_MICROWAVE_OVEN": set(
    example("built-in-microwave-unified", "Yeni mutfağımda dolaplarla bütün duracak, günlük ısıtma işini hızlandıracak bir ankastre mikrodalga arıyorum.", pco),
    example("built-in-microwave-family", "Yoğun akşamlarda porsiyonları sırayla kolayca ısıtabileceğimiz bir ankastre mikrodalga arıyorum.", po),
    example("built-in-microwave-counter-free", "Tezgâhı boş bırakıp küçük mutfakta yer kazanacağım bir ankastre mikrodalga arıyorum.", co),
  ),
  "APPLIANCES:AIR_PURIFIER": set(
    example("air-purifier-pet-room", "Evcil hayvanın bulunduğu salonda havadaki tüy ve kokuyu azaltmaya yardımcı olacak bir hava temizleyici arıyorum.", co),
    example("air-purifier-bedroom-quiet", "Yatak odasında gece uykumu bölmeden çalışabilecek bir hava temizleyici arıyorum.", pc),
    example("air-purifier-city-dust", "Yoğun trafikli caddede yaşadığım için odadaki tozu yönetmeme yardımcı olacak bir hava temizleyici arıyorum.", co),
  ),
  "APPLIANCES:FULLY_AUTOMATIC_ESPRESSO_MACHINE": set(
    example("auto-espresso-morning", "Sabah acelem varken çekirdekten kahveyi tek dokunuşla hazırlayıp kolay temizleyeceğim bir tam otomatik espresso makinesi arıyorum.", pco),
    example("auto-espresso-household", "Evde herkesin farklı sütlü kahvesini fazla uğraşmadan hazırlayabileceği bir tam otomatik kahve makinesi arıyorum.", pco),
    example("auto-espresso-workday", "Gün içinde birkaç kahve hazırlarken her fincanda ayrı ayar yapmamı gerektirmeyecek bir tam otomatik espresso makinesi arıyorum.", pco),
  ),
  "APPLIANCES:MANUAL_ESPRESSO_MACHINE": set(
    example("manual-espresso-learning", "Kahve hazırlamayı öğrenirken öğütüm ve süt köpürtme sürecini kendim yönetebileceğim manuel bir espresso makinesi arıyorum.", pc),
    example("manual-espresso-weekend", "Hafta sonu espresso hazırlama ritüelini yaşayacağım, tezgâhımda fazla yer kaplamayan manuel bir espresso makinesi arıyorum.", pc),
    example("manual-espresso-milk-drinks", "Evde sütlü kahveleri kendi kıvamıma göre hazırlayıp pratikçe temizleyebileceğim manuel bir espresso makinesi arıyorum.", pco),
  ),
  "APPLIANCES:FILTER_COFFEE_MACHINE": set(
    example("filter-coffee-morning-pot", "Sabah evde birkaç kupa kahveyi birlikte hazırlayıp sıcak tutabileceğim bir filtre kahve makinesi arıyorum.", pco),
    example("filter-coffee-timer", "İşe hazırlanırken kahvenin beni beklemesini sağlayacak, kullanımı kolay bir filtre kahve makinesi arıyorum.", co),
    example("filter-coffee-small-kitchen", "Dar mutfak tezgâhına sığacak ve iki kişilik kahveyi uğraştırmadan hazırlayacak bir filtre kahve makinesi arıyorum.", pco),
  ),
  "APPLIANCES:TURKISH_COFFEE_MACHINE": set(
    example("turkish-coffee-guests", "Misafir geldiğinde birkaç fincanı taşırmadan peş peşe hazırlayabileceğim bir Türk kahvesi makinesi arıyorum.", pco),
    example("turkish-coffee-morning", "Sabah tek fincanı başında beklemeden hazırlayıp kolay temizleyeceğim bir Türk kahvesi makinesi arıyorum.", pco),
    example("turkish-coffee-small-counter", "Küçük tezgâhımda az yer kaplayıp iki kişilik kahveyi pratikçe yapacak bir Türk kahvesi makinesi arıyorum.", pco),
  ),
  "APPLIANCES:AIR_FRYER": set(
    example("airfryer-weeknight", "İş çıkışı iki kişilik akşam yemeğini fazla bulaşık çıkarmadan hızlıca hazırlayabileceğim bir airfryer arıyorum.", pco),
    example("airfryer-family-basket", "Ailece yiyeceğimiz patates ve sebzeleri birkaç turla uğraşmadan hazırlayabileceğim bir sıcak hava fritözü arıyorum.", pco),
    example("airfryer-easy-clean", "Hafta içinde sık kullanıp sepetini bulaşık sonrası kolayca temizleyebileceğim bir airfryer arıyorum.", pco),
  ),
  "APPLIANCES:BLENDER": set(
    example("blender-morning-smoothie", "Sabah tek kişilik içeceğimi hızlı hazırlayıp parçalarını kolay yıkayabileceğim bir blender arıyorum.", pco),
    example("blender-soup", "Sıcak çorbayı pürüzsüz hale getirirken mutfağa sıçratmadan kullanabileceğim bir blender arıyorum.", pco),
    example("blender-small-counter", "Dar tezgâhımda yer kaplamadan sos ve içecek hazırlayacağım bir blender arıyorum.", pc),
  ),
  "APPLIANCES:FOOD_PROCESSOR": set(
    example("processor-meal-prep", "Haftalık yemek hazırlığında doğrama ve rendeleme işini kısaltıp parçalarını kolay temizleyeceğim bir mutfak robotu arıyorum.", pco),
    example("processor-family-cooking", "Kalabalık aile yemeklerinde sebzeleri tek tek uğraşmadan hazırlayabileceğim bir mutfak robotu arıyorum.", pco),
    example("processor-small-storage", "Dolabımda düzenli saklayabileceğim, hamur ve doğrama işlerinde kullanacağım bir mutfak robotu arıyorum.", pc),
  ),
  "APPLIANCES:ELECTRIC_STORAGE_WATER_HEATER": set(
    example("water-heater-family-shower", "Ailece peş peşe duş aldığımız akşamlarda sıcak suyu planlı kullanabileceğimiz bir termosifon arıyorum.", pco),
    example("water-heater-small-bathroom", "Küçük banyoma uygun yere kurulacak ve günlük sıcak su ihtiyacımızı karşılayacak elektrikli bir termosifon arıyorum.", pco),
    example("water-heater-schedule", "Sıcak suyu kullandığımız saatlere göre çalıştırıp gereksiz beklemeyi azaltabileceğimiz bir termosifon arıyorum.", pco),
  ),
  "APPLIANCES:INSTANTANEOUS_ELECTRIC_WATER_HEATER": set(
    example("instant-heater-guest-bath", "Nadiren kullanılan misafir banyosunda depolama yapmadan ihtiyaç olduğunda sıcak su sağlayacak elektrikli bir şofben arıyorum.", pco),
    example("instant-heater-small-space", "Dar alana kurulup lavaboda beklemeden sıcak su kullanmamı kolaylaştıracak elektrikli bir şofben arıyorum.", co),
    example("instant-heater-single-home", "Tek yaşadığım evde yalnız kullandığım anda suyu ısıtacak, kullanımı anlaşılır bir elektrikli şofben arıyorum.", pco),
  ),
  "APPLIANCES:SPLIT_AIR_CONDITIONER": set(
    example("ac-bedroom-quiet", "Yatak odasını gece uykumu bölmeden serinletecek bir split klima arıyorum.", pco),
    example("ac-sunny-living-room", "Öğleden sonra çok güneş alan salonu dengeli serinletip oturma alanını rahat ettirecek bir klima arıyorum.", pco),
    example("ac-home-office", "Evden çalıştığım odada gün boyu rahatsız edici hava akımı oluşturmadan serinlik sağlayacak bir split klima arıyorum.", pco),
  ),

  "ELECTRONICS:SMARTPHONE": set(
    example("phone-moving-child", "Çocuğumun hareketli anlarını uzaktan da net çekebileceğim bir akıllı telefon arıyorum.", pco),
    example("phone-long-workday", "Yoğun iş gününde mesajlaşma, harita ve görüşmeleri akşama kadar sürdürebileceğim bir telefon arıyorum.", pco),
    example("phone-one-hand-travel", "Seyahatte tek elle rahat kullanıp fotoğraflarımı düzenli saklayabileceğim bir cep telefonu arıyorum.", pco),
  ),
  "ELECTRONICS:LAPTOP": set(
    example("laptop-office-carry", "Her gün yanımda taşıyabileceğim, aynı anda çok sayıda ofis uygulamasında zorlanmayacak bir dizüstü bilgisayar arıyorum.", pco),
    example("laptop-student-library", "Kütüphanede ders çalışırken uzun süre prize ihtiyaç duymadan not alıp araştırma yapabileceğim bir laptop arıyorum.", pco),
    example("laptop-creative-home", "Evde fotoğraf düzenlerken akıcı çalışacak, iş bitince kolayca kaldırabileceğim bir dizüstü bilgisayar arıyorum.", pco),
  ),
  "ELECTRONICS:TABLET": set(
    example("tablet-travel-reading", "Uzun yolculuklarda kitap okuyup film izlerken çantamı ağırlaştırmayacak bir tablet arıyorum.", pco),
    example("tablet-family-video", "Evde görüntülü görüşme ve çocukların eğitim uygulamaları arasında rahatça geçebileceğimiz bir tablet arıyorum.", pco),
    example("tablet-handwritten-notes", "Toplantıda el yazısıyla not alıp sonrasında bilgisayarıma kolay aktarabileceğim bir tablet arıyorum.", pco),
  ),
  "ELECTRONICS:MONITOR": set(
    example("monitor-home-office", "Evden çalışırken iki belgeyi yan yana rahat okuyup gün sonunda gözümü daha az yoracak bir monitör arıyorum.", pco),
    example("monitor-photo-hobby", "Hobi olarak fotoğraf düzenlerken renkleri tutarlı görebileceğim, masama sığan bir monitör arıyorum.", pco),
    example("monitor-work-game", "Gündüz ofis işinde yazıları net okuyup akşam oyunlarda akıcı görüntü alabileceğim bir monitör arıyorum.", pco),
  ),
  "ELECTRONICS:TELEVISION": set(
    example("tv-bright-room-family", "Güneş alan salonda ailece dizi izlerken herkesin rahat görebileceği bir televizyon arıyorum.", pco),
    example("tv-small-living-room", "Küçük oturma odasında çok yakından izlerken görüntüsü rahatsız etmeyecek bir televizyon arıyorum.", pc),
    example("tv-sports-movies", "Hafta sonu maçları ve akşam filmlerini akıcı izleyip uygulamalar arasında kolay geçeceğimiz bir televizyon arıyorum.", pco),
  ),
  "ELECTRONICS:E_READER": set(
    example("ereader-commute", "Toplu taşımada tek elle tutup uzun süre gözümü yormadan okuyabileceğim bir e-kitap okuyucu arıyorum.", pco),
    example("ereader-holiday", "Tatilde birkaç kitabı çantada taşımadan sahilde de rahat okuyabileceğim bir elektronik kitap okuyucu arıyorum.", pco),
    example("ereader-night", "Gece eşimi rahatsız etmeden okuyup kaldığım yeri kolayca sürdürebileceğim bir e-kitap okuyucu arıyorum.", pco),
  ),
  "ELECTRONICS:HEADPHONES": set(
    example("headphones-commute-noise", "Toplu taşımada dış gürültüyü azaltıp müziğimi rahat dinleyebileceğim bir kulaklık arıyorum.", pco),
    example("headphones-video-calls", "Uzun görüntülü toplantılarda kulağımı sıkmadan sesimi anlaşılır iletecek bir kulaklık arıyorum.", pco),
    example("headphones-home-evening", "Akşam evdekileri rahatsız etmeden film izleyip koltukta rahat kullanabileceğim bir kulaklık arıyorum.", pco),
  ),
  "ELECTRONICS:PORTABLE_SPEAKER": set(
    example("speaker-picnic", "Piknikte çantada kolay taşıyıp arkadaş grubuna yetecek ses verecek bir taşınabilir hoparlör arıyorum.", pco),
    example("speaker-balcony", "Balkonda ve mutfakta oda değiştirirken yanımda götürebileceğim bir bluetooth hoparlör arıyorum.", pc),
    example("speaker-weekend-trip", "Hafta sonu gezisinde kısa sürede şarj edip gün içinde yeniden prize ihtiyaç duymayacağım bir taşınabilir hoparlör arıyorum.", pco),
  ),
  "ELECTRONICS:SOUNDBAR": set(
    example("soundbar-dialogue", "Dizi ve filmlerde konuşmaları sesi çok açmadan daha rahat anlayabileceğim bir soundbar arıyorum.", pco),
    example("soundbar-small-room", "Küçük salonda kablo kalabalığı oluşturmadan film sesini iyileştirecek bir soundbar arıyorum.", pco),
    example("soundbar-late-movie", "Gece film izlerken diyalogları net duyup evdekileri daha az rahatsız edeceğim bir televizyon ses sistemi arıyorum.", pco),
  ),
  "ELECTRONICS:DIGITAL_CAMERA": set(
    example("camera-moving-family", "Çocukların hareketli anlarını içeride ve dışarıda kolay takip edip net çekebileceğim bir dijital fotoğraf makinesi arıyorum.", pco),
    example("camera-travel-light", "Seyahatte boynumu yormadan taşıyıp manzara ve sokak fotoğrafları çekebileceğim bir fotoğraf makinesi arıyorum.", pco),
    example("camera-video-hobby", "Hobi videolarımda kendimi rahat kadraja alıp sonrasında düzenleyebileceğim bir dijital fotoğraf makinesi arıyorum.", pco),
  ),
  "ELECTRONICS:PROJECTOR": set(
    example("projector-living-room", "Akşam salon duvarında film izleyip kullanmadığımda ortadan kaldırabileceğim bir projektör arıyorum.", pco),
    example("projector-small-room", "Kısa mesafeden duvara yeterli büyüklükte görüntü verecek, küçük odaya uygun bir projeksiyon cihazı arıyorum.", co),
    example("projector-presentations", "Farklı toplantı odalarına taşıyıp sunumu hızlıca başlatabileceğim bir projektör arıyorum.", pco),
  ),
  "ELECTRONICS:GAME_CONSOLE": set(
    example("console-family-room", "Salonda ailece oynayabileceğimiz, kurulumu ve oyunlara geçişi kolay bir oyun konsolu arıyorum.", pco),
    example("console-weekend-friends", "Hafta sonu arkadaşlarla aynı ekranda oyun oynayıp eğlenebileceğimiz bir oyun konsolu arıyorum.", pc),
    example("console-small-library", "Oyunları silip yeniden indirmekle sık uğraşmadan kullanabileceğim bir oyun konsolu arıyorum.", po),
  ),
  "ELECTRONICS:WIFI_ROUTER_MESH": set(
    example("wifi-mesh-multifloor", "İki katlı evde odalar arasında gezerken bağlantının kopmasını azaltacak bir mesh sistemi arıyorum.", co),
    example("wifi-router-home-office", "Evden çalışırken görüntülü görüşme ile diğer cihazları birlikte taşıyabilecek bir wifi router arıyorum.", pco),
    example("wifi-mesh-thick-walls", "Kalın duvarlı evimde uzak odalara da dengeli bağlantı ulaştıracak bir mesh sistemi arıyorum.", co),
  ),
  "ELECTRONICS:NETWORK_ATTACHED_STORAGE": set(
    example("nas-family-photos", "Aile fotoğraflarını tek yerde saklayıp evdeki farklı cihazlardan ulaşabileceğimiz bir NAS cihazı arıyorum.", pco),
    example("nas-home-office-backup", "Evden çalışırken dosyalarımı düzenli yedekleyip cihaz arızasında kaybı azaltacak bir ağ depolama çözümü arıyorum.", pco),
    example("nas-media-library", "Film ve müzik arşivimi evde paylaşırken sonradan alan ekleyebileceğim bir NAS cihazı arıyorum.", pco),
  ),
  "ELECTRONICS:EXTERNAL_STORAGE": set(
    example("external-drive-photo-backup", "Aile fotoğraflarını düzenli yedekleyip çekmecede saklayabileceğim bir harici disk arıyorum.", pco),
    example("external-storage-travel", "Seyahatte video dosyalarımı çantada güvenle taşıyıp çalışma cihazıma hızlı aktarabileceğim bir harici depolama arıyorum.", pco),
    example("external-drive-console", "Oyunlarım için yer açarken kurulumları tekrar indirme ihtiyacını azaltacak bir harici disk arıyorum.", pco),
  ),
  "ELECTRONICS:PRINTER": set(
    example("printer-homework", "Çocukların ödevlerini evde gerektiğinde renkli çıkarıp kurulumla uğraşmayacağımız bir yazıcı arıyorum.", pco),
    example("printer-home-office", "Ev ofisimde çok sayfalı belgeleri iki taraflı basıp kâğıt işini hızlandıracak bir yazıcı arıyorum.", pco),
    example("printer-occasional-use", "Ayda birkaç kez çıktı aldığım için uzun aralarda sorun çıkarmadan kullanabileceğim bir yazıcı arıyorum.", pc),
  ),
  "ELECTRONICS:WEBCAM": set(
    example("webcam-low-light", "Akşam loş odada görüntülü toplantıya katılırken yüzümü anlaşılır gösterecek bir web kamera arıyorum.", pco),
    example("webcam-shared-desk", "Ortak çalışma masasında kadrajı kolay ayarlayıp görüşme bitince kaldırabileceğim bir webcam arıyorum.", pco),
    example("webcam-online-lessons", "Çevrim içi ders anlatırken hem tahtayı hem beni uygun kadraja alabilecek bir web kamera arıyorum.", pco),
  ),
  "ELECTRONICS:COMPUTER_AUDIO": set(
    example("desktop-speaker-small-desk", "Küçük çalışma masamda fazla yer kaplamadan toplantı ve müzik sesini anlaşılır verecek bilgisayar hoparlörü arıyorum.", pco),
    example("desktop-speaker-evening", "Akşam film izlerken komşuları rahatsız etmeden dengeli ses alacağım bir masaüstü hoparlör arıyorum.", pco),
    example("desktop-speaker-easy-switch", "Çalışma ve kişisel cihazlarım arasında kolay geçip kablo karmaşasını azaltacak bir bilgisayar hoparlörü arıyorum.", pco),
  ),
  "ELECTRONICS:SMARTWATCH": set(
    example("smartwatch-notifications", "Toplantıda cebimdeki cihazı çıkarmadan önemli arama ve mesajları görebileceğim bir akıllı saat arıyorum.", pco),
    example("smartwatch-walks", "Günlük yürüyüşlerimi takip edip telefonumla sorunsuz birlikte kullanabileceğim bir akıllı saat arıyorum.", pco),
    example("smartwatch-travel-day", "Seyahat gününde yönlendirmeleri bileğimden görüp sık sık şarj düşünmeyeceğim bir akıllı saat arıyorum.", pco),
  ),
  "ELECTRONICS:FITNESS_TRACKER": set(
    example("tracker-daily-steps", "Günlük adım ve yürüyüş alışkanlığımı sade biçimde takip edip bileğimde hafif taşıyacağım bir aktivite bilekliği arıyorum.", pco),
    example("tracker-sleep-routine", "Uyku düzenim hakkında genel eğilimleri görüp gece rahatsız olmadan takabileceğim bir akıllı bileklik arıyorum.", pco),
    example("tracker-phone-compatible", "Egzersiz kayıtlarını mevcut telefonumda kolayca görebileceğim, kullanımı basit bir aktivite bilekliği arıyorum.", pco),
  ),
  "ELECTRONICS:HOME_SECURITY_CAMERA": set(
    example("security-camera-pet", "Evde değilken evcil hayvanımın bulunduğu odayı kontrol edip yalnız gerekli bildirimleri alacağım bir güvenlik kamerası arıyorum.", pco),
    example("security-camera-entrance", "Apartman dairesinin girişini görecek, kayıtların kimlerle paylaşıldığını yönetebileceğim bir ev kamerası arıyorum.", pco),
    example("security-camera-rental", "Kiralık evde duvara fazla işlem yapmadan kurup taşınırken sökebileceğim bir güvenlik kamerası arıyorum.", pco),
  ),
  "ELECTRONICS:VIDEO_DOORBELL": set(
    example("doorbell-delivery", "Evde yokken kapıya gelen kişiyi görüp ziyaretçiyle uzaktan konuşabileceğim bir görüntülü kapı zili arıyorum.", pco),
    example("doorbell-rental", "Kiralık evimin girişine büyük tesisat değişikliği yapmadan takabileceğim bir görüntülü kapı zili arıyorum.", pc),
    example("doorbell-family-privacy", "Ailece kullanırken bildirimleri paylaşabileceğimiz ve kayıt erişimini yönetebileceğimiz bir görüntülü kapı zili arıyorum.", pco),
  ),
  "ELECTRONICS:SMART_HOME_HUB": set(
    example("smart-hub-mixed-devices", "Evdeki farklı marka ışık ve prizleri tek yerden yönetip günlük rutinler kurabileceğim bir akıllı ev merkezi arıyorum.", pco),
    example("smart-hub-local-control", "İnternet kesildiğinde temel ev komutlarının çalışmaya devam etmesine yardımcı olacak bir akıllı ev merkezi arıyorum.", co),
    example("smart-hub-family-simple", "Ailede herkesin ışık ve perde rutinlerini kolay kullanabileceği bir akıllı ev merkezi arıyorum.", po),
  ),
  "ELECTRONICS:UNINTERRUPTIBLE_POWER_SUPPLY": set(
    example("ups-home-office", "Elektrik kısa süre kesildiğinde işimi kaydetmeye ve çalışma cihazlarımı güvenle kapatmaya zaman verecek bir kesintisiz güç kaynağı arıyorum.", pco),
    example("ups-router-outage", "Kısa kesintilerde modem ve router çalışmaya devam etsin diye uygun bir kesintisiz güç kaynağı arıyorum.", pco),
    example("ups-small-desk", "Çalışma masamda fazla yer kaplamadan temel cihazları ani kesintilere karşı destekleyecek bir UPS arıyorum.", pco),
  ),
} satisfies Record<ActiveSecretaryCategoryKey, SecretaryDailyLifeExampleSet>);

export function validateSecretaryDailyLifeExamples(
  activeCategoryKeys: readonly string[],
  exampleCatalog: Readonly<Record<string, SecretaryDailyLifeExampleSet>> = SECRETARY_DAILY_LIFE_EXAMPLES,
): readonly string[] {
  const issues: string[] = [];
  const active = new Set(activeCategoryKeys);
  const stableKeys = new Set<string>();
  const texts = new Set<string>();
  for (const categoryKey of active) {
    const examples = exampleCatalog[categoryKey];
    if (!examples || examples.length < 2) issues.push(`MISSING_ACTIVE_CATEGORY:${categoryKey}`);
  }
  for (const examples of Object.values(exampleCatalog)) {
    for (const item of examples) {
      if (stableKeys.has(item.key)) issues.push(`DUPLICATE_STABLE_KEY:${item.key}`);
      if (texts.has(item.text)) issues.push(`DUPLICATE_PUBLIC_TEXT:${item.key}`);
      if (new Set(item.signals).size < 2) issues.push(`INSUFFICIENT_DAILY_LIFE_SIGNALS:${item.key}`);
      if (item.text.length > 145) issues.push(`TOO_LONG:${item.key}`);
      if (/\b(?:kesin|her koşulda|ömür boyu|asla)\b/iu.test(item.text)) issues.push(`ABSOLUTE_CLAIM:${item.key}`);
      if (/^[\p{L}\d /&-]{2,45}\s+(?:arıyorum|istiyorum)\.?$/iu.test(item.text)) issues.push(`GENERIC_PRODUCT_REQUEST:${item.key}`);
      if (/[A-Z]{3,}_[A-Z_]+/u.test(item.text)) issues.push(`RAW_CATEGORY_ID:${item.key}`);
      stableKeys.add(item.key);
      texts.add(item.text);
    }
  }
  return Object.freeze(issues);
}
