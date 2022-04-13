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
        uint256 indexed attributesIndex
    );

    VRFCoordinatorV2Interface public coordinator;
    LinkTokenInterface public linkToken;
    // Mainnet
    address private coordinatorAddress =
        0x271682DEB8C4E0901D1a1550aD2e64D568E69909;
    // Mainnet
    address private linkTokenAddress =
        0x514910771AF9Ca656af840dff83E8264EcF986CA;
    // 500 gwei gas lane
    bytes32 private keyHash =
        0xff8dedfbfa60af186cf3c830acbc32c05aae823045ae5ea7da1e45fbfaba4f92;
    uint64 private subscriptionId;

    mapping(uint256 => Request) private requests;

    struct Request {
        address requester;
        uint256 tokenId;
    }

    struct Attributes {
        uint256 index;
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

    Counters.Counter private _tokenIds;

    Attributes[] public defaultAttributes;

    mapping(uint256 => Attributes) public nftAttributes;
    mapping(address => uint256[]) public nftHolders;

    Boss[] public bosses;
    Boss public currentBoss;

    uint256 public mintCost = 0.00 ether;

    address public owner;

    /**
     * THIS IS JUST FOR TESTING
     */
    uint256 public testRequestId;

    constructor(
        string[] memory names,
        string[] memory imageUris,
        uint256[] memory hps,
        uint256[] memory damages,
        uint256[] memory crits,
        uint256[] memory heals,
        string[] memory bossNames,
        string[] memory bossImageUris,
        uint256[] memory bossHps,
        uint256[] memory bossDamage
    ) ERC721("Heroes", "Hero") VRFConsumerBaseV2(coordinatorAddress) {
        require(
            names.length == imageUris.length &&
                imageUris.length == hps.length &&
                hps.length == damages.length &&
                damages.length == crits.length &&
                crits.length == heals.length,
            "One of the given NFT default arrays is odd length"
        );

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

        for (uint256 i = 0; i < names.length; i++) {
            defaultAttributes.push(
                Attributes({
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
        _tokenIds.increment(); // To start token id from 1

        owner = msg.sender;

        coordinator = VRFCoordinatorV2Interface(coordinatorAddress);
        linkToken = LinkTokenInterface(linkTokenAddress);
        createSubscription();
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller must be owner");
        _;
    }

    function getDefaultAttributes()
        external
        view
        returns (Attributes[] memory)
    {
        return defaultAttributes;
    }

    function mintHero() external payable {
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
            100000,
            1
        );
        testRequestId = requestId;
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
        uint256 randomAttributesIndex = randomWords[0] %
            defaultAttributes.length;
        fullfillMint(request.requester, request.tokenId, randomAttributesIndex);
    }

    function fullfillMint(
        address requester,
        uint256 tokenId,
        uint256 attributesIndex
    ) private {
        Attributes memory attributes = defaultAttributes[attributesIndex];
        nftAttributes[tokenId] = Attributes({
            index: attributes.index,
            name: attributes.name,
            imageUri: attributes.imageUri,
            hp: attributes.hp,
            maxHp: attributes.hp,
            damage: attributes.damage,
            crit: attributes.crit,
            heal: attributes.heal
        });
        nftHolders[requester].push(tokenId);
        _safeMint(requester, tokenId);
        emit Mint(requester, tokenId, attributesIndex);
    }

    function createSubscription() private {
        subscriptionId = coordinator.createSubscription();
        coordinator.addConsumer(subscriptionId, address(this));
    }

    function fundSubscription(uint256 linkAmount) external onlyOwner {
        linkToken.transferAndCall(
            coordinatorAddress,
            linkAmount,
            abi.encode(subscriptionId)
        );
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        Attributes memory attributes = nftAttributes[tokenId];

        string memory json = Base64.encode(
            abi.encodePacked(
                '{"name": "',
                attributes.name,
                " -- NFT #: ",
                Strings.toString(tokenId),
                '", "description": "A Hero NFT that lets you play Monster Slayer!", "image": "',
                attributes.imageUri,
                '", "attributes": [ { "trait_type": "Health Points", "value": ',
                Strings.toString(attributes.hp),
                ', "max_value":',
                Strings.toString(attributes.maxHp),
                '}, { "trait_type": "Attack Damage", "value": ',
                Strings.toString(attributes.damage),
                ', "max_value":',
                Strings.toString(50),
                '}, { "trait_type": "Critical Damage Chance", "value": ',
                Strings.toString(attributes.crit),
                ', "max_value":',
                Strings.toString(50),
                '}, { "trait_type": "Healing Power", "value": ',
                Strings.toString(attributes.heal),
                ', "max_value":',
                Strings.toString(50),
                "} ]}"
            )
        );

        string memory output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );

        return output;
    }

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
    }

    function setMintCost(uint256 _mintCost) external onlyOwner {
        mintCost = _mintCost;
    }
}
