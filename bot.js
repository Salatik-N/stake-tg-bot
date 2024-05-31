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
} = require("./utils");

const token = process.env.BOT_API_KEY;
const bot = new Telegraf(token);

const tbankContract = require("./contracts/tbank");
const taousdContract = require("./contracts/taousd");
const wtaoContract = require("./contracts/wtao");

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
  if (ctx.chat.type === "private") {
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
let retryInterval = 5000;

[tbankContract, taousdContract, wtaoContract].forEach((contract) => {
  contract.events
    .Transfer({
      fromBlock: "latest",
    })
    .on("data", (event) => {
      eventQueue.push({ event, contract });
      console.log("Event added to queue:", event);
      processQueue();
    });
});

async function processQueue() {
  if (isProcessing || eventQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (eventQueue.length > 0) {
    const { event, contract } = eventQueue[0];
    const success = await processEvent(event, contract);
    if (success) {
      console.log(`Event processed successfully: ${event.transactionHash}`);
      eventQueue.shift();
    } else {
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }

  isProcessing = false;
}

async function processEvent(event, contract) {
  console.log(event);
  const subscribedChats = await getSubscribedChats();

  if (subscribedChats.length > 0) {
    let tokenData;
    let decimals;

    try {
      if (
        event.address.toLowerCase() ===
          "0x05cbef357cb14f9861c01f90ac7d5c90ce0ef05e".toLowerCase() &&
        event.returnValues.to.toLowerCase() ===
          "0xfce658b6e7B93F9c8281bbFd93394fBfd04A1402".toLowerCase()
      ) {
        tokenData = await getTBANKData("taobank");
        decimals = 18;
      } else if (
        event.address.toLowerCase() ===
          "0x966570a84709d693463cdd69dcadb0121b2c9d26".toLowerCase() &&
        event.returnValues.to.toLowerCase() ===
          "0xDf7b328d07FD11F4CC7199E17719cde7D2971DA1".toLowerCase()
      ) {
        tokenData = await gettaoUSDData(event.address);
        decimals = 18;
      } else if (
        event.address.toLowerCase() ===
          "0x77e06c9eccf2e797fd462a92b6d7642ef85b0a44".toLowerCase() &&
        event.returnValues.to.toLowerCase() ===
          "0x3E0858F65aBF8606103f2c6B98138E4208cC795B".toLowerCase()
      ) {
        tokenData = await getwTAOData(event.address);
        decimals = 9;
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

    const price = tokenData.price;
    const marketCap = price * (Number(totalSupply) / Math.pow(10, decimals));
    const readableAmount =
      Number(event.returnValues.value) / Math.pow(10, decimals);
    const photoPath = path.join(__dirname, "images", "staking.jpg");
    const caption = `
<b><a href='https://t.me/taobnk'>${name}</a> Staked!</b>
    
🔀 Amount <b>${readableAmount
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${symbol} ($${parseFloat(
      (readableAmount * price).toFixed(2)
    )})</b>
👤 <a href="https://arbiscan.io/address/${
      event.returnValues.from
    }">User</a> / <a href="https://arbiscan.io/tx/${
      event.transactionHash
    }">TX</a>
${price && `🏷 Price <b>$${parseFloat(price.toFixed(3))}</b>`}
${
  marketCap &&
  `💸 Market Cap <b>$${marketCap
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</b>`
}

<a href='https://www.taobank.ai/'>Home</a> | <a href='https://app.taobank.ai/home'>Buy</a> | <a href='https://app.taobank.ai/staking'>Staking</a> | <a href='https://docs.taobank.ai/'>Docs</a>
`;

    try {
      await Promise.all(
        subscribedChats.map(async (chatId) => {
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
        })
      );
      return true;
    } catch (error) {
      if (error.code === "EAI_AGAIN" || error.code === "EFATAL") {
        console.error("Network error occurred:", error);
      } else {
        console.error("Failed to send photo:", error);
      }
      return false;
    }
  }

  return true;
}
