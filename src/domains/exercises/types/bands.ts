/**
 * Band Types - Global band definitions for assistance exercises
 */

// Band type interface for Firestore
export interface BandType {
  id: string
  name: string            // "כחול (קל)"
  description?: string    // "מתאים למתחילים"
  isActive: boolean
  sortOrder: number
  createdAt?: Date
  updatedAt?: Date
}

// DTO for creating a new band type
export type CreateBandTypeDto = Omit<BandType, 'id' | 'createdAt' | 'updatedAt'>

// DTO for updating a band type
export type UpdateBandTypeDto = Partial<CreateBandTypeDto>
