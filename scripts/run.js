const main = async () => {
	const gameContractFactory = await hre.ethers.getContractFactory("Game");
	const gameContract = await gameContractFactory.deploy(
		["Warrior", "Thief", "Druid"], // Names
		[
			// Image URIs
			"https://ibb.co/hmj35qJ",
			"https://ibb.co/FKW4C4X",
			"https://ibb.co/tQfbVfH",
		],
		[100, 60, 40], // HPs
		[10, 5, 2], // Damages
		[20, 50, 10], // Crit chances
		[0, 0, 10] // Heal
	);
	await gameContract.deployed();
	console.log("Contract deployed to:", gameContract.address);

	let mint = await gameContract.mint(0);
	await mint.wait();

	let attributes = await gameContract.nftAttributes(1);
	console.log(attributes);

	let tokenURI = await gameContract.tokenURI(1);
	console.log(tokenURI);
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
