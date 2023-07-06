import { ethers } from "ethers";
import { readFileSync } from "fs";
import fse from 'fs-extra';
import path from "path";

/** 生成固定长度的字符串 */
export const randomString = (len: number) => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const maxPos = chars.length;
  let str = '';
  for (let i = 0; i < len; i++) {
    str += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return str;
}

export const randomLetterString = (len: number) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const maxPos = chars.length;
  let str = '';
  for (let i = 0; i < len; i++) {
    str += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return str;
}

// 获取txt文件内容，移除空行和制表符并转换为数组
export function getTxtContent(path: string) {
  const str = readFileSync(path, 'utf-8');
  return str.split(/[(\r\n)\r\n]+/).filter(el => el);
}

/** 循环执行直到任务成功 */
export function loop(task, sleepNum = 0) {
  return new Promise(async (resolve) => {
    while (true) {
      try {
        await task();
        resolve(true)
        break;
      } catch (error) {
        console.log(`[loop] ${error?.reason || error?.message}`)
      }
      if (sleepNum) {
        await new Promise(resolve => setTimeout(resolve, 1000 * sleepNum))
      }
    }
  })
}

/** 
 * 任务执行模块
 * @param taskName 任务名称
 * @param walletAddr 钱包地址
 * @param cb 任务回调
 * @returns
 */
export async function task(taskName, wallet: ethers.Wallet, cb, opts?: {
  runCount?: number
  force?: boolean
}) {
  const { force, runCount = 1 } = opts || {}
  const walletAddr = wallet.address;
  const logPath = path.join(process.cwd(), 'cache', walletAddr);
  const isExsit = await fse.pathExists(logPath)
  const text = `[任务|${taskName}]${walletAddr}:`;
  let log = {};
  await loop(async () => {
    log = isExsit
      ? fse.readJSONSync(logPath) || {}
      : fse.writeJSONSync(logPath, {});
  })
  if (log?.[taskName] >= runCount && !force) return
  console.log(`${text}⌛️执行中...`)
  try {
    await cb()
    const count = (log?.[taskName] || 0) + 1;
    // 确保文件写入成功
    await loop(() => {
      fse.writeJSONSync(logPath, { ...log, [taskName]: count });
      console.log(`✅${text}执行成功`)
    })
  } catch (error) {
    console.log(`❌${text}执行失败: ${error?.reason || error?.message}`)
  }
}