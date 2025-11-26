import { Terminal } from "./components/Terminal";
import { themes, loadTheme } from "./themes/themes";

function App() {
  const currentTheme = loadTheme();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Terminal theme={themes[currentTheme]} />
      </div>
    </div>
  );
}

export default App;
