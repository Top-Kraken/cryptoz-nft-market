import { HardhatUserConfig, task } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_ARTIFACT_FROM_COMPILATION_OUTPUT } from "hardhat/builtin-tasks/task-names";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

const { privateKey, privateKey1 } = require('./secrets.json');

require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
	const accounts = await hre.ethers.getSigners();
  
	for (const account of accounts) {
	  console.log(account.address);
	}
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const config: HardhatUserConfig = {
	defaultNetwork: "hardhat",
	networks: {
		moonbase: {
			url: `https://rpc.testnet.moonbeam.network`,
			chainId: 1287,
			accounts: [privateKey] // Insert your private key here
		},
		moonbase1: {
			url: `https://rpc.testnet.moonbeam.network`,
			chainId: 1287,
			accounts: [privateKey1] // Insert your private key here
		},
    hardhat: {
			blockGasLimit: 17_000_000,
			allowUnlimitedContractSize: true,
		},
  	},
	solidity: { 
		version: "0.8.0",
		settings: {
			optimizer: {
				enabled: true,
			},
		},
	},
	gasReporter: {
	  enabled: false
	}
};

// Copy over the `metadata`, `userdoc` and `devdoc` compilation outputs to the Artifacts
// in order for TypeChain to generate comments for methods and events
task(TASK_COMPILE_SOLIDITY_GET_ARTIFACT_FROM_COMPILATION_OUTPUT).setAction(async (taskArgs, __, runSuper) => {
	const input = await runSuper();

	if (taskArgs?.contractOutput?.metadata && !input.metadata) {
		input.metadata = taskArgs.contractOutput.metadata;
	}
	if (taskArgs?.contractOutput?.devdoc && !input.devdoc) {
		input.devdoc = taskArgs.contractOutput.devdoc;
	}
	if (taskArgs?.contractOutput?.userdoc && !input.userdoc) {
		input.userdoc = taskArgs.contractOutput.userdoc;
	}

	return input;
});

export default config;
