/**
 * DiagnosticConsole.spec.tsx — UI tests for the admin Diagnostic Console.
 *
 * Verifies:
 *   - Header banner reflects the new "search by email + global kill switch" model.
 *   - Empty state (no user selected) renders in all 3 tabs without firing
 *     a single Firestore query.
 *   - Email lookup → 0 / 1 / N results behavior:
 *       0 → "לא נמצא משתמש עם email זה"
 *       1 → "נחקר כעת: {email} · UID: {uid}" + tabs activate
 *       N → "נמצאו N רשומות עם email זה. UIDs: ..." (no auto-selection)
 *   - The lookup goes through trainerService.findAllUsersByEmail (the
 *     duplicate-aware sibling helper), not findUserByEmail.
 *   - Service layer is mocked — these are not integration tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/domains/trainer/services/trainerService', () => ({
  trainerService: {
    findAllUsersByEmail: vi.fn(),
  },
}))

// react-hot-toast: JsonViewer's copy handler imports it transitively.
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

// Service mocked so the lookup flow is the only thing under test.
vi.mock('@/domains/admin/services/diagnosticService', async () => {
  const actual = await vi.importActual<
    typeof import('@/domains/admin/services/diagnosticService')
  >('@/domains/admin/services/diagnosticService')
  return {
    ...actual,
    getDiagnosticLogs: vi.fn(async () => ({ logs: [], hasMore: false, nextCursor: null })),
    getUserSessions: vi.fn(async () => []),
    getSessionLogs: vi.fn(async () => []),
    getWorkoutsForUser: vi.fn(async () => ({ workouts: [], hasMore: false, nextCursor: null })),
    getWorkoutRaw: vi.fn(async () => null),
  }
})

import DiagnosticConsole from '@/domains/admin/components/DiagnosticConsole'
import * as svc from '@/domains/admin/services/diagnosticService'
import { trainerService } from '@/domains/trainer/services/trainerService'

const findAllMock = trainerService.findAllUsersByEmail as unknown as ReturnType<typeof vi.fn>

// Minimal AppUser-shaped object — only fields the component reads.
function makeUser(uid: string, email = 'x@example.com') {
  return {
    uid,
    email,
    firstName: '',
    lastName: '',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  findAllMock.mockReset()
})

describe('DiagnosticConsole — header + empty state', () => {
  it('renders the new banner referencing settings/app.diagnosticLogsEnabled (no hardcoded UID)', () => {
    renderWithQuery(<DiagnosticConsole />)
    expect(screen.getByText('Diagnostic Console')).toBeInTheDocument()
    // Old hardcoded UID must NOT appear.
    expect(screen.queryByText('OHxRVH3RdUP8k7xQBuAa5ZXvfrI2')).not.toBeInTheDocument()
    // New banner mentions the kill switch field path.
    expect(
      screen.getByText(/settings\/app\.diagnosticLogsEnabled/),
    ).toBeInTheDocument()
  })

  it('renders all 3 tab buttons + the email input', () => {
    renderWithQuery(<DiagnosticConsole />)
    expect(screen.getByRole('button', { name: /Logs Timeline/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Workout Inspector/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Session Replay/ })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email של המשתמש/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'חפש' })).toBeInTheDocument()
  })

  it('shows "בחר משתמש לתחילת חקירה" empty state in Logs Timeline before any lookup', async () => {
    renderWithQuery(<DiagnosticConsole />)
    await waitFor(() => {
      expect(screen.getByText('בחר משתמש לתחילת חקירה.')).toBeInTheDocument()
    })
    // Service must NOT have been called — the queries are gated by `enabled: !!userId`.
    expect(svc.getDiagnosticLogs).not.toHaveBeenCalled()
  })

  it('shows the empty state in Workout Inspector tab when no user is selected', async () => {
    renderWithQuery(<DiagnosticConsole />)
    fireEvent.click(screen.getByRole('button', { name: /Workout Inspector/ }))
    await waitFor(() => {
      expect(screen.getByText('בחר משתמש לתחילת חקירה.')).toBeInTheDocument()
    })
    expect(svc.getWorkoutsForUser).not.toHaveBeenCalled()
  })

  it('shows the empty state in Session Replay tab when no user is selected', async () => {
    renderWithQuery(<DiagnosticConsole />)
    fireEvent.click(screen.getByRole('button', { name: /Session Replay/ }))
    await waitFor(() => {
      expect(screen.getByText('בחר משתמש לתחילת חקירה.')).toBeInTheDocument()
    })
    expect(svc.getUserSessions).not.toHaveBeenCalled()
  })
})

describe('DiagnosticConsole — email lookup via trainerService.findAllUsersByEmail', () => {
  it('0 matches → shows "לא נמצא משתמש" error and does not load tabs', async () => {
    findAllMock.mockResolvedValueOnce([])
    renderWithQuery(<DiagnosticConsole />)

    fireEvent.change(screen.getByPlaceholderText(/email של המשתמש/), {
      target: { value: 'nope@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'חפש' }))

    await waitFor(() => {
      expect(screen.getByText('לא נמצא משתמש עם email זה')).toBeInTheDocument()
    })
    expect(findAllMock).toHaveBeenCalledWith('nope@example.com')
    expect(svc.getDiagnosticLogs).not.toHaveBeenCalled()
  })

  it('1 match → selects UID, shows "נחקר כעת" header, loads Logs Timeline with that uid', async () => {
    findAllMock.mockResolvedValueOnce([makeUser('uid-found-123', 'found@example.com')])
    renderWithQuery(<DiagnosticConsole />)

    fireEvent.change(screen.getByPlaceholderText(/email של המשתמש/), {
      target: { value: 'found@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'חפש' }))

    await waitFor(() => {
      expect(screen.getByText('uid-found-123')).toBeInTheDocument()
    })
    // Banner shows the lowercased email + uid.
    expect(screen.getByText('found@example.com')).toBeInTheDocument()
    // Logs Timeline tab is the default; its query should now fire with the resolved uid.
    await waitFor(() => {
      expect(svc.getDiagnosticLogs).toHaveBeenCalled()
    })
    const firstCallArgs = (svc.getDiagnosticLogs as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]
    expect(firstCallArgs[0]).toBe('uid-found-123')
  })

  it('N>1 matches → shows multi-result error with UIDs, does NOT auto-select, tabs remain empty', async () => {
    findAllMock.mockResolvedValueOnce([
      makeUser('dup-1', 'zehava@assa-adam.com'),
      makeUser('dup-2', 'zehava@assa-adam.com'),
    ])
    renderWithQuery(<DiagnosticConsole />)

    fireEvent.change(screen.getByPlaceholderText(/email של המשתמש/), {
      target: { value: 'zehava@assa-adam.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'חפש' }))

    await waitFor(() => {
      expect(
        screen.getByText(/נמצאו 2 רשומות עם email זה\. UIDs: dup-1, dup-2/),
      ).toBeInTheDocument()
    })
    // Tab queries must not have run — no UID was selected.
    expect(svc.getDiagnosticLogs).not.toHaveBeenCalled()
    // Empty state still showing in Logs Timeline.
    expect(screen.getByText('בחר משתמש לתחילת חקירה.')).toBeInTheDocument()
  })

  it('lowercases + trims the email before passing it to the service helper', async () => {
    findAllMock.mockResolvedValueOnce([])
    renderWithQuery(<DiagnosticConsole />)

    fireEvent.change(screen.getByPlaceholderText(/email של המשתמש/), {
      target: { value: '  Found@Example.COM  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'חפש' }))

    await waitFor(() => expect(findAllMock).toHaveBeenCalled())
    expect(findAllMock).toHaveBeenCalledWith('found@example.com')
  })

  it('clear button resets selection and returns to empty state', async () => {
    findAllMock.mockResolvedValueOnce([makeUser('uid-keep', 'keep@example.com')])
    renderWithQuery(<DiagnosticConsole />)

    fireEvent.change(screen.getByPlaceholderText(/email של המשתמש/), {
      target: { value: 'keep@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'חפש' }))

    await waitFor(() => {
      expect(screen.getByText('uid-keep')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'נקה בחירה' }))

    await waitFor(() => {
      expect(screen.queryByText('uid-keep')).not.toBeInTheDocument()
      expect(screen.getByText('בחר משתמש לתחילת חקירה.')).toBeInTheDocument()
    })
  })

  it('uses findAllUsersByEmail (not findUserByEmail) to surface the duplicate case', async () => {
    findAllMock.mockResolvedValueOnce([makeUser('uid-1')])
    renderWithQuery(<DiagnosticConsole />)

    fireEvent.change(screen.getByPlaceholderText(/email של המשתמש/), {
      target: { value: 'a@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'חפש' }))

    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(1))
    // Sanity: the contract goes through the unbounded helper. The limit(1)
    // helper would silently swallow duplicates — that's the bug the new
    // helper exists to prevent.
    expect(trainerService.findAllUsersByEmail).toBe(findAllMock)
  })
})
