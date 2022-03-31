const main = async () => {
	const gameContractFactory = await hre.ethers.getContractFactory("Game");
	const gameContract = await gameContractFactory.deploy();
	await gameContract.deployed();
	console.log("Contract deployed to:", gameContract.address);
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
