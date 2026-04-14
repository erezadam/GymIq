import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  mobilePreview: boolean
  toggleMobilePreview: () => void
  setMobilePreview: (value: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      mobilePreview: false,
      toggleMobilePreview: () => set((state) => ({ mobilePreview: !state.mobilePreview })),
      setMobilePreview: (value) => set({ mobilePreview: value }),
    }),
    {
      name: 'gymiq-ui-state',
    }
  )
)
