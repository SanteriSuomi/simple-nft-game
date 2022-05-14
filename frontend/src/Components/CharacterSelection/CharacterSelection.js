import { Stack, Typography } from "@mui/material";
import { ethers } from "hardhat";
import { React } from "react";
import { ABI, CONTRACT_ADDRESS } from "../../utils/constants";

export default function CharacterSelection() {
	const fetchUserHeroes = async (signer) => {
		try {
			console.log(signer);
			const gameContract = new ethers.Contract(
				CONTRACT_ADDRESS,
				ABI,
				signer
			);
			const heroes = await gameContract.getUserHeroes(
				signer.getAddress()
			);
			if (heroes && heroes.length > 0) {
				console.log("User has character NFT");
				return heroes;
			} else {
				console.log("No character NFT found");
			}
		} catch (error) {
			console.log(error);
		}
		return undefined;
	};

	return (
		<Stack direction="column" alignItems="center" marginTop="5%">
			<Typography fontSize={"calc(10px + 0.5rem)"}>
				Mint a new hero to get started!
			</Typography>
		</Stack>
	);
}
