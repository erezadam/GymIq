import { useParams } from 'react-router-dom'
import PersonalRecords from '@/domains/workouts/components/PersonalRecords'

export default function TraineePersonalRecords() {
  const { id: traineeId } = useParams<{ id: string }>()
  return <PersonalRecords userId={traineeId} />
}
