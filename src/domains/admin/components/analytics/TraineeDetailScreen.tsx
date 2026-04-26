import { useParams } from 'react-router-dom'
import { LoadingState } from './LoadingState'
import { EmptyState } from './EmptyState'
import { UserDetailHeader } from './UserDetailHeader'
import { UserDetailBody } from './UserDetailBody'
import { useUserDetail } from './useUserDetail'

export default function TraineeDetailScreen() {
  const params = useParams<{ id: string }>()
  const userId = params.id
  const { isLoading, isError, error, stats, notFound } = useUserDetail(userId)

  if (isLoading) return <LoadingState rows={6} />
  if (isError) {
    return (
      <EmptyState
        title="טעינת הנתונים נכשלה"
        description={String((error as { message?: string })?.message ?? '')}
      />
    )
  }
  if (notFound || !stats) {
    return (
      <EmptyState
        title="המשתמש לא נמצא"
        description="ייתכן שהמשתמש נמחק או שהקישור שגוי."
      />
    )
  }

  // If this user happens to be a trainer too, expose a "view as trainer" toggle.
  const switchToTrainerHref =
    stats.user.role === 'trainer' ? `/admin/analytics/trainer/${stats.user.uid}` : undefined

  return (
    <div className="space-y-4">
      <UserDetailHeader
        stats={stats}
        switchToTrainerHref={switchToTrainerHref}
        modeLabel={stats.user.role === 'trainer' ? 'תצוגת מתאמן' : undefined}
      />
      <UserDetailBody stats={stats} />
    </div>
  )
}
