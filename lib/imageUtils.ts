/**
 * 浏览器端图片压缩
 * 目标：宽度700px以内，JPEG质量35%，最大返回base64
 */
export async function compressImage(file: File): Promise<{ base64: string; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)

      // 主图压缩
      const MAX_W = 700
      let w = img.width
      let h = img.height
      if (w > MAX_W) {
        h = Math.round((h * MAX_W) / w)
        w = MAX_W
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const base64 = canvas.toDataURL('image/jpeg', 0.35).split(',')[1]

      // 缩略图（用于历史记录）
      const TH = 120
      const tw = w > h ? Math.round((w * TH) / h) : TH
      const th = w > h ? TH : Math.round((h * TH) / w)
      const tc = document.createElement('canvas')
      tc.width = TH
      tc.height = TH
      const tctx = tc.getContext('2d')!
      tctx.drawImage(img, (tw - TH) / 2, (th - TH) / 2, tw, th, 0, 0, TH, TH)
      const thumbnail = tc.toDataURL('image/jpeg', 0.5)

      resolve({ base64, thumbnail })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

export function validateImageFile(file: File): string | null {
  const MAX_SIZE = 4 * 1024 * 1024
  if (file.size > MAX_SIZE) return '图片不能超过4MB'
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'].includes(file.type.toLowerCase())) {
    return '请选择JPG、PNG或WEBP格式的图片'
  }
  return null
}
