import { expect, it } from 'vitest'
import { identifierLinePixels } from './enhance-identifier-line'
it('enlarges identifier text with white padding and darkens faint strokes', () => {
  const source = { width: 4, height: 4, data: new Uint8ClampedArray(4 * 4 * 4).fill(128) }
  const output = identifierLinePixels(source)
  expect(output.width).toBe(52)
  expect(output.height).toBe(72)
  expect(Array.from(output.data.slice(0, 4))).toEqual([255, 255, 255, 255])
  const center = ((output.height / 2) * output.width + output.width / 2) * 4
  expect(Array.from(output.data.slice(center, center + 4))).toEqual([64, 64, 64, 255])
})
