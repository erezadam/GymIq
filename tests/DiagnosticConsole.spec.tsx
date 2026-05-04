/**
 * DiagnosticConsole.spec.tsx — Smoke tests for the admin Diagnostic Console.
 *
 * Verifies render of the header (with hardcoded UID), tab switching, and
 * empty-state messages. Service layer is mocked — these are not integration
 * tests against Firestore.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// PR #121 module — mocked.
vi.mock('@/lib/firebase/diagnosticLogs', () => ({
  DEBUG_USER_UID: 'OHxRVH3RdUP8k7xQBuAa5ZXvfrI2',
}))

// react-hot-toast: render component imports it via JsonViewer's copy handler.
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

// Service mocked so we exercise UI in isolation.
vi.mock('@/domains/admin/services/diagnosticService', async () => {
  const actual = await vi.importActual<
    typeof import('@/domains/admin/services/diagnosticService')
  >('@/domains/admin/services/diagnosticService')
  return {
    ...actual,
    getDiagnosticLogs: vi.fn(async () => ({ logs: [], hasMore: false })),
    getUserSessions: vi.fn(async () => []),
    getSessionLogs: vi.fn(async () => []),
    getWorkoutsForUser: vi.fn(async () => ({ workouts: [], hasMore: false })),
    getWorkoutRaw: vi.fn(async () => null),
  }
})

import DiagnosticConsole from '@/domains/admin/components/DiagnosticConsole'
// Import from the mocked module directly (not through diagnosticService which
// uses importActual + spread) so the value is unambiguously the mocked one
// regardless of Vitest's mock-hoist order.
import { DEBUG_USER_UID } from '@/lib/firebase/diagnosticLogs'

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DiagnosticConsole — render + tabs', () => {
  it('renders the header with the hardcoded DEBUG_USER_UID', () => {
    renderWithQuery(<DiagnosticConsole />)
    expect(screen.getByText('Diagnostic Console')).toBeInTheDocument()
    // Use the imported constant — if the writer ever changes DEBUG_USER_UID,
    // this assertion tracks the change instead of going green on stale text.
    expect(screen.getByText(DEBUG_USER_UID)).toBeInTheDocument()
  })

  it('renders all 3 tab buttons', () => {
    renderWithQuery(<DiagnosticConsole />)
    expect(screen.getByRole('button', { name: /Logs Timeline/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Workout Inspector/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Session Replay/ })).toBeInTheDocument()
  })

  it('starts on Logs Timeline tab and shows empty-state copy', async () => {
    renderWithQuery(<DiagnosticConsole />)
    await waitFor(() => {
      expect(screen.getByText(/אין לוגים בטווח הזה/)).toBeInTheDocument()
    })
  })

  it('switches to Workout Inspector on tab click and shows its empty-state', async () => {
    renderWithQuery(<DiagnosticConsole />)
    fireEvent.click(screen.getByRole('button', { name: /Workout Inspector/ }))
    await waitFor(() => {
      expect(screen.getByText(/אין אימונים תואמים/)).toBeInTheDocument()
    })
  })

  it('switches to Session Replay and shows the no-sessions empty-state', async () => {
    renderWithQuery(<DiagnosticConsole />)
    fireEvent.click(screen.getByRole('button', { name: /Session Replay/ }))
    await waitFor(() => {
      expect(
        screen.getByText(/אין sessions. כדי ליצור session חדש/),
      ).toBeInTheDocument()
    })
  })
})
