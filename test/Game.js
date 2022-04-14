const { ethers } = require("hardhat");
const { expect } = require("chai");
const { purchaseToken, randomUint256 } = require("../utils/Utilities");

describe("Game contract", function () {
	let game;
	let owner;
	let defaultAttributes;

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

		defaultAttributes = await game.getDefaultAttributes();
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
		async function mint() {
			let mintTx = await game.mintHero();
			await mintTx.wait();

			let testRequestId = await game.testRequestId();

			let testFullfillRequest = await game.testFulfillRandomWords(
				testRequestId,
				[randomUint256()]
			);
			await testFullfillRequest.wait();
		}

		it("Should be able to mint with VRF working", async function () {
			await mint();

			let mintEvents = await game.queryFilter(game.filters.Mint());
			let mintEventArgs = mintEvents[0].args;

			expect(mintEventArgs.owner).to.equal(owner.address);
			expect(mintEventArgs.tokenId.toNumber()).to.equal(1);

			expect(mintEventArgs.attributesIndex.toNumber())
				.to.be.greaterThanOrEqual(0)
				.and.be.lessThanOrEqual(defaultAttributes.length);

			let nftAttributes = await game.nftAttributes(1);
			let nftIndex = nftAttributes.index.toNumber();
			expect(nftAttributes.imageUri).to.equal(
				defaultAttributes[nftIndex].imageUri
			);
			expect(nftAttributes.hp.toNumber()).to.equal(
				defaultAttributes[nftIndex].hp.toNumber()
			);
		});

		it("Should be able to mint again", async function () {
			await mint();

			let nftAttributes = await game.nftAttributes(2);
			let nftIndex = nftAttributes.index.toNumber();
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
			let attack = await game.attackBoss();
			await attack.wait();
		});
	});
});
