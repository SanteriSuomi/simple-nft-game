const main = async () => {
	const gameContractFactory = await hre.ethers.getContractFactory("Game");
	const gameContract = await gameContractFactory.deploy(
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
	console.log("Contract deployed to:", gameContract.address);

	let mint = await gameContract.mintHero();
	await mint.wait();
	mint = await gameContract.mintHero();
	await mint.wait();

	await new Promise((r) => setTimeout(r, 10000));
	console.log(await gameContract.nftAttributes(1));
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
