import { XpyStageState } from "@/components/xpy/XpyStageTemplates";
import { BABY_EXPERIENCE } from "@/features/xpy/visualPacks";
export default function BabyStageTwoPage() { return <XpyStageState adapter={BABY_EXPERIENCE} current="STAGE_2_EVALUATION" state="UNSUPPORTED" title="Ürün değerlendirmesi" description="Bu aşama yalnız Aşama 1'de yetkilendirilmiş exact bebek arabası kararından açılır." returnHref="/baby#asama-1" returnLabel="Karar görüşmesine dön"/>; }

