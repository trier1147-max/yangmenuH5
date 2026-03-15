import { NextRequest } from 'next/server'
import { extractTextByOcr } from '@/lib/ocr'
import https from 'https'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const parser = require('../../../cloudfunctions/recognizeMenu/parser')

const AI_MODEL = 'deepseek-v3.2'
const AI_HOST = 'api.lkeap.cloud.tencent.com'
const AI_PATH = '/v1/chat/completions'
const AI_MAX_TOKENS = 6000
const AI_TIMEOUT_MS = 90000
const OCR_INPUT_MAX_CHARS = 3000

const DEEPSEEK_PROMPT = `你是一个专业的菜单识别助手，帮助中国用户读懂海外餐厅菜单。

【质量第一 - 最高优先级】
- 每道菜的 description 至少 2-3 句，说明起源/特色/做法，有背景故事的要写出来
- flavor 要具体描述（不只是"鲜美"两字），写出层次感
- recommendation 要说明适合什么口味偏好的人，以及是否推荐第一次来的客人尝试
- 宁可只处理前 12-15 道主要菜品，也要保证每道菜介绍详尽充实，绝不为凑数量而牺牲质量

【输出格式】仅返回合法 JSON，不返回 Markdown、解释或任何多余文字：
{
  "isMenu": true,
  "dishes": [
    {
      "originalName": "菜单原文菜名（保留原文）",
      "briefCN": "15字内中文概括",
      "description": "菜品介绍：起源、特色与做法（2-4句，纯中文）",
      "flavor": "具体风味与口感描述，如香辣酥脆、酸甜鲜嫩、浓郁醇厚（纯中文）",
      "recommendation": "适合什么口味偏好的人，第一次来是否推荐尝试（纯中文）",
      "price": "原价格格式，如 $8.9 / €12 / ¥38 / £9.5 / ₩15000；无价格返回 \"\"",
      "options": [{"group":"主食","rule":"二选一","choices":["米饭","面条"]}],
      "ingredients": ["生菜", "番茄", "芝士"]
    }
  ]
}

【强制中文化】所有面向用户字段必须 100% 纯中文，严禁任何外文：
- description、flavor、recommendation、ingredients 禁止英/法/德/西/意/日/韩等任何外文
- 食材：必须用中文（生菜、番茄、牛肉、芝士、培根、罗勒、帕玛森芝士、马苏里拉芝士）
- 烹饪术语：用中文（煎、炒、炖、烤、蒸），禁止 grilled、rôti、asado、arrosto 等
- 口味描述：用中文（香辣、鲜甜、浓郁、酥脆），禁止 spicy、épicé、picante 等
- 专有名词（提拉米苏、凯撒沙拉、帕尼尼等已中文化名称）可保留，周边描述必须中文
- 无法翻译的生僻外文直接省略，不要保留任何非中文字符

【价格规则】
- 按原币种保留格式：$8.9 / €12 / ¥38 / £9.5 / ₩15000 / 38元
- 每道菜单独填写 price；多列菜单按行对应填入，不要只填第一道
- 严禁将卡路里（350kcal）、克重（200g）、毫升（500ml）误填为 price
- 无价格时返回 ""

【菜单判定】
- 非餐厅菜单返回 {"isMenu": false, "dishes": []}
- 只有 1-2 个词，或完全不像食物相关内容，一律返回 {"isMenu": false, "dishes": []}

【仅识别菜品】严禁将说明文字、宣传语、联系方式、版权声明、页码识别为菜品

【originalName 规则】
- 必须保留菜单上的完整菜名，严禁简化
- 若 OCR 有拼写错误可修正，但不得删减或改写菜名

【其他规则】
- 按菜单从上到下顺序排列
- briefCN 纯中文不超过 15 字
- ingredients 提取 2-6 个核心食材（中文），无法判断返回 []
- 最终检查：description/flavor/recommendation/ingredients 中不允许任何拉丁字母、假名、韩文`

function optimizeOcrText(raw: string): { text: string; truncated: boolean } {
  const text = String(raw || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)

  const deduped: string[] = []
  const seen = new Set<string>()
  for (const line of text) {
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(line)
    if (deduped.length >= 200) break
  }

  const merged = deduped.join('\n')
  if (merged.length <= OCR_INPUT_MAX_CHARS) return { text: merged, truncated: false }
  return { text: merged.slice(0, OCR_INPUT_MAX_CHARS), truncated: true }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { imageBase64, dishNames } = body as { imageBase64?: string; dishNames?: string[] }

  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController, event: string, data: unknown) => {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let ocrText = ''

        if (dishNames && dishNames.length > 0) {
          // 手动输入模式
          ocrText = dishNames.map((n: string) => String(n).trim()).filter(Boolean).join('\n')
        } else if (imageBase64) {
          // 图片识别模式
          send(controller, 'status', { message: '正在识别图片文字...' })
          ocrText = await extractTextByOcr(imageBase64)
          if (!ocrText || ocrText.trim().length === 0) {
            send(controller, 'error', { message: '图片中未识别到文字，请确保图片清晰' })
            controller.close()
            return
          }
        } else {
          send(controller, 'error', { message: '请提供图片或菜名' })
          controller.close()
          return
        }

        send(controller, 'status', { message: 'AI正在翻译菜单...' })

        const { text: optimizedText } = optimizeOcrText(ocrText)
        const userContent = `请识别以下菜单 OCR 文本并返回 JSON：\n"""\n${optimizedText}\n"""`

        const bodyStr = JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: DEEPSEEK_PROMPT },
            { role: 'user', content: userContent },
          ],
          temperature: 0.5,
          max_tokens: AI_MAX_TOKENS,
          stream: true,
          thinking: { type: 'disabled' },
        })

        const defaultCurrency = parser.detectCurrencyFromOcrText(ocrText)

        await new Promise<void>((resolve, reject) => {
          let acc = ''
          let lastPartialCount = 0
          let finishReason: string | null = null

          const options = {
            hostname: AI_HOST,
            path: AI_PATH,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.LKEAP_API_KEY}`,
              'Content-Length': Buffer.byteLength(bodyStr),
            },
          }

          const aiReq = https.request(options, (res) => {
            const statusCode = res.statusCode || 0
            if (statusCode < 200 || statusCode >= 300) {
              let errBuf = ''
              res.on('data', (chunk: Buffer) => { errBuf += chunk.toString() })
              res.on('end', () => {
                let msg = `识别失败（错误码：${statusCode}），请重试`
                if (statusCode === 429) msg = '服务繁忙，请稍后再试'
                else if (statusCode === 401) msg = '服务配置异常，请联系开发者'
                reject(new Error(msg))
              })
              return
            }

            let buf = ''
            res.on('data', (chunk: Buffer) => {
              buf += chunk.toString()
              const lines = buf.split('\n')
              buf = lines.pop() || ''
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const json = JSON.parse(line.slice(6))
                    const choice = json.choices?.[0]
                    const content = choice?.delta?.content
                    const reason = choice?.finish_reason
                    if (reason) finishReason = reason
                    if (content) {
                      acc += content
                      let partial = parser.parseDishesFallback(acc)
                      if (!partial || partial.length === 0) {
                        partial = parser.tryParsePartialDishes(acc, defaultCurrency)
                      }
                      if (!partial || partial.length === 0) {
                        try { partial = parser.parseDishesMinimal(acc, defaultCurrency) || [] } catch (_) {}
                      }
                      if (partial && partial.length > lastPartialCount) {
                        lastPartialCount = partial.length
                        send(controller, 'partial', { dishes: partial, count: partial.length })
                      }
                    }
                  } catch (_) {}
                }
              }
            })

            res.on('end', () => {
              try {
                const meta = parser.parseAiResponseMeta(acc)
                if (meta && meta.isMenu === false) {
                  reject(new Error('这张图片不像是餐厅菜单哦，请对准菜单重新拍摄'))
                  return
                }

                let dishes: unknown[] = []
                try {
                  dishes = parser.parseDishesFromText(acc, defaultCurrency)
                } catch (_) {
                  dishes = parser.parseDishesMinimal(acc, defaultCurrency) || parser.parseDishesFallback(acc) || []
                }

                const ocrPrices = parser.extractPricesFromOcrText(ocrText)
                if (ocrPrices.length > 0) {
                  dishes = parser.applyPricesByIndex(dishes, ocrPrices, defaultCurrency)
                }

                const menuTooLong = finishReason === 'length'
                send(controller, 'done', { dishes, menuTooLong })
                resolve()
              } catch (e) {
                reject(e)
              }
            })
          })

          aiReq.on('error', (e: Error) => reject(new Error('网络错误: ' + e.message)))
          aiReq.setTimeout(AI_TIMEOUT_MS, () => {
            aiReq.destroy()
            reject(new Error('识别超时，请重试'))
          })
          aiReq.write(bodyStr)
          aiReq.end()
        })
      } catch (e) {
        const err = e as Error
        send(controller, 'error', { message: err.message || '识别失败，请重试' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
