import { Button, Stack, Typography } from "@mui/material";
import { React, useEffect, useState } from "react";

export default function CharacterSelection({ data }) {
	const { provider, signer, contract } = data;

	const [heroes, setHeroes] = useState(null);

	const fetchUserHeroes = async () => {
		if (heroes) return;
		try {
			const userHeroes = await contract.getUserHeroes(
				await signer.getAddress()
			);
			if (userHeroes && userHeroes.length > 0) {
				console.log("User has character NFT");
				setHeroes(userHeroes);
			} else {
				console.log("No character NFT found");
			}
		} catch (error) {
			console.log(error);
		}
	};

	const transformHeroData = async () => {
		// TODO transform data return by getUserHeroes to a usable object (convert BigNumbers etc)
	};

	const mintHero = async () => {
		try {
			(await contract.mintHeroTest({ gasLimit: 1000000 })).wait();
			fetchUserHeroes();
		} catch (error) {
			console.log(error);
		}
	};

	useEffect(() => {
		fetchUserHeroes();
	});

	const renderContent = () => {
		if (heroes && heroes.length > 0) {
			return (
				<Stack direction="column" alignItems="center" marginTop="5%">
					<Typography fontSize={"calc(10px + 0.5rem)"}>
						Heroes found!
					</Typography>
				</Stack>
			);
		} else {
			return (
				<Stack direction="column" alignItems="center" marginTop="5%">
					<Typography fontSize={"calc(10px + 0.5rem)"}>
						No heroes found, press the button below to mint your
						hero.
					</Typography>
					<Button
						sx={{
							backgroundColor: "#6e2c90",
							fontSize: {
								xs: "calc(5px + 0.5rem)",
								lg: "calc(10px + 1rem)",
							},
						}}
						variant="contained"
						onClick={mintHero}
					>
						Mint
					</Button>
				</Stack>
			);
		}
	};

	return renderContent();
}
