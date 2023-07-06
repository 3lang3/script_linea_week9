/**
 * LINEA WEEK 9!
 * 
 * Author @3lang3 2023-07-6
 * Github: https://github.com/3lang3
 */

import { ethers } from "ethers";
import { cli } from "./utils/cli";
import { Galex } from "./module";
import cfg from "./config";
import { loop, task } from "./utils/utils";
import * as snapshot from "./tasks/snapshot";
import * as twitter from "./tasks/twitter";
import fse from 'fs-extra';

// 领取任务积分
const claim = async (wallet: ethers.Wallet) => {
  await task('claim', wallet, async () => {
    await loop(async () => {
      const account = new Galex({ privateKey: wallet.privateKey });
      const r = await account.getPrepareParticipate({
        campaignID: cfg.campaignId,
        chain: 'ETHEREUM',
      });
      if (r.prepareParticipate?.disallowReason) {
        throw Error(`领取失败: ${r.prepareParticipate?.disallowReason}`);
      }
      if (r.prepareParticipate?.loyaltyPointsTxResp?.TotalClaimedPoints) {
        console.log(`[${wallet.address}]成功领取 ${r.prepareParticipate?.loyaltyPointsTxResp?.TotalClaimedPoints} 分`);
      }
    })
  }, {
    force: true
  })
};

cli(async ({ action, pks, startIdx, endIdx }) => {
  if (!cfg.campaignId || !cfg.w) {
    console.error(
      "❌ 请在config.ts中配置对应参数",
    );
    process.exit(1);
  }

  // 确保根目录有cache文件夹
  fse.ensureDirSync('./cache');

  for (let k = startIdx; k <= endIdx; k++) {
    const pk = pks[k];
    const wallet = new ethers.Wallet(pk);
    try {
      if (action === 'claim') {
        await claim(wallet);
      } else {
        await snapshot.vote(wallet);
        await twitter.retweet(wallet);
      }
    } catch (error) {
      console.log(error?.reason || error?.message)
    }
  }
});
