// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./libraries/Base64.sol";

import "hardhat/console.sol";

contract Game is ERC721 {
    using Counters for Counters.Counter;

    struct Attributes {
        uint256 index;
        string name;
        string uri;
        uint256 hp;
        uint256 maxHp;
        uint256 damage;
        uint256 crit;
        uint256 heal;
    }

    Counters.Counter private _tokenIds;

    Attributes[] public defaultAttributes;

    mapping(uint256 => Attributes) public nftAttributes;
    mapping(address => uint256[]) public nftHolders;

    uint256 public mintCost = 0.00 ether;

    address private owner;

    constructor(
        string[] memory names,
        string[] memory uris,
        uint256[] memory hps,
        uint256[] memory damages,
        uint256[] memory crits,
        uint256[] memory heals
    ) ERC721("Heroes", "Hero") {
        require(
            names.length == uris.length &&
                uris.length == hps.length &&
                hps.length == damages.length &&
                damages.length == crits.length &&
                crits.length == heals.length,
            "One of the given default arrays is odd length"
        );
        for (uint256 i = 0; i < names.length; i++) {
            defaultAttributes.push(
                Attributes({
                    index: i,
                    name: names[i],
                    uri: uris[i],
                    hp: hps[i],
                    maxHp: hps[i],
                    damage: damages[i],
                    crit: crits[i],
                    heal: heals[i]
                })
            );
        }
        _tokenIds.increment();
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller must be owner");
        _;
    }

    function mint(uint256 attributesIndex) external payable {
        if (mintCost > 0) {
            require(msg.value == mintCost, "Payment is not correct");
        }
        uint256 tokenId = _tokenIds.current();
        Attributes memory attribute = defaultAttributes[attributesIndex];
        nftAttributes[tokenId] = Attributes({
            index: attribute.index,
            name: attribute.name,
            uri: attribute.uri,
            hp: attribute.hp,
            maxHp: attribute.hp,
            damage: attribute.damage,
            crit: attribute.crit,
            heal: attribute.heal
        });
        nftHolders[msg.sender].push(tokenId);
        _safeMint(msg.sender, tokenId);
        _tokenIds.increment();
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
                '", "description": "Hero NFT that lets you play Monster Slayer!", "image": "',
                attributes.uri,
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
