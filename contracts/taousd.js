require("dotenv").config();
const { Web3 } = require("web3");
const abiUSD = require("../abiUSD.json");

const web3Provider = new Web3.providers.WebsocketProvider(
  `wss://arbitrum-mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`
);
const web3 = new Web3(web3Provider);

const address = "0x966570A84709D693463CDD69dCadb0121b2C9d26";
const contract = new web3.eth.Contract(abiUSD, address);

module.exports = contract;
