// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.13;

import "hardhat/console.sol";

contract Game {
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

    Attributes[] defaultAttributes;

    constructor(
        // Default character details
        string[] memory names,
        string[] memory uris,
        uint256[] memory hps,
        uint256[] memory damages,
        uint256[] memory crits,
        uint256[] memory heals
    ) {
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
        // for (uint256 i = 0; i < defaultAttributes.length; i++) {
        //     console.logUint(defaultAttributes[i].index);
        //     console.logString(defaultAttributes[i].name);
        //     console.logString(defaultAttributes[i].uri);
        //     console.logUint(defaultAttributes[i].hp);
        //     console.logUint(defaultAttributes[i].maxHp);
        //     console.logUint(defaultAttributes[i].damage);
        //     console.logUint(defaultAttributes[i].crit);
        //     console.logUint(defaultAttributes[i].heal);
        // }
    }
}
