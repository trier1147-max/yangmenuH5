export interface Dish {
  originalName: string
  briefCN: string
  detail: DishDetail | null
}

export interface DishDetail {
  description?: string
  introduction?: string
  ingredients: string[]
  flavor: string
  price?: string
  options?: DishOptionGroup[]
  dietaryTags?: string[]
  recommendation?: string
}

export interface DishOptionGroup {
  group: string
  rule: string
  choices: string[]
}

export interface HistoryRecord {
  id: string
  thumbnail?: string
  dishes: Dish[]
  createdAt: string
  dishCount: number
}

export interface RecognizeSSEEvent {
  type: 'status' | 'partial' | 'done' | 'error'
  message?: string
  dishes?: Dish[]
}
