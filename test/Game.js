const { ethers } = require("hardhat");
const { expect, assert } = require("chai");
const { randomUint256, initializeGameContract } = require("../utils/Utilities");

describe("Game contract", function () {
	let gameContract;
	let owner;
	let defaultHeroes;

	before(async function () {
		gameContract = await initializeGameContract(
			false,
			hre.network.name,
			"0.01"
		);
		[owner] = await ethers.getSigners(); // First account
		defaultHeroes = await gameContract.getDefaultHeroes();
	});

	describe("Deployment", function () {
		it("Should assign correct owner", async function () {
			const gameOwner = await gameContract.owner();
			expect(gameOwner).to.equal(owner.address);
		});

		it("First default attribute should have correct HP", async function () {
			expect(defaultHeroes[0].hp).to.equal(100);
		});
	});

	describe("Minting", function () {
		async function mintHero() {
			const mintTx = await gameContract.mintHero();
			await mintTx.wait();

			const testRequestId = await gameContract.testRequestId();

			const testFullfillRequest =
				await gameContract.testFulfillRandomWords(testRequestId, [
					randomUint256(),
				]);
			await testFullfillRequest.wait();
		}

		it("Should be able to mint with VRF working", async function () {
			await mintHero();

			const mintEvents = await gameContract.queryFilter(
				gameContract.filters.Mint()
			);
			const mintEventArgs = mintEvents[0].args;

			expect(mintEventArgs.owner).to.equal(owner.address);
			expect(mintEventArgs.tokenId.toNumber()).to.equal(0);

			expect(mintEventArgs.heroIndex.toNumber())
				.to.be.greaterThanOrEqual(0)
				.and.be.lessThanOrEqual(defaultHeroes.length);

			const nftHero = await gameContract.nftHero(0);
			const nftIndex = nftHero.index.toNumber();
			expect(nftHero.imageUri).to.equal(defaultHeroes[nftIndex].imageUri);
			expect(nftHero.hp.toNumber()).to.equal(
				defaultHeroes[nftIndex].hp.toNumber()
			);
		});

		it("Should be able to mint again", async function () {
			await mintHero();

			const nftHero = await gameContract.nftHero(1);
			const nftIndex = nftHero.index.toNumber();
			expect(nftHero.imageUri).to.equal(defaultHeroes[nftIndex].imageUri);
			expect(nftHero.hp.toNumber()).to.equal(
				defaultHeroes[nftIndex].hp.toNumber()
			);
		});

		it("Total supply is correct", async function () {
			const totalSupply = await gameContract.totalSupply();
			expect(totalSupply.toNumber()).to.equal(3);
		});

		it("Metadata of minted NFT is correct", async function () {
			const metadataString = await gameContract.tokenURI(1);
			try {
				const base64ToString = Buffer.from(
					metadataString.substring(
						// Remove the "data:application/json;base64," that is for browser only
						metadataString.indexOf(",") + 1,
						metadataString.length
					),
					"base64"
				).toString();
				JSON.parse(base64ToString);
				assert.ok(true);
			} catch (error) {
				assert.fail("Metadata is not correct JSON");
			}
		});
	});

	describe("Attacking", function () {
		it("Should be able to attack", async function () {
			const attack = await gameContract.attackBoss();
			await attack.wait();
		});
	});
});
