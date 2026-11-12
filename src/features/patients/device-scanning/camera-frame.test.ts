import { expect, it } from 'vitest'
import { cameraFrameCrop } from './camera-frame'
it('captures the visible portrait viewport from a landscape camera without stretching it', () => {
  const crop = cameraFrameCrop(1920, 1080, 390, 600)
  expect(crop).toEqual({ x: 609, y: 0, width: 702, height: 1080 })
})
it('captures the visible landscape viewport from a portrait camera', () => {
  const crop = cameraFrameCrop(1080, 1920, 1200, 400)
  expect(crop.x).toBe(0)
  expect(crop.width).toBe(1080)
  expect(crop.height).toBeCloseTo(360)
  expect(crop.y).toBeCloseTo(780)
})
it('keeps the whole image when preview dimensions are not yet available', () => {
  expect(cameraFrameCrop(1280, 720, 0, 0)).toEqual({ x: 0, y: 0, width: 1280, height: 720 })
})
