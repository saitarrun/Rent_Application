const RENT = artifacts.require("RENT");
const Payments = artifacts.require("Payments");
const Repairs = artifacts.require("Repairs");

module.exports = async function (deployer) {
  await deployer.deploy(RENT);
  const rent = await RENT.deployed();

  await deployer.deploy(Payments, rent.address);
  await deployer.deploy(Repairs, rent.address);
};
