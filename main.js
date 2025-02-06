import axios from "axios";
import chalk from "chalk";
import figlet from "figlet";
import Web3 from "web3";
import fs from "fs/promises";
import JoinSpace from "./joinSpace.js";
import getSessions from "./getSessions.js";
import { Config } from "./config.js";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { fileURLToPath } from "url"; // Import necessary functions for file URL conversion
import { dirname } from "path"; // Import necessary functions for path manipulation
const __filename = fileURLToPath(import.meta.url); // Get the current module's filename
const __dirname = dirname(__filename);
import { HttpsProxyAgent } from "https-proxy-agent";

const baseHeader = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
  Referer: "https://dapp.fractionai.xyz/",
  Origin: "https://dapp.fractionai.xyz",
  "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

const displayBanner = () => {
  const hakari = chalk.yellow("BY BOYOKE ENCOK");
  console.log(hakari);
};
const delay = (second) => new Promise((resolve) => setTimeout(resolve, second * 1000));

const newAgent = (proxy = null) => {
  if (proxy) {
    if (proxy.startsWith("http://")) {
      return new HttpsProxyAgent(proxy);
    } else if (proxy.startsWith("socks4://") || proxy.startsWith("socks5://")) {
      return new SocksProxyAgent(proxy);
    } else {
      console.log(chalk.yellow(`Unsupported proxy type: ${proxy}`));
      return null;
    }
  }
  return null;
};

async function readFile(pathFile) {
  try {
    const datas = await fs.readFile(pathFile, "utf8");
    return datas
      .split("\n")
      .map((data) => data.trim())
      .filter((data) => data.length > 0);
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    return [];
  }
}

class ClientAPI {
  constructor(accountIndex, wallet, proxy, authInfo) {
    this.accountIndex = accountIndex;
    this.authInfo = authInfo;
    this.wallet = wallet;
    this.proxy = proxy;
    this.proxyIp = "Unknown IP";
  }

  async checkProxyIP() {
    try {
      const proxyAgent = new HttpsProxyAgent(this.proxy);
      const response = await axios.get("https://api.ipify.org?format=json", { httpsAgent: proxyAgent });
      if (response.status === 200) {
        this.proxyIP = response.data.ip;
        return response.data.ip;
      } else {
        throw new Error(`Cannot check proxy IP. Status code: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Error checking proxy IP: ${error.message}`);
    }
  }

  login = async (privateKey) => {
    const web3 = new Web3(new Web3.providers.HttpProvider("https://sepolia.infura.io"));
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);

    const getNonce = await axios.get("https://dapp-backend-large.fractionai.xyz/api3/auth/nonce", {
      headers: baseHeader
    });
    const nonce = getNonce.data.nonce;

    const issuedAt = new Date().toISOString();
    const message = `dapp.fractionai.xyz wants you to sign in with your Ethereum account:
${account.address}

Sign in with your wallet to Fraction AI.

URI: https://dapp.fractionai.xyz
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${issuedAt}`;

    const signature = web3.eth.accounts.sign(message, privateKey);
    const payload = {
      message,
      signature: signature.signature,
      referralCode: "BB03C69E",
    };

    const loginData = await axios.post("https://dapp-backend-large.fractionai.xyz/api3/auth/verify", payload, {
      headers: {
        ...baseHeader,
        "Content-Type": "application/json",
        },
        httpsAgent: newAgent(this.proxy),
    });

    return loginData.data;
  };

  runAccount = async () => {

    try {
      this.proxyIP = await this.checkProxyIP()
      if(!this.proxyIP) return console.log(chalk.yellow(`Can't check proxy ${this.proxy} for account ${this.accountIndex+1}`))
      const privateKey = this.wallet;
      const formattedPrivateKey = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;
      const getlogin = await this.login(formattedPrivateKey);
      if (!getlogin) return;
      this.authInfo = getlogin;

      //   process.exit(0);

      const getAiagent = await JoinSpace(getlogin.accessToken, getlogin.user.id);
      console.log(chalk.green(`Success login with wallet: ${getlogin.user.walletAddress} | Fractal Amount : ${getlogin.user.fractal} | Total agent: ${getAiagent.aiagentId.length}`));
      for (let j = 0; j < getAiagent.aiagentId.length; j++) {
        const aiagentId = getAiagent.aiagentId[j];
        const agentName = getAiagent.nameAgent[j];
        console.log(`[Account ${this.accountIndex + 1}] Wating 30s to get sessions...`);
        const session = await getSessions(getlogin);
        // console.log(session, getlogin);
        // console.log(getAiagent.aiagentId);

        if (session.length < 6) {
          try {
            const joinSpace = await axios.post(
              `https://dapp-backend-large.fractionai.xyz/api3/matchmaking/initiate`,
              { userId: getlogin.user.id, agentId: aiagentId, entryFees: Config.ENTRYFEE, sessionTypeId: 1 },
              {
                headers: {
                  ...baseHeader,
                  Authorization: `Bearer ${getlogin.accessToken}`,
                  "Content-Type": "application/json",
                },
                httpsAgent: newAgent(this.proxy),
              }
            );

            if (joinSpace.status === 200) {
              console.log(chalk.green(`[Account ${this.accountIndex + 1}] Success join space with ${agentName} : agentId: ${aiagentId} `));
            }
          } catch (error) {
            if (error.response.data.error.includes("6 for the hour")) {
              console.log(chalk.yellow(`[Account ${this.accountIndex + 1}] Session limmited | Wait 1 hour before proceeding to the next agent...`));
              continue;
            } else if (error.response) {
              console.log(
                chalk.yellow(
                  `[Account ${this.accountIndex + 1}] Failed join space with ${agentName} agent: ${aiagentId}, Status: ${error.response.status}, Reason: ${error.response.data.error || "Unknown"}`
                )
              );
            } else {
              console.log(chalk.red(`Error occurred: ${error.message}`));
            }
          }
        } else if (session.length >= 6) {
          console.log(chalk.yellow(`[Account ${this.accountIndex + 1}] Session limit reached, wait 30s before proceeding to the next agent...`));
          continue;
        } else {
          console.log(chalk.yellow(`[Account ${this.accountIndex + 1}] Error Session not found `));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };
}

async function runWorker(workerData) {
  const { wallet, accountIndex, proxy } = workerData;
  const to = new ClientAPI(accountIndex, wallet, proxy);
  try {
    await to.runAccount();
    parentPort.postMessage({
      accountIndex,
    });
  } catch (error) {
    parentPort.postMessage({ accountIndex, error: error.message });
  } finally {
    if (!isMainThread) {
      parentPort.postMessage("taskComplete");
    }
  }
}

async function main() {
  displayBanner();
  await delay(1);

  const proxies = await readFile("proxy.txt");
  let wallets = await readFile("privateKeys.txt");

  if (proxies.length === 0) console.log("No proxies found in proxy.txt - running without proxies");
  if (wallets.length === 0) {
    console.log('No Wallets found, creating new Wallets first "npm run autoref"');
    return;
  }

  let maxThreads = Config.MAX_THREADS;

  while (true) {
    let currentIndex = 0;
    const errors = [];

    while (currentIndex < wallets.length) {
      const workerPromises = [];
      const batchSize = Math.min(maxThreads, wallets.length - currentIndex);
      for (let i = 0; i < batchSize; i++) {
        const worker = new Worker(__filename, {
          workerData: {
            wallet: wallets[currentIndex],
            accountIndex: currentIndex,
            proxy: proxies[currentIndex % proxies.length],
          },
        });

        workerPromises.push(
          new Promise((resolve) => {
            worker.on("message", (message) => {
              if (message === "taskComplete") {
                worker.terminate();
              }
              resolve();
            });
            worker.on("error", (error) => {
              console.log(`Worker error for account ${currentIndex}: ${error.message}`);
              worker.terminate();
              resolve();
            });
            worker.on("exit", (code) => {
              worker.terminate();
              if (code !== 0) {
                errors.push(`Worker for the account ${currentIndex} exit with code: ${code}`);
              }
              resolve();
            });
          })
        );

        currentIndex++;
      }

      await Promise.all(workerPromises);

      if (errors.length > 0) {
        errors.length = 0;
      }

      if (currentIndex < wallets.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    console.log(chalk.magenta(`Completed all account | Waiting ${Config.SLEEP_TIME} minutes to continue...`));
    await delay(Config.SLEEP_TIME * 60);
  }
}

if (isMainThread) {
  main().catch((error) => {
    console.log("Error:", error);
    process.exit(1);
  });
} else {
  runWorker(workerData);
}
