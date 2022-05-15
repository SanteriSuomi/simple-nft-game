const main = async () => {
	const gameContract = await hre.ethers.getContractAt(
		"Game",
		"0xE8addD62feD354203d079926a8e563BC1A7FE81e"
	);
	// TODO: use a library to mine blocks to simulate time passing instead of sleeping?
	await new Promise((r) => setTimeout(r, 10000));
	let subscription = await gameContract.getSubscriptionDetails();
	console.log(subscription);
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
