import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { PastPaper, PastPaperQuestion, StudyMaterial } from '@/types'

/**
 * Expected backend contract:
 *  GET    /materials              -> StudyMaterial[]
 *  GET    /materials/:id          -> StudyMaterial
 *  POST   /materials/upload       -> StudyMaterial (multipart/form-data)
 *  DELETE /materials/:id          -> void
 *
 *  GET    /past-papers            -> PastPaper[]
 *  GET    /past-papers/:id        -> PastPaper
 *  POST   /past-papers/upload     -> PastPaper (multipart/form-data)
 *  GET    /past-papers/:id/questions -> PastPaperQuestion[]
 */
export const documentService = {
  async listMaterials(): Promise<StudyMaterial[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /materials')
    const { data } = await apiClient.get<StudyMaterial[]>('/materials')
    return data
  },

  async getMaterial(id: string): Promise<StudyMaterial> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /materials/${id}`)
    const { data } = await apiClient.get<StudyMaterial>(`/materials/${id}`)
    return data
  },

  async uploadMaterial(file: File, subjectId?: string, onProgress?: (pct: number) => void): Promise<StudyMaterial> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /materials/upload')
    const form = new FormData()
    form.append('file', file)
    if (subjectId) form.append('subjectId', subjectId)
    const { data } = await apiClient.post<StudyMaterial>('/materials/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100))
      },
    })
    return data
  },

  async deleteMaterial(id: string): Promise<void> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`DELETE /materials/${id}`)
    await apiClient.delete(`/materials/${id}`)
  },

  async listPastPapers(): Promise<PastPaper[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /past-papers')
    const { data } = await apiClient.get<PastPaper[]>('/past-papers')
    return data
  },

  async getPastPaper(id: string): Promise<PastPaper> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /past-papers/${id}`)
    const { data } = await apiClient.get<PastPaper>(`/past-papers/${id}`)
    return data
  },

  async uploadPastPaper(file: File, subjectId: string, year: number): Promise<PastPaper> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /past-papers/upload')
    const form = new FormData()
    form.append('file', file)
    form.append('subjectId', subjectId)
    form.append('year', String(year))
    const { data } = await apiClient.post<PastPaper>('/past-papers/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async getPastPaperQuestions(paperId: string): Promise<PastPaperQuestion[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /past-papers/${paperId}/questions`)
    const { data } = await apiClient.get<PastPaperQuestion[]>(`/past-papers/${paperId}/questions`)
    return data
  },
}
