// 洋菜单 - 小程序入口，初始化云开发与用户信息
import type { User } from "./utils/types";
import type { ScanRecord } from "./utils/types";

export interface AppOption {
  globalData: {
    openid: string;
    userInfo: User | null;
    initPromise: Promise<void>;
    /** 跳转前缓存的 record，供 menu-list 直接使用，避免二次请求 */
    pendingRecord?: (ScanRecord & { _id: string }) | null;
  };
}

App({
  globalData: {
    openid: "",
    userInfo: null,
    initPromise: Promise.resolve(),
    pendingRecord: null as (ScanRecord & { _id: string }) | null,
  } as AppOption["globalData"],

  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      return;
    }
    wx.cloud.init({
      env: "cloud1-0gdbdassd6ca82d8",
      traceUser: true,
    });
    this.globalData.initPromise = this.initUser();
  },

  /** 应用回到前台时，若首页在等待选图（左滑返回不会触发 Page.onShow），在此兜底重置 */
  onShow() {
    const pages = getCurrentPages();
    const cur = pages[pages.length - 1] as WechatMiniprogram.Page.Instance<Record<string, unknown>, Record<string, unknown>> | undefined;
    if (cur?.route === "pages/index/index") {
      const d = cur.data as { isProcessing?: boolean; loading?: boolean };
      if (d?.isProcessing && !d?.loading) {
        cur.setData({ isProcessing: false });
      }
    }
  },

  async initUser() {
    try {
      await wx.login();
      const res = await wx.cloud.callFunction<{ openid: string; user: User }>({
        name: "getUserInfo",
        data: {},
      });
      const result = res.result as { openid?: string; user?: User };
      if (result?.openid && result?.user) {
        this.globalData.openid = result.openid;
        this.globalData.userInfo = result.user;
      }
    } catch (e) {
      console.error("initUser failed:", e);
    }
  },
});
