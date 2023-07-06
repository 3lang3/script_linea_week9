import { Galex } from "@/module";
import { task } from "@/utils/utils";
import { ethers } from "ethers";

export const retweet = async (wallet: ethers.Wallet) => {
  await task('retweet', wallet, async () => {
    const account = new Galex({ privateKey: wallet.privateKey });
    const { addressInfo } = await account.basicUserInfo();
    if (!addressInfo) throw Error('用户信息获取失败');
    if (!addressInfo.twitterUserID) throw Error('用户未绑定twitter');
    const r = await account.addTypedCredentialItems({
      credId: '299525679151226880',
      items: [wallet.address.toLocaleLowerCase()],
      operation: 'APPEND',
    });
    if (!r.typedCredentialItems) {
      throw Error('retweet任务失败');
    }
  })
};