require("dotenv").config();
const { Web3 } = require("web3");
const abiTBANK = require("../abiTBANK.json");

const web3 = new Web3();

const debug = (...messages) => console.log(...messages);

/**
 * Refreshes provider instance and attaches even handlers to it
 */
function refreshProvider(web3Obj, providerUrl) {
  let retries = 0;

  function retry(event) {
    if (event) {
      debug("Web3 provider disconnected or errored.");
      retries += 1;

      if (retries > 5) {
        debug(`Max retries of 5 exceeding: ${retries} times tried`);
        return setTimeout(refreshProvider, 5000);
      }
    } else {
      debug(`Reconnecting web3 provider ${config.eth.provider}`);
      refreshProvider(web3Obj, providerUrl);
    }

    return null;
  }

  const provider = new Web3.providers.WebsocketProvider(providerUrl);

  provider.on("end", () => retry());
  provider.on("error", () => retry());

  web3Obj.setProvider(provider);

  debug("New Web3 provider initiated");

  return provider;
}

const providerUrl = `wss://arbitrum-mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`;
refreshProvider(web3, providerUrl);

const address = "0x05cBeF357CB14F9861C01F90AC7d5C90CE0ef05e";
const contract = new web3.eth.Contract(abiTBANK, address);

module.exports = contract;
