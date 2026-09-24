import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { AiMode, AiProviderId, Conversation, Message } from '@/types'

export interface SendMessagePayload {
  conversationId?: string
  content: string
  mode: AiMode
  providerId: AiProviderId
  attachmentDocumentIds?: string[]
}

/**
 * Expected backend contract:
 *  GET    /conversations                    -> Conversation[]
 *  GET    /conversations/:id/messages        -> Message[]
 *  POST   /conversations                     -> Conversation
 *  PATCH  /conversations/:id                 -> Conversation (rename/bookmark)
 *  DELETE /conversations/:id                 -> void
 *  POST   /conversations/:id/messages        -> Message (streamed or full)
 *  POST   /conversations/:id/messages/:msgId/regenerate -> Message
 *  POST   /conversations/:id/stop            -> void
 */
export const conversationService = {
  async list(): Promise<Conversation[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /conversations')
    const { data } = await apiClient.get<Conversation[]>('/conversations')
    return data
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /conversations/${conversationId}/messages`)
    const { data } = await apiClient.get<Message[]>(`/conversations/${conversationId}/messages`)
    return data
  },

  async create(mode: AiMode, subjectId?: string): Promise<Conversation> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /conversations')
    const { data } = await apiClient.post<Conversation>('/conversations', { mode, subjectId })
    return data
  },

  async rename(id: string, title: string): Promise<Conversation> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`PATCH /conversations/${id}`)
    const { data } = await apiClient.patch<Conversation>(`/conversations/${id}`, { title })
    return data
  },

  async setBookmarked(id: string, bookmarked: boolean): Promise<Conversation> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`PATCH /conversations/${id}`)
    const { data } = await apiClient.patch<Conversation>(`/conversations/${id}`, { bookmarked })
    return data
  },

  async remove(id: string): Promise<void> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`DELETE /conversations/${id}`)
    await apiClient.delete(`/conversations/${id}`)
  },

  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /conversations/:id/messages')
    const { conversationId, ...body } = payload
    const { data } = await apiClient.post<Message>(
      `/conversations/${conversationId}/messages`,
      body
    )
    return data
  },

  async regenerate(conversationId: string, messageId: string): Promise<Message> {
    if (!BACKEND_READY)
      throw new BackendNotReadyError(`POST /conversations/${conversationId}/messages/${messageId}/regenerate`)
    const { data } = await apiClient.post<Message>(
      `/conversations/${conversationId}/messages/${messageId}/regenerate`
    )
    return data
  },

  async stopGeneration(conversationId: string): Promise<void> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`POST /conversations/${conversationId}/stop`)
    await apiClient.post(`/conversations/${conversationId}/stop`)
  },
}
