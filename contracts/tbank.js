require("dotenv").config();
const { Web3 } = require("web3");
const abiTBANK = require("../abiTBANK.json");

const web3Provider = new Web3.providers.WebsocketProvider(
  `wss://arbitrum-mainnet.infura.io/ws/v3/${process.env.INFURA_TOKEN}`,
  {
    timeout: 30000,

    clientConfig: {
      // Useful if requests are large
      maxReceivedFrameSize: 100000000,
      maxReceivedMessageSize: 100000000,

      // Useful to keep a connection alive
      keepalive: true,
      keepaliveInterval: -1,
    },

    // Enable auto reconnection
    reconnect: {
      auto: true,
      delay: 1000,
      maxAttempts: 10,
      onTimeout: false,
    },
  }
);
web3Provider.on("close", (event) => {
  console.log(event);
  console.log("Websocket closed.");
});

web3Provider.on("error", (error) => {
  console.error(error);
});

const web3 = new Web3(web3Provider);

const address = "0x05cBeF357CB14F9861C01F90AC7d5C90CE0ef05e";
const contract = new web3.eth.Contract(abiTBANK, address);

module.exports = contract;
