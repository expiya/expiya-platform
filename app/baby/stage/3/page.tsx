import { XpyStageState } from "@/components/xpy/XpyStageTemplates";
import { BABY_EXPERIENCE } from "@/features/xpy/visualPacks";
export default function BabyStageThreePage() { return <XpyStageState adapter={BABY_EXPERIENCE} current="STAGE_3_ACTION" state="UNSUPPORTED" title="Güvenli talep" description="Satıcı, teklif, stok, ödeme, sipariş ve veri aktarımı henüz desteklenmiyor." returnHref="/baby" returnLabel="Bebek & Çocuk bölümüne dön"/>; }

