import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import '@mantine/core/styles.css';

import { createTheme, MantineProvider } from '@mantine/core';

import { Routes, Route } from "react-router";
import OuterShell from "./components/OuterShell";
import { isEditingState } from "./atoms/projects";
import Home from "./components/Home";
import Editor from "./components/Editor";
const theme = createTheme({
	/** Put your mantine theme override here */
});

function App() {

	return (
			<MantineProvider theme={theme}>
				<main >
					<Routes>
						<Route path="/" element={<OuterShell />}>
							<Route index element={1 ? <Home /> : <Editor />} />
						</Route>
					</Routes>

				</main>

			</MantineProvider>

	);
}

export default App;
