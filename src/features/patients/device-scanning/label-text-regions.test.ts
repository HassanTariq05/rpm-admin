import { expect, it } from 'vitest'
import { labelTextRegions } from './label-text-regions'
it('finds neighboring printed text rows without including the tall barcode below them', () => {
  const width = 400,
    height = 400
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  function rectangle(x: number, y: number, w: number, h: number) {
    for (let row = y; row < y + h; row++)
      for (let col = x; col < x + w; col++) {
        const i = (row * width + col) * 4
        data[i] = data[i + 1] = data[i + 2] = 0
      }
  }
  for (let x = 40; x < 200; x += 12) {
    rectangle(x, 80, 7, 14)
    rectangle(x, 106, 7, 14)
    rectangle(x, 180, 3, 100)
  }
  const regions = labelTextRegions({ data, width, height })
  expect(regions.some((r) => r.top <= 80 && r.top + r.height >= 120)).toBe(true)
  expect(regions.every((r) => r.top + r.height < 180)).toBe(true)
})
it('does not invent regions for a blank image', () => {
  expect(
    labelTextRegions({
      data: new Uint8ClampedArray(100 * 100 * 4).fill(255),
      width: 100,
      height: 100,
    }),
  ).toEqual([])
})
