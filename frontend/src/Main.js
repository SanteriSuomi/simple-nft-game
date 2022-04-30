import "./App.css";
import { useEffect, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

export default function Main() {
	const [account, setAccount] = useState(null);

	const { ethereum } = window;

	const checkWalletConnection = async () => {
		if (ethereum) {
			console.log("We have the ethereum object", ethereum);
		} else {
			console.log("Make sure you have MetaMask!");
		}

		const accounts = await ethereum.request({ method: "eth_accounts" });
		if (accounts.length === 0) {
			console.log("No authorized accounts");
		} else {
			setAccount(accounts[0]);
		}
	};

	const connectWallet = async () => {
		if (!ethereum) {
			alert("hj");
		}

		const accounts = await ethereum.request({
			method: "eth_requestAccounts",
		});

		console.log("Connected", accounts[0]);
		setAccount(accounts[0]);
	};

	useEffect(() => {
		checkWalletConnection();
	}, []);

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between">
				<Typography>Monster Slayer</Typography>
				<Button variant="contained">Connect</Button>
			</Stack>
		</Box>
	);
}
