const fs = require("fs");
const path = require("path");
const RENT = artifacts.require("RENT");
const Payments = artifacts.require("Payments");
const Repairs = artifacts.require("Repairs");

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error("Failed to read contracts.json", err);
    return {};
  }
}

function persistConfig(configPath, config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Contracts written to ${configPath}`);
}

module.exports = async function (deployer, network) {
  await deployer.deploy(RENT);
  const rent = await RENT.deployed();

  await deployer.deploy(Payments, rent.address);
  const payments = await Payments.deployed();

  await deployer.deploy(Repairs, rent.address);
  const repairs = await Repairs.deployed();

  const netId = await web3.eth.net.getId();
  const configPath = path.resolve(__dirname, "..", "contracts.json");
  const config = loadConfig(configPath);

  if (!config[netId]) {
    config[netId] = {
      chainLabel: network || `chain-${netId}`,
      rpcUrl: config["1337"]?.rpcUrl || "http://127.0.0.1:8545"
    };
  }

  config[netId] = {
    ...config[netId],
    RENT: rent.address,
    Payments: payments.address,
    Repairs: repairs.address
  };

  persistConfig(configPath, config);
};
