const coordinatorAddress =
	hre.network.name == "testnet"
		? "0x6168499c0cFfCaCD319c818142124B7A15E857ab" // Testnet
		: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909"; // Mainnet (local fork)

module.exports = [
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
	[20, 28], // Boss damages
	coordinatorAddress,
];
