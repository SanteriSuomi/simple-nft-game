const coordinatorAddress =
	hre.network.name == "testnet"
		? "0x6168499c0cFfCaCD319c818142124B7A15E857ab" // Testnet
		: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909"; // Mainnet (local fork)

module.exports = coordinatorAddress;
