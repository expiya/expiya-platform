export type CategoryId = "ROBOT_VACUUM" | "SPLIT_AIR_CONDITIONER";

export interface CandidateSeed {
  readonly id: string; readonly brand: string; readonly model: string; readonly segment: string;
  readonly sourceUrl: string; readonly sourceClass: "MANUFACTURER_TURKIYE" | "MANUFACTURER_GLOBAL_APPLICABILITY_BRIDGE";
  readonly exactIdentity: string; readonly facts: Readonly<Record<string, string | number | boolean>>;
}

const robot = (id:string,brand:string,model:string,segment:string,sourceUrl:string,facts:CandidateSeed["facts"],sourceClass:CandidateSeed["sourceClass"]="MANUFACTURER_TURKIYE"):CandidateSeed=>({id,brand,model,segment,sourceUrl,sourceClass,exactIdentity:`${brand} / ${model} / TR-listed configuration`,facts});
export const ROBOT_VACUUM_CANDIDATES: readonly CandidateSeed[] = Object.freeze([
  robot("xiaomi-x20-pro","Xiaomi","Robot Vacuum X20 Pro","FULL_SERVICE_DOCK","https://www.mi.com/tr/product/xiaomi-robot-vacuum-x20-pro/",{dock:"wash/dry/empty",navigation:"LDS",mop:"liftable"}),
  robot("xiaomi-x20-plus","Xiaomi","Robot Vacuum X20+","FULL_SERVICE_DOCK","https://www.mi.com/tr/product/xiaomi-robot-vacuum-x20-plus/",{dock:"wash/dry/empty",navigation:"LDS",mop:"rotary"}),
  robot("xiaomi-s20-plus","Xiaomi","Robot Vacuum S20+","MOP_FOCUSED","https://www.mi.com/tr/product/xiaomi-robot-vacuum-s20-plus/",{dock:"charge",navigation:"LDS",mop:"dual rotary"}),
  robot("xiaomi-s20","Xiaomi","Robot Vacuum S20","VALUE_MAPPING","https://www.mi.com/tr/product/xiaomi-robot-vacuum-s20/",{dock:"charge",navigation:"LDS",mop:"integrated"}),
  robot("xiaomi-h40-ov51","Xiaomi","Robot Vacuum H40 / OV51","AUTO_EMPTY_VALUE","https://www.mi.com/tr/product/xiaomi-robot-vacuum-h40/",{dock:"auto-empty",modelCode:"OV51",mop:"integrated"}),
  robot("xiaomi-x10","Xiaomi","Robot Vacuum X10","AUTO_EMPTY_VALUE","https://www.mi.com/tr/product/xiaomi-robot-vacuum-x10/",{dock:"auto-empty",navigation:"LDS",mop:"integrated"}),
  robot("roborock-qrevo-s","Roborock","Qrevo S","FULL_SERVICE_DOCK","https://tr.roborock.com/pages/roborock-qrevo-s",{dock:"multifunction",mop:"dual spinning",navigation:"LiDAR"}),
  robot("roborock-qrevo-master","Roborock","Qrevo Master","PREMIUM_OBSTACLE","https://tr.roborock.com/pages/roborock-qrevo-master",{dock:"multifunction",obstacle:"reactive AI",mop:"flexiarm"}),
  robot("roborock-s8-maxv-ultra","Roborock","S8 MaxV Ultra","PREMIUM_OBSTACLE","https://tr.roborock.com/pages/roborock-s8-maxv-ultra",{dock:"rockdock ultra",obstacle:"reactive AI 2.0",mop:"vibraRise"}),
  robot("roborock-q8-max-plus","Roborock","Q8 Max+","AUTO_EMPTY_VALUE","https://tr.roborock.com/pages/roborock-q8-max-plus",{dock:"auto-empty",brush:"duoRoller",navigation:"LiDAR"}),
  robot("dreame-x40-ultra","Dreame","X40 Ultra","PREMIUM_OBSTACLE","https://tr.dreametech.com/products/x40-ultra",{dock:"all-in-one",mop:"extendable/liftable",obstacle:"recognition"}),
  robot("dreame-l40-ultra","Dreame","L40 Ultra","FULL_SERVICE_DOCK","https://tr.dreametech.com/products/l40-ultra",{dock:"all-in-one",mop:"extendable/liftable",navigation:"mapping"}),
  robot("dreame-l10s-ultra-gen2","Dreame","L10s Ultra Gen 2","FULL_SERVICE_DOCK","https://tr.dreametech.com/products/l10s-ultra-gen-2",{dock:"all-in-one",mop:"dual rotary",navigation:"mapping"}),
  robot("ecovacs-deebot-t30-pro-omni","Ecovacs","DEEBOT T30 PRO OMNI","FULL_SERVICE_DOCK","https://www.ecovacs.com/tr/deebot-robotic-vacuum-cleaner/deebot-t30-pro-omni",{dock:"OMNI",mop:"TruEdge",navigation:"TrueMapping"},"MANUFACTURER_GLOBAL_APPLICABILITY_BRIDGE"),
  robot("ecovacs-deebot-n20-pro-plus","Ecovacs","DEEBOT N20 PRO PLUS","AUTO_EMPTY_VALUE","https://www.ecovacs.com/tr/deebot-robotic-vacuum-cleaner/deebot-n20-pro-plus",{dock:"auto-empty",mop:"vibrating",navigation:"TrueMapping"},"MANUFACTURER_GLOBAL_APPLICABILITY_BRIDGE"),
  robot("samsung-vr7md96514g-tr","Samsung","VR7MD96514G/TR","PREMIUM_OBSTACLE","https://www.samsung.com/tr/vacuum-cleaners/robot/",{configuration:"VR7MD96514G/TR",dock:"clean station",navigation:"AI object recognition"}),
  robot("bosch-bcrc2w","Bosch","BCRC2W","MOP_FOCUSED","https://www.bosch-home.com.tr/urunler/elektrikli-supurgeler/spotless-robot-supurgeler-ortak-ve-model-bazli-ozellikler",{configuration:"BCRC2W",mop:"wet cleaning",navigation:"mapping"}),
  robot("philips-xu7100-01","Philips","HomeRun 7000 Aqua XU7100/01","PREMIUM_OBSTACLE","https://www.philips.com.tr/c-p/XU7100_01/homerun-7000-series-aqua-islak-ve-kuru-temizleme-robotu",{configuration:"XU7100/01",dock:"auto-empty",mop:"aqua"}),
]);

const ac=(id:string,brand:string,model:string,segment:string,sourceUrl:string,btu:number,sourceClass:CandidateSeed["sourceClass"]="MANUFACTURER_TURKIYE"):CandidateSeed=>({id,brand,model,segment,sourceUrl,sourceClass,exactIdentity:`${brand} / ${model} / Türkiye residential single-split indoor+outdoor package`,facts:{coolingCapacityBtuH:btu,inverter:true,pairIdentity:"indoor+outdoor package; installation scope separately verified at purchase"}});
export const SPLIT_AIR_CONDITIONER_CANDIDATES: readonly CandidateSeed[] = Object.freeze([
  ac("arcelik-09325-a","Arçelik","09325 A","COMPACT_9000","https://www.arcelik.com.tr/9000-btu-klima/09325-a-klima",9000),
  ac("arcelik-12325-a","Arçelik","12325 A","MAINSTREAM_12000","https://www.arcelik.com.tr/12000-btu-klima/12325-a-klima",12000),
  ac("arcelik-15325-s","Arçelik","15325 S","MID_CAPACITY_15000","https://www.arcelik.com.tr/15000-btu-klima/15325-s-klima",15000),
  ac("arcelik-18325-a","Arçelik","18325 A","LARGE_ROOM_18000","https://www.arcelik.com.tr/18000-btu-klima/18325-a-klima",18000),
  ac("arcelik-24325-a","Arçelik","24325 A","EXTRA_LARGE_24000","https://www.arcelik.com.tr/24000-btu-klima/24325-a-klima",24000),
  ac("beko-31225-a","Beko","31225 A","MAINSTREAM_12000","https://www.beko.com.tr/12000-btu-klima/31225-a-klima",12000),
  ac("beko-31825-a","Beko","31825 A","LARGE_ROOM_18000","https://www.beko.com.tr/18000-btu-klima/31825-a-klima",18000),
  ac("beko-32425-a","Beko","32425 A","EXTRA_LARGE_24000","https://www.beko.com.tr/24000-btu-klima/32425-a-klima",24000),
  ac("vestel-flora-doga-092","Vestel","Flora Doğa Inverter 092","COMPACT_9000","https://www.vestel.com.tr/vestel-flora-doga-inverter-092-klima-p-3517",9000),
  ac("vestel-flora-doga-122","Vestel","Flora Doğa Inverter 122","MAINSTREAM_12000","https://www.vestel.com.tr/vestel-flora-doga-inverter-122-klima-p-3518",12000),
  ac("vestel-flora-doga-182","Vestel","Flora Doğa Inverter 182","LARGE_ROOM_18000","https://www.vestel.com.tr/vestel-flora-doga-inverter-182-klima-p-3519",18000),
  ac("samsung-ar60f09c0bw-sk","Samsung","AR60F09C0BW/SK","COMPACT_9000","https://www.samsung.com/tr/air-conditioners/wall-mount/",9000),
  ac("samsung-ar60f12c1kw-sk","Samsung","AR60F12C1KW/SK","MAINSTREAM_12000","https://www.samsung.com/tr/air-conditioners/wall-mount/ar9500t-ar70f12caawneu-ai-fast---comfort-cooling--ai-fast---comfort-cooling--comfort-drying-for-cold-free-dehumidification-ar60f12c1kw-sk/",12000),
  ac("samsung-ar60f18c1kw-sk","Samsung","AR60F18C1KW/SK","LARGE_ROOM_18000","https://www.samsung.com/tr/air-conditioners/wall-mount/",18000),
  ac("lg-pc09sq","LG","PC09SQ","COMPACT_9000","https://www.lg.com/tr/klima/lg-pc09sq",9000),
  ac("lg-pc12sq","LG","PC12SQ","MAINSTREAM_12000","https://www.lg.com/tr/klima/lg-pc12sq",12000),
  ac("bosch-cl2000-26-pair","Bosch","CL2000U W 26 E + CL2000 26 E","COMPACT_9000","https://www.bosch-homecomfort.com/tr/tr/ocs/residential/climate-2000-19312605-p/",9000),
  ac("bosch-cl3000i-35-pair","Bosch","CL3000iU W 35 E + CL3000i 35 E","MAINSTREAM_12000","https://www.bosch-homecomfort.com/tr/tr/ocs/residential/climate-3000i-19312608-p/",12000),
  ac("daikin-ftxf25e-rxf25e","Daikin","FTXF25E + RXF25E Sensira","COMPACT_9000","https://www.daikin.com.tr/urunler/sensira",9000,"MANUFACTURER_GLOBAL_APPLICABILITY_BRIDGE"),
]);
