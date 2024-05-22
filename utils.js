const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const tgChatsPath = path.join(__dirname, "tg-chats.json");

async function getTBANKData(tokenId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      price: Number(data[tokenId].usd),
    };
  } catch (error) {
    console.error("Failed to fetch token data:", error);
  }
}

async function gettaoUSDData(tokenId) {
  const url = `https://api.geckoterminal.com/api/v2/networks/arbitrum/tokens/${tokenId}`;
  try {
    const response = await fetch(url);
    const responseJSON = await response.json();
    return {
      price: Number(responseJSON.data.attributes.price_usd),
    };
  } catch (error) {
    console.error("Failed to fetch token data:", error);
  }
}

async function getwTAOData(tokenId) {
  const url = `https://api.geckoterminal.com/api/v2/networks/eth/tokens/${tokenId}`;
  try {
    const response = await fetch(url);
    const responseJSON = await response.json();
    return {
      price: Number(responseJSON.data.attributes.price_usd),
    };
  } catch (error) {
    console.error("Failed to fetch token data:", error);
  }
}

function addChatId(chatId) {
  fs.readFile(tgChatsPath, (err, data) => {
    if (err && err.code === "ENOENT") {
      fs.writeFile(tgChatsPath, JSON.stringify([chatId]), (err) => {
        if (err) throw err;
        console.log(`Chat ID ${chatId} added.`);
      });
    } else if (data) {
      let ids = JSON.parse(data);
      if (!ids.includes(chatId)) {
        ids.push(chatId);
        fs.writeFile(tgChatsPath, JSON.stringify(ids), (err) => {
          if (err) throw err;
          console.log(`Chat ID ${chatId} added.`);
        });
      }
    }
  });
}

function removeChatId(chatId) {
  fs.readFile(tgChatsPath, (err, data) => {
    if (err) throw err;
    let ids = JSON.parse(data);
    ids = ids.filter((id) => id !== chatId);
    fs.writeFile(tgChatsPath, JSON.stringify(ids), (err) => {
      if (err) throw err;
      console.log(`Chat ID ${chatId} removed.`);
    });
  });
}

function getSubscribedChats() {
  return new Promise((resolve, reject) => {
    fs.readFile(tgChatsPath, (err, data) => {
      if (err) {
        if (err.code === "ENOENT") {
          fs.writeFile(tgChatsPath, JSON.stringify([]), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve([]);
            }
          });
        } else {
          reject(err);
        }
      } else {
        try {
          resolve(JSON.parse(data));
        } catch (parseErr) {
          reject(parseErr);
        }
      }
    });
  });
}

module.exports = {
  addChatId,
  removeChatId,
  getSubscribedChats,
  getTBANKData,
  gettaoUSDData,
  getwTAOData,
};
