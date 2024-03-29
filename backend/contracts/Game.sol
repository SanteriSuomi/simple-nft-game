// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

import "./libraries/Base64.sol";

// import "hardhat/console.sol";

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

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    // Store information about a oracle request, used when fulfilling request
    struct Request {
        RequestType reqType;
        address requester;
        uint256 tokenId;
    }

    struct Hero {
        uint256 index;
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
        uint256 index;
        string name;
        string imageUri;
        uint256 hp;
        uint256 maxHp;
        uint256 damage;
    }

    address public owner;
    uint256 public maxTokenAmount = 2;
    uint256 public mintCost = 0.00 ether;

    uint16 public minConfirmations = 3;
    uint32 public callbackGas = 1e6;
    uint32 public numWords = 1;

    VRFCoordinatorV2Interface public coordinator;
    LinkTokenInterface public linkToken;

    mapping(address => uint256[]) public nftHolders; // Map each address to a list of NFTs they hold
    mapping(uint256 => Hero) public nftHero; // Map token ID to its' hero data structure
    mapping(address => bool) public isMinting;

    Hero[] public defaultHeroes;
    Boss[] public defaultBosses;
    Boss public currentBoss;

    Counters.Counter private _tokenIds;
    address private coordinatorAddress;
    address private linkTokenAddress;
    bytes32 private keyHash;
    uint64 private subscriptionId;

    bool private initialized;
    bool private requestingNewBoss;

    mapping(uint256 => Request) private requests; // Map request ID to a data structure with information about said request

    /**
     *  TODO FOR TESTING PURPOSES ONLY
     */
    uint256 public testRequestId;

    constructor(address _coordinatorAddress)
        ERC721("Heroes", "Hero")
        VRFConsumerBaseV2(_coordinatorAddress)
    {
        require(
            _coordinatorAddress != address(0),
            "Coordinator can't be zero address"
        );
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
            "One of the given default arrays is odd length"
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
            "One of the given default arrays is odd length"
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

    function setVRF(address linkTokenAddress_, bytes32 keyHash_)
        external
        onlyOwner
        checkInitialized
    {
        require(
            linkTokenAddress_ != address(0),
            "Link token address can't be zero address"
        );
        linkTokenAddress = linkTokenAddress_;
        keyHash = keyHash_;
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
            "This address has reached maximum token amount"
        );
        require(!isMinting[msg.sender], "Can't mint multiple at a time");
        if (mintCost > 0) {
            require(msg.value == mintCost, "Payment is not correct amount");
        }
        isMinting[msg.sender] = true;
        requestMint(_tokenIds.current());
        _tokenIds.increment();
    }

    /**
     * ONLY USER FOR LOCAL TESTING - BYPASSES CHAINLINK VRF WHICH ONLY WORKS IN RINKEBY PUBLIC TESTNET
     */
    function mintHeroTest() external {
        uint256 randomHeroIndex = uint256(
            keccak256(abi.encodePacked(block.difficulty, block.timestamp))
        ) % defaultHeroes.length;
        Hero storage hero = defaultHeroes[randomHeroIndex];
        uint256 tokenId = _tokenIds.current();
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
        nftHolders[msg.sender].push(tokenId);
        _safeMint(msg.sender, tokenId);
        _tokenIds.increment();
        emit Mint(msg.sender, tokenId, randomHeroIndex);
    }

    function withdrawEther() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success, "Transfer unsuccessful");
    }

    function fundSubscription() external {
        require(
            linkToken.balanceOf(address(this)) > 0,
            "No link token balance"
        );
        bool success = linkToken.transferAndCall(
            coordinatorAddress,
            linkToken.balanceOf(address(this)),
            abi.encode(subscriptionId)
        );
        require(success, "Could not fund subscription");
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

    function getUserHeroes(address user) external view returns (Hero[] memory) {
        uint256[] storage userTokenIds = nftHolders[user];
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
        return _tokenIds.current();
    }

    function setOwner(address newOwner) external onlyOwner {
        require(
            newOwner != address(0),
            "Link token address can't be zero address"
        );
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerChanged(oldOwner, newOwner);
    }

    function setMaxTokenAmount(uint256 amount) external onlyOwner {
        maxTokenAmount = amount;
    }

    function setMintCost(uint256 cost) external onlyOwner {
        mintCost = cost;
    }

    function setVRFSettings(
        uint16 confirmations,
        uint32 gas,
        uint32 words
    ) external onlyOwner {
        minConfirmations = confirmations;
        callbackGas = gas;
        numWords = words;
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

    function attackBoss() external {
        require(!requestingNewBoss, "Currently spawning a new boss");
        require(
            currentBoss.hp > 0,
            "Current boss is dead, you must spawn a new boss"
        );
        uint256[] storage senderTokenIds = nftHolders[msg.sender];
        uint256 length = senderTokenIds.length;
        require(length > 0, "Attacker must have at least 1 hero");
        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = senderTokenIds[i];
            Hero storage hero = nftHero[tokenId];
            if (hero.hp > 0) {
                requestAttack(tokenId);
            }
        }
    }

    function spawnNewBoss() external {
        require(currentBoss.hp == 0, "Current boss is not dead yet");
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
    ) external onlyOwner {
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
                minConfirmations,
                callbackGas,
                numWords
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
        isMinting[msg.sender] = false;
        emit Mint(requester, tokenId, randomHeroIndex);
        _safeMint(requester, tokenId);
    }

    function fulfillAttack(
        address requester,
        uint256 tokenId,
        uint256 randomWord
    ) private {
        Hero storage hero = nftHero[tokenId];
        uint256 randomInt = randomWord % 2;
        if (randomInt == 0) {
            bool bossDead = false;
            if (currentBoss.hp <= hero.damage) {
                currentBoss.hp = 0;
                bossDead = true;
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
            if (bossDead) {
                emit BossDead(requester, tokenId, currentBoss.index);
            }
        } else if (currentBoss.hp > 0) {
            if (hero.hp <= currentBoss.damage) {
                hero.hp = 0;
                _burn(tokenId);
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

    receive() external payable {}
}
