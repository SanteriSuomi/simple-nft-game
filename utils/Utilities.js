const { ethers } = require("hardhat");
const fs = require("fs");

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

	const coordinatorAddress =
		networkName == "testnet"
			? "0x6168499c0cFfCaCD319c818142124B7A15E857ab" // Testnet
			: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909"; // Mainnet (local fork)

	const gameContract = await gameFactory.deploy(
		["Warrior", "Thief", "Druid"], // Hero names
		[
			"https://gateway.pinata.cloud/ipfs/QmeYsWSHN8HFXYLbJx77jDWbn9mWDqjvFNUPEEjoz7vWFh/Warrior.gif",
			"https://gateway.pinata.cloud/ipfs/QmeYsWSHN8HFXYLbJx77jDWbn9mWDqjvFNUPEEjoz7vWFh/Thief.gif",
			"https://gateway.pinata.cloud/ipfs/QmeYsWSHN8HFXYLbJx77jDWbn9mWDqjvFNUPEEjoz7vWFh/Druid.gif",
		],
		[100, 60, 40], // HPs
		[10, 6, 2], // Damages
		[20, 50, 10], // Crit chances
		[2, 2, 6], // Heal
		["Treant", "Skeleton Lord"], // Boss names
		[
			"https://gateway.pinata.cloud/ipfs/QmXJR7SFE8MkcXPgXSUvmeavF5GUQZeDzyXpLoK8knLVNq/Treant.gif",
			"https://gateway.pinata.cloud/ipfs/QmXJR7SFE8MkcXPgXSUvmeavF5GUQZeDzyXpLoK8knLVNq/Slime.gif",
		],
		[1000, 600], // Boss HPs
		[20, 28], // Boss damages
		coordinatorAddress
	);
	await gameContract.deployed();

	if (printAddress) {
		console.log("Contract deployed to:", gameContract.address);
	}

	const linkTokenAddress =
		networkName == "testnet"
			? "0x01BE23585060835E02B77ef475b0Cc51aA1e0709" // Testnet
			: "0x514910771AF9Ca656af840dff83E8264EcF986CA"; // Mainnet (local fork)
	const keyHash =
		networkName == "testnet"
			? "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc" // Testnet
			: "0x9fe0eebf5e446e3c998ec9bb19951541aee00bb90ea201ae456421a2ded86805"; // Mainnet (local fork), 1000 gwei

	const initializeVRFT = await gameContract.initializeVRF(
		linkTokenAddress,
		keyHash
	);
	initializeVRFT.wait();

	// Only auto-purchase link token in default forked local chain or testnet
	if (networkName == "testnet" || networkName == "hardhat") {
		// Purchase link token from Uniswap
		const token = await purchaseToken(
			networkName,
			owner,
			"0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap router address is the same for all networks
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
					? "0xc778417E063141139Fce010982780140Aa0cD5Ab" // Testnet
					: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Mainnet (local fork) - Wrapped ETH
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
