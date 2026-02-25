const fs = require('fs');
const path = require('path');

const directoryToSearch = path.join(__dirname, 'screens');
const appDirectory = __dirname; // search components if needed
const componentsToSearch = path.join(__dirname, 'components');

const DIRS_TO_SEARCH = [directoryToSearch, componentsToSearch];

const processFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Remove import { useFonts, ... } from "@expo-google-fonts/kanit";
    content = content.replace(/import\s*\{\s*([^}]*useFonts[^}]*)\s*\}\s*from\s*(['"])@expo-google-fonts\/kanit\2;\n?/g, (match, imports) => {
        // If it only imports useFonts and font weights, we can remove the whole line.
        // It's possible we need to remove the whole line anyway since that's what we want.
        return '';
    });
    // Another variation
    content = content.replace(/import\s*useFonts.*?from\s*['"]@expo-google-fonts\/kanit['"];\n?/g, '');

    // Remove individual imports from kanit if they weren't caught
    content = content.replace(/import\s*\{[^}]*Kanit_[^}]*\}\s*from\s*(['"])@expo-google-fonts\/kanit\1;\n?/g, '');

    // Remove the `const [fontsLoaded] = useFonts({...});` block
    content = content.replace(/const\s+\[fontsLoaded\]\s*=\s*useFonts\s*\(\s*\{[^}]*\}\s*\);\n?/g, '');
    content = content.replace(/let\s+\[fontsLoaded\]\s*=\s*useFonts\s*\(\s*\{[^}]*\}\s*\);\n?/g, '');

    // Sometimes it's spread multiple lines
    content = content.replace(/const\s+\[fontsLoaded\]\s*=\s*useFonts\(\{[\s\S]*?\}\);\n?/g, '');

    // Sometimes useFonts is isolated, let's just make sure `if (!fontsLoaded)` blocks exist but we probably shouldn't remove them unless we define `fontsLoaded` to `true`.
    // Wait, if we remove `fontsLoaded`, the line `if (!fontsLoaded) return null;` will throw undefined variable error!
    // So we should remove `if (!fontsLoaded) { return null; }`
    content = content.replace(/if\s*\(!fontsLoaded\)\s*\{\s*return null;\s*\}\n?/g, '');
    content = content.replace(/if\s*\(!fontsLoaded\)\s*return null;\n?/g, '');

    // Replace the fontFamily names in stylesheets
    content = content.replace(/Kanit_400Regular/g, 'NotoSansThai_400Regular');
    content = content.replace(/Kanit_500Medium/g, 'NotoSansThai_500Medium');
    content = content.replace(/Kanit_600SemiBold/g, 'NotoSansThai_600SemiBold');
    content = content.replace(/Kanit_700Bold/g, 'NotoSansThai_700Bold');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
};

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        } else {
            if (filepath.endsWith('.js') || filepath.endsWith('.jsx')) {
                filelist.push(filepath);
            }
        }
    });
    return filelist;
};

DIRS_TO_SEARCH.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`Searching in ${dir}...`);
        const files = walkSync(dir);
        files.forEach(file => processFile(file));
    }
});

console.log("Refactoring complete.");
