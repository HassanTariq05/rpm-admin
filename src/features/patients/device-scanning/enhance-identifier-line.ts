type Rectangle = { left: number; top: number; width: number; height: number }

/** Enlarge a tightly cropped identifier line and strengthen faint strokes. */
export function identifierLinePixels(
  source: Pick<ImageData, 'data' | 'width' | 'height'>,
  gamma = 2,
) {
  const scale = 3
  const width = source.width * scale + 40
  const height = source.height * scale + 60
  const data = new Uint8ClampedArray(width * height * 4)
  function gray(x: number, y: number) {
    if (x < 0 || y < 0 || x >= source.width || y >= source.height) return 255
    const i = (y * source.width + x) * 4
    return source.data[i]! * 0.299 + source.data[i + 1]! * 0.587 + source.data[i + 2]! * 0.114
  }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const sx = Math.floor(source.width / 2) + (x - width / 2) / scale
      const sy = Math.floor(source.height / 2) + (y - height / 2) / scale
      const x0 = Math.floor(sx),
        y0 = Math.floor(sy),
        dx = sx - x0,
        dy = sy - y0
      const value =
        gray(x0, y0) * (1 - dx) * (1 - dy) +
        gray(x0 + 1, y0) * dx * (1 - dy) +
        gray(x0, y0 + 1) * (1 - dx) * dy +
        gray(x0 + 1, y0 + 1) * dx * dy
      const i = (y * width + x) * 4
      data[i] = data[i + 1] = data[i + 2] = 255 * (value / 255) ** gamma
      data[i + 3] = 255
    }
  return { data, width, height }
}
export function enhanceIdentifierLine(image: HTMLCanvasElement, rectangle: Rectangle, gamma = 2) {
  const source = image.getContext('2d')
  if (!source) throw new Error('Image processing unavailable')
  const pixels = identifierLinePixels(
    source.getImageData(rectangle.left, rectangle.top, rectangle.width, rectangle.height),
    gamma,
  )
  const canvas = document.createElement('canvas')
  canvas.width = pixels.width
  canvas.height = pixels.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image processing unavailable')
  const output = context.createImageData(pixels.width, pixels.height)
  output.data.set(pixels.data)
  context.putImageData(output, 0, 0)
  return canvas
}
