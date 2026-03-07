"use strict";
/**
 * 洋菜单 - 前端服务层测试（微信开发者工具控制台手动运行）
 * 使用方式：在控制台输入 runAllTests() 或 require('./tests/service-test').runAllTests()
 * 需在 app.json 中注册测试页面或在任意页面中 require 后挂到全局
 */
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
exports.runAllTests = runAllTests;
var ai_1 = require("../services/ai");
var history_1 = require("../services/history");
var results = [];
function ok(name, pass, msg) {
    results.push({ name: name, pass: pass, msg: msg });
    console.log(pass ? "  \u2705 ".concat(name) : "  \u274C ".concat(name).concat(msg ? ": " + msg : ""));
}
/** 测试 history.getRecentRecords 返回格式 */
function testGetRecentRecords() {
    return __awaiter(this, void 0, void 0, function () {
        var list, item, hasId, hasTimeText, hasDishSummary, hasDishCount, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, history_1.getRecentRecords)(3)];
                case 1:
                    list = _a.sent();
                    if (!Array.isArray(list)) {
                        ok("getRecentRecords 返回数组", false, "返回类型非数组");
                        return [2 /*return*/];
                    }
                    ok("getRecentRecords 返回数组", true);
                    if (list.length > 0) {
                        item = list[0];
                        hasId = "_id" in item;
                        hasTimeText = "timeText" in item;
                        hasDishSummary = "dishSummary" in item;
                        hasDishCount = "dishCount" in item;
                        ok("getRecentRecords 项含 _id/timeText/dishSummary/dishCount", hasId && hasTimeText && hasDishSummary && hasDishCount);
                    }
                    else {
                        ok("getRecentRecords 空记录返回空数组", list.length === 0);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    ok("getRecentRecords", false, String(e_1));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** 测试 history.getRecordById 空 ID 返回 null */
function testGetRecordByIdEmpty() {
    return __awaiter(this, void 0, void 0, function () {
        var r, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, history_1.getRecordById)("")];
                case 1:
                    r = _a.sent();
                    ok("getRecordById 空 ID 返回 null", r === null);
                    return [3 /*break*/, 3];
                case 2:
                    e_2 = _a.sent();
                    ok("getRecordById 空 ID", false, String(e_2));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** 测试 ai.recognizeMenu 失败时返回 { dishes: [] } 不抛异常 */
function testRecognizeMenuFail() {
    return __awaiter(this, void 0, void 0, function () {
        var res, hasDishes, noThrow, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, ai_1.recognizeMenu)("invalid-file-id-xxx", false)];
                case 1:
                    res = _a.sent();
                    hasDishes = Array.isArray(res.dishes);
                    noThrow = true;
                    ok("recognizeMenu 失败时返回 dishes 数组", hasDishes);
                    ok("recognizeMenu 失败时不抛异常", noThrow);
                    ok("recognizeMenu 失败时 dishes 为空", res.dishes.length === 0 && !!res.error);
                    return [3 /*break*/, 3];
                case 2:
                    e_3 = _a.sent();
                    ok("recognizeMenu 失败时不抛异常", false, "抛出了异常: " + String(e_3));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** 测试 ai.recognizeMenu 返回值结构包含 dishes */
function testRecognizeMenuStructure() {
    return __awaiter(this, void 0, void 0, function () {
        var res, hasDishes, d, e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, ai_1.recognizeMenu)("invalid-file-id-structure-test", false)];
                case 1:
                    res = _a.sent();
                    hasDishes = "dishes" in res && Array.isArray(res.dishes);
                    ok("recognizeMenu 返回值含 dishes 数组", hasDishes);
                    if (res.dishes.length > 0) {
                        d = res.dishes[0];
                        ok("dishes 项含 originalName/briefCN/detail", "originalName" in d && "briefCN" in d && "detail" in d);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    e_4 = _a.sent();
                    ok("recognizeMenu 结构", false, String(e_4));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** 测试 ai.recognizeManualDishes 失败时返回 { dishes: [] } */
function testRecognizeManualDishesFail() {
    return __awaiter(this, void 0, void 0, function () {
        var res, e_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, ai_1.recognizeManualDishes)([])];
                case 1:
                    res = _a.sent();
                    ok("recognizeManualDishes 空数组时返回 dishes 数组", Array.isArray(res.dishes));
                    ok("recognizeManualDishes 失败时 dishes 为空", res.dishes.length === 0 || !!res.error);
                    return [3 /*break*/, 3];
                case 2:
                    e_5 = _a.sent();
                    ok("recognizeManualDishes 失败不抛异常", false, String(e_5));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** 运行所有测试 */
function runAllTests() {
    return __awaiter(this, void 0, void 0, function () {
        var passed, failed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results.length = 0;
                    console.log("\n========== 洋菜单 服务层测试 ==========\n");
                    return [4 /*yield*/, testGetRecentRecords()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, testGetRecordByIdEmpty()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, testRecognizeMenuFail()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, testRecognizeMenuStructure()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, testRecognizeManualDishesFail()];
                case 5:
                    _a.sent();
                    passed = results.filter(function (r) { return r.pass; }).length;
                    failed = results.filter(function (r) { return !r.pass; }).length;
                    console.log("\n========== 结果 ==========");
                    console.log("\u901A\u8FC7: ".concat(passed, "  \u5931\u8D25: ").concat(failed));
                    return [2 /*return*/, { passed: passed, failed: failed, results: results }];
            }
        });
    });
}
