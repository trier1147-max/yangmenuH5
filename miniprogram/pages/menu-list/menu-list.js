"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var history_1 = require("../../services/history");
var INGREDIENT_ZH_MAP = {
    lettuce: "生菜", salad: "沙拉", tomato: "番茄", tomatoes: "番茄",
    beef: "牛肉", chicken: "鸡肉", fish: "鱼", pork: "猪肉", lamb: "羊肉", duck: "鸭肉",
    cheese: "芝士", bacon: "培根", onion: "洋葱", onions: "洋葱",
    garlic: "大蒜", "olive oil": "橄榄油", basil: "罗勒", pepper: "胡椒", salt: "盐",
    pasta: "意面", rice: "米饭", bread: "面包", egg: "鸡蛋", eggs: "鸡蛋",
    milk: "牛奶", cream: "奶油", butter: "黄油", mushroom: "蘑菇", mushrooms: "蘑菇",
    shrimp: "虾", salmon: "三文鱼", cod: "鳕鱼", tuna: "金枪鱼", crab: "蟹",
    potato: "土豆", potatoes: "土豆", carrot: "胡萝卜", carrots: "胡萝卜",
    spinach: "菠菜", broccoli: "西兰花", asparagus: "芦笋", avocado: "牛油果",
    lemon: "柠檬", lemons: "柠檬", lime: "青柠", olive: "橄榄", olives: "橄榄",
    parmesan: "帕玛森芝士", mozzarella: "马苏里拉芝士", feta: "羊奶酪",
    cilantro: "香菜", parsley: "欧芹", thyme: "百里香", oregano: "牛至",
    honey: "蜂蜜", vinegar: "醋", "soy sauce": "酱油", mustard: "芥末",
    coconut: "椰子", almond: "杏仁", walnut: "核桃", peanut: "花生",
    "bell pepper": "甜椒", "green pepper": "青椒", chili: "辣椒",
    ginger: "姜", "green onion": "葱", scallion: "葱", "spring onion": "葱",
    noodle: "面条", noodles: "面条", "rice noodle": "米粉",
    tofu: "豆腐", seaweed: "海苔", nori: "海苔", wasabi: "芥末",
    "sour cream": "酸奶油", yogurt: "酸奶", "maple syrup": "枫糖浆",
};
function translateIngredientToZh(value) {
    var raw = value.trim();
    if (!raw)
        return "";
    var lower = raw.toLowerCase();
    if (INGREDIENT_ZH_MAP[lower])
        return INGREDIENT_ZH_MAP[lower];
    if (/[\u4e00-\u9fff]/.test(raw))
        return raw;
    return "";
}
function isPlaceholderIngredient(value) {
    var raw = String(value !== null && value !== void 0 ? value : "").trim();
    if (!raw)
        return true;
    var normalized = raw
        .toLowerCase()
        .replace(/[：:()（）\[\]【】]/g, "")
        .replace(/\s+/g, "");
    var genericOnly = /^(食材|原料|配料|材料|主料|辅料|佐料|调料|ingredient|ingredients|material|materials|item|food)$/i;
    return (genericOnly.test(raw) ||
        /^(食材|原料|配料|材料|主料|辅料|佐料|调料)[a-z0-9一二三四五六七八九十甲乙丙丁]?$/.test(raw) ||
        /(食材|原料|配料|材料|ingredient|material)[-_:： ]?[a-z0-9一二三四五六七八九十甲乙丙丁]+$/i.test(raw) ||
        /^(ingredient|ingredients|material|materials)[-_ ]?[a-z0-9]+$/i.test(raw) ||
        /^(item|food)[-_ ]?[a-z0-9]+$/i.test(raw) ||
        /(示例|样例|占位|placeholder|sample|demo|test|mock)/i.test(raw) ||
        /^(a|b|c|d|e|f|g|1|2|3|4|5|6)$/.test(normalized));
}
function normalizeIngredients(list) {
    if (!Array.isArray(list) && typeof list !== "string")
        return [];
    var seen = new Set();
    var result = [];
    var rawList = Array.isArray(list) ? list : [list];
    rawList.forEach(function (item) {
        var value = String(item !== null && item !== void 0 ? item : "").trim();
        if (!value)
            return;
        var parts = value
            .split(/[、,，;；/|]/)
            .map(function (part) {
            return part
                .trim()
                .replace(/^[\-•·\s]+/, "")
                .replace(/^(食材|原料|配料|材料|主料|辅料|佐料|调料)[：:]\s*/i, "")
                .trim();
        })
            .filter(Boolean);
        var candidates = parts.length > 0 ? parts : [value];
        candidates.forEach(function (candidate) {
            if (!candidate || isPlaceholderIngredient(candidate))
                return;
            var zh = translateIngredientToZh(candidate) || candidate;
            if (!zh)
                return;
            var key = zh.toLowerCase();
            if (seen.has(key))
                return;
            seen.add(key);
            if (result.length < 6)
                result.push(zh);
        });
    });
    return result;
}
function normalizeImageSource(raw) {
    var src = String(raw !== null && raw !== void 0 ? raw : "").trim();
    if (!src.startsWith("http"))
        return src;
    var tMatch = src.match(/[?&]t=(\d{10,})/);
    if (!tMatch)
        return src;
    var expiry = Number(tMatch[1]);
    if (!Number.isFinite(expiry))
        return src;
    if (Math.floor(Date.now() / 1000) >= expiry)
        return "";
    return src;
}
function normalizePrice(raw) {
    var value = String(raw !== null && raw !== void 0 ? raw : "").trim();
    if (!value)
        return "";
    var normalized = value.replace(/^楼/, "").replace(/\s+/g, " ");
    if (!/[0-9]/.test(normalized))
        return "";
    if (normalized.length > 30)
        return normalized.slice(0, 30);
    return normalized;
}
function extractCurrencySymbol(price) {
    var value = String(price || "").trim();
    if (!value)
        return "";
    var symbolMatch = value.match(/^(¥|￥|\$|€|£|₩|₽|₹|฿|₫|₺|₴|₱|CHF|HK\$|MOP\$|NT\$|R\$|A\$|C\$)/i);
    return symbolMatch ? symbolMatch[1] : "";
}
function detectMenuCurrencySymbol(dishes) {
    var counter = {};
    dishes.forEach(function (dish) {
        var _a, _b;
        var price = String((_b = (_a = dish.detail) === null || _a === void 0 ? void 0 : _a.price) !== null && _b !== void 0 ? _b : "").trim();
        var symbol = extractCurrencySymbol(price);
        if (!symbol)
            return;
        counter[symbol] = (counter[symbol] || 0) + 1;
    });
    var best = "";
    var max = 0;
    Object.keys(counter).forEach(function (key) {
        if (counter[key] > max) {
            max = counter[key];
            best = key;
        }
    });
    return best;
}
function applyCurrencySymbol(price, menuCurrencySymbol) {
    var value = String(price || "").trim();
    if (!value)
        return "";
    if (!menuCurrencySymbol)
        return value;
    if (extractCurrencySymbol(value))
        return value;
    if (!/^[0-9]+(\.[0-9]+)?$/.test(value))
        return value;
    return "".concat(menuCurrencySymbol).concat(value);
}
function normalizeOptionRule(rule) {
    var value = String(rule !== null && rule !== void 0 ? rule : "").trim();
    if (!value)
        return "";
    if (value.length > 30)
        return value.slice(0, 30);
    return value;
}
function normalizeOptionGroups(raw) {
    if (!Array.isArray(raw))
        return [];
    var groups = [];
    raw.forEach(function (item) {
        var _a, _b, _c;
        var obj = (item !== null && item !== void 0 ? item : {});
        var group = String((_c = (_b = (_a = obj.group) !== null && _a !== void 0 ? _a : obj.name) !== null && _b !== void 0 ? _b : obj.title) !== null && _c !== void 0 ? _c : "").trim();
        var rule = normalizeOptionRule(obj.rule);
        var source = Array.isArray(obj.choices)
            ? obj.choices
            : Array.isArray(obj.items)
                ? obj.items
                : Array.isArray(obj.options)
                    ? obj.options
                    : [];
        var seen = new Set();
        var choices = [];
        source.forEach(function (entry) {
            var _a, _b, _c;
            var text = typeof entry === "string"
                ? entry.trim()
                : String((_c = (_b = (_a = entry === null || entry === void 0 ? void 0 : entry.name) !== null && _a !== void 0 ? _a : entry === null || entry === void 0 ? void 0 : entry.label) !== null && _b !== void 0 ? _b : entry === null || entry === void 0 ? void 0 : entry.value) !== null && _c !== void 0 ? _c : "").trim();
            if (!text || seen.has(text))
                return;
            seen.add(text);
            if (choices.length < 12)
                choices.push(text);
        });
        if (!group && !rule && choices.length === 0)
            return;
        if (groups.length < 6)
            groups.push({ group: group, rule: rule, choices: choices });
    });
    return groups;
}
function inferDishCategory(dish) {
    var _a, _b, _c, _d;
    // 优先用 originalName（菜单原文/英文）匹配，避免中文歧义（如 鸡尾酒→鸡肉）
    var text = [
        String(dish.originalName || ""),
        String(dish.briefCN || ""),
        String(((_a = dish.detail) === null || _a === void 0 ? void 0 : _a.introduction) || ((_b = dish.detail) === null || _b === void 0 ? void 0 : _b.description) || ""),
        String(((_c = dish.detail) === null || _c === void 0 ? void 0 : _c.background) || ""),
        String(((_d = dish.detail) === null || _d === void 0 ? void 0 : _d.flavor) || ""),
    ]
        .join(" ")
        .toLowerCase();
    // 顺序重要：更具体的品类放前面。匹配以英文原文为主，展示仍为中文。
    var rules = [
        { label: "沙拉", patterns: [/salad|沙拉/] },
        { label: "汤品", patterns: [/soup|bisque|chowder|gazpacho|汤|浓汤|汤品|冷汤/] },
        { label: "意面", patterns: [/pasta|spaghetti|linguine|fettuccine|penne|lasagna|ravioli|gnocchi|意面|意粉|通心粉|意式饺子/] },
        { label: "烩饭", patterns: [/risotto|paella|烩饭|海鲜饭/] },
        { label: "炖菜", patterns: [/stew|ragu|confit|ratatouille|炖|烩菜|勃艮第|油封|普罗旺斯炖菜/] },
        { label: "烤物", patterns: [/grill|grilled|roast|roasted|烤鸡|烤鱼|烤肉|烤羊|烤鸭|烤蔬菜|烧烤/] },
        { label: "牛排", patterns: [/steak|sirloin|ribeye|tenderloin|t-?bone|牛排|菲力|西冷|肋眼/] },
        { label: "披萨", patterns: [/pizza|披萨/] },
        { label: "汉堡", patterns: [/burger|hamburger|汉堡|汉堡包|芝士堡|牛肉堡|鸡堡|鱼堡|虾堡/] },
        { label: "三明治", patterns: [/sandwich|sub|panini|三明治|三文治|潜艇堡|帕尼尼/] },
        { label: "炸物", patterns: [/fries|fried chicken|chicken wings|wings|nuggets|schnitzel|炸鸡|炸薯条|鸡翅|鸡米花|薯条|薯格|炸肉排/] },
        { label: "寿司", patterns: [/sushi|sashimi|nigiri|maki|寿司|刺身|手卷|卷物/] },
        { label: "煎饼", patterns: [/crepe|pancake|waffle|煎饼|可丽饼|华夫/] },
        { label: "面包", patterns: [/bread|croissant|pretzel|toast|baguette|面包|可颂|碱水结|吐司|法棍/] },
        { label: "冷盘", patterns: [/charcuterie|prosciutto|jamón|gravlax|冷盘|冷切|腌肉|帕尔马火腿|伊比利亚|腌鱼|烟熏三文鱼/] },
        { label: "派", patterns: [/pie|quiche|派|法式咸派|酥皮/] },
        { label: "海鲜", patterns: [/seafood|shrimp|prawn|salmon|cod|octopus|mussel|海鲜|虾|蟹|贝|三文鱼|鳕鱼|青口|章鱼/] },
        { label: "饮品", patterns: [/cocktail|mojito|margarita|martini|negroni|aperol|spritz|wine|beer|coffee|tea|juice|latte|espresso|smoothie|sangria|gin|vodka|rum|whisky|whiskey|liqueur|鸡尾酒|饮品|咖啡|茶|果汁|苏打|汽水|拿铁|美式|奶昔/] },
        { label: "鸡肉", patterns: [/chicken\b|chicken\s|鸡肉|鸡腿|鸡胸|鸡块|鸡(?!尾)/] },
        { label: "猪肉", patterns: [/pork|wurst|bratwurst|猪排|猪肘|猪肉|香肠/] },
        { label: "羊肉", patterns: [/lamb|mutton|羊排|羊肉|羊腿/] },
        { label: "咖喱", patterns: [/curry|咖喱/] },
        { label: "塔可卷饼", patterns: [/taco|burrito|wrap|fajita|塔可|卷饼/] },
        { label: "小食", patterns: [/appetizer|starter|tapas|bruschetta|小食|开胃菜|小菜|前菜|小食拼盘|意式烤面包/] },
        { label: "甜点", patterns: [/dessert|cake|pudding|ice cream|tiramisu|macaron|churros|soufflé|甜点|蛋糕|布丁|提拉米苏|冰淇淋|马卡龙|蛋挞|舒芙蕾/] },
    ];
    for (var _i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
        var rule = rules_1[_i];
        if (rule.patterns.some(function (pattern) { return pattern.test(text); }))
            return rule.label;
    }
    return "其他";
}
Page({
    data: {
        recordId: "",
        fromHistory: false,
        imageFileID: "",
        allDishes: [],
        dishes: [],
        categories: [],
        collapsedCategories: [],
        activeCategory: "all",
        categoryExpanded: false,
        orderDishCount: 0,
        orderItemCount: 0,
        orderAmountText: "",
        orderSummaryText: "",
        orderListItems: [],
        showOrderBar: false,
        orderDetailVisible: false,
        scrollIntoId: "",
        initialLoading: true,
        processing: false,
        timeoutHint: "",
        error: "",
    },
    _processingTimer: 0,
    _pollTimer: 0,
    _expandedKeys: new Set(),
    _orderMap: new Map(),
    onLoad: function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var recordId, fromHistory, app, pending, record, _a;
            var _this = this;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        recordId = (_b = options === null || options === void 0 ? void 0 : options.recordId) !== null && _b !== void 0 ? _b : "";
                        fromHistory = (options === null || options === void 0 ? void 0 : options.from) === "history";
                        this.setData({
                            recordId: recordId,
                            fromHistory: fromHistory,
                            initialLoading: true,
                            processing: false,
                            timeoutHint: "",
                            error: "",
                            activeCategory: "all",
                        });
                        if (!recordId) {
                            this.setData({ initialLoading: false, error: "缺少记录 ID" });
                            return [2 /*return*/];
                        }
                        this._processingTimer = setTimeout(function () {
                            if (_this.data.processing) {
                                _this.setData({ timeoutHint: "识别时间较长，可能网络或服务繁忙，可返回重试" });
                            }
                        }, 30000);
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, , 5]);
                        app = getApp();
                        pending = (_c = app.globalData) === null || _c === void 0 ? void 0 : _c.pendingRecord;
                        record = null;
                        if (pending && String(pending._id) === String(recordId)) {
                            app.globalData.pendingRecord = null;
                            record = pending;
                        }
                        else if (pending) {
                            app.globalData.pendingRecord = null;
                        }
                        if (!!record) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, history_1.getRecordById)(recordId)];
                    case 2:
                        record = (_d.sent());
                        _d.label = 3;
                    case 3:
                        if (!record) {
                            this.setData({ initialLoading: false, error: "未找到记录" });
                            return [2 /*return*/];
                        }
                        this.applyRecord(record);
                        if (record.status === "processing") {
                            this.startPolling(recordId);
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        _a = _d.sent();
                        this.setData({ initialLoading: false, error: "加载失败，请重试" });
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
    applyRecord: function (record) {
        var _this = this;
        var _a, _b;
        var list = (_b = (((_a = record.partialDishes) === null || _a === void 0 ? void 0 : _a.length) ? record.partialDishes : record.dishes)) !== null && _b !== void 0 ? _b : [];
        var menuCurrencySymbol = detectMenuCurrencySymbol(list);
        var dishes = list.map(function (d, index) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            var normalizedDescription = String(((_a = d.detail) === null || _a === void 0 ? void 0 : _a.description) || "").toLowerCase() === "manual input"
                ? ""
                : ((_b = d.detail) === null || _b === void 0 ? void 0 : _b.description) || "";
            var introduction = ((_d = (_c = d.detail) === null || _c === void 0 ? void 0 : _c.introduction) === null || _d === void 0 ? void 0 : _d.trim()) ||
                normalizedDescription;
            var detail = d.detail
                ? Object.assign({}, {
                    description: "",
                    introduction: "",
                    ingredients: [],
                    flavor: "",
                    price: "",
                    options: [],
                    recommendation: "",
                }, d.detail, {
                    description: normalizedDescription,
                    introduction: introduction,
                    ingredients: normalizeIngredients((_e = d.detail) === null || _e === void 0 ? void 0 : _e.ingredients),
                    flavor: ((_f = d.detail) === null || _f === void 0 ? void 0 : _f.flavor) || "",
                    price: applyCurrencySymbol(normalizePrice((_g = d.detail) === null || _g === void 0 ? void 0 : _g.price), menuCurrencySymbol),
                    options: normalizeOptionGroups((_h = d.detail) === null || _h === void 0 ? void 0 : _h.options),
                    recommendation: ((_j = d.detail) === null || _j === void 0 ? void 0 : _j.recommendation) || "",
                })
                : {
                    description: "",
                    introduction: "",
                    ingredients: [],
                    flavor: "",
                    price: "",
                    options: [],
                    recommendation: "",
                };
            var key = _this.getDishIdentity(d, index);
            var orderCount = _this._orderMap.get(key) || 0;
            return Object.assign({}, d, {
                key: key,
                category: inferDishCategory(d),
                orderCount: orderCount,
                detail: detail,
                expanded: _this._expandedKeys.has(key),
            });
        });
        var processing = record.status === "processing";
        var error = record.status === "error" ? record.errorMessage || "识别失败" : "";
        var hasProgress = dishes.length > 0;
        var clearHint = !processing || hasProgress;
        var categories = this.buildCategories(dishes);
        var activeCategory = categories.some(function (c) { return c.key === _this.data.activeCategory; })
            ? this.data.activeCategory
            : "all";
        var collapsedCategories = categories.slice(0, 4);
        var filteredDishes = this.filterDishesByCategory(dishes, activeCategory);
        var summary = this.computeOrderSummaryPayload(dishes);
        this.setData({
            imageFileID: normalizeImageSource(record.imageFileID),
            allDishes: dishes,
            dishes: filteredDishes,
            categories: categories,
            collapsedCategories: collapsedCategories,
            activeCategory: activeCategory,
            initialLoading: false,
            processing: processing,
            timeoutHint: clearHint ? "" : this.data.timeoutHint,
            error: error,
            orderDishCount: summary.orderDishCount,
            orderItemCount: summary.orderItemCount,
            orderAmountText: summary.orderAmountText,
            orderSummaryText: summary.orderSummaryText,
            orderListItems: summary.orderListItems,
            showOrderBar: summary.orderItemCount >= 1,
        });
        if (record.status === "done" || record.status === "error") {
            this.stopPolling();
        }
    },
    /** 使用稳定的 key（不含 price），避免流式更新时 price 变化导致展开状态丢失 */
    getDishIdentity: function (dish, index) {
        var _a, _b;
        var name = String((_a = dish.originalName) !== null && _a !== void 0 ? _a : "").trim();
        var brief = String((_b = dish.briefCN) !== null && _b !== void 0 ? _b : "").trim();
        return "".concat(name, "__").concat(brief, "__").concat(index);
    },
    buildCategories: function (dishes) {
        var counter = {};
        dishes.forEach(function (dish) {
            var label = dish.category || "其他";
            counter[label] = (counter[label] || 0) + 1;
        });
        var categories = Object.keys(counter)
            .sort(function (a, b) { return counter[b] - counter[a]; })
            .map(function (label) { return ({ key: label, label: label, count: counter[label] }); });
        categories.unshift({ key: "all", label: "全部", count: dishes.length });
        return categories;
    },
    filterDishesByCategory: function (dishes, categoryKey) {
        if (categoryKey === "all")
            return dishes;
        return dishes.filter(function (dish) { return dish.category === categoryKey; });
    },
    refreshVisibleDishes: function () {
        var visible = this.filterDishesByCategory(this.data.allDishes, this.data.activeCategory);
        this.setData({ dishes: visible });
    },
    parsePriceNumber: function (price) {
        var value = String(price || "").trim();
        if (!value)
            return NaN;
        var matched = value.match(/-?\d+(?:\.\d+)?/);
        if (!matched)
            return NaN;
        return Number(matched[0]);
    },
    updateOrderSummary: function (sourceDishes) {
        var _this = this;
        var list = sourceDishes !== null && sourceDishes !== void 0 ? sourceDishes : this.data.allDishes;
        var selected = list.filter(function (dish) { return (dish.orderCount || 0) > 0; });
        var orderDishCount = selected.length;
        var orderItemCount = selected.reduce(function (sum, dish) { return sum + (dish.orderCount || 0); }, 0);
        var amount = 0;
        var pricedItemCount = 0;
        var lines = [];
        selected.forEach(function (dish) {
            var _a;
            var count = dish.orderCount || 0;
            var name = dish.originalName || dish.briefCN || "未命名菜品";
            lines.push("".concat(name, " x").concat(count));
            var priceText = String(((_a = dish.detail) === null || _a === void 0 ? void 0 : _a.price) || "");
            var priceNumber = _this.parsePriceNumber(priceText);
            if (Number.isFinite(priceNumber)) {
                amount += priceNumber * count;
                pricedItemCount += count;
            }
        });
        var amountBaseSymbol = detectMenuCurrencySymbol(selected);
        var orderAmountText = pricedItemCount > 0 ? "".concat(amountBaseSymbol || "¥").concat(amount.toFixed(2)) : "待定";
        var orderSummaryText = lines.length > 0 ? lines.join("\n") : "";
        var baseList = sourceDishes !== null && sourceDishes !== void 0 ? sourceDishes : this.data.allDishes;
        var orderListItems = selected.map(function (dish) {
            var _a;
            var key = dish.key || _this.getDishIdentity(dish, 0);
            var idx = baseList.findIndex(function (d) { return (d.key || "") === key; });
            return {
                key: key,
                name: dish.originalName || dish.briefCN || "未命名菜品",
                price: String(((_a = dish.detail) === null || _a === void 0 ? void 0 : _a.price) || "").trim() || "—",
                count: dish.orderCount || 0,
                scrollIndex: idx >= 0 ? idx : 0,
            };
        });
        this.setData({
            orderDishCount: orderDishCount,
            orderItemCount: orderItemCount,
            orderAmountText: orderAmountText,
            orderSummaryText: orderSummaryText,
            orderListItems: orderListItems,
        });
    },
    /** 基于给定列表计算点单汇总并返回供一次 setData 使用（避免异步导致首次加菜不显示栏） */
    computeOrderSummaryPayload: function (sourceDishes) {
        var _this = this;
        var selected = sourceDishes.filter(function (d) { return (d.orderCount || 0) > 0; });
        var orderDishCount = selected.length;
        var orderItemCount = selected.reduce(function (sum, d) { return sum + (d.orderCount || 0); }, 0);
        var amount = 0;
        var pricedItemCount = 0;
        var lines = [];
        selected.forEach(function (dish) {
            var _a;
            var count = dish.orderCount || 0;
            lines.push("".concat(dish.originalName || dish.briefCN || "未命名菜品", " x").concat(count));
            var priceNumber = _this.parsePriceNumber(String(((_a = dish.detail) === null || _a === void 0 ? void 0 : _a.price) || ""));
            if (Number.isFinite(priceNumber)) {
                amount += priceNumber * count;
                pricedItemCount += count;
            }
        });
        var amountBaseSymbol = detectMenuCurrencySymbol(selected);
        var orderAmountText = pricedItemCount > 0 ? "".concat(amountBaseSymbol || "¥").concat(amount.toFixed(2)) : "待定";
        var orderSummaryText = lines.length > 0 ? lines.join("\n") : "";
        var orderListItems = selected.map(function (dish) {
            var _a;
            var key = dish.key || _this.getDishIdentity(dish, 0);
            var idx = sourceDishes.findIndex(function (d) { return (d.key || "") === key; });
            return {
                key: key,
                name: dish.originalName || dish.briefCN || "未命名菜品",
                price: String(((_a = dish.detail) === null || _a === void 0 ? void 0 : _a.price) || "").trim() || "—",
                count: dish.orderCount || 0,
                scrollIndex: idx >= 0 ? idx : 0,
            };
        });
        return {
            orderDishCount: orderDishCount,
            orderItemCount: orderItemCount,
            orderAmountText: orderAmountText,
            orderSummaryText: orderSummaryText,
            orderListItems: orderListItems,
        };
    },
    startPolling: function (recordId) {
        var _this = this;
        this.stopPolling();
        var intervalMs = 1200;
        var pollStartTime = Date.now();
        var tick = function () { return __awaiter(_this, void 0, void 0, function () {
            var record, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (Date.now() - pollStartTime > 90000) {
                            this.stopPolling();
                            this.setData({
                                processing: false,
                                error: "识别超时，请返回重试",
                            });
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, history_1.getRecordById)(recordId)];
                    case 2:
                        record = _b.sent();
                        if (!record) {
                            this.stopPolling();
                            this.setData({
                                initialLoading: false,
                                processing: false,
                                error: "未找到记录",
                            });
                            return [2 /*return*/];
                        }
                        this.applyRecord(record);
                        if (record.status !== "processing") {
                            this.stopPolling();
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        this.stopPolling();
                        this.setData({
                            initialLoading: false,
                            processing: false,
                            error: "刷新状态失败，请返回重试",
                        });
                        return [2 /*return*/];
                    case 4:
                        this._pollTimer = setTimeout(tick, intervalMs);
                        return [2 /*return*/];
                }
            });
        }); };
        tick();
    },
    stopPolling: function () {
        if (this._pollTimer) {
            clearTimeout(this._pollTimer);
            this._pollTimer = 0;
        }
    },
    onUnload: function () {
        this.stopPolling();
        if (this._processingTimer) {
            clearTimeout(this._processingTimer);
            this._processingTimer = 0;
        }
    },
    onRetakePhoto: function () {
        wx.navigateBack();
    },
    onImageError: function () {
        if (this.data.imageFileID) {
            this.setData({ imageFileID: "" });
        }
    },
    onDishTap: function (e) {
        var _this = this;
        var index = Number(e.currentTarget.dataset.index);
        var dishes = this.data.dishes;
        // Guard: undefined/invalid dataset.index yields NaN; avoid crash on dishes[NaN]
        if (Number.isNaN(index) || index < 0 || index >= dishes.length)
            return;
        var dish = dishes[index];
        var key = dish.key || this.getDishIdentity(dish, index);
        var nextExpanded = !dish.expanded;
        if (dish.expanded)
            this._expandedKeys.delete(key);
        else
            this._expandedKeys.add(key);
        var allDishes = this.data.allDishes.map(function (item, itemIndex) {
            var itemKey = item.key || _this.getDishIdentity(item, itemIndex);
            return itemKey === key ? Object.assign({}, item, { expanded: nextExpanded }) : item;
        });
        var nextDishes = this.filterDishesByCategory(allDishes, this.data.activeCategory);
        this.setData({ allDishes: allDishes, dishes: nextDishes });
    },
    onCategoryTap: function (e) {
        var key = String(e.currentTarget.dataset.key || "all");
        if (key === this.data.activeCategory)
            return;
        this.setData({ activeCategory: key });
        this.refreshVisibleDishes();
    },
    onCategoryExpandTap: function () {
        this.setData({ categoryExpanded: !this.data.categoryExpanded });
    },
    onAddOrder: function (e) {
        var key = String(e.currentTarget.dataset.key || "");
        if (!key)
            return;
        var count = (this._orderMap.get(key) || 0) + 1;
        this._orderMap.set(key, count);
        this.syncOrderCountByKey(key, count);
    },
    onDecreaseOrder: function (e) {
        var key = String(e.currentTarget.dataset.key || "");
        if (!key)
            return;
        var current = this._orderMap.get(key) || 0;
        var next = Math.max(0, current - 1);
        if (next === 0)
            this._orderMap.delete(key);
        else
            this._orderMap.set(key, next);
        this.syncOrderCountByKey(key, next);
    },
    syncOrderCountByKey: function (key, count) {
        var allDishes = this.data.allDishes.map(function (dish) {
            return dish.key === key ? Object.assign({}, dish, { orderCount: count }) : dish;
        });
        var dishes = this.filterDishesByCategory(allDishes, this.data.activeCategory);
        var summary = this.computeOrderSummaryPayload(allDishes);
        var showOrderBar = summary.orderItemCount >= 1;
        this.setData({
            orderDishCount: summary.orderDishCount,
            orderItemCount: summary.orderItemCount,
            orderAmountText: summary.orderAmountText,
            orderSummaryText: summary.orderSummaryText,
            orderListItems: summary.orderListItems,
            showOrderBar: showOrderBar,
        });
        this.setData({ allDishes: allDishes, dishes: dishes });
    },
    /** 仅阻止冒泡：点击数量区域时不触发展开/收起 */
    onStepperAreaTap: function () { },
    onOrderSummaryTap: function () {
        if (this.data.orderItemCount <= 0)
            return;
        this.setData({ orderDetailVisible: !this.data.orderDetailVisible });
    },
    onCloseOrderDetail: function () {
        this.setData({ orderDetailVisible: false });
    },
    onOrderItemTap: function (e) {
        var _this = this;
        var key = String(e.currentTarget.dataset.key || "");
        var scrollIndex = Number(e.currentTarget.dataset.scrollIndex);
        if (!key)
            return;
        this.setData({ orderDetailVisible: false });
        var _a = this.data, allDishes = _a.allDishes, activeCategory = _a.activeCategory;
        var inAllDishes = allDishes.some(function (d) { return (d.key || "") === key; });
        if (!inAllDishes)
            return;
        var scrollToDish = function () {
            _this.setData({ scrollIntoId: "dish-" + scrollIndex });
            setTimeout(function () { return _this.setData({ scrollIntoId: "" }); }, 600);
        };
        if (activeCategory !== "all") {
            this.setData({ activeCategory: "all", dishes: allDishes }, function () {
                setTimeout(scrollToDish, 80);
            });
        }
        else {
            setTimeout(scrollToDish, 80);
        }
    },
});
