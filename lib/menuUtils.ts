import type { Dish, DishDetail, DishOptionGroup } from './types'

// ── 食材英文 → 中文映射表 ──────────────────────────────────────────
const INGREDIENT_ZH_MAP: Record<string, string> = {
  lettuce: '生菜', salad: '沙拉', tomato: '番茄', tomatoes: '番茄',
  beef: '牛肉', chicken: '鸡肉', fish: '鱼', pork: '猪肉', lamb: '羊肉', duck: '鸭肉',
  cheese: '芝士', bacon: '培根', onion: '洋葱', onions: '洋葱',
  garlic: '大蒜', 'olive oil': '橄榄油', basil: '罗勒', pepper: '胡椒', salt: '盐',
  pasta: '意面', rice: '米饭', bread: '面包', egg: '鸡蛋', eggs: '鸡蛋',
  milk: '牛奶', cream: '奶油', butter: '黄油', mushroom: '蘑菇', mushrooms: '蘑菇',
  shrimp: '虾', salmon: '三文鱼', cod: '鳕鱼', tuna: '金枪鱼', crab: '蟹',
  potato: '土豆', potatoes: '土豆', carrot: '胡萝卜', carrots: '胡萝卜',
  spinach: '菠菜', broccoli: '西兰花', asparagus: '芦笋', avocado: '牛油果',
  lemon: '柠檬', lemons: '柠檬', lime: '青柠', olive: '橄榄', olives: '橄榄',
  parmesan: '帕玛森芝士', mozzarella: '马苏里拉芝士', feta: '羊奶酪',
  cilantro: '香菜', parsley: '欧芹', thyme: '百里香', oregano: '牛至',
  honey: '蜂蜜', vinegar: '醋', 'soy sauce': '酱油', mustard: '芥末',
  coconut: '椰子', almond: '杏仁', walnut: '核桃', peanut: '花生',
  'bell pepper': '甜椒', 'green pepper': '青椒', chili: '辣椒',
  ginger: '姜', 'green onion': '葱', scallion: '葱', 'spring onion': '葱',
  noodle: '面条', noodles: '面条', 'rice noodle': '米粉',
  tofu: '豆腐', seaweed: '海苔', nori: '海苔', wasabi: '芥末',
  'sour cream': '酸奶油', yogurt: '酸奶', 'maple syrup': '枫糖浆',
}

function translateIngredientToZh(value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (INGREDIENT_ZH_MAP[lower]) return INGREDIENT_ZH_MAP[lower]
  if (/[\u4e00-\u9fff]/.test(raw)) return raw
  return ''
}

function isPlaceholderIngredient(value: string): boolean {
  const raw = String(value ?? '').trim()
  if (!raw) return true
  const normalized = raw.toLowerCase().replace(/[：:()（）\[\]【】]/g, '').replace(/\s+/g, '')
  const genericOnly = /^(食材|原料|配料|材料|主料|辅料|佐料|调料|ingredient|ingredients|material|materials|item|food)$/i
  return (
    genericOnly.test(raw) ||
    /^(食材|原料|配料|材料|主料|辅料|佐料|调料)[a-z0-9一二三四五六七八九十甲乙丙丁]?$/.test(raw) ||
    /(食材|原料|配料|材料|ingredient|material)[-_:： ]?[a-z0-9一二三四五六七八九十甲乙丙丁]+$/i.test(raw) ||
    /^(ingredient|ingredients|material|materials)[-_ ]?[a-z0-9]+$/i.test(raw) ||
    /^(item|food)[-_ ]?[a-z0-9]+$/i.test(raw) ||
    /(示例|样例|占位|placeholder|sample|demo|test|mock)/i.test(raw) ||
    /^(a|b|c|d|e|f|g|1|2|3|4|5|6)$/.test(normalized)
  )
}

export function normalizeIngredients(list: unknown): string[] {
  if (!Array.isArray(list) && typeof list !== 'string') return []
  const seen = new Set<string>()
  const result: string[] = []
  const rawList = Array.isArray(list) ? list : [list]
  rawList.forEach((item) => {
    const value = String(item ?? '').trim()
    if (!value) return
    const parts = value
      .split(/[、,，;；/|]/)
      .map((part) =>
        part
          .trim()
          .replace(/^[\-•·\s]+/, '')
          .replace(/^(食材|原料|配料|材料|主料|辅料|佐料|调料)[：:]\s*/i, '')
          .trim()
      )
      .filter(Boolean)
    const candidates = parts.length > 0 ? parts : [value]
    candidates.forEach((candidate) => {
      if (!candidate || isPlaceholderIngredient(candidate)) return
      const zh = translateIngredientToZh(candidate) || candidate
      if (!zh) return
      const key = zh.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      if (result.length < 6) result.push(zh)
    })
  })
  return result
}

// ── 价格工具 ──────────────────────────────────────────────────────
export function normalizePrice(raw: unknown): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  const normalized = value.replace(/^楼/, '').replace(/\s+/g, ' ')
  if (!/[0-9]/.test(normalized)) return ''
  if (normalized.length > 30) return normalized.slice(0, 30)
  return normalized
}

export function extractCurrencySymbol(price: string): string {
  const value = String(price || '').trim()
  if (!value) return ''
  const symbolMatch = value.match(/^(¥|￥|\$|€|£|₩|₽|₹|฿|₫|₺|₴|₱|CHF|HK\$|MOP\$|NT\$|R\$|A\$|C\$)/i)
  return symbolMatch ? symbolMatch[1] : ''
}

export function detectMenuCurrencySymbol(dishes: Dish[]): string {
  const counter: Record<string, number> = {}
  dishes.forEach((dish) => {
    const price = String(dish.detail?.price ?? '').trim()
    const symbol = extractCurrencySymbol(price)
    if (!symbol) return
    counter[symbol] = (counter[symbol] || 0) + 1
  })
  let best = ''
  let max = 0
  Object.keys(counter).forEach((key) => {
    if (counter[key] > max) { max = counter[key]; best = key }
  })
  return best
}

export function applyCurrencySymbol(price: string, menuCurrencySymbol: string): string {
  const value = String(price || '').trim()
  if (!value) return ''
  if (!menuCurrencySymbol) return value
  if (extractCurrencySymbol(value)) return value
  if (!/^[0-9]+(\.[0-9]+)?$/.test(value)) return value
  return `${menuCurrencySymbol}${value}`
}

// ── 选项组规范化 ────────────────────────────────────────────────────
export function normalizeOptionGroups(raw: unknown): DishOptionGroup[] {
  if (!Array.isArray(raw)) return []
  const groups: DishOptionGroup[] = []
  ;(raw as Record<string, unknown>[]).forEach((item) => {
    const obj = (item ?? {}) as Record<string, unknown>
    const group = String(obj.group ?? obj.name ?? obj.title ?? '').trim()
    const rule = String(obj.rule ?? '').trim().slice(0, 30)
    const source = Array.isArray(obj.choices) ? obj.choices
      : Array.isArray(obj.items) ? obj.items
      : Array.isArray(obj.options) ? obj.options : []
    const seen = new Set<string>()
    const choices: string[] = []
    ;(source as unknown[]).forEach((entry) => {
      const text = typeof entry === 'string' ? entry.trim()
        : String((entry as Record<string, unknown>)?.name ?? (entry as Record<string, unknown>)?.label ?? (entry as Record<string, unknown>)?.value ?? '').trim()
      if (!text || seen.has(text)) return
      seen.add(text)
      if (choices.length < 12) choices.push(text)
    })
    if (!group && !rule && choices.length === 0) return
    if (groups.length < 6) groups.push({ group, rule, choices })
  })
  return groups
}

// ── 菜品分类识别 ────────────────────────────────────────────────────
const CATEGORY_RULES: { label: string; patterns: RegExp[] }[] = [
  { label: '拼盘', patterns: [/platter|board|sharing|assorted|tasting|combination|selection|mixed|charcuterie.?board|antipasto|拼盘|拼板|拼碟|什锦|拼|组合|精选拼|分享盘/] },
  { label: '饮品', patterns: [/\bcocktail|mocktail|mojito|margarita|martini|negroni|aperol|spritz|\bwine\b|\bbeer\b|\bcoffee\b|\btea\b|\bjuice\b|\blatte\b|\bespresso\b|\bcappuccino\b|\bamericano\b|\bsmoothie\b|\bsangria\b|\bgin\b|\bvodka\b|\brum\b|\bwhisky|\bwhiskey|\bliqueur\b|\bmilkshake\b|\blemonade\b|\bboba\b|鸡尾酒|无酒精饮|饮品|咖啡|奶茶|果茶|花茶|果汁|苏打水|汽水|拿铁|美式咖啡|卡布奇诺|奶昔|柠檬水|果昔|气泡水|冷萃/] },
  { label: '汤品', patterns: [/\bsoup\b|\bbisque\b|\bchowder\b|\bgazpacho\b|\bvichyssoise\b|\bminestrone\b|\bbouillabaisse\b|\bbouillon\b|\bconsommé\b|汤$|^汤|浓汤|汤品|例汤|冷汤|炖汤|奶油汤|罗宋汤|法式洋葱汤|蛤蜊浓汤/] },
  { label: '沙拉', patterns: [/\bsalad\b|沙拉|凯撒|尼斯沙拉|华尔道夫/] },
  { label: '意面', patterns: [/\bpasta\b|\bspaghetti\b|\blinguine\b|\bfettuccine\b|\bpenne\b|\brigatoni\b|\btagliatelle\b|\blasagna\b|\bravioli\b|\btortellini\b|\bgnocchi\b|\borzo\b|意面|意粉|通心粉|意式饺子|宽面|扁面条/] },
  { label: '烩饭', patterns: [/\brisotto\b|\bpaella\b|\bpilaf\b|\bfried.?rice\b|烩饭|海鲜饭|炒饭|炖饭|焗饭|盖饭|饭|丼/] },
  { label: '披萨', patterns: [/\bpizza\b|\bflatbread.{0,8}(pizza|topped)|披萨|比萨|薄饼披萨/] },
  { label: '汉堡', patterns: [/\bburger\b|\bhamburger\b|\bsmash.?burger\b|汉堡|汉堡包|芝士堡|牛肉堡|鸡堡|鱼堡|虾堡/] },
  { label: '三明治', patterns: [/\bsandwich\b|\bsub\b|\bpanini\b|\bclub\b|\bhero\b|\bhoagie\b|三明治|三文治|潜艇堡|帕尼尼/] },
  { label: '炸物', patterns: [/\bfried\b|\bdeep.?fry|\bfritter\b|\bschnitzel\b|\btempura\b|\bcalamari\b|\bchips\b|\bfries\b|\bnugget|\bwing|\btender|\bstrip\b|炸鸡|炸薯条|炸鱿鱼|炸虾|鸡翅|鸡米花|薯条|薯格|炸猪排|炸鱼|裹粉炸/] },
  { label: '烤物', patterns: [/\bgrilled?\b|\broasted?\b|\bbbq\b|\bbarbecue\b|\brotisserie\b|\bchargrilled\b|烤鸡|烤鱼|烤肉|烤羊|烤鸭|烤蔬|烧烤|炙烤|扒|焗烤|明火|炭烤/] },
  { label: '牛排', patterns: [/\bsteak\b|\bsirloin\b|\bribeye\b|\btenderloin\b|\bt.?bone\b|\bentrecôte\b|\bnew.?york.?strip\b|牛排|菲力|西冷|肋眼|牛扒|霜降牛/] },
  { label: '炖菜', patterns: [/\bstew\b|\bragu\b|\bconfit\b|\bcassoulet\b|\bossobuco\b|\bratatouille\b|\bbraised?\b|\bslow.?cook|\bcacciatore\b|炖|烩菜|勃艮第|油封|普罗旺斯炖|红酒炖|砂锅|慢煮/] },
  { label: '寿司', patterns: [/\bsushi\b|\bsashimi\b|\bnigiri\b|\bmaki\b|\btemaki\b|\bomakase\b|\buramaki\b|寿司|刺身|手卷|卷物|鱼生|握寿司|军舰卷/] },
  { label: '煎饼', patterns: [/\bcrepe\b|\bcrêpe\b|\bpancake\b|\bwaffle\b|\bdutch.?baby\b|煎饼|可丽饼|华夫|班戟|薄饼/] },
  { label: '派', patterns: [/\bpie\b|\bquiche\b|\btart\b|\bwellington\b|派|法式咸派|酥皮|挞|千层酥|惠灵顿/] },
  { label: '冷盘', patterns: [/\bcharcuterie\b|\bprosciutto\b|\bjamón\b|\bgravlax\b|\bantipasto\b|\bbresaola\b|\bcarpaccio\b|冷盘|冷切|腌肉|帕尔马火腿|伊比利亚|烟熏三文鱼|生牛肉片|熟食/] },
  { label: '面包', patterns: [/\bbread\b(?!.{0,10}(sandwich|crumb|basket|bowl))|\bcroissant\b|\bpretzel\b|\bfocaccia\b|\bciabatta\b|\bsourdough\b|\bbrioche\b|\bbagel\b|\bnaan\b|\bpita\b|面包|可颂|碱水结|佛卡夏|恰巴塔|酸面包|贝果|皮塔饼/] },
  { label: '海鲜', patterns: [/\bseafood\b|\blobster\b|\boyster\b|\bcrab\b|\bprawn\b|\bscallop\b|\bclam\b|\bmussel\b|\boctopus\b|\bsquid\b|\bhalibut\b|\bsea.?bass\b|\bdorade\b|\btuna\b|\bcod\b|海鲜|龙虾|生蚝|蟹|扇贝|蛤蜊|青口|章鱼|鱿鱼|鳕鱼|比目鱼|鲈鱼|鱼排|鱼扒/] },
  { label: '咖喱', patterns: [/\bcurry\b|\btikka\b|\bmasala\b|\bvindaloo\b|\bkorma\b|\bdal\b|\bbiryani\b|咖喱|日式咖喱|泰式咖喱|印度咖喱|黄咖喱|绿咖喱|红咖喱/] },
  { label: '墨西哥', patterns: [/\btaco\b|\bburrito\b|\bfajita\b|\bquesadilla\b|\benchilada\b|\bnachos\b|\bguacamole\b|\bchimichanga\b|塔可|卷饼|墨西哥|玉米饼|纳乔斯/] },
  { label: '牛肉', patterns: [/\bbeef\b|\bwagyu\b|\bshort.?rib\b|\bveal\b|牛肉|牛腩|牛尾|炖牛|和牛/] },
  { label: '鸡肉', patterns: [/\bchicken\b|\bpollo\b|\bpoussin\b|鸡肉|鸡腿|鸡胸|鸡块|鸡扒|嫩鸡|整鸡/] },
  { label: '猪肉', patterns: [/\bpork\b|\bpig\b|\bpiglet\b|\bwurst\b|\bporchetta\b|\biberico\b|猪排|猪肘|猪肉|猪脸|烤乳猪|猪小排/] },
  { label: '羊肉', patterns: [/\blamb\b|\bmutton\b|\bagneau\b|羊排|羊肉|羊腿|羊架/] },
  { label: '素食', patterns: [/\bvegan\b|\bvegetarian\b|\bveggie\b|\bplant.?based\b|素食|纯素|蔬食|全素/] },
  { label: '甜点', patterns: [/\bdessert\b|\bcake\b|\bpudding\b|\bice.?cream\b|\btiramisu\b|\bmacaron\b|\bchurros\b|\bsoufflé\b|\btrifle\b|\bmousse\b|\bpanna.?cotta\b|\bfondant\b|\bbrownie\b|\bmille.?feuille\b|\bcrème.?brûlée\b|\bprofiterole\b|\bgelato\b|\bsorbet\b|\bcheesecake\b|\bparfait\b|甜点|蛋糕|布丁|提拉米苏|冰淇淋|雪糕|马卡龙|蛋挞|舒芙蕾|慕斯|奶冻|焦糖布丁|泡芙|千层酥|巧克力熔岩/] },
  { label: '小食', patterns: [/\bappetizer\b|\bstarter\b|\btapas\b|\bbruschetta\b|\bamuse.?bouche\b|\bfingers\b|\bsnack\b|小食|开胃菜|小菜|前菜/] },
]

export function inferDishCategory(dish: { originalName?: string; briefCN?: string }): string {
  const nameText = [
    String(dish.originalName || ''),
    String(dish.briefCN || ''),
  ].join(' ').toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(nameText))) return rule.label
  }
  return '其他'
}

// ── 完整 detail 规范化（用于展开时） ────────────────────────────────
export function normalizeDishDetail(
  detail: DishDetail | null,
  menuCurrencySymbol: string
): DishDetail {
  if (!detail) {
    return { description: '', introduction: '', ingredients: [], flavor: '', price: '', options: [], recommendation: '' }
  }
  const normalizedDescription = String(detail.description || '').toLowerCase() === 'manual input' ? '' : detail.description || ''
  const introduction = detail.introduction?.trim() || normalizedDescription
  return {
    description: normalizedDescription,
    introduction,
    ingredients: normalizeIngredients(detail.ingredients),
    flavor: detail.flavor || '',
    price: applyCurrencySymbol(normalizePrice(detail.price), menuCurrencySymbol),
    options: normalizeOptionGroups(detail.options),
    recommendation: detail.recommendation || '',
    dietaryTags: detail.dietaryTags,
  }
}

// ── 价格数字提取 ────────────────────────────────────────────────────
export function parsePriceNumber(price: string): number {
  const value = String(price || '').trim()
  if (!value) return NaN
  const matched = value.match(/-?\d+(?:\.\d+)?/)
  if (!matched) return NaN
  return Number(matched[0])
}
