/** Match the centered object-fit: cover preview when capturing a video frame. */
export function cameraFrameCrop(
  width: number,
  height: number,
  viewWidth: number,
  viewHeight: number,
) {
  if (viewWidth <= 0 || viewHeight <= 0) return { x: 0, y: 0, width, height }
  const scale = Math.max(viewWidth / width, viewHeight / height)
  const cropWidth = Math.min(width, viewWidth / scale)
  const cropHeight = Math.min(height, viewHeight / scale)
  return {
    x: (width - cropWidth) / 2,
    y: (height - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  }
}
