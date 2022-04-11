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
	console.log("Token balance after purchase: " + tokenBalance);
	return token;
}

module.exports = { purchaseToken };
