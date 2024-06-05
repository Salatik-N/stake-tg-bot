require("dotenv").config();
const { Web3 } = require("web3");
const abiStakeWTAO = require("../abiStakeWTAO.json");

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

  const provider = new Web3.providers.WebsocketProvider(providerUrl);

  provider.on("end", () => retry());
  provider.on("error", () => retry());

  web3Obj.setProvider(provider);

  debug("New Web3 provider initiated");

  return provider;
}

const providerUrl = `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`;
refreshProvider(web3, providerUrl);

const address = "0x3e0858f65abf8606103f2c6b98138e4208cc795b";
const contract = new web3.eth.Contract(abiStakeWTAO, address);

module.exports = contract;
