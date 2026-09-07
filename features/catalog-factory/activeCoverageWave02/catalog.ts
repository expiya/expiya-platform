export type Wave02Category = "REFRIGERATOR" | "WASHING_MACHINE" | "DISHWASHER" | "DRYER" | "TABLET" | "MONITOR" | "SMARTWATCH" | "HEADPHONES";
export type Wave02Seed = { id:string; brand:string; family:string; model:string; exactVariant:string; sku?:string; gtin?:string; segment:string; sourceUrl:string; facts:Readonly<Record<string,string|number|boolean>> };

const s=(id:string,brand:string,family:string,model:string,exactVariant:string,segment:string,sourceUrl:string,facts:Wave02Seed["facts"],sku?:string):Wave02Seed=>({id,brand,family,model,exactVariant,segment,sourceUrl,facts,sku});

export const WAVE02_SEEDS:Readonly<Record<Wave02Category,readonly Wave02Seed[]>>={
 REFRIGERATOR:[
  s("arcelik-270561-eb","Arçelik","270561","270561 EB","270561 EB / TR / alttan donduruculu","BOTTOM_FREEZER","https://www.arcelik.com.tr/buzdolabi/270561-eb-buzdolabi",{layout:"bottom-freezer",cooling:"No Frost"},"270561 EB"),
  s("beko-670561-eb","Beko","670561","670561 EB","670561 EB / TR / alttan donduruculu","BOTTOM_FREEZER","https://www.beko.com.tr/buzdolabi/670561-eb-buzdolabi",{layout:"bottom-freezer",cooling:"No Frost"},"670561 EB"),
  s("bosch-kgn56cwe0n","Bosch","Series 4","KGN56CWE0N","KGN56CWE0N / TR / beyaz","WIDE_BOTTOM_FREEZER","https://www.bosch-home.com.tr/urun-listesi/KGN56CWE0N",{layout:"bottom-freezer",widthClassCm:70},"KGN56CWE0N"),
  s("siemens-kg56nawf0n","Siemens","iQ500","KG56NAWF0N","KG56NAWF0N / TR / beyaz","WIDE_BOTTOM_FREEZER","https://www.siemens-home.bsh-group.com/tr/urun-listesi/KG56NAWF0N",{layout:"bottom-freezer",cooling:"noFrost"},"KG56NAWF0N"),
  s("lg-gc-b569nllm","LG","Bottom Freezer","GC-B569NLLM","GC-B569NLLM / TR / inox","SMART_BOTTOM_FREEZER","https://www.lg.com/tr/buzdolabi/lg-gc-b569nllm",{layout:"bottom-freezer",connectivity:"Wi-Fi"},"GC-B569NLLM"),
  s("samsung-rb50dg601es9tr","Samsung","Bespoke AI","RB50DG601ES9TR","RB50DG601ES9TR / TR / inox","SMART_BOTTOM_FREEZER","https://www.samsung.com/tr/refrigerators/bottom-mount-freezer/rb6000d-spacemax-rb50dg601es9tr/",{layout:"bottom-freezer",connectivity:"SmartThings"},"RB50DG601ES9TR"),
  s("vestel-nf64012-ex","Vestel","NF640","NF64012 EX","NF64012 EX / TR / inox","TOP_FREEZER","https://www.vestel.com.tr/nf64012-ex-buzdolabi",{layout:"top-freezer",cooling:"No Frost"},"NF64012 EX"),
  s("grundig-gkne-5311","Grundig","GKNE","GKNE 5311","GKNE 5311 / TR / kombi","BOTTOM_FREEZER","https://www.grundig.com.tr/buzdolabi/gkne-5311",{layout:"bottom-freezer",cooling:"No Frost"},"GKNE 5311")],
 WASHING_MACHINE:[
  s("arcelik-10140-pm","Arçelik","10140","10140 PM","10140 PM / TR / 10 kg","LARGE_CAPACITY","https://www.arcelik.com.tr/camasir-makinesi/10140-pm",{capacityKg:10,spinRpm:1400},"10140 PM"),
  s("beko-cm-10140-b","Beko","CM","CM 10140 B","CM 10140 B / TR / 10 kg","LARGE_CAPACITY","https://www.beko.com.tr/camasir-makinesi/cm-10140-b",{capacityKg:10,spinRpm:1400},"CM 10140 B"),
  s("bosch-wgb254a0tr","Bosch","Series 8","WGB254A0TR","WGB254A0TR / TR / 10 kg","PREMIUM_AUTODOSE","https://www.bosch-home.com.tr/urun-listesi/WGB254A0TR",{capacityKg:10,spinRpm:1400},"WGB254A0TR"),
  s("siemens-wg54b2a0tr","Siemens","iQ700","WG54B2A0TR","WG54B2A0TR / TR / 10 kg","PREMIUM_AUTODOSE","https://www.siemens-home.bsh-group.com/tr/urun-listesi/WG54B2A0TR",{capacityKg:10,spinRpm:1400},"WG54B2A0TR"),
  s("lg-f4y5erypv","LG","AI DD","F4Y5ERYPV","F4Y5ERYPV / TR / 11 kg","CONNECTED_LARGE","https://www.lg.com/tr/camasir-makinesi/lg-f4y5erypv",{capacityKg:11,connectivity:"Wi-Fi"},"F4Y5ERYPV"),
  s("samsung-ww11db8b95ghah","Samsung","Bespoke AI","WW11DB8B95GHAH","WW11DB8B95GHAH / TR / 11 kg","CONNECTED_LARGE","https://www.samsung.com/tr/washers-and-dryers/washing-machines/ww11db8b95ghah/",{capacityKg:11,connectivity:"SmartThings"},"WW11DB8B95GHAH")],
 DISHWASHER:[
  s("arcelik-6167-i","Arçelik","6167","6167 I","6167 I / TR / inox","FULL_SIZE_3RACK","https://www.arcelik.com.tr/bulasik-makinesi/6167-i",{widthCm:60,rackCount:3},"6167 I"),
  s("beko-bm-6147-wf","Beko","BM","BM 6147 WF","BM 6147 WF / TR / beyaz","CONNECTED_FULL_SIZE","https://www.beko.com.tr/bulasik-makinesi/bm-6147-wf",{widthCm:60,connectivity:"Wi-Fi"},"BM 6147 WF"),
  s("bosch-sms6emi81t","Bosch","Series 6","SMS6EMI81T","SMS6EMI81T / TR / inox","CONNECTED_FULL_SIZE","https://www.bosch-home.com.tr/urun-listesi/SMS6EMI81T",{widthCm:60,connectivity:"Home Connect"},"SMS6EMI81T"),
  s("siemens-sn23ei62mt","Siemens","iQ300","SN23EI62MT","SN23EI62MT / TR / inox","FULL_SIZE_3RACK","https://www.siemens-home.bsh-group.com/tr/urun-listesi/SN23EI62MT",{widthCm:60,rackCount:3},"SN23EI62MT"),
  s("samsung-dw60dg790fsltr","Samsung","Bespoke AI","DW60DG790FSLTR","DW60DG790FSLTR / TR / inox","CONNECTED_FULL_SIZE","https://www.samsung.com/tr/dishwashers/freestanding/dw60dg790fsltr/",{widthCm:60,connectivity:"SmartThings"},"DW60DG790FSLTR"),
  s("vestel-bm-6312-x","Vestel","BM","BM 6312 X","BM 6312 X / TR / inox","FULL_SIZE_3RACK","https://www.vestel.com.tr/bm-6312-x-bulasik-makinesi",{widthCm:60,rackCount:3},"BM 6312 X"),
  s("lg-dfc513fv","LG","QuadWash","DFC513FV","DFC513FV / TR / inox","STEAM_FULL_SIZE","https://www.lg.com/tr/bulasik-makinesi/lg-dfc513fv",{widthCm:60,washSystem:"QuadWash"},"DFC513FV"),
  s("profilo-bm6481ma","Profilo","BM","BM6481MA","BM6481MA / TR / inox","FULL_SIZE_3RACK","https://www.profilo.com/tr/urun-listesi/BM6481MA",{widthCm:60,rackCount:3},"BM6481MA"),
  s("grundig-gpdf-5711","Grundig","GPDF","GPDF 5711","GPDF 5711 / TR / beyaz","VALUE_FULL_SIZE","https://www.grundig.com.tr/bulasik-makinesi/gpdf-5711",{widthCm:60,installation:"freestanding"},"GPDF 5711")],
 DRYER:[
  s("arcelik-910-kmg","Arçelik","910","910 KMG","910 KMG / TR / 9 kg","HEAT_PUMP_9KG","https://www.arcelik.com.tr/kurutma-makinesi/910-kmg",{capacityKg:9,drying:"heat-pump"},"910 KMG"),
  s("beko-km-90","Beko","KM","KM 90","KM 90 / TR / 9 kg","HEAT_PUMP_9KG","https://www.beko.com.tr/kurutma-makinesi/km-90",{capacityKg:9,drying:"heat-pump"},"KM 90"),
  s("bosch-wqb245a0tr","Bosch","Series 8","WQB245A0TR","WQB245A0TR / TR / 9 kg","CONNECTED_HEAT_PUMP","https://www.bosch-home.com.tr/urun-listesi/WQB245A0TR",{capacityKg:9,connectivity:"Home Connect"},"WQB245A0TR"),
  s("siemens-wq45b2a0tr","Siemens","iQ700","WQ45B2A0TR","WQ45B2A0TR / TR / 9 kg","CONNECTED_HEAT_PUMP","https://www.siemens-home.bsh-group.com/tr/urun-listesi/WQ45B2A0TR",{capacityKg:9,connectivity:"Home Connect"},"WQ45B2A0TR"),
  s("lg-rh10v9pv2w","LG","Dual Inverter","RH10V9PV2W","RH10V9PV2W / TR / 10 kg","LARGE_HEAT_PUMP","https://www.lg.com/tr/kurutma-makinesi/lg-rh10v9pv2w",{capacityKg:10,drying:"heat-pump"},"RH10V9PV2W"),
  s("samsung-dv90dg6845lbah","Samsung","Bespoke AI","DV90DG6845LBAH","DV90DG6845LBAH / TR / 9 kg","CONNECTED_HEAT_PUMP","https://www.samsung.com/tr/washers-and-dryers/dryers/dv90dg6845lbah/",{capacityKg:9,connectivity:"SmartThings"},"DV90DG6845LBAH"),
  s("vestel-kmi-98402-g","Vestel","KMI","KMI 98402 G","KMI 98402 G / TR / 9 kg","HEAT_PUMP_9KG","https://www.vestel.com.tr/kmi-98402-g-kurutma-makinesi",{capacityKg:9,drying:"heat-pump"},"KMI 98402 G"),
  s("profilo-km9611ctr","Profilo","KM","KM9611CTR","KM9611CTR / TR / 9 kg","HEAT_PUMP_9KG","https://www.profilo.com/tr/urun-listesi/KM9611CTR",{capacityKg:9,drying:"heat-pump"},"KM9611CTR"),
  s("grundig-gdh-92","Grundig","GDH","GDH 92","GDH 92 / TR / 9 kg","HEAT_PUMP_9KG","https://www.grundig.com.tr/kurutma-makinesi/gdh-92",{capacityKg:9,drying:"heat-pump"},"GDH 92")],
 TABLET:[
  s("apple-ipad-air-m3-11-128","Apple","iPad Air","A3266","11-inch iPad Air M3 Wi-Fi 128GB / TR","PREMIUM_CREATIVE","https://www.apple.com/tr/ipad-air/specs/",{displayInches:11,storageGb:128},"A3266"),
  s("samsung-sm-x920nzartur","Samsung","Galaxy Tab S10 Ultra","SM-X920NZARTUR","SM-X920NZARTUR / 12GB / 256GB / TR","PREMIUM_LARGE","https://www.samsung.com/tr/tablets/galaxy-tab-s/galaxy-tab-s10-ultra-gray-256gb-sm-x920nzartur/",{displayInches:14.6,storageGb:256},"SM-X920NZARTUR"),
  s("lenovo-zadx0068tr","Lenovo","Tab Plus","ZADX0068TR","ZADX0068TR / 8GB / 256GB / TR","MEDIA_VALUE","https://www.lenovo.com/tr/tr/p/tablets/android-tablets/lenovo-tab-series/lenovo-tab-plus/",{storageGb:256,memoryGb:8},"ZADX0068TR"),
  s("huawei-agrk-w09-6-128","HUAWEI","MatePad SE 11","AGRK-W09","AGRK-W09 / 6GB / 128GB / TR","FAMILY_VALUE","https://consumer.huawei.com/tr/tablets/matepad-se-11/specs/",{displayInches:11,storageGb:128},"AGRK-W09"),
  s("xiaomi-pad-7-8-256-gray","Xiaomi","Pad 7","Pad 7","Pad 7 / 8GB / 256GB / Gray / TR","PERFORMANCE_VALUE","https://www.mi.com/tr/product/xiaomi-pad-7/specs/",{memoryGb:8,storageGb:256},"Pad 7 8/256"),
  s("honor-pad-v9-8-256","HONOR","Pad V9","Pad V9","Pad V9 / 8GB / 256GB / TR","THIN_MEDIA","https://www.honor.com/tr/tablets/honor-pad-v9/",{memoryGb:8,storageGb:256},"Pad V9 8/256")],
 MONITOR:[
  s("lg-27gr83q-b","LG","UltraGear","27GR83Q-B","27GR83Q-B / TR","QHD_HIGH_REFRESH","https://www.lg.com/tr/monitor/lg-27gr83q-b",{sizeInches:27,resolution:"2560x1440"},"27GR83Q-B"),
  s("samsung-ls32dg802suxuf","Samsung","Odyssey OLED G8","LS32DG802SUXUF","LS32DG802SUXUF / TR","OLED_GAMING","https://www.samsung.com/tr/monitors/gaming/odyssey-oled-g8-g80sd-32-inch-ls32dg802suxuf/",{sizeInches:32,panel:"OLED"},"LS32DG802SUXUF"),
  s("asus-pg27aqdm","ASUS","ROG Swift OLED","PG27AQDM","PG27AQDM / TR","OLED_GAMING","https://rog.asus.com/tr/monitors/27-to-31-5-inches/rog-swift-oled-pg27aqdm/",{sizeInches:27,panel:"OLED"},"PG27AQDM"),
  s("dell-u2724d","Dell","UltraSharp","U2724D","U2724D / TR","PROFESSIONAL_QHD","https://www.dell.com/tr-tr/shop/dell-ultrasharp-27-monitor-u2724d/apd/210-bkvc/",{sizeInches:27,resolution:"2560x1440"},"210-BKVC"),
  s("lenovo-67c5gac1tk","Lenovo","Legion R27qe","67C5GAC1TK","67C5GAC1TK / TR","QHD_HIGH_REFRESH","https://www.lenovo.com/tr/tr/p/accessories-and-software/monitors/gaming/67c5gac1tk",{sizeInches:27,resolution:"2560x1440"},"67C5GAC1TK"),
  s("philips-346e2cuae-00","Philips","E Line","346E2CUAE/00","346E2CUAE/00 / TR","ULTRAWIDE_PRODUCTIVITY","https://www.philips.com.tr/c-p/346E2CUAE_00/",{sizeInches:34,resolution:"3440x1440"},"346E2CUAE/00"),
  s("msi-mag-274qrf-qd-e2","MSI","MAG","MAG 274QRF QD E2","MAG 274QRF QD E2 / TR","QHD_HIGH_REFRESH","https://tr.msi.com/Monitor/MAG-274QRF-QD-E2",{sizeInches:27,resolution:"2560x1440"},"MAG 274QRF QD E2"),
  s("aoc-q27g3xmn-bk","AOC","Gaming","Q27G3XMN/BK","Q27G3XMN/BK / TR","MINILED_GAMING","https://aoc.com/tr/gaming/products/monitors/q27g3xmn-bk",{sizeInches:27,backlight:"Mini LED"},"Q27G3XMN/BK")],
 SMARTWATCH:[
  s("apple-watch-series-10-46-gps","Apple","Watch Series 10","MWWQ3TU/A","46mm GPS Jet Black Aluminium / TR","IOS_MAINSTREAM","https://www.apple.com/tr/apple-watch-series-10/specs/",{caseMm:46,connectivity:"GPS"},"MWWQ3TU/A"),
  s("samsung-sm-l705fdaatur","Samsung","Galaxy Watch Ultra","SM-L705FDAATUR","SM-L705FDAATUR / TR","RUGGED_LTE","https://www.samsung.com/tr/watches/galaxy-watch/galaxy-watch-ultra-titanium-gray-lte-sm-l705fdaatur/",{connectivity:"LTE",caseMaterial:"titanium"},"SM-L705FDAATUR"),
  s("huawei-watch-gt5-pro-46-black","HUAWEI","Watch GT 5 Pro","Watch GT 5 Pro 46mm","46mm Black / TR","LONG_BATTERY_PREMIUM","https://consumer.huawei.com/tr/wearables/watch-gt5-pro/specs/",{caseMm:46,platform:"HUAWEI Health"},"GT5 Pro 46 Black"),
  s("garmin-fenix-8-47-amoled","Garmin","fēnix 8","010-02904-00","47mm AMOLED / TR","OUTDOOR_MULTISPORT","https://www.garmin.com.tr/fenix-8-47-mm-amoled",{caseMm:47,display:"AMOLED"},"010-02904-00"),
  s("xiaomi-watch-2-pro-lte-black","Xiaomi","Watch 2 Pro","Watch 2 Pro LTE","Black / LTE / TR","WEAR_OS_VALUE","https://www.mi.com/tr/product/xiaomi-watch-2-pro/specs/",{connectivity:"LTE",platform:"Wear OS"},"Watch 2 Pro LTE"),
  s("amazfit-t-rex-3-pro-48-black","Amazfit","T-Rex 3 Pro","T-Rex 3 Pro 48mm","48mm Black / TR","RUGGED_VALUE","https://www.amazfit.com/products/amazfit-t-rex-3-pro",{caseMm:48,platform:"Zepp OS"},"T-Rex 3 Pro 48")],
 HEADPHONES:[
  s("apple-airpods-pro-2-usbc","Apple","AirPods Pro","MTJV3TU/A","AirPods Pro 2 USB-C / TR","TWS_PREMIUM","https://www.apple.com/tr/airpods-pro/specs/",{form:"TWS",connector:"USB-C"},"MTJV3TU/A"),
  s("sony-wh-1000xm6-black","Sony","1000X","WH-1000XM6/B","WH-1000XM6 Black / TR","ANC_OVER_EAR","https://www.sony.com.tr/electronics/kafa-bantli-kulakliklar/wh-1000xm6",{form:"over-ear",anc:true},"WH-1000XM6/B"),
  s("bose-qc-ultra-black","Bose","QuietComfort Ultra","880066-0100","QuietComfort Ultra Headphones Black / TR","ANC_OVER_EAR","https://www.bose.com.tr/tr_tr/products/headphones/noise_cancelling_headphones/quietcomfort-ultra-headphones.html",{form:"over-ear",anc:true},"880066-0100"),
  s("sennheiser-momentum-4-black","Sennheiser","MOMENTUM","MOMENTUM 4 Wireless","Black / TR","HI_FI_WIRELESS","https://www.sennheiser-hearing.com/tr-TR/p/momentum-4-wireless/",{form:"over-ear",wireless:true},"MOMENTUM 4 Black"),
  s("jbl-tour-one-m3-black","JBL","Tour","JBLTOURONEM3BLK","Tour One M3 Black / TR","ANC_OVER_EAR","https://www.jbl.com.tr/TOUR-ONE-M3.html",{form:"over-ear",anc:true},"JBLTOURONEM3BLK"),
  s("marshall-major-v-black","Marshall","Major","Major V","Black / TR","LIFESTYLE_ON_EAR","https://www.marshall.com/tr/en/product/major-v",{form:"on-ear",wireless:true},"Major V Black")]
};
