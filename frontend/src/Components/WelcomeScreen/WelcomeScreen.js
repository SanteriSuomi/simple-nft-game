import { Stack, Typography } from "@mui/material";
import { Box } from "@mui/system";

export default function WelcomeScreen() {
	return (
		<Stack
			direction="column"
			justifyContent="center"
			alignItems="center"
			spacing={3}
			height="100%"
		>
			<Box
				component="img"
				sx={{
					height: "auto",
					width: {
						xs: "100%",
						sm: "65%",
						md: "calc(300px + 10vw)",
					},
				}}
				alt="The house from the offer."
				src="main.webp"
			/>
			<Typography fontSize={"calc(10px + 0.5rem)"}>
				Connect your wallet to get started (top right)!
			</Typography>
		</Stack>
	);
}
