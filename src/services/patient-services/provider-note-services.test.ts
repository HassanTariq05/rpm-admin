import axios, { type InternalAxiosRequestConfig } from 'axios'
import { expect, it } from 'vitest'
import { createProviderNoteService } from './provider-note-services'

it('uses the documented provider note routes, payloads, and cancellation signal', async () => {
  const note = {
    id: 'note-a',
    patientId: 'patient-a',
    body: 'Note text',
    createdAt: '2026-11-20T10:00:00Z',
  }
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    adapter: async (config) => {
      requests.push(config)
      const data = config.method === 'get' ? { notes: [note] } : note
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  const service = createProviderNoteService(client, 'https://example.test/api')
  const signal = new AbortController().signal
  expect(await service.getAll(note.patientId, signal)).toEqual([note])
  expect(await service.create(note.patientId, note.body)).toEqual(note)
  expect(await service.update(note.patientId, note.id, 'Updated text')).toEqual(note)
  expect(await service.remove(note.patientId, note.id)).toEqual(note)
  expect(requests.map(({ method, url }) => [method, url])).toEqual([
    ['get', '/patients/patient-a/notes'],
    ['post', '/patients/patient-a/notes'],
    ['put', '/patients/patient-a/notes/note-a'],
    ['delete', '/patients/patient-a/notes/note-a'],
  ])
  expect(requests[0]).toMatchObject({ baseURL: 'https://example.test/api', signal })
  expect(JSON.parse(requests[1]!.data)).toEqual({ body: 'Note text' })
  expect(JSON.parse(requests[2]!.data)).toEqual({ body: 'Updated text' })
})
