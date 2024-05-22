const { Web3 } = require("web3");
const abiTBANK = require("../abiTBANK.json");

const web3Provider = new Web3.providers.WebsocketProvider(
  `wss://arbitrum-mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`
);
const web3 = new Web3(web3Provider);

const address = "0x05cBeF357CB14F9861C01F90AC7d5C90CE0ef05e";
const contract = new web3.eth.Contract(abiTBANK, address);

module.exports = contract;
