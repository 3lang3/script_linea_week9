import config from "@/config"
import { loop, task } from "@/utils/utils"
import axios from "axios"
import { ethers } from 'ethers'

function randomChoice(len: number) {
  return Math.floor(Math.random() * len) + 1
}

async function getSignature(account, signData) {
  const { domain, types, message } = signData.data
  const signer = new ethers.Wallet(account.privateKey)
  return await signer._signTypedData(domain, types, message)
}

async function sendRequest(data) {
  const config = {
    method: 'post',
    url: 'https://hub.snapshot.org/api/msg',
    headers: {
      'authority': 'hub.snapshot.org',
      'accept': 'application/json',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'content-type': 'application/json',
      'origin': 'https://snapshot.org',
      'referer': 'https://snapshot.org/',
      'sec-ch-ua': '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
    },
    data: JSON.stringify(data)
  };
  const res = await axios(config)
  if (!res.data || !res.data?.id) {
    throw new Error('投票失败')
  }
}

async function voteOn(wallet: ethers.Wallet, params: {
  space: string,
  proposal: string,
  choice: number,
}) {
  const data = {
    "address": wallet.address,
    "data": {
      "domain": {
        "name": "snapshot",
        "version": "0.1.4"
      },
      "types": {
        "Vote": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "space",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "uint64"
          },
          {
            "name": "proposal",
            "type": "string"
          },
          {
            "name": "choice",
            "type": "uint32"
          },
          {
            "name": "reason",
            "type": "string"
          },
          {
            "name": "app",
            "type": "string"
          }
        ]
      },
      "message": {
        ...params,
        "app": "snapshot",
        "reason": "",
        "from": wallet.address,
        "timestamp": Math.floor(Date.now() / 1000)
      }
    }
  } as any;
  data.sig = await getSignature(wallet, data)
  await sendRequest(data)
}

let proposalsCache: any;

async function getProposals() {
  if (proposalsCache) {
    return proposalsCache;
  }
  const url = 'https://hub.snapshot.org/graphql?'
  const { data } = await axios.post(url, { "operationName": "Proposal", "variables": { "id": config.snapshotId }, "query": "query Proposal($id: String!) {\n  proposal(id: $id) {\n    id\n    ipfs\n    title\n    body\n    discussion\n    choices\n    start\n    end\n    snapshot\n    state\n    author\n    created\n    plugins\n    network\n    type\n    quorum\n    symbol\n    privacy\n    validation {\n      name\n      params\n    }\n    strategies {\n      name\n      network\n      params\n    }\n    space {\n      id\n      name\n    }\n    scores_state\n    scores\n    scores_by_strategy\n    scores_total\n    votes\n    flagged\n  }\n}" })
  proposalsCache = data.data.proposal
  return proposalsCache;
}

export async function vote(wallet: ethers.Wallet) {
  const proposal = await getProposals()
  await task('vote', wallet, async () => {
    const choice = randomChoice(proposal.choices.length);
    console.log(`[${wallet.address}投票]: 第${choice}项-${proposal.choices[choice - 1]}`);
    await voteOn(wallet, { space: config.snapshotSpace, proposal: proposal.id, choice: choice })
  })
}