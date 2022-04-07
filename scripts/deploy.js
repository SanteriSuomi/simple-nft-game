const main = async () => {
	const gameContractFactory = await hre.ethers.getContractFactory("Game");
	const gameContract = await gameContractFactory.deploy(
		["Warrior", "Thief", "Druid"],
		[
			"https://i.ibb.co/KVk7PCm/Battlemage.gif",
			"https://i.ibb.co/k0tYjSr/ezgif-com-gif-maker.gif",
			"https://i.ibb.co/tXRNhWy/Druid.gif",
		],
		[100, 60, 40], // HPs
		[10, 6, 2], // Damages
		[20, 50, 10], // Crit chances
		[1, 1, 5] // Heal
	);
	await gameContract.deployed();
	console.log("Contract deployed to:", gameContract.address);

	let mint = await gameContract.mint(0, { gasPrice: 30000000000 });
	await mint.wait();

	mint = await gameContract.mint(1, { gasPrice: 30000000000 });
	await mint.wait();

	mint = await gameContract.mint(2, { gasPrice: 30000000000 });
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
