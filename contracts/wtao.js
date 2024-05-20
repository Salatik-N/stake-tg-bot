const { Web3 } = require("web3");
const abiWTAO = require("../abiWTAO.json");

const web3Provider = new Web3.providers.WebsocketProvider(
  `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`
);
const web3 = new Web3(web3Provider);

const address = "0x3E0858F65aBF8606103f2c6B98138E4208cC795B";
const contract = new web3.eth.Contract(abiWTAO, address);

module.exports = contract;