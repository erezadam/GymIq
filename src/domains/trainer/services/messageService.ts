import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { TrainerMessage } from '../types'

function toMessage(id: string, data: any): TrainerMessage {
  return {
    id,
    trainerId: data.trainerId,
    traineeId: data.traineeId,
    trainerName: data.trainerName,
    type: data.type || 'general',
    subject: data.subject,
    body: data.body,
    referenceType: data.referenceType,
    referenceId: data.referenceId,
    referenceName: data.referenceName,
    isRead: data.isRead || false,
    readAt: data.readAt?.toDate?.() || data.readAt,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    priority: data.priority || 'normal',
    replies: data.replies?.map((r: any) => ({
      ...r,
      createdAt: r.createdAt?.toDate?.() || r.createdAt || new Date(),
    })) || [],
  }
}

export const messageService = {
  // Send a message from trainer to trainee
  async sendMessage(
    data: Omit<TrainerMessage, 'id' | 'isRead' | 'readAt' | 'createdAt' | 'replies'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, 'trainerMessages'), {
      ...data,
      isRead: false,
      createdAt: serverTimestamp(),
      replies: [],
    })
    return docRef.id
  },

  // Get messages for a trainee (inbox)
  async getTraineeMessages(
    traineeId: string,
    limitCount: number = 50
  ): Promise<TrainerMessage[]> {
    const q = query(
      collection(db, 'trainerMessages'),
      where('traineeId', '==', traineeId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => toMessage(doc.id, doc.data()))
  },

  // Get messages sent by trainer to a specific trainee
  async getTrainerMessagesToTrainee(
    trainerId: string,
    traineeId: string,
    limitCount: number = 50
  ): Promise<TrainerMessage[]> {
    const q = query(
      collection(db, 'trainerMessages'),
      where('trainerId', '==', trainerId),
      where('traineeId', '==', traineeId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => toMessage(doc.id, doc.data()))
  },

  // Get all messages sent by trainer
  async getTrainerMessages(
    trainerId: string,
    limitCount: number = 50
  ): Promise<TrainerMessage[]> {
    const q = query(
      collection(db, 'trainerMessages'),
      where('trainerId', '==', trainerId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => toMessage(doc.id, doc.data()))
  },

  // Mark message as read
  async markAsRead(messageId: string): Promise<void> {
    const docRef = doc(db, 'trainerMessages', messageId)
    await updateDoc(docRef, {
      isRead: true,
      readAt: serverTimestamp(),
    })
  },

  // Get unread count for trainee
  async getUnreadCount(traineeId: string): Promise<number> {
    const q = query(
      collection(db, 'trainerMessages'),
      where('traineeId', '==', traineeId),
      where('isRead', '==', false)
    )
    const snapshot = await getDocs(q)
    return snapshot.size
  },

  // Add a reply to a message
  async addReply(
    messageId: string,
    reply: { senderId: string; senderName: string; senderRole: 'trainer' | 'user'; body: string }
  ): Promise<void> {
    const docRef = doc(db, 'trainerMessages', messageId)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return

    const current = snapshot.data()
    const replies = current.replies || []

    await updateDoc(docRef, {
      replies: [
        ...replies,
        {
          id: `reply_${Date.now()}`,
          ...reply,
          createdAt: Timestamp.now(),
        },
      ],
    })
  },
}
