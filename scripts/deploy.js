// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // We get the contract to deploy
  const ZoombiesMarketPlace = await hre.ethers.getContractFactory("ZoombiesMarketPlace");
  console.log('Deploying ZoombiesMarketPlace...');
  const zoombiesMarketPlace = await ZoombiesMarketPlace.deploy("ZoombiesMarketplace", "ZOOM", "0x372d0695E75563D9180F8CE31c9924D7e8aaac47", "0x3E7997B8D30AA6216102fb2e9206246e478d57d3");
  await zoombiesMarketPlace.deployed();

  console.log("ZoombiesMarketPlace deployed to:", zoombiesMarketPlace.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });