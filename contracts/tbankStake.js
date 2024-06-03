require("dotenv").config();
const { Web3 } = require("web3");
const abiStakeTBANK = require("../abiStakeTBANK.json");

const web3Provider = new Web3.providers.WebsocketProvider(
  `wss://arbitrum-mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`
);
const web3 = new Web3(web3Provider);

const address = "0xfce658b6e7B93F9c8281bbFd93394fBfd04A1402";
const contract = new web3.eth.Contract(abiStakeTBANK, address);

module.exports = contract;
