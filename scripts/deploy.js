const { initializeGameContract } = require("../utils/Utilities");

const main = async () => {
	await initializeGameContract(true, hre.network.name, "0.01");
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
