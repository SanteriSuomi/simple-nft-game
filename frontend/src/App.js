import "./App.css";
import { useEffect, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ethers } from "ethers";

export default function App() {
	const [account, setAccount] = useState(null);

	const { ethereum } = window;

	const connectWallet = async () => {
		try {
			if (!ethereum) {
				alert("hj");
			}

			const provider = new ethers.providers.Web3Provider(ethereum);
			await provider.send("eth_requestAccounts", []);
			const signer = provider.getSigner();

			setAccount({
				provider: provider,
				accounts: signer,
			});
			console.log(
				(await provider.getBalance(signer.getAddress())).toString()
			);
		} catch (error) {
			console.log(error);
		}
	};

	useEffect(() => {
		const checkWalletConnection = async () => {
			try {
				if (ethereum) {
					console.log("Ethereum object found", ethereum);
				} else {
					console.log("Make sure you have MetaMask!");
				}

				const accounts = await ethereum.request({
					method: "eth_accounts",
				});

				if (accounts.length === 0) {
					console.log("No authorized accounts");
				} else {
					const provider = new ethers.providers.Web3Provider(
						ethereum
					);
					const signer = provider.getSigner();
					setAccount({
						provider: provider,
						accounts: signer,
					});
				}
			} catch (error) {
				console.log(error);
			}
		};

		if (!account) {
			checkWalletConnection();
		}
	}, [account, ethereum]);

	return (
		<Stack direction="column" spacing={7.5}>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
			>
				<Typography fontSize={35}>👾 Monster Slayer 👹</Typography>
				<Button
					sx={{
						maxHeight: 45,
						backgroundColor: "#6e2c90",
					}}
					variant="contained"
					onClick={() => {
						connectWallet();
					}}
				>
					{account ? "Connected" : "Connect"}
				</Button>
			</Stack>
			<Stack direction="column" alignItems="center" spacing={3}>
				<Box
					component="img"
					sx={{
						height: 250,
						width: 375,
					}}
					alt="The house from the offer."
					src="main.webp"
				/>
				<Typography fontSize={18.5}>
					Connect your wallet to get started (top right)!
				</Typography>
			</Stack>
		</Stack>
	);
}
