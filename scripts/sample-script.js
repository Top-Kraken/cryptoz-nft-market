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

  // We get the contract to deploy
  const ZoombiesMarketPlace = await hre.ethers.getContractFactory("ZoombiesMarketPlace");
  console.log('Deploying ZoombiesMarketPlace...');

  const zoombiesMarketPlace = await ZoombiesMarketPlace.attach('0x49d2F305E1e5912D75De54af22717aAC6332D58A');

  console.log("ZoombiesMarketPlace attached to:", zoombiesMarketPlace.address);

  await zoombiesMarketPlace.whitelistToken('0x8e21404bAd3A1d2327cc6D2B2118f47911a1f316', true);
  console.log("Whitelist 0x8e21404bAd3A1d2327cc6D2B2118f47911a1f316");
  await zoombiesMarketPlace.whitelistToken('0x372d0695E75563D9180F8CE31c9924D7e8aaac47', true);
  console.log("Whitelist 0x372d0695E75563D9180F8CE31c9924D7e8aaac47");

  await zoombiesMarketPlace.listItem(0, 100, 1932, '0x8e21404bAd3A1d2327cc6D2B2118f47911a1f316');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });