import "./App.css";
import { useEffect, useState } from "react";
import { Stack } from "@mui/material";
import { ethers } from "ethers";
import CharacterSelection from "./Components/CharacterSelection/CharacterSelection";
import Header from "./Components/Header/Header";
import WelcomeScreen from "./Components/WelcomeScreen/WelcomeScreen";
import { CHAIN_ID, NETWORK_NAME } from "./utils/constants";

var sentAlert;

export default function App() {
	const [userData, setUserData] = useState(null);

	const { ethereum } = window;

	const connectWallet = async () => {
		try {
			if (!ethereum) {
				return alert("No Metamask detected");
			}

			const provider = new ethers.providers.Web3Provider(ethereum);
			await provider.send("eth_requestAccounts", []);
			const signer = provider.getSigner();
			setUserData({
				provider: provider,
				accounts: signer,
			});
		} catch (error) {
			console.log(error);
		}
	};

	useEffect(() => {
		const checkNetwork = async () => {
			try {
				if (ethereum.networkVersion !== CHAIN_ID) {
					alert(`Please connect to ${NETWORK_NAME}!`);
				}
			} catch (error) {
				console.log(error);
			}
		};

		const checkWalletConnection = async () => {
			try {
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
					setUserData({
						provider: provider,
						signer: signer,
					});
				}
			} catch (error) {
				console.log(error);
			}
		};

		const checkNetworkAndWallet = async () => {
			if (!ethereum) {
				return alert("No Metamask detected");
			}
			if (!userData) {
				if (!sentAlert) {
					sentAlert = true;
					setTimeout(async () => {
						await checkNetwork();
						sentAlert = false;
					}, 2000);
				}
				await checkWalletConnection();
			}
		};

		checkNetworkAndWallet();
	}, [userData, ethereum]);

	const renderContent = () => {
		if (userData) {
			return <CharacterSelection></CharacterSelection>;
		} else {
			return <WelcomeScreen></WelcomeScreen>;
		}
	};

	return (
		<Stack direction="column" height="90vh">
			<Header connectWallet={connectWallet} account={userData}></Header>
			{renderContent()}
		</Stack>
	);
}
