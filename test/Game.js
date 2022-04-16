const { ethers } = require("hardhat");
const { expect } = require("chai");
const { randomUint256, initializeGameContract } = require("../utils/Utilities");

describe("Game contract", function () {
	let gameContract;
	let owner;
	let defaultAttributes;

	before(async function () {
		gameContract = await initializeGameContract(false);
		[owner] = await ethers.getSigners(); // First account
		defaultAttributes = await gameContract.getDefaultAttributes();
	});

	describe("Deployment", function () {
		it("Should assign correct owner", async function () {
			const gameOwner = await gameContract.owner();
			expect(gameOwner).to.equal(owner.address);
		});

		it("First default attribute should have correct HP", async function () {
			const attribute = await gameContract.defaultAttributes(0);
			expect(attribute.hp).to.equal(100);
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

			expect(mintEventArgs.attributesIndex.toNumber())
				.to.be.greaterThanOrEqual(0)
				.and.be.lessThanOrEqual(defaultAttributes.length);

			const nftAttributes = await gameContract.nftAttributes(1);
			const nftIndex = nftAttributes.index.toNumber();
			expect(nftAttributes.imageUri).to.equal(
				defaultAttributes[nftIndex].imageUri
			);
			expect(nftAttributes.hp.toNumber()).to.equal(
				defaultAttributes[nftIndex].hp.toNumber()
			);
		});

		it("Should be able to mint again", async function () {
			await mintHero();

			const nftAttributes = await gameContract.nftAttributes(2);
			const nftIndex = nftAttributes.index.toNumber();
			expect(nftAttributes.imageUri).to.equal(
				defaultAttributes[nftIndex].imageUri
			);
			expect(nftAttributes.hp.toNumber()).to.equal(
				defaultAttributes[nftIndex].hp.toNumber()
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
