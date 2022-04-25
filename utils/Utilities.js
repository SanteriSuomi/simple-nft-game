const { ethers } = require("hardhat");
const fs = require("fs");
const args = require("./arguments");

const TESTNET_LINK_TOKEN = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709";
const MAINNET_LINK_TOKEN = "0x514910771AF9Ca656af840dff83E8264EcF986CA";

const TESTNET_KEY_HASH =
	"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";
const MAINNET_KEY_HASH =
	"0x9fe0eebf5e446e3c998ec9bb19951541aee00bb90ea201ae456421a2ded86805";

const UNISWAP_ROUTER_ADRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Same for all networks

const TESTNET_WETH_TOKEN = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
const MAINNET_WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

/**
 * Generate random BigNumber in the range of 0 and 2^256, more generally known as Uint256 or unsigned integer 256
 * @returns Ethers BigNumber object with value in the range of 0 and 2^256
 */
function randomUint256() {
	return ethers.BigNumber.from(ethers.utils.randomBytes(32));
}

async function initializeGameContract(
	printAddress,
	networkName,
	linkBuyEtherAmount
) {
	const [owner] = await ethers.getSigners(); // First account

	const gameFactory = await ethers.getContractFactory("Game");
	const gameContract = await gameFactory.deploy(args);
	await gameContract.deployed();

	await gameContract.setHeroes(
		["Warrior", "Thief", "Druid"], // Hero names
		[
			"https://gateway.pinata.cloud/ipfs/QmeYsWSHN8HFXYLbJx77jDWbn9mWDqjvFNUPEEjoz7vWFh/Warrior.gif",
			"https://gateway.pinata.cloud/ipfs/QmeYsWSHN8HFXYLbJx77jDWbn9mWDqjvFNUPEEjoz7vWFh/Thief.gif",
			"https://gateway.pinata.cloud/ipfs/QmeYsWSHN8HFXYLbJx77jDWbn9mWDqjvFNUPEEjoz7vWFh/Druid.gif",
		],
		[100, 60, 40], // HPs
		[10, 6, 2], // Damages
		[20, 50, 10], // Crit chances
		[2, 2, 6] // Heal
	);
	await gameContract.setBosses(
		["Treant", "Skeleton Lord"], // Boss names
		[
			"https://gateway.pinata.cloud/ipfs/QmXJR7SFE8MkcXPgXSUvmeavF5GUQZeDzyXpLoK8knLVNq/Treant.gif",
			"https://gateway.pinata.cloud/ipfs/QmXJR7SFE8MkcXPgXSUvmeavF5GUQZeDzyXpLoK8knLVNq/Slime.gif",
		],
		[500, 350], // Boss HPs
		[20, 15] // Boss damages
	);

	const linkTokenAddress =
		networkName == "testnet"
			? TESTNET_LINK_TOKEN // Testnet
			: MAINNET_LINK_TOKEN; // Mainnet (local fork)
	const keyHash =
		networkName == "testnet"
			? TESTNET_KEY_HASH // Testnet
			: MAINNET_KEY_HASH; // Mainnet (local fork), 1000 gwei
	await gameContract.setVRF(linkTokenAddress, keyHash);
	await gameContract.setInitialized();

	if (printAddress) {
		console.log("Contract deployed to:", gameContract.address);
	}

	// Only auto-purchase link token in default forked local chain or testnet
	if (networkName == "testnet" || networkName == "hardhat") {
		// Purchase link token from Uniswap
		const token = await purchaseToken(
			networkName,
			owner,
			UNISWAP_ROUTER_ADRESS, // Uniswap router address is the same for all networks
			linkTokenAddress,
			"/router_abi.txt",
			"/link_token_abi.txt",
			linkBuyEtherAmount
		);
		const tokenBalance = await token.balanceOf(owner.address);
		await token.transfer(gameContract.address, tokenBalance);
		await gameContract.fundSubscription({ gasLimit: 150000 }); // Fund chainlink subscription with purchased link token
	}
	return gameContract;
}

/**
 * Exchange ETH to token.
 * @param {*} networkName Current network name from hardhat config
 * @param {*} owner Ethers signer object of the address used
 * @param {*} routerAddress Address of uniswap-compatible router
 * @param {*} tokenAddress Address of EIP-20 token
 * @param {*} routerAbiFile File name of the ABI used for router
 * @param {*} tokenAbiFile File name of the ABI used for token
 * @param {*} amountETH Amount of ETH to exchange
 * @returns Token contract
 * Note: abi file names must end in .txt and be in the same directory as this file
 */
async function purchaseToken(
	networkName,
	owner,
	routerAddress,
	tokenAddress,
	routerAbiFile,
	tokenAbiFile,
	amountETH
) {
	const routerAbiBuffer = fs.readFileSync(__dirname + routerAbiFile);
	const router = new ethers.Contract(
		routerAddress,
		routerAbiBuffer.toString(),
		owner
	);

	const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
	const buyTx =
		await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
			0,
			[
				networkName == "testnet"
					? TESTNET_WETH_TOKEN // Testnet
					: MAINNET_WETH_TOKEN, // Mainnet (local fork) - Wrapped ETH
				tokenAddress,
			],
			owner.address,
			blockTimestamp + 60,
			{ value: ethers.utils.parseEther(amountETH) }
		);
	await buyTx.wait();

	const tokenAbiBuffer = fs.readFileSync(__dirname + tokenAbiFile);
	return new ethers.Contract(tokenAddress, tokenAbiBuffer.toString(), owner);
}

module.exports = { purchaseToken, randomUint256, initializeGameContract };
