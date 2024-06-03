require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const {
  addChatId,
  removeChatId,
  getSubscribedChats,
  getTBANKData,
  gettaoUSDData,
  getwTAOData,
  decodeTransaction,
} = require("./utils");
const token = process.env.BOT_API_KEY;
const bot = new Telegraf(token);

const tbankContract = require("./contracts/tbank");
const tbankStakeContract = require("./contracts/tbankStake");
const taousdContract = require("./contracts/taousd");
const wtaoContract = require("./contracts/wtao");
const wtaoStakeContract = require("./contracts/wtaoStake");

bot.catch((err, ctx) => {
  console.log(`Polling error for ${ctx.updateType}`, err);
});

bot.start((ctx) => {
  addChatId(ctx.chat.id);
  ctx.reply("🎉 You have successfully subscribed to updates.", {
    parse_mode: "HTML",
  });
});

bot.command("stop", (ctx) => {
  removeChatId(ctx.chat.id);
  ctx.reply("You have successfully unsubscribed from updates.", {
    parse_mode: "HTML",
  });
});

bot.on("message", (ctx) => {
  const chatId = ctx.chat.id;
  if (chatId === "private") {
    const hello = `
Send <b>/start</b> to subscribe or <b>/stop</b> to unsubscribe.

<a href='https://www.taobank.ai/'>Home</a> | <a href='https://app.taobank.ai/home'>Buy</a> | <a href='https://app.taobank.ai/home'>Staking</a> | <a href='https://docs.taobank.ai/'>Docs</a>
`;
    ctx.reply(hello, { parse_mode: "HTML" });
  }
});

bot.launch();

let eventQueue = [];
let isProcessing = false;
let timeoutId = null;

tbankStakeContract.events
  .StakeChanged({
    fromBlock: "latest",
  })
  .on("data", (event) => {
    eventQueue.push({ event, contract: tbankContract });
    console.log(`[${new Date().toISOString()}] Event added to queue:`, event);
    processQueue();
  });

taousdContract.events
  .Transfer({
    fromBlock: "latest",
  })
  .on("data", (event) => {
    eventQueue.push({ event, contract: taousdContract });
    console.log(`[${new Date().toISOString()}] Event added to queue:`, event);
    processQueue();
  });

wtaoStakeContract.events
  .Staked({
    fromBlock: "latest",
  })
  .on("data", (event) => {
    eventQueue.push({ event, contract: wtaoContract });
    console.log(`[${new Date().toISOString()}] Event added to queue:`, event);
    processQueue();
  });

async function processQueue() {
  if (isProcessing || eventQueue.length === 0) {
    return;
  }

  isProcessing = true;

  const { event, contract } = eventQueue[0];
  const success = await processEvent(event, contract);
  if (success) {
    console.log(
      `[${new Date().toISOString()}] Event processed successfully: ${
        event.transactionHash
      }`
    );
    eventQueue.shift();
    isProcessing = false;
    if (eventQueue.length > 0) {
      processQueue();
    }
  } else {
    console.error(
      `[${new Date().toISOString()}] Failed to process event: ${
        event.transactionHash
      }`
    );
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      isProcessing = false;
      processQueue();
    }, 5000);
  }
}

async function processEvent(event, contract) {
  const subscribedChats = await getSubscribedChats();

  if (subscribedChats.length > 0) {
    let tokenData;
    let decimals;
    let network;
    let price;
    let readableAmount;
    let user;

    try {
      console.log("Try to fetch token data");
      if (
        event.address.toLowerCase() ===
        "0xfce658b6e7B93F9c8281bbFd93394fBfd04A1402".toLowerCase()
      ) {
        tokenData = await getTBANKData("taobank");
        network = "arbitrum";
        decimals = 18;
        price = tokenData.price;
        readableAmount =
          Number(await decodeTransaction(event.transactionHash, network)) /
          Math.pow(10, decimals);
        user = event.returnValues._staker;
      } else if (
        event.address.toLowerCase() ===
          "0x966570a84709d693463cdd69dcadb0121b2c9d26".toLowerCase() &&
        event.returnValues.to.toLowerCase() ===
          "0xDf7b328d07FD11F4CC7199E17719cde7D2971DA1".toLowerCase()
      ) {
        tokenData = await gettaoUSDData(event.address);
        network = "arbitrum";
        decimals = 18;
        price = tokenData.price;
        readableAmount =
          Number(event.returnValues.value) / Math.pow(10, decimals);
        user = event.returnValues.from;
      } else if (
        event.address.toLowerCase() ===
        "0x3E0858F65aBF8606103f2c6B98138E4208cC795B".toLowerCase()
      ) {
        tokenData = await getwTAOData();
        network = "ethereum";
        decimals = 9;
        price = tokenData.price;
        readableAmount =
          Number(event.returnValues.amount) / Math.pow(10, decimals);
        user = event.returnValues.user;
      } else {
        console.log("Not staking");
        return true;
      }
    } catch (error) {
      console.error("Failed to fetch token data:", error);
      return false;
    }

    const name = await contract.methods.name().call();
    const symbol = await contract.methods.symbol().call();
    const totalSupply = await contract.methods.totalSupply().call();
    const marketCap = price * (Number(totalSupply) / Math.pow(10, decimals));

    const photoPath = path.join(__dirname, "images", "staking.jpg");
    const caption = `
<b><a href='https://t.me/taobnk'>${name}</a> Staked!</b>
    
🔀 Amount <b>${readableAmount
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${symbol} ($${parseFloat(
      (readableAmount * price).toFixed(2)
    )})</b>
👤 <a href="https://${
      network === "arbitrum" ? "arbiscan" : "etherscan"
    }.io/address/${user}">User</a> / <a href="https://${
      network === "arbitrum" ? "arbiscan" : "etherscan"
    }.io/tx/${event.transactionHash}">TX</a>
${price && `🏷 Price <b>$${parseFloat(price.toFixed(3))}</b>`}
${
  marketCap &&
  `💸 Market Cap <b>$${marketCap
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</b>`
}

<a href='https://www.taobank.ai/'>Home</a> | <a href='https://app.taobank.ai/home'>Buy</a> | <a href='https://app.taobank.ai/staking'>Staking</a> | <a href='https://docs.taobank.ai/'>Docs</a>
`;

    for (const chatId of subscribedChats) {
      try {
        const form = new FormData();
        form.append("chat_id", chatId);
        form.append("photo", fs.createReadStream(photoPath));
        form.append("caption", caption);
        form.append("parse_mode", "HTML");

        await axios.post(
          `https://api.telegram.org/bot${token}/sendPhoto`,
          form,
          {
            headers: form.getHeaders(),
          }
        );
      } catch (error) {
        console.error(`Failed to send photo to chat ${chatId}:`, error);
      }
    }
  }

  return true;
}
