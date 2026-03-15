import crypto from 'crypto'
import https from 'https'

const OCR_HOST = 'ocr.tencentcloudapi.com'
const OCR_SERVICE = 'ocr'
const OCR_ACTION = 'GeneralBasicOCR'
const OCR_VERSION = '2018-11-19'

function signTc3(secretKey: string, date: string, service: string, stringToSign: string): string {
  const hmac = (key: Buffer | string, data: string) =>
    crypto.createHmac('sha256', key).update(data, 'utf8').digest()
  const secretDate = hmac('TC3' + secretKey, date)
  const secretService = hmac(secretDate, service)
  const secretSigning = hmac(secretService, 'tc3_request')
  return hmac(secretSigning, stringToSign).toString('hex')
}

export async function extractTextByOcr(imageBase64: string): Promise<string> {
  const secretId = process.env.TENCENT_SECRET_ID!
  const secretKey = process.env.TENCENT_SECRET_KEY!

  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000)
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
    const payload = JSON.stringify({ ImageBase64: imageBase64 })
    const contentType = 'application/json; charset=utf-8'
    const hashedPayload = crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
    const canonicalHeaders = `content-type:${contentType}\nhost:${OCR_HOST}\n`
    const signedHeaders = 'content-type;host'
    const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, hashedPayload].join('\n')
    const hashedCanonical = crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')
    const credentialScope = `${date}/${OCR_SERVICE}/tc3_request`
    const stringToSign = ['TC3-HMAC-SHA256', String(timestamp), credentialScope, hashedCanonical].join('\n')
    const signature = signTc3(secretKey, date, OCR_SERVICE, stringToSign)
    const auth = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const options = {
      hostname: OCR_HOST,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Host: OCR_HOST,
        'X-TC-Action': OCR_ACTION,
        'X-TC-Version': OCR_VERSION,
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Region': 'ap-guangzhou',
        Authorization: auth,
        'Content-Length': Buffer.byteLength(payload, 'utf8'),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.Response?.Error) {
            reject(new Error(json.Response.Error.Message || 'OCR识别失败'))
            return
          }
          const items: { DetectedText?: string }[] = json.Response?.TextDetections || []
          const text = items.map((t) => t.DetectedText || '').join('\n')
          resolve(text.trim())
        } catch (e) {
          reject(new Error('OCR返回解析失败'))
        }
      })
    })

    req.on('error', (e: Error) => reject(new Error('OCR网络错误: ' + e.message)))
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('OCR接口超时'))
    })
    req.write(payload, 'utf8')
    req.end()
  })
}
