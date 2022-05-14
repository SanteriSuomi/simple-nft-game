require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (_taskArgs, hre) => {
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
module.exports = {
	solidity: {
		version: "0.8.13",
		settings: {
			optimizer: {
				enabled: true,
				runs: 100,
				details: {
					yul: false,
				},
			},
		},
	},
	networks: {
		hardhat: {
			// This is used by default
			forking: {
				url: "https://eth-mainnet.alchemyapi.io/v2/KtxGqfD5yrajOEKTD6bOTI07CppFftPA",
			},
		},
		testnet: {
			url: "https://speedy-nodes-nyc.moralis.io/9fa2db1294acbd13133c482a/eth/rinkeby",
			accounts: [process.env.PRIVATE_KEY],
		},
	},
	etherscan: {
		apiKey: process.env.ETHERSCAN_API_KEY,
	},
};
