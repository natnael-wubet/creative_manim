import AceEditor from "react-ace";
import ace from "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-one_dark";
import "ace-builds/src-noconflict/ext-language_tools";
import { useTheme } from "@/hooks/useTheme";

// Ace modes, themes, and completions are imported statically above, so nothing
// should be fetched at runtime; in dev the base path only silences Ace's
// "unable to infer path" warning.
if (import.meta.env.DEV) {
  ace.config.set("basePath", "/node_modules/ace-builds/src-noconflict");
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

function CodeEditor({ value, onChange, readOnly = false }: CodeEditorProps) {
  const { theme } = useTheme();

  return (
    <AceEditor
      mode="python"
      theme={theme === "dark" ? "one_dark" : "github"}
      name="manim-scene-editor"
      value={value}
      onChange={onChange}
      width="100%"
      height="100%"
      fontSize={13}
      tabSize={4}
      showPrintMargin={false}
      highlightActiveLine
      readOnly={readOnly}
      editorProps={{ $blockScrolling: true }}
      setOptions={{
        useWorker: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: false,
        wrap: true,
        fontFamily: "JetBrains Mono, Fira Code, monospace",
      }}
    />
  );
}

export default CodeEditor;
