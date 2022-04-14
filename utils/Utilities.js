const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Exchange ETH to token.
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
				"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Wrapped ETH
				tokenAddress,
			],
			owner.address,
			blockTimestamp + 30,
			{ value: ethers.utils.parseEther(amountETH) }
		);
	await buyTx.wait();

	const tokenAbiBuffer = fs.readFileSync(__dirname + tokenAbiFile);
	const token = new ethers.Contract(
		tokenAddress,
		tokenAbiBuffer.toString(),
		owner
	);

	let tokenBalance = (await token.balanceOf(owner.address)).toString();
	// console.log("Token balance after purchase: " + tokenBalance);
	return token;
}

/**
 * Generate random BigNumber in the range of 0 and 2^256, more generally known as Uint256 or unsigned integer 256
 * @returns Ethers BigNumber object with value in the range of 0 and 2^256
 */
function randomUint256() {
	return ethers.BigNumber.from(ethers.utils.randomBytes(32));
}

async function initializeGameContract(printAddress) {
	let [owner] = await ethers.getSigners(); // First account
	let gameFactory = await ethers.getContractFactory("Game");
	let gameContract = await gameFactory.deploy(
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
		[20, 28] // Boss damages
	);
	await gameContract.deployed();
	if (printAddress) {
		console.log("Contract deployed to:", gameContract.address);
	}

	// Purchase link token from Uniswap
	const token = await purchaseToken(
		owner,
		"0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
		"0x514910771AF9Ca656af840dff83E8264EcF986CA",
		"/router_abi.txt",
		"/link_token_abi.txt",
		"10"
	);
	await token.transfer(gameContract.address, "5000000000000000000");
	await gameContract.fundSubscription("5000000000000000000"); // Fund chainlink subscription with 5 link tokens
	return gameContract;
}

module.exports = { purchaseToken, randomUint256, initializeGameContract };
