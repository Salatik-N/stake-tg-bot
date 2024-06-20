require("dotenv").config();
const { Web3 } = require("web3");
const abiUSD = require("../abiUSD.json");

const web3 = new Web3();

const debug = (...messages) => console.log(...messages);

let currentProvider = null;

/**
 * Refreshes provider instance and attaches event handlers to it
 */
function refreshProvider(web3Obj, providerUrl) {
  if (currentProvider) {
    currentProvider.disconnect(1000, "Provider Refresh");
    debug("Existing Web3 provider connection closed");
  }

  const provider = new Web3.providers.WebsocketProvider(providerUrl, {
    clientConfig: {
      keepalive: true,
      keepaliveInterval: 60000,
    },
    reconnect: {
      auto: true,
      delay: 5000,
      maxAttempts: 5,
      onTimeout: false,
    },
  });

  provider.on("connect", () => {
    console.log("Websocket connected.");
  });

  web3Obj.setProvider(provider);
  currentProvider = provider; // Update the current provider

  debug("New Web3 provider initiated");

  return provider;
}

const providerUrl = `wss://arbitrum-mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`;
refreshProvider(web3, providerUrl);

const twoHoursInMilliseconds = 2 * 60 * 60 * 1000;
setInterval(() => {
  debug("Reconnecting Web3 provider every 2 hours");
  refreshProvider(web3, providerUrl);
}, twoHoursInMilliseconds);

const address = "0x966570A84709D693463CDD69dCadb0121b2C9d26";
const contract = new web3.eth.Contract(abiUSD, address);

module.exports = contract;
