const { initializeGameContract } = require("../utils/Utilities");

const main = async () => {
	let gameContract = await initializeGameContract(true);

	let mint = await gameContract.mintHero();
	await mint.wait();
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
