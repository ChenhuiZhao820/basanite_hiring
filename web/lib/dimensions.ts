// The 8 evaluation dimensions. Single source of truth for the role wizard
// and the interview plan panel; keys mirror agents/dimensions.py.
export const ALL_DIMENSIONS = [
  { key: 'judgment_under_ambiguity', name: 'Judgment Under Ambiguity', description: 'The capacity to act decisively on incomplete information.' },
  { key: 'tacit_knowledge', name: 'Tacit Knowledge Extraction', description: 'Surfacing knowledge that lives in experience, not text.' },
  { key: 'intuition_under_scarcity', name: 'Intuition Under Data Scarcity', description: 'Sound judgment when data is insufficient.' },
  { key: 'psychological_safety', name: 'Psychological Safety & Collective Learning', description: 'Creating conditions where teams correct errors.' },
  { key: 'creative_reframing', name: 'Creative Problem Reframing', description: 'Recognising when the team is solving the wrong problem.' },
  { key: 'ethical_reasoning', name: 'Ethical Reasoning', description: 'Navigating real tradeoffs with integrity.' },
  { key: 'capacity_for_change', name: 'Capacity to Be Changed by Experience', description: 'Learning from experience, not just accumulating it.' },
  { key: 'technical_depth', name: 'Technical Judgment Depth', description: 'Understanding boundaries of technical decisions.' },
] as const

export const MIN_DIMENSIONS = 2
