const { initializeGameContract } = require("../utils/Utilities");
const fs = require("fs");
const path = require("path");

// Project root
const rootPath = path.join(path.dirname(require.main.filename), "../../");

const main = async () => {
	const contract = await initializeGameContract(
		true,
		hre.network.name,
		"0.01"
	);

	function buildOriginPath(paths, fileName) {
		return path.resolve(rootPath, ...paths, fileName);
	}

	function buildDestinationPath(fileName) {
		return path.resolve(
			rootPath,
			"frontend",
			"src",
			"utils",
			"files",
			fileName
		);
	}

	function copyAbiToFrontend() {
		const abiName = "Game.json";
		fs.copyFileSync(
			buildOriginPath(
				["backend", "artifacts", "contracts", "Game.sol"],
				abiName
			),
			buildDestinationPath(abiName)
		);
		console.log("Updated ABI in frontend");
	}

	function copyAddressToFrontend() {
		const addressFileName = "Address.json";
		const addressJson = JSON.stringify({
			address: contract.address,
		});
		fs.writeFileSync(buildDestinationPath(addressFileName), addressJson, {
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
