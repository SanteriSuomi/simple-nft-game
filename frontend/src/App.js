import "./App.css";
import { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { ethers } from "ethers";
import SelectCharacter from "./Components/SelectCharacter/SelectCharacter";
import Header from "./Components/Header/Header";
import WelcomeScreen from "./Components/WelcomeScreen/WelcomeScreen";

export default function App() {
	const [account, setAccount] = useState(null);
	const [characterNFT, setCharacterNFT] = useState(null);

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

	const renderContent = () => {
		if (!account) {
			return <WelcomeScreen></WelcomeScreen>;
		} else if (account && !characterNFT) {
			return <SelectCharacter setCharacterNFT={setCharacterNFT} />;
		}
	};

	return (
		<Stack direction="column" height="90vh">
			<Header connectWallet={connectWallet} account={account}></Header>
			{renderContent()}
		</Stack>
	);
}
