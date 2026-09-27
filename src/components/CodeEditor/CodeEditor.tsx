
import { ScrollArea, useMantineColorScheme } from '@mantine/core';
import './CodeEditor.module.css'

import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-python";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-one_dark";
import "ace-builds/src-noconflict/ext-language_tools";
type CodeEditorProps = {
	value: string;
	onChange: (value: string) => void;
}
const CodeEditor: React.FC<CodeEditorProps> = ({
	value,
	onChange
}) => {

	const { colorScheme, toggleColorScheme } = useMantineColorScheme();
	const isDark = colorScheme === "dark";
	return (
		<div>
			<AceEditor
				mode="python"        // or "python", "java", etc.
				theme={isDark ? "one_dark" : "github"}          // or "github", "monokai", etc.

				name="code-editor"
				value={value}
				onChange={onChange}       // onChange(newValue, event)
				width="100%"
				height="400px"
				fontSize={14}
				defaultValue='from manim import *

	class ManimCELogo(Scene):
    def construct(self):
	self.camera.background_color = "#ece6e2"
	logo_green = "#87c2a5"
	logo_blue = "#525893"
	logo_red = "#e07a5f"
	logo_black = "#343434"
	ds_m = MathTex(r"\mathbb{M}", fill_color = logo_black).scale(7)
	ds_m.shift(2.25 * LEFT + 1.5 * UP)
	circle = Circle(color = logo_green, fill_opacity = 1).shift(LEFT)
	square = Square(color = logo_blue, fill_opacity = 1).shift(UP)
	triangle = Triangle(color = logo_red, fill_opacity = 1).shift(RIGHT)
	logo = VGroup(triangle, square, circle, ds_m)  # order matters
	logo.move_to(ORIGIN)
	self.add(logo)'
				showPrintMargin={false}
				editorProps={{ $blockScrolling: true }}
				setOptions={{
					useWorker: false,
					enableBasicAutocompletion: true,
					enableLiveAutocompletion: true,
					enableSnippets: true,
				}}
			/>
		</div>
	);
};

export default CodeEditor;

