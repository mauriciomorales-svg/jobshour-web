/**
 * Compress image to WebP format for rural/low-bandwidth optimization
 * Max 1024px width, 80% quality
 */
export async function compressImageToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions (max 1024px width)
        const MAX_WIDTH = 1024
        let width = img.width
        let height = img.height
        
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width
          width = MAX_WIDTH
        }
        
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          'image/webp',
          0.8 // 80% quality
        )
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Get optimized image size info
 */
export function getImageSizeInfo(originalSize: number, compressedSize: number) {
  const reduction = ((originalSize - compressedSize) / originalSize) * 100
  return {
    original: formatBytes(originalSize),
    compressed: formatBytes(compressedSize),
    reduction: reduction.toFixed(1) + '%',
    savings: formatBytes(originalSize - compressedSize)
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
