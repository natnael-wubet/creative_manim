import "./App.css";
import "./index.css";
import "@mantine/core/styles.css";

import { createTheme, MantineProvider } from "@mantine/core";
import { Routes, Route } from "react-router";
import { useAtom } from "jotai";

import OuterShell from "./components/OuterShell";
import Home from "./components/Home";
import Editor from "./components/Editor";
import { isEditingAtom } from "./atoms/projects";
import { ThemeSync } from "./ThemeSync";

const theme = createTheme({
	/** Manim — creative animation studio theme */
	fontFamily:
		"Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
	fontFamilyMonospace:
		"JetBrains Mono, Fira Code, ui-monospace, SFMono-Regular, Consolas, monospace",
	headings: {
		fontFamily:
			"Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
		fontWeight: "600",
	},
	primaryColor: "violet",
	defaultRadius: "md",
	cursorType: "pointer",
	colors: {
		violet: [
			"#f5f0ff",
			"#e9dffd",
			"#d1bef8",
			"#b69af2",
			"#9d76ed",
			"#885ae8",
			"#7c4ee6",
			"#6a3fd4",
			"#5e37bf",
			"#512eaa",
		],
		amber: [
			"#fff9e6",
			"#fff2cc",
			"#ffe599",
			"#ffd866",
			"#ffca33",
			"#ffbd00",
			"#e6a800",
			"#cc9500",
			"#b38300",
			"#997000",
		],
	},
	shadows: {
		sm: "0 1px 2px rgba(0,0,0,0.15)",
		md: "0 4px 12px rgba(0,0,0,0.2)",
		lg: "0 8px 24px rgba(0,0,0,0.25)",
		xl: "0 12px 36px rgba(0,0,0,0.3)",
	},
	spacing: {
		xs: "0.25rem",
		sm: "0.5rem",
		md: "0.75rem",
		lg: "1rem",
		xl: "1.5rem",
	},
});

function App() {
	const [isEditing] = useAtom(isEditingAtom);

	return (
		<MantineProvider theme={theme} defaultColorScheme="auto" >
			<ThemeSync />
			<main>
				<Routes>
					<Route path="/" element={<OuterShell />}>
						<Route index element={!isEditing ? <Home /> : <Editor />} />
					</Route>
				</Routes>
			</main>
		</MantineProvider>
	);
}

export default App;
