const { ethers } = require("hardhat");
const { expect } = require("chai");
const { randomUint256, initializeGameContract } = require("../utils/Utilities");

describe("Game contract", function () {
	let gameContract;
	let owner;
	let defaultHeroes; // Default hero attributes array

	before(async function () {
		gameContract = await initializeGameContract(false);
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
			expect(mintEventArgs.tokenId.toNumber()).to.equal(1);

			expect(mintEventArgs.heroIndex.toNumber())
				.to.be.greaterThanOrEqual(0)
				.and.be.lessThanOrEqual(defaultHeroes.length);

			const nftHero = await gameContract.nftHero(1);
			const nftIndex = nftHero.index.toNumber();
			expect(nftHero.imageUri).to.equal(defaultHeroes[nftIndex].imageUri);
			expect(nftHero.hp.toNumber()).to.equal(
				defaultHeroes[nftIndex].hp.toNumber()
			);
		});

		it("Should be able to mint again", async function () {
			await mintHero();

			const nftHero = await gameContract.nftHero(2);
			const nftIndex = nftHero.index.toNumber();
			expect(nftHero.imageUri).to.equal(defaultHeroes[nftIndex].imageUri);
			expect(nftHero.hp.toNumber()).to.equal(
				defaultHeroes[nftIndex].hp.toNumber()
			);
		});
	});

	describe("Attacking", function () {
		it("Should be able to attack", async function () {
			const attack = await gameContract.attackBoss();
			await attack.wait();
		});
	});
});
