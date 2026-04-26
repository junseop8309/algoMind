export type MasteryState =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'mastered'
  | 'review_due'
  | 'gap_detected'

export interface ConceptNode {
  id: string
  slug: string
  title: string
  category: string
  difficulty: number
  prerequisites: string[]
  masteryState: MasteryState
  position: { x: number; y: number }
}

export interface RoadmapEdge {
  id: string
  source: string
  target: string
}

export interface UserRoadmap {
  id: string
  userId: string
  nodes: ConceptNode[]
  edges: RoadmapEdge[]
  createdAt: string
  updatedAt: string
}
