import "./App.css";
import { useEffect, useState } from "react";
import { Stack } from "@mui/material";
import { ethers } from "ethers";
import SelectCharacter from "./Components/SelectCharacter/SelectCharacter";
import Header from "./Components/Header/Header";
import WelcomeScreen from "./Components/WelcomeScreen/WelcomeScreen";
import { CONTRACT_ADDRESS, ABI } from "./utils/constants";

export default function App() {
	const [account, setAccount] = useState(null);
	const [userHeroes, setUserHeroes] = useState(null);

	const { ethereum } = window;

	const connectWallet = async () => {
		try {
			if (!ethereum) {
				return alert("No Metamask detected");
			}

			const provider = new ethers.providers.Web3Provider(ethereum);
			await provider.send("eth_requestAccounts", []);
			const signer = provider.getSigner();
			setAccount({
				provider: provider,
				accounts: signer,
			});
		} catch (error) {
			console.log(error);
		}
	};

	// Check network and wallet connection here
	useEffect(() => {
		const checkNetwork = async () => {
			try {
				if (ethereum.networkVersion !== "4") {
					alert("Please connect to Rinkeby!");
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
					setAccount({
						provider: provider,
						accounts: signer,
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

			if (account) {
				await checkNetwork();
			} else {
				await checkWalletConnection();
			}
		};

		checkNetworkAndWallet();
	}, [account, ethereum]);

	// Check user NFT here
	useEffect(() => {
		const fetchNFTMetadata = async () => {
			const provider = new ethers.providers.Web3Provider(ethereum);
			await provider.send("eth_requestAccounts", []);
			const signer = provider.getSigner();
			const gameContract = new ethers.Contract(
				CONTRACT_ADDRESS,
				ABI,
				signer
			);

			const userHeroes = await gameContract.getUserHeroes(
				signer.getAddress()
			);
			console.log(userHeroes);
			if (userHeroes && userHeroes.length > 0) {
				console.log("User has character NFT");
				setUserHeroes(userHeroes);
			} else {
				console.log("No character NFT found");
			}
		};

		// /*
		//  * We only want to run this, if we have a connected wallet
		//  */
		// if (currentAccount) {
		// 	console.log("CurrentAccount:", currentAccount);
		// 	fetchNFTMetadata();
		// }
		fetchNFTMetadata();
	});

	const renderContent = () => {
		if (account && userHeroes) {
			return <SelectCharacter setCharacterNFT={setUserHeroes} />;
		} else {
			return <WelcomeScreen></WelcomeScreen>;
		}
	};

	return (
		<Stack direction="column" height="90vh">
			<Header connectWallet={connectWallet} account={account}></Header>
			{renderContent()}
		</Stack>
	);
}
