const TelegramBot = require("node-telegram-bot-api")
const { Web3 } = require("web3")
const abi = require("./abi.json")
const abiUSD = require("./abiUSD.json")
const fetch = require("node-fetch")
const fs = require("fs")
const tgChats = require("./tg-chats.json")

const token = "6588902767:AAGPQEkx5UzKgNeHGTbW4GJHyurzJicNs84"
const bot = new TelegramBot(token, { polling: true })

var web3Provider = new Web3.providers.WebsocketProvider(
  "wss://arbitrum-mainnet.infura.io/ws/v3/183bcf9bcb5949a1a9e1432adb8bb0d0"
)
var web3 = new Web3(web3Provider)

const contractsAddress = [
  "0x05cBeF357CB14F9861C01F90AC7d5C90CE0ef05e",
  "0x966570A84709D693463CDD69dCadb0121b2C9d26",
]
const contractsABI = [abi, abiUSD]
const contracts = contractsAddress.map(
  (address, index) => new web3.eth.Contract(contractsABI[index], address)
)
let lastChatId = null

bot.on("message", (msg) => {
  const chatId = msg.chat.id
  const hello = `
  <b>Hey TAO user!</b>
  
  Send <b>/start</b> to subscribe or <b>/stop</b> to unsubscribe.
  
  <a href='https://www.taobank.ai/'>Home</a> | <a href='https://app.taobank.ai/home'>Buy</a> | <a href='https://app.taobank.ai/staking'>Staking</a> | <a href='https://docs.taobank.ai/'>Docs</a>
  `

  switch (msg.text) {
    case "/start":
      addChatId(chatId)
      bot.sendMessage(chatId, "🎉 You have successfully subscribed to updates.")
      break
    case "/stop":
      removeChatId(chatId)
      bot.sendMessage(
        chatId,
        "You have successfully unsubscribed from updates."
      )
      break
    default:
      bot.sendMessage(chatId, hello, { parse_mode: "HTML" })
  }
})

contracts.forEach((contract) => {
  contract.events
    .allEvents({
      fromBlock: "latest",
    })
    .on("data", async (event) => {
      console.log("Event received: ", event) // Логирование полученного события
      const subscribedChats = await getSubscribedChats()
      if (subscribedChats.length > 0) {
        const tokenData = await getTokenData("taobank")
        const price = tokenData.price
        const symbol = await contract.methods.symbol().call()
        const totalSupply = await contract.methods.totalSupply().call()
        const marketCap = price * (Number(totalSupply) / Math.pow(10, 18))
        const decimals = 18
        const readableAmount =
          Number(event.returnValues.value) / Math.pow(10, decimals)
        const photo =
          "https://bittensor.org/wp-content/uploads/2023/07/Bittensor-Titelbild-1200x1200-1.png"
        const caption = `
<b><a href='https://t.me/taobnk'>TaoBank</a> Staked!</b>
    
🔀 Amount <b>${parseFloat(readableAmount.toFixed(2))} ${symbol}</b>
👤 <a href="https://arbiscan.io/address/${event.returnValues.to}">User</a> / <a href="https://arbiscan.io/tx/${event.transactionHash}">TX</a>
🏷 Price <b>$${parseFloat(price.toFixed(3))}</b>
💸 Market Cap <b>$${parseFloat(marketCap.toFixed(2))}</b>

<a href='https://www.taobank.ai/'>Home</a> | <a href='https://app.taobank.ai/home'>Buy</a> | <a href='https://app.taobank.ai/staking'>Staking</a> | <a href='https://docs.taobank.ai/'>Docs</a> 
      `
        subscribedChats.forEach((chatId) => {
          bot.sendPhoto(chatId, photo, {
            caption: caption,
            parse_mode: "HTML",
          })
        })
      }
    })
})

async function getTokenData(tokenId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
  try {
    const response = await fetch(url)
    const data = await response.json()
    return {
      price: data[tokenId].usd,
    }
  } catch (error) {
    console.error("Failed to fetch token data:", error)
  }
}

function addChatId(chatId) {
  fs.readFile(path, (err, data) => {
    if (err && err.code === "ENOENT") {
      fs.writeFile(path, JSON.stringify([chatId]), (err) => {
        if (err) throw err
        console.log(`Chat ID ${chatId} added.`)
      })
    } else if (data) {
      let ids = JSON.parse(data)
      if (!ids.includes(chatId)) {
        ids.push(chatId)
        fs.writeFile(path, JSON.stringify(ids), (err) => {
          if (err) throw err
          console.log(`Chat ID ${chatId} added.`)
        })
      }
    }
  })
}

function removeChatId(chatId) {
  fs.readFile(path, (err, data) => {
    if (err) throw err
    let ids = JSON.parse(data)
    ids = ids.filter((id) => id !== chatId)
    fs.writeFile(path, JSON.stringify(ids), (err) => {
      if (err) throw err
      console.log(`Chat ID ${chatId} removed.`)
    })
  })
}

function getSubscribedChats() {
  return new Promise((resolve, reject) => {
    fs.readFile("./tg-chats.json", (err, data) => {
      if (err) {
        if (err.code === "ENOENT") {
          fs.writeFile("./tg-chats.json", JSON.stringify([]), (err) => {
            if (err) {
              reject(err)
            } else {
              resolve([])
            }
          })
        } else {
          reject(err)
        }
      } else {
        try {
          resolve(JSON.parse(data))
        } catch (parseErr) {
          reject(parseErr)
        }
      }
    })
  })
}
