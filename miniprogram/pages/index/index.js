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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var toast_1 = __importDefault(require("@vant/weapp/toast/toast"));
var ai_1 = require("../../services/ai");
var history_1 = require("../../services/history");
var user_1 = require("../../services/user");
var MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
var ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"];
/** Validate image files: size <= 4MB, format jpg/jpeg/png. Returns error message or null if valid. */
function validateImageFiles(files) {
    var _a, _b, _c;
    if (!files || files.length === 0)
        return null;
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var f = files_1[_i];
        var size = (_a = f.size) !== null && _a !== void 0 ? _a : 0;
        if (size > MAX_IMAGE_SIZE_BYTES) {
            return "size";
        }
        var path = f.tempFilePath || "";
        var ext = (_c = (_b = path.split(".").pop()) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== null && _c !== void 0 ? _c : "";
        var hasExtension = path.includes(".") && ext.length > 0;
        if (hasExtension) {
            if (!ALLOWED_EXTENSIONS.includes(ext))
                return "format";
        }
        else {
            if (f.fileType !== "image")
                return "format";
        }
    }
    return null;
}
Page({
    data: {
        recentRecords: [],
        loading: false,
        loadingEmoji: "👨‍🍳",
        loadingBadge: "菜单小剧场",
        loadingText: "识别中...",
        showManualInput: false,
        manualInputText: "",
        isProcessing: false,
        remaining: 6,
        total: 6,
        canShare: true,
        showLimitDialog: false,
    },
    loadingTimer: 0,
    onShow: function () {
        this.refreshData();
    },
    refreshData: function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, recentRecords, usage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            (0, history_1.getRecentRecords)(3),
                            (0, user_1.checkUsage)(),
                        ])];
                    case 1:
                        _a = _b.sent(), recentRecords = _a[0], usage = _a[1];
                        this.setData({
                            recentRecords: recentRecords,
                            remaining: usage.remaining,
                            total: usage.total,
                            canShare: usage.canShare,
                        });
                        return [2 /*return*/];
                }
            });
        });
    },
    /** 轮询直到解析出至少一道菜，或识别完成/报错/超时。成功时返回 record 供跳转页直接使用，避免二次请求。 */
    waitForAtLeastOneDish: function (recordId_1) {
        return __awaiter(this, arguments, void 0, function (recordId, timeoutMs) {
            var start, record, count, full, err;
            var _a, _b, _c, _d;
            if (timeoutMs === void 0) { timeoutMs = 35000; }
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        start = Date.now();
                        _e.label = 1;
                    case 1:
                        if (!(Date.now() - start < timeoutMs)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, history_1.getRecordById)(recordId)];
                    case 2:
                        record = _e.sent();
                        if (record) {
                            count = ((_b = (_a = record.partialDishes) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) || ((_d = (_c = record.dishes) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0);
                            if (count > 0) {
                                full = record;
                                return [2 /*return*/, { hasDish: true, record: Object.assign({}, full, { _id: recordId }) }];
                            }
                            if (record.status === "done" || record.status === "error") {
                                err = record.errorMessage;
                                return [2 /*return*/, { hasDish: false, errorMessage: err }];
                            }
                        }
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1200); })];
                    case 3:
                        _e.sent();
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, { hasDish: false }];
                }
            });
        });
    },
    onTakePhoto: function () {
        return __awaiter(this, void 0, void 0, function () {
            var usage, res, valErr, e_1, errMsg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.data.isProcessing)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, user_1.checkUsage)()];
                    case 1:
                        usage = _a.sent();
                        if (usage.remaining <= 0) {
                            this.setData({ showLimitDialog: true });
                            return [2 /*return*/];
                        }
                        this.setData({ isProcessing: true });
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, 6, 7]);
                        return [4 /*yield*/, wx.chooseMedia({
                                count: 6,
                                mediaType: ["image"],
                                sourceType: ["camera"],
                            })];
                    case 3:
                        res = _a.sent();
                        valErr = validateImageFiles(res.tempFiles);
                        if (valErr) {
                            wx.showToast({
                                title: valErr === "size" ? "图片不能超过4MB，请重新选择" : "仅支持 JPG/PNG 格式",
                                icon: "none",
                            });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.handleMediaResult(res)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        e_1 = _a.sent();
                        errMsg = (e_1 === null || e_1 === void 0 ? void 0 : e_1.errMsg) || (e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || (typeof e_1 === "string" ? e_1 : "");
                        if (errMsg.includes("cancel"))
                            return [2 /*return*/]; // 用户主动取消，静默返回
                        clearInterval(this.loadingTimer);
                        this.setData({ loading: false });
                        toast_1.default.fail(errMsg || "操作失败，请重试");
                        return [3 /*break*/, 7];
                    case 6:
                        this.setData({ isProcessing: false });
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    },
    onChooseAlbum: function () {
        return __awaiter(this, void 0, void 0, function () {
            var usage, res, valErr, e_2, errMsg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.data.isProcessing)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, user_1.checkUsage)()];
                    case 1:
                        usage = _a.sent();
                        if (usage.remaining <= 0) {
                            this.setData({ showLimitDialog: true });
                            return [2 /*return*/];
                        }
                        this.setData({ isProcessing: true });
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, 6, 7]);
                        return [4 /*yield*/, wx.chooseMedia({
                                count: 6,
                                mediaType: ["image"],
                                sourceType: ["album"],
                            })];
                    case 3:
                        res = _a.sent();
                        valErr = validateImageFiles(res.tempFiles);
                        if (valErr) {
                            wx.showToast({
                                title: valErr === "size" ? "图片不能超过4MB，请重新选择" : "仅支持 JPG/PNG 格式",
                                icon: "none",
                            });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.handleMediaResult(res)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        e_2 = _a.sent();
                        errMsg = (e_2 === null || e_2 === void 0 ? void 0 : e_2.errMsg) || (e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || (typeof e_2 === "string" ? e_2 : "");
                        if (errMsg.includes("cancel"))
                            return [2 /*return*/]; // 用户主动取消，静默返回
                        clearInterval(this.loadingTimer);
                        this.setData({ loading: false });
                        toast_1.default.fail(errMsg || "操作失败，请重试");
                        return [3 /*break*/, 7];
                    case 6:
                        this.setData({ isProcessing: false });
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    },
    onManualInput: function () {
        this.setData({ showManualInput: true, manualInputText: "" });
    },
    onManualInputChange: function (e) {
        this.setData({ manualInputText: e.detail.value });
    },
    onManualInputClose: function () {
        this.setData({ showManualInput: false, manualInputText: "" });
    },
    onManualInputCancel: function () {
        this.setData({ showManualInput: false, manualInputText: "" });
    },
    onManualInputConfirm: function () {
        return __awaiter(this, void 0, void 0, function () {
            var text, dishNames, usage, result, app, e_3, errMsg;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (this.data.isProcessing)
                            return [2 /*return*/];
                        text = (this.data.manualInputText || "").trim();
                        this.setData({ showManualInput: false, manualInputText: "" });
                        if (!text) {
                            (0, toast_1.default)("请至少输入一个菜名");
                            return [2 /*return*/];
                        }
                        dishNames = this.parseManualNames(text);
                        if (dishNames.length === 0) {
                            (0, toast_1.default)("未识别到有效菜名");
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, user_1.checkUsage)()];
                    case 1:
                        usage = _d.sent();
                        if (usage.remaining <= 0) {
                            this.setData({ showLimitDialog: true });
                            return [2 /*return*/];
                        }
                        this.setData({ isProcessing: true });
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 5, 6, 7]);
                        this.setData({
                            loading: true,
                            loadingEmoji: "📝",
                            loadingBadge: "点菜顾问已就位",
                            loadingText: "正在给这道菜补上好懂的介绍...",
                        });
                        return [4 /*yield*/, (0, ai_1.recognizeManualDishes)(dishNames)];
                    case 3:
                        result = _d.sent();
                        this.setData({ loading: false });
                        if (!result.recordId || ((_b = (_a = result.dishes) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) < 1) {
                            toast_1.default.fail(result.error || "未识别到有效菜品");
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, user_1.consumeUsage)()];
                    case 4:
                        _d.sent();
                        app = getApp();
                        app.globalData.pendingRecord = {
                            _id: result.recordId,
                            _openid: "",
                            imageFileID: "",
                            dishes: (_c = result.dishes) !== null && _c !== void 0 ? _c : [],
                            status: "done",
                            createdAt: new Date(),
                        };
                        wx.navigateTo({
                            url: "/pages/menu-list/menu-list?recordId=".concat(result.recordId),
                        });
                        return [3 /*break*/, 7];
                    case 5:
                        e_3 = _d.sent();
                        this.setData({ loading: false });
                        errMsg = (e_3 === null || e_3 === void 0 ? void 0 : e_3.errMsg) || (e_3 === null || e_3 === void 0 ? void 0 : e_3.message) || (typeof e_3 === "string" ? e_3 : "");
                        toast_1.default.fail(errMsg || "操作失败，请重试");
                        return [3 /*break*/, 7];
                    case 6:
                        this.setData({ isProcessing: false });
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    },
    /** 解析手动输入的菜名，支持中英文逗号、分号、顿号、换行分隔 */
    parseManualNames: function (text) {
        var normalized = text.replace(/[\r\t]/g, " ");
        // 中英文逗号(，,)、分号(；;)、顿号(、)均可分隔
        var parts = normalized
            .split(/[\n,;\uFF0C\uFF1B\u3001]+/)
            .map(function (s) { return s.trim(); })
            .filter(Boolean)
            .slice(0, 40);
        var seen = new Set();
        var names = [];
        parts.forEach(function (name) {
            if (seen.has(name))
                return;
            seen.add(name);
            names.push(name);
        });
        return names;
    },
    handleMediaResult: function (res) {
        return __awaiter(this, void 0, void 0, function () {
            var files, timeElapsed, filePaths, compressed, fileIDs, allDishes_1, recordId, lastError_1, streamRes, _a, hasDish, errorMessage, record, results, app, e_4, errMsg;
            var _this = this;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        files = (_b = res.tempFiles) !== null && _b !== void 0 ? _b : [];
                        if (files.length === 0)
                            return [2 /*return*/];
                        this.setData({
                            loading: true,
                            loadingEmoji: "👨‍🍳",
                            loadingBadge: "菜单小剧场",
                            loadingText: "大厨正在解读这份菜单...",
                        });
                        timeElapsed = 0;
                        this.loadingTimer = setInterval(function () {
                            timeElapsed += 3;
                            if (timeElapsed >= 3 && timeElapsed < 7) {
                                _this.setData({
                                    loadingEmoji: "🍲",
                                    loadingBadge: "正在备菜",
                                    loadingText: "先帮你看看这页菜单里都有什么...",
                                });
                            }
                            else if (timeElapsed >= 7) {
                                _this.setData({
                                    loadingEmoji: "🍽️",
                                    loadingBadge: "准备上桌",
                                    loadingText: "菜品马上整理好，稍等一下...",
                                });
                            }
                        }, 3000);
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 16, , 17]);
                        filePaths = files.map(function (f) { return f.tempFilePath; });
                        return [4 /*yield*/, Promise.all(filePaths.map(function (path) {
                                return wx.compressImage({
                                    src: path,
                                    quality: 50,
                                    compressedWidth: 960,
                                });
                            }))];
                    case 2:
                        compressed = _d.sent();
                        return [4 /*yield*/, Promise.all(compressed.map(function (c) { return (0, ai_1.uploadImage)(c.tempFilePath); }))];
                    case 3:
                        fileIDs = _d.sent();
                        allDishes_1 = [];
                        recordId = null;
                        lastError_1 = "";
                        if (!(fileIDs.length === 1)) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, ai_1.recognizeMenuStream)(fileIDs[0])];
                    case 4:
                        streamRes = _d.sent();
                        recordId = (_c = streamRes.recordId) !== null && _c !== void 0 ? _c : null;
                        if (streamRes.error)
                            lastError_1 = streamRes.error;
                        if (!recordId) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.waitForAtLeastOneDish(recordId)];
                    case 5:
                        _a = _d.sent(), hasDish = _a.hasDish, errorMessage = _a.errorMessage, record = _a.record;
                        if (!hasDish) {
                            recordId = null;
                            lastError_1 = errorMessage || lastError_1 || "未识别到有效菜品";
                        }
                        else if (record) {
                            getApp().globalData.pendingRecord = record;
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        lastError_1 = lastError_1 || "识别服务启动失败，请重试";
                        _d.label = 7;
                    case 7: return [3 /*break*/, 12];
                    case 8: return [4 /*yield*/, Promise.all(fileIDs.map(function (fileID) { return (0, ai_1.recognizeMenu)(fileID, false); }))];
                    case 9:
                        results = _d.sent();
                        results.forEach(function (r) {
                            r.dishes.forEach(function (d) { return allDishes_1.push(d); });
                            if (r.error)
                                lastError_1 = r.error;
                        });
                        if (!(allDishes_1.length > 0)) return [3 /*break*/, 11];
                        return [4 /*yield*/, (0, ai_1.saveRecord)(fileIDs[0], allDishes_1)];
                    case 10:
                        recordId = _d.sent();
                        if (recordId) {
                            app = getApp();
                            app.globalData.pendingRecord = {
                                _id: recordId,
                                _openid: "",
                                imageFileID: fileIDs[0],
                                dishes: allDishes_1,
                                status: "done",
                                createdAt: new Date(),
                            };
                        }
                        return [3 /*break*/, 12];
                    case 11:
                        lastError_1 = lastError_1 || "未识别到有效菜品";
                        _d.label = 12;
                    case 12:
                        clearInterval(this.loadingTimer);
                        this.setData({ loading: false });
                        if (!recordId) return [3 /*break*/, 14];
                        return [4 /*yield*/, (0, user_1.consumeUsage)()];
                    case 13:
                        _d.sent();
                        wx.navigateTo({
                            url: "/pages/menu-list/menu-list?recordId=".concat(recordId),
                        });
                        return [3 /*break*/, 15];
                    case 14:
                        toast_1.default.fail(lastError_1 || "识别失败，请重试");
                        _d.label = 15;
                    case 15: return [3 /*break*/, 17];
                    case 16:
                        e_4 = _d.sent();
                        console.error("recognition failed:", e_4);
                        clearInterval(this.loadingTimer);
                        this.setData({ loading: false });
                        errMsg = (e_4 === null || e_4 === void 0 ? void 0 : e_4.errMsg) || (e_4 === null || e_4 === void 0 ? void 0 : e_4.message) || (typeof e_4 === "string" ? e_4 : "");
                        toast_1.default.fail(errMsg || "识别失败，请重试");
                        return [3 /*break*/, 17];
                    case 17: return [2 /*return*/];
                }
            });
        });
    },
    onRecordTap: function (e) {
        var ds = e.currentTarget.dataset;
        var recordId = (ds.recordId || ds.recordid || "");
        if (recordId) {
            wx.navigateTo({
                url: "/pages/menu-list/menu-list?recordId=".concat(recordId),
            });
        }
    },
    onDeleteRecentRecord: function (e) {
        return __awaiter(this, void 0, void 0, function () {
            var ds, recordId, modalRes, ok;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ds = e.currentTarget.dataset;
                        recordId = (ds.recordId || ds.recordid || "");
                        if (!recordId)
                            return [2 /*return*/];
                        return [4 /*yield*/, wx.showModal({
                                title: "删除记录",
                                content: "确认删除这条识别记录吗？删除后不可恢复。",
                                confirmText: "删除",
                                confirmColor: "#ee0a24",
                                cancelText: "取消",
                            })];
                    case 1:
                        modalRes = _a.sent();
                        if (!modalRes.confirm)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, history_1.deleteRecordById)(recordId)];
                    case 2:
                        ok = _a.sent();
                        if (!ok) {
                            toast_1.default.fail("删除失败，请重试");
                            return [2 /*return*/];
                        }
                        this.setData({
                            recentRecords: this.data.recentRecords.filter(function (item) { return item._id !== recordId; }),
                        });
                        toast_1.default.success("已删除");
                        return [2 /*return*/];
                }
            });
        });
    },
    onViewAllHistory: function () {
        wx.navigateTo({ url: "/pages/history/history" });
    },
    onLimitDialogConfirm: function () {
        this.setData({ showLimitDialog: false });
    },
    onLimitDialogCancel: function () {
        this.setData({ showLimitDialog: false });
    },
    /** 分享给朋友：+2 次 */
    onShareAppMessage: function () {
        var _this = this;
        (0, user_1.addShareBonus)(2).then(function (res) {
            if (res.success) {
                (0, user_1.checkUsage)().then(function (usage) {
                    _this.setData({
                        remaining: usage.remaining,
                        total: usage.total,
                        canShare: usage.canShare,
                    });
                    toast_1.default.success("已获得 2 次额外机会");
                });
            }
            else {
                toast_1.default.fail("今日次数已达上限");
            }
        });
        return {
            title: "在国外不知道吃啥？拍一下菜单AI帮你搞懂每道菜",
            path: "/pages/index/index",
            imageUrl: "",
        };
    },
    /** 分享到朋友圈：+4 次 */
    onShareTimeline: function () {
        var _this = this;
        (0, user_1.addShareBonus)(4).then(function (res) {
            if (res.success) {
                (0, user_1.checkUsage)().then(function (usage) {
                    _this.setData({
                        remaining: usage.remaining,
                        total: usage.total,
                        canShare: usage.canShare,
                    });
                    toast_1.default.success("已获得 4 次额外机会");
                });
            }
            else {
                toast_1.default.fail("今日次数已达上限");
            }
        });
        return {
            title: "在国外不知道吃啥？拍一下菜单AI帮你搞懂每道菜",
            query: "",
            imageUrl: "",
        };
    },
});
