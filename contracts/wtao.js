require("dotenv").config();
const { Web3 } = require("web3");
const abiWTAO = require("../abiWTAO.json");

const web3Provider = new Web3.providers.HttpProvider(
  `https://mainnet.infura.io/v3/${process.env.INFURA_TOKEN}`
);

const web3 = new Web3(web3Provider);

const address = "0x77E06c9eCCf2E797fd462A92B6D7642EF85b0A44";
const contract = new web3.eth.Contract(abiWTAO, address);

module.exports = contract;
