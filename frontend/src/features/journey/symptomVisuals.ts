import {
  IconBolt,
  IconCircleDot,
  IconCircleHalf2,
  IconDroplet,
  IconDropletFilled,
  IconLungs,
  IconScale,
  IconStethoscope,
  IconToiletPaper,
  IconZzz,
  type Icon,
} from '@tabler/icons-react'
import type { BodyRegionId } from '@/shared/ui'

/**
 * Presentation only: where on the body map a symptom card sits and its picture. The lane
 * still comes from the server's card content; this never changes what is sent. A card
 * missing here (added in content later) shows under "whole body" with a neutral picture,
 * and every card is shown while no body part is chosen, so nothing is ever hidden.
 */
export interface SymptomVisual {
  regions: BodyRegionId[]
  icon: Icon
}

export const symptomVisuals: Record<string, SymptomVisual> = {
  lump: { regions: ['head', 'chest'], icon: IconCircleDot },
  cough: { regions: ['chest'], icon: IconLungs },
  bleeding: { regions: ['belly'], icon: IconDroplet },
  after_menopause: { regions: ['belly'], icon: IconDropletFilled },
  stool: { regions: ['belly'], icon: IconToiletPaper },
  mole: { regions: ['skin'], icon: IconCircleHalf2 },
  tired: { regions: ['whole'], icon: IconZzz },
  pain: { regions: ['whole'], icon: IconBolt },
  appetite: { regions: ['whole'], icon: IconScale },
}

const fallback: SymptomVisual = { regions: ['whole'], icon: IconStethoscope }

export const visualFor = (symptomId: string): SymptomVisual => symptomVisuals[symptomId] ?? fallback

/** Body-map order, top to bottom, then skin and whole body. */
export const REGION_ORDER: BodyRegionId[] = ['head', 'chest', 'belly', 'skin', 'whole']

export const regionLabelKey = (region: BodyRegionId) => `ui.journey.body.region.${region}`
