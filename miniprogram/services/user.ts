// 洋菜单 - 用户次数管理：检查、消耗、分享奖励
import { callFunction } from "./cloud";

const BASE_LIMIT = 6;
const MAX_LIMIT = 12;

interface UserInfoRes {
  success?: boolean;
  user?: { dailyUsage?: number; dailyBonus?: number; lastUsageDate?: string };
  error?: string;
}

interface ConsumeRes {
  success?: boolean;
  error?: string;
}

interface AddBonusRes {
  success?: boolean;
  remaining?: number;
  error?: string;
}

/** 检查今日使用次数，返回剩余、总额、是否还能通过分享获取 */
export async function checkUsage(): Promise<{
  remaining: number;
  total: number;
  canShare: boolean;
}> {
  const res = await callFunction<UserInfoRes>("getUserInfo", {});
  if (!res.success || !res.user) {
    return { remaining: BASE_LIMIT, total: BASE_LIMIT, canShare: true };
  }
  const dailyUsage = res.user.dailyUsage ?? 0;
  const dailyBonus = res.user.dailyBonus ?? 0;
  const total = BASE_LIMIT + dailyBonus;
  const remaining = Math.max(0, total - dailyUsage);
  const canShare = total < MAX_LIMIT;
  return { remaining, total, canShare };
}

/** 消耗一次使用次数，拍照/识别成功后调用。成功返回 true，超限返回 false */
export async function consumeUsage(): Promise<boolean> {
  const res = await callFunction<ConsumeRes>("getUserInfo", { action: "consume" });
  return res.success === true;
}

/** 分享奖励。amount: 2=朋友 4=朋友圈。返回是否成功和新的剩余次数 */
export async function addShareBonus(amount: 2 | 4 = 2): Promise<{ success: boolean; newRemaining: number }> {
  const res = await callFunction<AddBonusRes>("getUserInfo", { action: "addBonus", amount });
  if (res.success && typeof res.remaining === "number") {
    return { success: true, newRemaining: res.remaining };
  }
  return { success: false, newRemaining: 0 };
}
