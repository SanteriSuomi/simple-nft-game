// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

import "./libraries/Base64.sol";

import "hardhat/console.sol";

contract Game is ERC721, VRFConsumerBaseV2 {
    using Counters for Counters.Counter;

    enum RequestType {
        MINT,
        ATTACK,
        NEW_BOSS
    }

    enum AttackType {
        HERO,
        BOSS
    }

    event Mint(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 defaultIndex
    );

    event HeroAttack(
        address indexed attacker,
        uint256 indexed tokenId,
        uint256 indexed bossIndex,
        uint256 newHeroHp,
        uint256 newBossHp
    );

    event BossAttack(
        address indexed attacker,
        uint256 indexed tokenId,
        uint256 indexed bossIndex,
        uint256 newHeroHp,
        uint256 newBossHp
    );

    event HeroDead(address indexed attacker, uint256 indexed tokenId);

    event BossDead(
        address indexed attacker,
        uint256 indexed tokenId,
        uint256 indexed bossIndex
    );

    event NewBoss(uint256 indexed bossIndex);

    struct Request {
        // Store information about a oracle request, used when fulfilling request
        RequestType reqType;
        address requester;
        uint256 tokenId;
    }

    struct Hero {
        uint256 index; // Default heroes index
        uint256 birthDate;
        string name;
        string imageUri;
        uint256 hp;
        uint256 maxHp;
        uint256 damage;
        uint256 crit;
        uint256 heal;
    }

    struct Boss {
        uint256 index; // Default bosses index
        string name;
        string imageUri;
        uint256 hp;
        uint256 maxHp;
        uint256 damage;
    }

    Counters.Counter private _tokenIds;

    VRFCoordinatorV2Interface public coordinator;
    LinkTokenInterface public linkToken;
    address private coordinatorAddress;
    address private linkTokenAddress;
    bytes32 private keyHash;
    uint64 private subscriptionId;

    mapping(uint256 => Request) private requests; // Map request ID to a data structure with information about said request

    mapping(address => uint256[]) public nftHolders; // Map each address to a list of NFTs they hold
    mapping(uint256 => Hero) public nftHero; // Map token ID to its' hero data structure

    Hero[] public defaultHeroes;

    Boss[] public defaultBosses;
    Boss public currentBoss;

    address public owner;

    uint256 public maxTokenAmount = 2;
    uint256 public mintCost = 0.00 ether;

    bool private initialized;

    bool private requestingNewBoss;

    /**
     *  TODO FOR TESTING PURPOSES ONLY
     */
    uint256 public testRequestId;

    constructor(address _coordinatorAddress)
        ERC721("Heroes", "Hero")
        VRFConsumerBaseV2(_coordinatorAddress)
    {
        owner = msg.sender;
        coordinatorAddress = _coordinatorAddress;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller must be owner");
        _;
    }

    modifier checkInitialized() {
        require(!initialized, "Contract has already been initialized");
        _;
    }

    function setHeroes(
        string[] memory names,
        string[] memory imageUris,
        uint256[] memory hps,
        uint256[] memory damages,
        uint256[] memory crits,
        uint256[] memory heals
    ) external onlyOwner checkInitialized {
        require(
            names.length == imageUris.length &&
                imageUris.length == hps.length &&
                hps.length == damages.length &&
                damages.length == crits.length &&
                crits.length == heals.length,
            "One of the given NFT default arrays is odd length"
        );
        for (uint256 i = 0; i < names.length; i++) {
            defaultHeroes.push(
                Hero({
                    birthDate: block.timestamp,
                    index: i,
                    name: names[i],
                    imageUri: imageUris[i],
                    hp: hps[i],
                    maxHp: hps[i],
                    damage: damages[i],
                    crit: crits[i],
                    heal: heals[i]
                })
            );
        }
    }

    function setBosses(
        string[] memory bossNames,
        string[] memory bossImageUris,
        uint256[] memory bossHps,
        uint256[] memory bossDamage
    ) external onlyOwner checkInitialized {
        require(
            bossNames.length == bossImageUris.length &&
                bossImageUris.length == bossHps.length &&
                bossHps.length == bossDamage.length,
            "One of the given boss default arrays is odd length"
        );
        for (uint256 i = 0; i < bossNames.length; i++) {
            defaultBosses.push(
                Boss({
                    index: i,
                    name: bossNames[i],
                    imageUri: bossImageUris[i],
                    hp: bossHps[i],
                    maxHp: bossHps[i],
                    damage: bossDamage[i]
                })
            );
        }
        Boss memory newBoss = defaultBosses[0];
        currentBoss = newBoss;
    }

    function setVRF(address _linkTokenAddress, bytes32 _keyHash)
        external
        onlyOwner
        checkInitialized
    {
        linkTokenAddress = _linkTokenAddress;
        keyHash = _keyHash;
        coordinator = VRFCoordinatorV2Interface(coordinatorAddress);
        linkToken = LinkTokenInterface(linkTokenAddress);
        createSubscription();
    }

    function setInitialized() external onlyOwner checkInitialized {
        initialized = true;
    }

    function mintHero() external payable {
        uint256[] storage senderTokenIds = nftHolders[msg.sender];
        require(
            senderTokenIds.length < maxTokenAmount,
            "This address has reached maximum NFT amount"
        );
        if (mintCost > 0) {
            require(msg.value == mintCost, "Payment is not correct");
        }
        requestMint(_tokenIds.current());
        _tokenIds.increment();
    }

    function fundSubscription() external {
        linkToken.transferAndCall(
            coordinatorAddress,
            linkToken.balanceOf(address(this)),
            abi.encode(subscriptionId)
        );
    }

    function getSubscriptionDetails()
        external
        view
        returns (
            uint96,
            uint64,
            address,
            address[] memory
        )
    {
        return coordinator.getSubscription(subscriptionId);
    }

    function getUserHeroes() external view returns (Hero[] memory) {
        uint256[] storage userTokenIds = nftHolders[msg.sender];
        uint256 length = userTokenIds.length;
        Hero[] memory userHeroes = new Hero[](length);
        for (uint256 i = 0; i < length; i++) {
            userHeroes[i] = nftHero[userTokenIds[i]];
        }
        return userHeroes;
    }

    function getDefaultHeroes() external view returns (Hero[] memory) {
        return defaultHeroes;
    }

    function getDefaultBosses() external view returns (Boss[] memory) {
        return defaultBosses;
    }

    function totalSupply() external view returns (uint256) {
        if (nftHero[0].maxHp == 0) {
            return 0;
        }
        return _tokenIds.current() + 1;
    }

    function setOwner(address _address) external onlyOwner {
        owner = _address;
    }

    function setMaxTokenAmount(uint256 amount) external onlyOwner {
        maxTokenAmount = amount;
    }

    function setMintCost(uint256 cost) external onlyOwner {
        mintCost = cost;
    }

    /**
     *  TODO FOR TESTING PURPOSES ONLY
     */
    function setCurrentBoss(
        string memory bossName,
        string memory bossImageUri,
        uint256 bossHp,
        uint256 bossDamage
    ) external onlyOwner {
        currentBoss = Boss({
            index: 10,
            name: bossName,
            imageUri: bossImageUri,
            hp: bossHp,
            maxHp: bossHp,
            damage: bossDamage
        });
    }

    function attackBoss() public {
        require(!requestingNewBoss, "Currently requesting a new boss.");
        require(
            currentBoss.hp > 0,
            "Current boss is dead, request a new boss."
        );
        uint256[] storage senderTokenIds = nftHolders[msg.sender];
        for (uint256 i = 0; i < senderTokenIds.length; i++) {
            uint256 tokenId = senderTokenIds[i];
            Hero storage hero = nftHero[tokenId];
            if (hero.hp > 0) {
                requestAttack(tokenId);
            }
        }
    }

    function spawnNewBoss() public {
        require(currentBoss.hp == 0, "Current boss is not dead yet.");
        requestingNewBoss = true;
        uint256 requestId = requestRandomWords();
        testRequestId = requestId; // FOR TESTING PURPOSES
        requests[requestId] = Request(RequestType.NEW_BOSS, msg.sender, 0);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        Hero storage hero = nftHero[tokenId];
        string memory json = Base64.encode(
            abi.encodePacked(
                '{"name": "',
                hero.name,
                " -- NFT #: ",
                Strings.toString(tokenId),
                '", "description": "A Hero NFT that lets you play Monster Slayer!", "image": "',
                hero.imageUri,
                '", "attributes": [ { "trait_type": "Birth Date", "value": ',
                Strings.toString(hero.birthDate),
                '}, { "display_type": "date", "trait_type": "Health Points", "value": ',
                Strings.toString(hero.hp),
                ', "max_value":',
                Strings.toString(hero.maxHp),
                '}, { "trait_type": "Attack Damage", "value": ',
                Strings.toString(hero.damage),
                ', "max_value":',
                Strings.toString(50),
                '}, { "trait_type": "Critical Damage Chance", "value": ',
                Strings.toString(hero.crit),
                ', "max_value":',
                Strings.toString(50),
                '}, { "trait_type": "Healing Power", "value": ',
                Strings.toString(hero.heal),
                ', "max_value":',
                Strings.toString(50),
                "} ]}"
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     *  TODO FOR TESTING PURPOSES ONLY
     */
    function testFulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) public onlyOwner {
        fulfillRandomWords(requestId, randomWords);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        Request memory request = requests[requestId];
        delete requests[requestId];
        if (request.reqType == RequestType.MINT) {
            fulfillMint(request.requester, request.tokenId, randomWords[0]);
        } else if (request.reqType == RequestType.ATTACK) {
            fulfillAttack(request.requester, request.tokenId, randomWords[0]);
        } else if (request.reqType == RequestType.NEW_BOSS) {
            fulfillNewBoss(randomWords[0]);
        }
    }

    function requestMint(uint256 tokenId) private {
        uint256 requestId = requestRandomWords();
        testRequestId = requestId; // FOR TESTING PURPOSES
        requests[requestId] = Request(RequestType.MINT, msg.sender, tokenId);
    }

    function requestAttack(uint256 tokenId) private {
        uint256 requestId = requestRandomWords();
        testRequestId = requestId; // FOR TESTING PURPOSES
        requests[requestId] = Request(RequestType.ATTACK, msg.sender, tokenId);
    }

    function requestRandomWords() private returns (uint256) {
        return
            coordinator.requestRandomWords(
                keyHash,
                subscriptionId,
                3,
                1000000,
                1
            );
    }

    function fulfillMint(
        address requester,
        uint256 tokenId,
        uint256 randomWord
    ) private {
        uint256 randomHeroIndex = randomWord % defaultHeroes.length;
        Hero storage hero = defaultHeroes[randomHeroIndex];
        nftHero[tokenId] = Hero({
            birthDate: block.timestamp,
            index: hero.index,
            name: hero.name,
            imageUri: hero.imageUri,
            hp: hero.hp,
            maxHp: hero.hp,
            damage: hero.damage,
            crit: hero.crit,
            heal: hero.heal
        });
        nftHolders[requester].push(tokenId);
        _safeMint(requester, tokenId);
        emit Mint(requester, tokenId, randomHeroIndex);
    }

    function fulfillAttack(
        address requester,
        uint256 tokenId,
        uint256 randomWord
    ) private {
        Hero storage hero = nftHero[tokenId];
        uint256 randomInt = randomWord % 2;
        if (randomInt == 0) {
            bool dead;
            if (currentBoss.hp < hero.damage) {
                currentBoss.hp = 0;
                dead = true;
            } else {
                currentBoss.hp -= hero.damage;
            }
            emit HeroAttack(
                requester,
                tokenId,
                currentBoss.index,
                hero.hp,
                currentBoss.hp
            );
            if (dead) {
                emit BossDead(requester, tokenId, currentBoss.index);
            }
        } else {
            if (hero.hp < currentBoss.damage) {
                hero.hp = 0;
                emit HeroDead(requester, tokenId);
            } else {
                hero.hp -= currentBoss.damage;
            }
            emit BossAttack(
                requester,
                tokenId,
                currentBoss.index,
                hero.hp,
                currentBoss.hp
            );
        }
    }

    function fulfillNewBoss(uint256 randomWord) private {
        uint256 randomBossIndex = randomWord % defaultBosses.length;
        Boss memory newBoss = defaultBosses[randomBossIndex];
        currentBoss = newBoss;
        requestingNewBoss = false;
        emit NewBoss(currentBoss.index);
    }

    function createSubscription() private {
        subscriptionId = coordinator.createSubscription();
        coordinator.addConsumer(subscriptionId, address(this));
    }
}
