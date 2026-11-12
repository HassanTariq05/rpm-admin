/** Find short rows of printed characters, excluding large barcode/image shapes. */
export function labelTextRegions(image: Pick<ImageData, 'data' | 'width' | 'height'>) {
  const { width, height, data } = image
  const stride = width + 1
  const gray = new Uint8Array(width * height)
  const integral = new Float64Array(stride * (height + 1))
  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const value = Math.round(
        data[i * 4]! * 0.299 + data[i * 4 + 1]! * 0.587 + data[i * 4 + 2]! * 0.114,
      )
      gray[i] = value
      sum += value
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1]! + sum
    }
  }
  const ink = new Uint8Array(width * height)
  const radius = Math.max(12, Math.round(Math.min(width, height) / 40))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius),
        x1 = Math.min(width, x + radius + 1)
      const y0 = Math.max(0, y - radius),
        y1 = Math.min(height, y + radius + 1)
      const mean =
        (integral[y1 * stride + x1]! -
          integral[y0 * stride + x1]! -
          integral[y1 * stride + x0]! +
          integral[y0 * stride + x0]!) /
        ((x1 - x0) * (y1 - y0))
      ink[y * width + x] = gray[y * width + x]! < mean - 18 ? 1 : 0
    }
  }
  type Box = { left: number; top: number; right: number; bottom: number; count: number }
  const characters: Box[] = []
  const queue = new Int32Array(width * height)
  for (let i = 0; i < ink.length; i++) {
    if (!ink[i]) continue
    let head = 0,
      tail = 1
    queue[0] = i
    ink[i] = 0
    const box: Box = {
      left: i % width,
      right: i % width,
      top: Math.floor(i / width),
      bottom: Math.floor(i / width),
      count: 0,
    }
    while (head < tail) {
      const p = queue[head++]!,
        x = p % width,
        y = Math.floor(p / width)
      box.left = Math.min(box.left, x)
      box.right = Math.max(box.right, x)
      box.top = Math.min(box.top, y)
      box.bottom = Math.max(box.bottom, y)
      box.count++
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue
          const next = (y + dy) * width + x + dx
          if (ink[next]) {
            ink[next] = 0
            queue[tail++] = next
          }
        }
    }
    const h = box.bottom - box.top + 1,
      w = box.right - box.left + 1
    if (box.count >= 8 && h >= 6 && h < height * 0.065 && w < h * 25) characters.push(box)
  }
  const rows: Box[][] = []
  for (const box of characters.sort((a, b) => a.top + a.bottom - (b.top + b.bottom))) {
    const center = (box.top + box.bottom) / 2
    const row = rows.find(
      (items) =>
        Math.abs(center - (items[0]!.top + items[0]!.bottom) / 2) <
        Math.min(box.bottom - box.top + 1, items[0]!.bottom - items[0]!.top + 1) * 0.55,
    )
    if (row) row.push(box)
    else rows.push([box])
  }
  const regions: { left: number; top: number; width: number; height: number }[] = []
  for (const row of rows) {
    let cluster: Box[] = []
    function finish() {
      if (cluster.length < 2) return
      const left = Math.max(0, Math.min(...cluster.map((b) => b.left)) - 10)
      const top = Math.max(0, Math.min(...cluster.map((b) => b.top)) - 10)
      const right = Math.min(width, Math.max(...cluster.map((b) => b.right)) + 11)
      const bottom = Math.min(height, Math.max(...cluster.map((b) => b.bottom)) + 11)
      if (right - left > (bottom - top) * 2)
        regions.push({ left, top, width: right - left, height: bottom - top })
    }
    for (const box of row.sort((a, b) => a.left - b.left)) {
      const previous = cluster.at(-1)
      if (previous && box.left - previous.right > (previous.bottom - previous.top + 1) * 3) {
        finish()
        cluster = []
      }
      cluster.push(box)
    }
    finish()
  }
  const paired = regions.flatMap((region, index) => {
    const next = regions.slice(index + 1).find((candidate) => {
      const overlap =
        Math.min(region.left + region.width, candidate.left + candidate.width) -
        Math.max(region.left, candidate.left)
      return (
        candidate.top > region.top &&
        candidate.top - (region.top + region.height) < 8 &&
        overlap > Math.max(region.width, candidate.width) * 0.7
      )
    })
    if (!next) return []
    const left = Math.min(region.left, next.left),
      top = region.top
    return [
      {
        left,
        top,
        width: Math.max(region.left + region.width, next.left + next.width) - left,
        height: next.top + next.height - top,
      },
    ]
  })
  return [...paired, ...regions].slice(0, 50)
}
