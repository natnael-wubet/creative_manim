import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import '@mantine/core/styles.css';

import { createTheme, MantineProvider } from '@mantine/core';

import { Routes, Route } from "react-router";
import OuterShell from "./components/OuterShell";
import {
	RecoilRoot,
	atom,
	selector,
	useRecoilState,
	useRecoilValue,
} from 'recoil';
const theme = createTheme({
	/** Put your mantine theme override here */
});

function App() {
	const [greetMsg, setGreetMsg] = useState("");
	const [name, setName] = useState("");

	async function greet() {
		// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
		setGreetMsg(await invoke("greet", { name }));
	}

	return (

		<RecoilRoot>
			<MantineProvider theme={theme}>
				<main >
					<Routes>
						<Route path="/" element={<OuterShell />} />
					</Routes>

				</main>

			</MantineProvider>

		</RecoilRoot>
	);
}

export default App;
