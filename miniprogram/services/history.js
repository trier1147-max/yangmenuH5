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
exports.getRecordById = getRecordById;
exports.deleteRecordById = deleteRecordById;
exports.getRecentRecords = getRecentRecords;
/** 根据 recordId 获取单条扫描记录 */
function getRecordById(recordId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, res, e_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!recordId)
                        return [2 /*return*/, null];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    db = wx.cloud.database();
                    return [4 /*yield*/, db.collection("scan_records").doc(recordId).get()];
                case 2:
                    res = _b.sent();
                    return [2 /*return*/, (_a = res.data) !== null && _a !== void 0 ? _a : null];
                case 3:
                    e_1 = _b.sent();
                    console.error("getRecordById failed:", e_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/** 根据 recordId 删除单条扫描记录 */
function deleteRecordById(recordId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!recordId)
                        return [2 /*return*/, false];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    db = wx.cloud.database();
                    return [4 /*yield*/, db.collection("scan_records").doc(recordId).remove()];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    e_2 = _a.sent();
                    console.error("deleteRecordById failed:", e_2);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/** 获取最近 N 条扫描记录 */
function getRecentRecords() {
    return __awaiter(this, arguments, void 0, function (limit) {
        var db, res, list, e_3;
        if (limit === void 0) { limit = 3; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    db = wx.cloud.database();
                    return [4 /*yield*/, db
                            .collection("scan_records")
                            .orderBy("createdAt", "desc")
                            .limit(limit)
                            .get()];
                case 1:
                    res = _a.sent();
                    list = res.data.map(function (r) {
                        var _a, _b;
                        return ({
                            _id: r._id,
                            createdAt: r.createdAt,
                            timeText: formatTime(r.createdAt),
                            dishSummary: ((_a = r.dishes) !== null && _a !== void 0 ? _a : [])
                                .slice(0, 3)
                                .map(function (d) { return d.briefCN || d.originalName; })
                                .filter(Boolean)
                                .join("、") || "无菜品",
                            dishCount: ((_b = r.dishes) !== null && _b !== void 0 ? _b : []).length,
                            imageFileID: r.imageFileID || "",
                        });
                    });
                    return [2 /*return*/, list];
                case 2:
                    e_3 = _a.sent();
                    console.error("getRecentRecords failed:", e_3);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function formatTime(date) {
    var d = typeof date === "string" ? new Date(date) : date;
    var now = new Date();
    var diff = now.getTime() - d.getTime();
    if (diff < 60000)
        return "刚刚";
    if (diff < 3600000)
        return "".concat(Math.floor(diff / 60000), "\u5206\u949F\u524D");
    if (diff < 86400000)
        return "".concat(Math.floor(diff / 3600000), "\u5C0F\u65F6\u524D");
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return "".concat(d.getMonth() + 1, "-").concat(pad(d.getDate()), " ").concat(pad(d.getHours()), ":").concat(pad(d.getMinutes()));
}
