require("dotenv").config();
const { Web3 } = require("web3");
const abiStakeWTAO = require("../abiStakeWTAO.json");

const web3Provider = new Web3.providers.WebsocketProvider(
  `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`
);
const web3 = new Web3(web3Provider);

const address = "0x3e0858f65abf8606103f2c6b98138e4208cc795b";
const contract = new web3.eth.Contract(abiStakeWTAO, address);

module.exports = contract;
