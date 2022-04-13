const { ethers } = require("hardhat");
const { expect, assert } = require("chai");
const { purchaseToken, randomUint256 } = require("../utils/Utilities");

describe("Game contract", function () {
	let game;
	let owner;

	before(async function () {
		let gameFactory = await ethers.getContractFactory("Game");
		game = await gameFactory.deploy(
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
		[owner] = await ethers.getSigners();

		// Purchase link token
		const token = await purchaseToken(
			owner,
			"0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
			"0x514910771AF9Ca656af840dff83E8264EcF986CA",
			"/router_abi.txt",
			"/link_token_abi.txt",
			"10"
		);
		await token.transfer(game.address, "5000000000000000000");
		await game.fundSubscription("5000000000000000000"); // Fund subscription with 5 link tokens
	});

	describe("Deployment", function () {
		it("Should assign correct owner", async function () {
			let gameOwner = await game.owner();
			expect(gameOwner).to.equal(owner.address);
		});

		it("First default attribute should have correct HP", async function () {
			let attribute = await game.defaultAttributes(0);
			expect(attribute.hp).to.equal(100);
		});
	});

	describe("Minting", function () {
		it("Should be able to mint", async function () {
			let mint = await game.mintHero();
			await mint.wait();

			let testRequestId = await game.testRequestId();

			let testFullfillRequest = await game.testFulfillRandomWords(
				testRequestId,
				[randomUint256()]
			);
			await testFullfillRequest.wait();

			let mintEvent = game.filters.Mint();
			let mintEvents = await game.queryFilter(mintEvent);
			let mintEventArgs = mintEvents[0].args;

			expect(mintEventArgs.owner).to.equal(owner.address);
			expect(mintEventArgs.tokenId.toNumber()).to.equal(1);

			let defaultAttributes = await game.getDefaultAttributes();
			expect(mintEventArgs.attributesIndex.toNumber())
				.to.be.greaterThanOrEqual(0)
				.and.be.lessThan(defaultAttributes.length);
		});
	});
});
