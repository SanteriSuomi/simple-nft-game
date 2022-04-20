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

    event Mint(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 indexed heroIndex
    );

    Counters.Counter private _tokenIds;

    VRFCoordinatorV2Interface public coordinator;
    LinkTokenInterface public linkToken;
    address private coordinatorAddress;
    address private linkTokenAddress;
    bytes32 private keyHash;
    uint64 private subscriptionId;

    mapping(uint256 => Request) private requests;

    struct Request {
        address requester;
        uint256 tokenId;
    }

    struct Hero {
        uint256 index; // Default heroes index for this NFT
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
        string name;
        string imageUri;
        uint256 hp;
        uint256 maxHp;
        uint256 damage;
    }

    Hero[] public defaultHeroes;

    mapping(address => uint256[]) public nftHolders; // Map each address to a list of NFTs they hold
    mapping(uint256 => Hero) public nftHero; // Map NFT token ID to its' hero data structure

    Boss[] public bosses;
    Boss public currentBoss;

    address public owner;
    uint256 public maxTokenAmount = 3;
    uint256 public mintCost = 0.00 ether;

    bool private initialized;

    /**
     * THIS IS JUST FOR TESTING
     */
    uint256 public testRequestId;

    constructor(address _coordinatorAddress)
        ERC721("Heroes", "Hero")
        VRFConsumerBaseV2(_coordinatorAddress)
    {
        owner = msg.sender;
        coordinatorAddress = _coordinatorAddress;
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
            bosses.push(
                Boss({
                    name: bossNames[i],
                    imageUri: bossImageUris[i],
                    hp: bossHps[i],
                    maxHp: bossDamage[i],
                    damage: bossDamage[i]
                })
            );
        }
        currentBoss = bosses[0];
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

    function createSubscription() private {
        subscriptionId = coordinator.createSubscription();
        coordinator.addConsumer(subscriptionId, address(this));
    }

    function setInitialized() external onlyOwner checkInitialized {
        initialized = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller must be owner");
        _;
    }

    modifier checkInitialized() {
        require(!initialized, "Contract has already been initialized");
        _;
    }

    function mintHero() external payable {
        uint256[] storage tokenIds = nftHolders[msg.sender];
        require(
            tokenIds.length < maxTokenAmount,
            "This address has reached maximum NFT amount"
        );
        if (mintCost > 0) {
            require(msg.value == mintCost, "Payment is not correct");
        }
        uint256 tokenId = _tokenIds.current();
        requestMint(tokenId);
        _tokenIds.increment();
    }

    function requestMint(uint256 tokenId) private {
        uint256 requestId = coordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            3,
            1000000,
            1
        );
        testRequestId = requestId; // FOR TESTING PURPOSES
        requests[requestId] = Request(msg.sender, tokenId);
    }

    /**
     *   THIS FUNCTION IS FOR TESTING PURPOSES ONLY
     */
    function testFulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) public {
        fulfillRandomWords(requestId, randomWords);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        Request memory request = requests[requestId];
        delete requests[requestId];
        uint256 randomHeroIndex = randomWords[0] % defaultHeroes.length;
        fullfillMint(request.requester, request.tokenId, randomHeroIndex);
    }

    function fullfillMint(
        address requester,
        uint256 tokenId,
        uint256 heroIndex
    ) private {
        console.log("Fulfill Mint");
        Hero memory hero = defaultHeroes[heroIndex];
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
        emit Mint(requester, tokenId, heroIndex);
    }

    function attackBoss() public {
        uint256[] storage tokenIds = nftHolders[msg.sender];
        console.log(
            "Boss %s has %s HP and %s AD",
            currentBoss.name,
            currentBoss.hp,
            currentBoss.damage
        );
        for (uint256 i = 0; i < tokenIds.length; i++) {
            Hero storage hero = nftHero[tokenIds[i]];
            console.log(
                "Hero %s attacking, has %s HP and %s AD",
                hero.name,
                hero.hp,
                hero.damage
            );

            // TODO destroy hero / boss when dead
            if (currentBoss.hp < hero.damage) {
                // TODO Remove current boss and get a new one through VRF, emit event
                currentBoss.hp = 0;
            } else {
                currentBoss.hp -= hero.damage;
            }

            if (hero.hp < currentBoss.damage) {
                // TODO Destroy this hero and remove it from the player, emit event
                hero.hp = 0;
            } else {
                hero.hp -= currentBoss.damage;
            }
        }
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        Hero memory hero = nftHero[tokenId];
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

    function fundSubscription() external onlyOwner {
        linkToken.transferAndCall(
            coordinatorAddress,
            linkToken.balanceOf(address(this)),
            abi.encode(subscriptionId)
        );
    }

    function getDefaultHeroes() external view returns (Hero[] memory) {
        return defaultHeroes;
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
        Hero[] memory userHeroes;
        uint256 length = userTokenIds.length;
        for (uint256 i = 0; i < length; i++) {
            userHeroes[i] = nftHero[userTokenIds[i]];
        }
        return userHeroes;
    }

    function totalSupply() external view returns (uint256) {
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
}
