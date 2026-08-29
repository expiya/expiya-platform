export interface EquipmentPublicCopy {
  readonly label: string;
  readonly dailyMeaning: string;
}

const copy = (label: string, dailyMeaning: string): EquipmentPublicCopy => ({ label, dailyMeaning });

/** Public, non-claim-expanding copy for every equipment code in the active catalog. */
export const EQUIPMENT_PUBLIC_COPY: Readonly<Record<string, EquipmentPublicCopy>> = {
  ABS: copy("Kilitlenme önleyici fren sistemi (ABS)", "Sert frenlemede tekerleklerin kilitlenmesini önlemeye ve direksiyon kontrolünü korumaya yardımcı olur."),
  ACC: copy("Adaptif hız sabitleyici (ACC)", "Öndeki araçla ayarlanan takip mesafesini korumak için hızı otomatik olarak azaltıp artırmaya yardımcı olur."),
  ACTIVE_DRIVING_ASSIST: copy("Aktif sürüş desteği", "Uyumlu yol koşullarında hız ve şerit desteğini birlikte sunarak sürücünün iş yükünü azaltmaya yardımcı olabilir."),
  ADAPTIVE_CRUISE_CONTROL: copy("Adaptif hız sabitleyici", "Öndeki araçla ayarlanan takip mesafesini korumak için hızı otomatik olarak azaltıp artırmaya yardımcı olur."),
  AEB: copy("Otonom acil fren desteği (AEB)", "Öndeki araç veya engelle çarpışma riski algılandığında sürücüyü uyarabilir ve frenlemeye destek olabilir."),
  AEBS: copy("Gelişmiş acil fren sistemi (AEBS)", "Olası çarpışma riskinde uyarı ve otomatik fren desteği sağlayabilir."),
  BAS: copy("Fren destek sistemi (BAS)", "Acil fren niyetini algıladığında gereken fren basıncına daha hızlı ulaşmaya yardımcı olur."),
  BLIND_SPOT_WARNING: copy("Kör nokta uyarısı", "Şerit değiştirirken aynalarda zor görülen araçlar için uyarı sağlar."),
  CRUISE_CONTROL: copy("Hız sabitleyici", "Uzun yolda seçilen hızı koruyarak gaz pedalını sürekli kullanma ihtiyacını azaltır; öndeki araçla mesafeyi kendisi ayarlamaz."),
  DAW: copy("Sürücü dikkat uyarısı (DAW)", "Sürüş davranışında dikkat kaybı işaretleri algıladığında mola uyarısı verebilir."),
  DBC: copy("Yokuş iniş desteği (DBC)", "Dik inişlerde düşük hızı korumak için frenleri yönetmeye yardımcı olur."),
  DISTANCE_WARNING: copy("Takip mesafesi uyarısı", "Öndeki araçla mesafe riskli biçimde azaldığında sürücüyü uyarabilir."),
  DRIVER_ATTENTION_WARNING: copy("Sürücü dikkat uyarısı", "Dikkat kaybı işareti algıladığında mola uyarısı verebilir."),
  DRIVER_FATIGUE_DETECTION: copy("Sürücü yorgunluk algılama", "Sürüş örüntülerinden olası yorgunluk belirtileri algıladığında mola önerebilir."),
  DSC: copy("Dinamik denge kontrolü (DSC)", "Kayma eğilimi oluştuğunda fren ve motor müdahalesiyle aracın yönünü korumaya yardımcı olur."),
  EBA: copy("Acil fren desteği (EBA)", "Panik frenlemede fren basıncını destekleyerek durma performansına yardımcı olur."),
  EBD: copy("Elektronik fren gücü dağılımı (EBD)", "Fren kuvvetini tekerlekler arasında yol ve yük koşullarına göre dağıtmaya yardımcı olur."),
  ECALL: copy("Acil çağrı sistemi (eCall)", "Ciddi bir kaza algılandığında acil yardım bağlantısının kurulmasına yardımcı olabilir."),
  ESA: copy("Acil direksiyon desteği (ESA)", "Kaçınma manevrasında direksiyon hareketini destekleyerek aracın dengede kalmasına yardımcı olabilir."),
  ESC: copy("Elektronik denge kontrolü (ESC)", "Kayma eğilimi oluştuğunda seçili tekerleklere fren uygulayarak aracın yönünü korumaya yardımcı olur."),
  ESP: copy("Elektronik denge programı (ESP)", "Virajda veya kaygan zeminde savrulma eğilimini azaltmaya yardımcı olur."),
  ESS: copy("Acil fren sinyali (ESS)", "Sert frenlemede arkadaki sürücüleri hızlı yanıp sönen lambalarla uyarmaya yardımcı olur."),
  FCA: copy("Ön çarpışma önleme desteği (FCA)", "Öndeki araç veya engelle çarpışma riskinde uyarı ve fren desteği sağlayabilir."),
  FORWARD_COLLISION_WARNING: copy("Ön çarpışma uyarısı", "Öndeki araçla kapanma hızı risk oluşturduğunda sürücüyü uyarabilir."),
  FRONT_AIRBAGS: copy("Ön hava yastıkları", "Uygun şiddette önden çarpışmada sürücü ve ön yolcu için ek koruma sağlamaya yardımcı olur."),
  FRONT_REAR_PARK_SENSORS: copy("Ön ve arka park sensörleri", "Dar manevralarda ön ve arka engellere olan mesafeyi sesli veya görsel uyarıyla izlemeyi kolaylaştırır."),
  FRONT_REAR_SIDE_PARK_SENSORS: copy("Ön, arka ve yan park sensörleri", "Dar alanlarda aracın çevresindeki engelleri daha kapsamlı izlemeye yardımcı olur."),
  FRONT_SIDE_CURTAIN_AIRBAGS: copy("Ön, yan ve perde hava yastıkları", "Uygun şiddette önden ve yandan çarpışmalarda yolcu bölmesi için ek koruma sağlamaya yardımcı olur."),
  HAC: copy("Yokuş kalkış desteği (HAC)", "Eğimde kalkış sırasında fren basıncını kısa süre koruyarak geri kaymayı azaltmaya yardımcı olur."),
  HBA: copy("Uzun far asistanı (HBA)", "Karşıdan gelen veya önde giden araç algılandığında uzun ve kısa far arasında otomatik geçiş yapmaya yardımcı olur."),
  HSA: copy("Yokuş kalkış desteği (HSA)", "Eğimde kalkış sırasında aracın geri kaymasını azaltmaya yardımcı olur."),
  ICC: copy("Akıllı hız sabitleyici (ICC)", "Öndeki trafik akışına göre hızı ve takip mesafesini ayarlamaya yardımcı olabilir."),
  INTELLIGENT_SPEED_ASSIST: copy("Akıllı hız desteği", "Algılanan hız sınırı bilgisini sürücüye iletebilir ve hızın ayarlanmasına yardımcı olabilir."),
  ISA: copy("Akıllı hız desteği (ISA)", "Algılanan hız sınırını göstererek veya uyararak uygun hızın korunmasına yardımcı olur."),
  ISLA: copy("Akıllı hız sınırı desteği (ISLA)", "Trafik işaretlerinden algılanan hız sınırını sürücüye bildirir ve hız ayarına yardımcı olabilir."),
  ISOFIX: copy("ISOFIX çocuk koltuğu bağlantısı", "Uyumlu çocuk koltuğunu aracın sabit bağlantı noktalarına doğru ve sağlam biçimde takmayı kolaylaştırır."),
  LEVEL_2_DRIVER_ASSIST: copy("Seviye 2 sürüş desteği", "Belirli koşullarda hız ve direksiyon desteğini birlikte sunabilir; sürücünün sürekli dikkat ve kontrol sorumluluğu devam eder."),
  LFA: copy("Şerit takip asistanı (LFA)", "Yol çizgilerini izleyerek aracın şerit merkezine yakın kalmasına direksiyon desteği sağlayabilir."),
  LKA: copy("Şeritte tutma desteği (LKA)", "Araç istemeden şeritten uzaklaştığında direksiyon desteği veya uyarı sağlayabilir."),
  LTA: copy("Şerit takip desteği (LTA)", "Şerit çizgilerini izleyerek aracın şerit içindeki konumunu korumasına yardımcı olabilir."),
  LVDA: copy("Öndeki araç hareket uyarısı (LVDA)", "Trafikte öndeki araç hareket ettiğinde sürücüyü uyararak gecikmeyi azaltmaya yardımcı olur."),
  MCB: copy("İkincil çarpışma freni (MCB)", "İlk çarpışmanın ardından aracı yavaşlatarak ikinci bir çarpışma riskini azaltmaya yardımcı olabilir."),
  PARK_ASSIST: copy("Park yardım sistemi", "Park manevrasında direksiyon veya çevre algılama desteği sunabilir; kapsamı donanıma göre değişir."),
  PCS: copy("Çarpışma önleme sistemi (PCS)", "Öndeki yol kullanıcılarıyla çarpışma riski algılandığında uyarı ve fren desteği sağlayabilir."),
  PEDESTRIAN_CYCLIST_DETECTION: copy("Yaya ve bisikletli algılama", "Ön taraftaki yaya veya bisikletliyi algılayarak çarpışma uyarısı ve ilgili sistemlerle fren desteği sağlayabilir."),
  PEDESTRIAN_DETECTION: copy("Yaya algılama", "Ön taraftaki yayayı algılayarak sürücüyü uyarabilir ve ilgili sistemlerle fren desteği sağlayabilir."),
  REAR_CAMERA: copy("Geri görüş kamerası", "Geri manevrada aracın arkasını ekrandan görmeyi kolaylaştırır; çevreyi doğrudan kontrol etme gereğini ortadan kaldırmaz."),
  REAR_CROSS_TRAFFIC_WARNING: copy("Arka çapraz trafik uyarısı", "Park yerinden geri çıkarken yandan yaklaşan araçlar için uyarı sağlayabilir."),
  SIDE_CURTAIN_AIRBAGS: copy("Yan ve perde hava yastıkları", "Uygun şiddette yandan çarpışmada yolcular için ek baş ve gövde koruması sağlamaya yardımcı olur."),
  SURROUND_VIEW_CAMERA: copy("360 derece çevre görüş kamerası", "Park sırasında aracın çevresini birleştirilmiş kamera görünümüyle izlemeye yardımcı olur."),
  TCS: copy("Çekiş kontrol sistemi (TCS)", "Kaygan zeminde patinajı azaltarak çekişin korunmasına yardımcı olur."),
  TPMS: copy("Lastik basıncı izleme sistemi (TPMS)", "Lastik basıncı belirlenen seviyenin altına düştüğünde sürücüyü uyararak güvenlik ve tüketim takibine yardımcı olur."),
  TPWS: copy("Lastik basıncı uyarı sistemi (TPWS)", "Lastik basıncında belirgin düşüş algılandığında sürücüyü uyarır."),
  TRAFFIC_SIGN_RECOGNITION: copy("Trafik işareti tanıma", "Algılanan hız sınırı ve bazı yol işaretlerini gösterge ekranında görmeyi kolaylaştırır."),
  TSS3: copy("Toyota Safety Sense 3 sürüş destek paketi", "Birden fazla çarpışma önleme ve sürüş destek işlevini paket halinde sunar; exact kapsam donanım listesine göre değerlendirilmelidir."),
  VSC: copy("Araç denge kontrolü (VSC)", "Kayma veya savrulma eğiliminde aracın izlenen yönde kalmasına yardımcı olur."),
  VSM: copy("Araç denge yönetimi (VSM)", "Fren ve direksiyon desteklerini birlikte yöneterek ani manevralarda dengeyi korumaya yardımcı olabilir."),
};

export function getEquipmentPublicCopy(code: string): EquipmentPublicCopy | undefined {
  return EQUIPMENT_PUBLIC_COPY[code];
}
