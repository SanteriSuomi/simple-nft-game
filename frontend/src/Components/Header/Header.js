import { Button, Stack, Typography } from "@mui/material";

export default function Header({ connectWallet, account }) {
	return (
		<Stack
			direction="row"
			justifyContent="space-between"
			alignItems="center"
		>
			<Typography
				fontSize={{
					xs: "calc(10px + 0.6rem)",
					lg: "calc(20px + 1.2rem)",
				}}
			>
				👾 Monster Slayer 👹
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
				onClick={connectWallet}
			>
				{account ? "Connected" : "Connect"}
			</Button>
		</Stack>
	);
}
