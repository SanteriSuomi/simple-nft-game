const { initializeGameContract } = require("../utils/Utilities");
const fs = require("fs");
const path = require("path");

const main = async () => {
	const contract = await initializeGameContract(
		true,
		hre.network.name,
		"0.01"
	);

	// Project root
	const rootPath = path.join(path.dirname(require.main.filename), "../");

	function getFromPath(paths, fileName) {
		return path.resolve(rootPath, ...paths, fileName);
	}

	function getToPath(fileName) {
		return path.resolve(rootPath, "frontend", "public", fileName);
	}

	function copyAbiToFrontend() {
		const abiName = "Game.json";
		fs.copyFileSync(
			getFromPath(["artifacts", "contracts", "Game.sol"], abiName),
			getToPath(abiName)
		);
		console.log("Updated ABI in frontend");
	}

	function copyAddressToFrontend() {
		const addressFileName = "Address";
		fs.writeFileSync(getToPath(addressFileName), contract.address, {
			flag: "w+",
		});
		console.log("Updated contract address in frontend");
	}

	copyAbiToFrontend();
	copyAddressToFrontend();
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
