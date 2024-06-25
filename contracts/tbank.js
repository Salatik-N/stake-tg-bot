require("dotenv").config();
const { Web3 } = require("web3");
const abiTBANK = require("../abiTBANK.json");

const web3 = new Web3();

const debug = (...messages) => console.log(...messages);

let currentProvider = null;

/**
 * Refreshes provider instance and attaches event handlers to it
 */
function refreshProvider(web3Obj, providerUrl) {
  // Close the existing provider connection if there is one
  if (currentProvider) {
    currentProvider.removeAllListeners(); // Remove all event listeners
    try {
      currentProvider.disconnect(1000, "Provider Refresh");
      debug("Existing Web3 provider connection closed");
    } catch (error) {
      debug("Error closing existing Web3 provider connection", error);
    }
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

  provider.on("error", (error) => {
    debug("Websocket error", error);
  });

  web3Obj.setProvider(provider);
  currentProvider = provider; // Update the current provider

  debug("New Web3 provider initiated");

  return provider;
}

const providerUrl = `wss://arbitrum-mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`;
refreshProvider(web3, providerUrl);

const address = "0x05cBeF357CB14F9861C01F90AC7d5C90CE0ef05e";
const contract = new web3.eth.Contract(abiTBANK, address);

module.exports = contract;
