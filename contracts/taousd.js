require("dotenv").config();
const { Web3 } = require("web3");
const abiUSD = require("../abiUSD.json");

const web3 = new Web3();

const debug = (...messages) => console.log(...messages);

/**
 * Refreshes provider instance and attaches event handlers to it
 */
function refreshProvider(web3Obj, providerUrl) {
  let retries = 0;

  function retry(event) {
    if (event) {
      debug("Web3 provider disconnected or errored.");
      retries += 1;

      if (retries > 5) {
        debug(`Max retries of 5 exceeding: ${retries} times tried`);
        return setTimeout(() => refreshProvider(web3Obj, providerUrl), 5000);
      }
    } else {
      debug(`Reconnecting web3 provider ${providerUrl}`);
      refreshProvider(web3Obj, providerUrl);
    }

    return null;
  }

  const provider = new Web3.providers.WebsocketProvider(providerUrl, {
    timeout: 30000,

    clientConfig: {
      maxReceivedFrameSize: 100000000,
      maxReceivedMessageSize: 100000000,
      keepalive: true,
      keepaliveInterval: -1,
    },

    reconnect: {
      auto: true,
      delay: 1000,
      maxAttempts: 10,
      onTimeout: false,
    },
  });

  provider.on("end", (event) => {
    debug("Websocket ended", event);
    retry(event);
  });

  provider.on("error", (error) => {
    debug("Websocket error", error);
    retry(error);
  });

  web3Obj.setProvider(provider);

  debug("New Web3 provider initiated");

  return provider;
}

const providerUrl = `wss://arbitrum-mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`;
refreshProvider(web3, providerUrl);

const address = "0x966570A84709D693463CDD69dCadb0121b2C9d26";
const contract = new web3.eth.Contract(abiUSD, address);

module.exports = contract;
