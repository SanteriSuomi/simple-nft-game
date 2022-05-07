import { Stack, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

export default function SelectCharacter({ setCharacterNFT }) {
	return (
		<Stack direction="column" alignItems="center" marginTop="5%">
			<Typography fontSize={"calc(10px + 0.5rem)"}>
				Mint a new hero to get started!
			</Typography>
		</Stack>
	);
}
