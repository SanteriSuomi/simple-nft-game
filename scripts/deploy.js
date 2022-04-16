const { initializeGameContract } = require("../utils/Utilities");

const main = async () => {
	const networkName = hre.network.name;
	const gameContract = await initializeGameContract(true, networkName);

	if (networkName == "testnet" || networkName == "hardhat") {
		const mint = await gameContract.mintHero();
		await mint.wait();
	}
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
