const main = async () => {
	const gameContract = await hre.ethers.getContractAt(
		"Game",
		"0xE8addD62feD354203d079926a8e563BC1A7FE81e"
	);
	await new Promise((r) => setTimeout(r, 10000));
	let subscription = await gameContract.getSubscriptionDetails();
	console.log(subscription);

	// const gameFactory = await ethers.getContractFactory("Game");
	// const gameContract = await gameFactory.attach(
	// 	"0x413b1AfCa96a3df5A686d8BFBF93d30688a7f7D9" // The deployed contract address
	// );
	// let subscription = await gameContract.getSubscriptionDetails();
	// console.log(subscription);
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
