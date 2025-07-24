const {
    withAndroidManifest,
    withAppBuildGradle,
    withProjectBuildGradle,
    withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function addComposeCompilerPlugin(config) {
    return withProjectBuildGradle(config, (config) => {
        const { modResults } = config;
        let buildGradleContent = modResults.contents;

        console.log('Paysafe plugin: Adding Compose Compiler plugin to project build.gradle...');

        try {
            // Add Compose Compiler plugin to project level dependencies if not present
            if (!buildGradleContent.includes('org.jetbrains.kotlin:compose-compiler-gradle-plugin')) {
                // Find the kotlin-gradle-plugin line and add the compose plugin after it
                const kotlinPluginLine = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')";
                if (buildGradleContent.includes(kotlinPluginLine)) {
                    buildGradleContent = buildGradleContent.replace(
                        kotlinPluginLine,
                        kotlinPluginLine + '\n    classpath "org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.0.21"'
                    );
                    console.log('Paysafe plugin: Added Compose Compiler plugin classpath to project build.gradle');
                } else {
                    console.log('Paysafe plugin: Could not find kotlin-gradle-plugin line in project build.gradle');
                }
            } else {
                console.log('Paysafe plugin: Compose Compiler plugin already present in project build.gradle');
            }
        } catch (error) {
            console.error('Paysafe plugin: Error adding Compose Compiler plugin:', error.message);
        }

        modResults.contents = buildGradleContent;
        return config;
    });
}

function withPaysafeAndroidManifest(config) {
    return withAndroidManifest(config, async (config) => {
        console.log('Paysafe plugin: Configuring Android manifest...');

        try {
            // Get the main application manifest
            const manifest = config.modResults;

            // Ensure uses-permission array exists
            if (!manifest.manifest.$['uses-permission']) {
                manifest.manifest.$['uses-permission'] = [];
            }

            const permissions = manifest.manifest.$['uses-permission'];
            const hasInternetPermission = permissions.some(
                permission => permission.$ && permission.$['android:name'] === 'android.permission.INTERNET'
            );

            if (!hasInternetPermission) {
                permissions.push({
                    $: { 'android:name': 'android.permission.INTERNET' }
                });
                console.log('Paysafe plugin: Added INTERNET permission');
            }
        } catch (error) {
            console.error('Paysafe plugin: Error configuring Android manifest:', error.message);
        }

        return config;
    });
}

function withPaysafeAppBuildGradle(config) {
    return withAppBuildGradle(config, (config) => {
        const { modResults } = config;
        let buildGradleContent = modResults.contents;

        console.log('Paysafe plugin: Configuring app build.gradle...');

        try {
            // Add libs directory for AAR files if not present

            if (!buildGradleContent.includes('flatDir')) {
                // Find "dependencies {" and add repositories block right before it
                const dependenciesLine = 'dependencies {';
                if (buildGradleContent.includes(dependenciesLine)) {
                    const repositoriesBlock = `repositories {
    flatDir {
        dirs 'libs'
    }
}

`;
                    buildGradleContent = buildGradleContent.replace(
                        dependenciesLine,
                        repositoriesBlock + dependenciesLine
                    );
                    console.log('Paysafe plugin: Added repositories block with flatDir');
                } else {
                    console.log('Paysafe plugin: Could not find dependencies block in app build.gradle');
                }
            }

            // Add Compose Compiler plugin to app module if not present
            if (!buildGradleContent.includes('org.jetbrains.kotlin.plugin.compose')) {
                // Look for the kotlin android plugin line and add compose plugin after it
                const kotlinPluginMatch = buildGradleContent.match(/(apply plugin: "org\.jetbrains\.kotlin\.android")/);
                if (kotlinPluginMatch) {
                    buildGradleContent = buildGradleContent.replace(
                        /(apply plugin: "org\.jetbrains\.kotlin\.android")/,
                        `$1
apply plugin: "org.jetbrains.kotlin.plugin.compose"`
                    );
                    console.log('Paysafe plugin: Added Compose Compiler plugin to app build.gradle');
                } else {
                    console.log('Paysafe plugin: Could not find Kotlin Android plugin in app build.gradle');
                }
            } else {
                console.log('Paysafe plugin: Compose Compiler plugin already present in app build.gradle');
            }

            // Enable Compose in build features
            if (!buildGradleContent.includes('compose true')) {
                const androidRegex = /(android\s*\{)/;
                if (androidRegex.test(buildGradleContent)) {
                    // Find the position after the android block opening
                    const match = buildGradleContent.match(androidRegex);
                    if (match) {
                        const insertPos = match.index + match[0].length;
                        const insertContent = `
    buildFeatures {
        compose true
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }`;

                        buildGradleContent =
                            buildGradleContent.slice(0, insertPos) +
                            insertContent +
                            buildGradleContent.slice(insertPos);

                        console.log('Paysafe plugin: Enabled Compose build features');
                    }
                }
            }

            // Add all 5 AAR dependencies (correct Android library format)
            const aarDependencies = [
                "implementation(name: 'card-payments-release', ext: 'aar')",
                "implementation(name: 'paysafe-core-release', ext: 'aar')",
                "implementation(name: 'tokenization-release', ext: 'aar')",
                "implementation(name: 'threedsecure-release', ext: 'aar')",
                "implementation(name: 'paysafe-cardinal', ext: 'aar')"
            ];

            // Add Compose dependencies with BOM
            const composeDependencies = [
                "implementation platform('androidx.compose:compose-bom:2024.09.03')",
                "implementation 'androidx.compose.ui:ui'",
                "implementation 'androidx.compose.ui:ui-tooling-preview'",
                "implementation 'androidx.compose.material3:material3'",
                "implementation 'androidx.activity:activity-compose:1.9.2'",
                "implementation 'androidx.compose.foundation:foundation'",
                "implementation 'androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6'",
                "implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.8.6'"
            ];

            // Add Kotlin serialization dependency (required by Paysafe SDK)
            const kotlinDependencies = [
                "implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0'"
            ];

            // Add OkHttp dependencies (required by Paysafe SDK)
            const okHttpDependencies = [
                "implementation 'com.squareup.okhttp3:okhttp:4.12.0'",
                "implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'"
            ];

            // Find dependencies block and add our dependencies
            const dependenciesRegex = /(dependencies\s*\{)/;
            if (dependenciesRegex.test(buildGradleContent)) {
                const match = buildGradleContent.match(dependenciesRegex);
                if (match) {
                    const insertPos = match.index + match[0].length;
                    let insertContent = '';

                    // Add AAR dependencies if not present
                    aarDependencies.forEach(dep => {
                        if (!buildGradleContent.includes(dep)) {
                            insertContent += `\n    ${dep}`;
                        }
                    });

                    // Add Compose dependencies if not present
                    composeDependencies.forEach(dep => {
                        if (!buildGradleContent.includes(dep)) {
                            insertContent += `\n    ${dep}`;
                        }
                    });

                    // Add Kotlin serialization dependencies if not present
                    kotlinDependencies.forEach(dep => {
                        if (!buildGradleContent.includes(dep)) {
                            insertContent += `\n    ${dep}`;
                        }
                    });

                    // Add OkHttp dependencies if not present
                    okHttpDependencies.forEach(dep => {
                        if (!buildGradleContent.includes(dep)) {
                            insertContent += `\n    ${dep}`;
                        }
                    });

                    if (insertContent) {
                        buildGradleContent =
                            buildGradleContent.slice(0, insertPos) +
                            insertContent +
                            buildGradleContent.slice(insertPos);

                        console.log('Paysafe plugin: Added AAR, Compose, Kotlin serialization, and OkHttp dependencies');
                    }
                }
            }
        } catch (error) {
            console.error('Paysafe plugin: Error configuring app build.gradle:', error.message);
        }

        modResults.contents = buildGradleContent;
        return config;
    });
}

function copyAARFiles(config) {
    return withDangerousMod(config, ['android', (config) => {
        const androidProjectPath = config.modRequest.platformProjectRoot;
        const libsPath = path.join(androidProjectPath, 'app', 'libs');

        console.log('Paysafe plugin: Copying AAR files...');

        if (!fs.existsSync(libsPath)) {
            fs.mkdirSync(libsPath, { recursive: true });
            console.log('Paysafe plugin: Created libs directory');
        }

        const sourceLibPath = path.join(__dirname, '..', 'android', 'lib');

        // Define AAR files to copy (only AAR files needed)
        const filesToCopy = [
            { dir: 'cardpaymentaar', aar: 'card-payments-release.aar' },
            { dir: 'paysafecoreaar', aar: 'paysafe-core-release.aar' },
            { dir: 'tokenizationaar', aar: 'tokenization-release.aar' },
            { dir: 'threedsecureaar', aar: 'threedsecure-release.aar' },
            { dir: 'paysafecardinalaar', aar: 'paysafe-cardinal.aar' }
        ];

        let copiedCount = 0;

        filesToCopy.forEach(({ dir, aar }) => {
            const aarDirPath = path.join(sourceLibPath, dir);

            // Copy AAR file
            const aarSourcePath = path.join(aarDirPath, aar);
            const aarDestPath = path.join(libsPath, aar);

            if (fs.existsSync(aarSourcePath)) {
                fs.copyFileSync(aarSourcePath, aarDestPath);
                console.log(`Paysafe plugin: Copied ${aar}`);
                copiedCount++;
            } else {
                console.log(`Paysafe plugin: AAR file not found: ${aarSourcePath}`);
            }
        });

        console.log(`Paysafe plugin: Successfully copied ${copiedCount} AAR files`);

        return config;
    }]);
}

function withPaysafeJavaFiles(config) {
    return withDangerousMod(config, [
        "android",
        async (config) => {
            console.log('Paysafe plugin: Copying Paysafe Java source files...');

            try {
                const platformProjectRoot = config.modRequest.platformProjectRoot;
                const targetJavaDir = path.join(platformProjectRoot, "app/src/main/java/expo/modules/paysafe");

                // Create target directory if it doesn't exist
                if (!fs.existsSync(targetJavaDir)) {
                    fs.mkdirSync(targetJavaDir, { recursive: true });
                    console.log('Paysafe plugin: Created target Java package directory');
                }

                // Define source directory - properly resolve from plugin location
                const sourceJavaDir = path.join(__dirname, '..', 'android', 'src', 'main', 'java', 'expo', 'modules', 'paysafe');

                // Verify source directory exists
                if (!fs.existsSync(sourceJavaDir)) {
                    console.error(`Paysafe plugin: Source Java directory not found: ${sourceJavaDir}`);
                    return config;
                }

                // Define Java files to copy
                const javaFiles = [
                    'PaysafeModule.java',
                    'PaysafePackage.java'
                ];

                // Copy each Java file
                let copiedCount = 0;
                javaFiles.forEach(javaFile => {
                    const sourcePath = path.join(sourceJavaDir, javaFile);
                    const destPath = path.join(targetJavaDir, javaFile);

                    try {
                        if (fs.existsSync(sourcePath)) {
                            fs.copyFileSync(sourcePath, destPath);
                            console.log(`Paysafe plugin: Copied ${javaFile}`);
                            copiedCount++;
                        } else {
                            console.warn(`Paysafe plugin: Source Java file not found: ${sourcePath}`);
                        }
                    } catch (error) {
                        console.error(`Paysafe plugin: Failed to copy ${javaFile}:`, error.message);
                    }
                });

                console.log(`Paysafe plugin: Successfully copied ${copiedCount}/${javaFiles.length} Java files`);

            } catch (error) {
                console.error('Paysafe plugin: Error in Java files setup:', error.message);
            }

            return config;
        }
    ]);
}

function withPaysafeMainApplication(config) {
    return withDangerousMod(config, [
        "android",
        async (config) => {
            console.log('Paysafe plugin: Updating MainApplication.kt...');

            try {
                const platformProjectRoot = config.modRequest.platformProjectRoot;

                // Find the MainApplication.kt file by searching recursively
                const searchDir = path.join(platformProjectRoot, "app/src/main/java");

                function findMainApplication(dir) {
                    try {
                        const files = fs.readdirSync(dir);
                        for (const file of files) {
                            const fullPath = path.join(dir, file);
                            const stat = fs.statSync(fullPath);

                            if (stat.isDirectory()) {
                                const result = findMainApplication(fullPath);
                                if (result) return result;
                            } else if (file === 'MainApplication.kt') {
                                return fullPath;
                            }
                        }
                    } catch (error) {

                    }
                    return null;
                }

                let mainApplicationPath = null;
                try {
                    mainApplicationPath = findMainApplication(searchDir);
                } catch (error) {
                    console.warn('Paysafe plugin: Could not search for MainApplication.kt:', error.message);
                }

                if (!mainApplicationPath) {
                    console.warn('Paysafe plugin: MainApplication.kt not found, skipping package addition');
                    return config;
                }

                let mainApplicationContent = fs.readFileSync(mainApplicationPath, 'utf8');
                let modified = false;

                // Add import if not present
                const importStatement = 'import expo.modules.paysafe.PaysafePackage';
                if (!mainApplicationContent.includes(importStatement)) {
                    // Find the last import statement and add after it
                    const importRegex = /(import\s+[^\r\n]*[\r\n]+)/g;
                    let lastImportMatch = null;
                    let match;

                    while ((match = importRegex.exec(mainApplicationContent)) !== null) {
                        lastImportMatch = match;
                    }

                    if (lastImportMatch) {
                        const insertIndex = lastImportMatch.index + lastImportMatch[0].length;
                        mainApplicationContent =
                            mainApplicationContent.slice(0, insertIndex) +
                            importStatement + '\n' +
                            mainApplicationContent.slice(insertIndex);
                        console.log('Paysafe plugin: Added PaysafePackage import');
                        modified = true;
                    }
                }

                // Add package to ReactNativeHost if not present
                const packageAddition = 'PaysafePackage()';
                if (!mainApplicationContent.includes(packageAddition)) {
                    // Try multiple patterns for packages list
                    const packagesPatterns = [
                        // Pattern 1: packages.addAll(...)
                        {
                            regex: /(packages\.addAll\s*\(\s*listOf\s*\([^)]*)\)/s,
                            replacement: '$1, ' + packageAddition + '))'
                        },
                        // Pattern 2: listOf(...)
                        {
                            regex: /(listOf\s*\([^)]*)\)/s,
                            replacement: '$1, ' + packageAddition + ')'
                        },
                        // Pattern 3: arrayListOf(...)
                        {
                            regex: /(arrayListOf\s*\([^)]*)\)/s,
                            replacement: '$1, ' + packageAddition + ')'
                        },
                        // Pattern 4: packages.add(...)
                        {
                            regex: /(packages\.add\([^)]*\)[^}]*)([\r\n\s]*})/s,
                            replacement: '$1\n            packages.add(' + packageAddition + ')$2'
                        }
                    ];

                    let patternMatched = false;
                    for (const pattern of packagesPatterns) {
                        if (pattern.regex.test(mainApplicationContent)) {
                            mainApplicationContent = mainApplicationContent.replace(
                                pattern.regex,
                                pattern.replacement
                            );
                            console.log('Paysafe plugin: Added PaysafePackage to packages list');
                            patternMatched = true;
                            modified = true;
                            break;
                        }
                    }

                    if (!patternMatched) {
                        console.warn('Paysafe plugin: Could not find packages list pattern to add PaysafePackage');
                        console.log('Paysafe plugin: MainApplication.kt content sample:');
                        console.log(mainApplicationContent.substring(0, 500) + '...');
                    }
                }

                // Write back the modified content only if changes were made
                if (modified) {
                    fs.writeFileSync(mainApplicationPath, mainApplicationContent);
                    console.log('Paysafe plugin: MainApplication.kt updated successfully');
                } else {
                    console.log('Paysafe plugin: MainApplication.kt already up to date');
                }

            } catch (error) {
                console.error('Paysafe plugin: Error updating MainApplication.kt:', error.message);
            }

            return config;
        }
    ]);
}

// iOS Configuration Functions

function withPaysafeIOSFiles(config) {
    return withDangerousMod(config, [
        "ios",
        async (config) => {
            console.log('Paysafe plugin: *** iOS FILE COPYING STARTED ***');
            console.log('Paysafe plugin: Copying Paysafe iOS files to project...');

            try {
                const platformProjectRoot = config.modRequest.platformProjectRoot;
                const projectName = config.modRequest.projectName || config.name;

                // Source: iOS folder from SDK (simplified structure)
                const sourceIOSDir = path.join(__dirname, '..', 'ios');

                // Target: ios/projectname/ (main target directory)
                const targetMainDir = path.join(platformProjectRoot, projectName);

                // Verify source directory exists
                if (!fs.existsSync(sourceIOSDir)) {
                    console.error(`Paysafe plugin: Source iOS directory not found: ${sourceIOSDir}`);
                    return config;
                }

                console.log(`Platform project root: ${platformProjectRoot}`);
                console.log(`Project name: ${projectName}`);
                console.log(`Source iOS directory: ${sourceIOSDir}`);

                // Copy all iOS files from the simplified structure
                const iosFiles = [
                    'PaysafeWrappeApp.swift',
                    'ContentView.swift',
                    'PaysafeModule.h',
                    'PaysafeModule.m'
                ];

                // Create Utils directory if it doesn't exist
                const utilsDir = path.join(targetMainDir, 'Utils');
                if (!fs.existsSync(utilsDir)) {
                    fs.mkdirSync(utilsDir, { recursive: true });
                    console.log('Paysafe plugin: Created Utils directory');
                }

                // Copy Utils files
                const utilsFiles = [
                    'Utils/Constants.swift'
                ];

                iosFiles.forEach(fileName => {
                    const sourcePath = path.join(sourceIOSDir, fileName);
                    const destPath = path.join(targetMainDir, fileName);

                    if (fs.existsSync(sourcePath)) {
                        let fileContent = fs.readFileSync(sourcePath, 'utf8');

                        // Modify PaysafeWrappeApp.swift to remove @main and App protocol if present
                        if (fileName === 'PaysafeWrappeApp.swift') {
                            fileContent = fileContent
                                .replace('@main\n', '')
                                .replace(/class PaysafeWrappeApp: App/g, 'class PaysafeWrappeApp: NSObject')
                                .replace(/public var body: some Scene \{[\s\S]*?\n    \}/, '')
                                .replace('@StateObject private var viewModel = PaysafeViewModel()', '');

                            // Ensure we have both imports
                            if (!fileContent.includes('import PaysafePaymentsSDK')) {
                                fileContent = fileContent.replace('import SwiftUI', 'import SwiftUI\nimport PaysafePaymentsSDK');
                            }
                        }

                        // Handle ContentView.swift to ensure it has the right import
                        if (fileName === 'ContentView.swift') {
                            // Ensure we have the PaysafePaymentsSDK import
                            if (!fileContent.includes('import PaysafePaymentsSDK')) {
                                fileContent = fileContent.replace('import SwiftUI', 'import SwiftUI\nimport PaysafePaymentsSDK');
                            }
                        }

                        // Update PaysafeModule.m to use correct project name
                        if (fileName === 'PaysafeModule.m') {
                            // Fix the Swift import to use correct project name
                            fileContent = fileContent.replace(
                                'PROJECT_NAME-Swift.h',
                                `${projectName}-Swift.h`
                            );

                            // Fix parameter type issue if present
                            fileContent = fileContent.replace(
                                'removeListeners:(NSNumber *)count',
                                'removeListeners:(double)count'
                            );
                        }

                        fs.writeFileSync(destPath, fileContent);
                        console.log(`Paysafe plugin: Copied and processed ${fileName}`);
                    } else {
                        console.warn(`Paysafe plugin: Source file not found: ${sourcePath}`);
                    }
                });

                // Copy Utils files
                utilsFiles.forEach(fileName => {
                    const sourcePath = path.join(sourceIOSDir, fileName);
                    const destPath = path.join(targetMainDir, fileName);

                    if (fs.existsSync(sourcePath)) {
                        let fileContent = fs.readFileSync(sourcePath, 'utf8');
                        fs.writeFileSync(destPath, fileContent);
                        console.log(`Paysafe plugin: Copied ${fileName}`);
                    } else {
                        console.warn(`Paysafe plugin: Utils file not found: ${sourcePath}`);
                    }
                });

                // Update or create bridging header
                const bridgingHeaderPath = path.join(targetMainDir, `${projectName}-Bridging-Header.h`);
                const bridgingHeaderContent = `#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import "PaysafeModule.h"
`;

                if (!fs.existsSync(bridgingHeaderPath)) {
                    fs.writeFileSync(bridgingHeaderPath, bridgingHeaderContent);
                    console.log('Paysafe plugin: Created bridging header');
                } else {
                    let headerContent = fs.readFileSync(bridgingHeaderPath, 'utf8');

                    // Add missing imports
                    if (!headerContent.includes('#import <React/RCTBridgeModule.h>')) {
                        headerContent = '#import <React/RCTBridgeModule.h>\n' + headerContent;
                    }
                    if (!headerContent.includes('#import <React/RCTEventEmitter.h>')) {
                        headerContent = '#import <React/RCTEventEmitter.h>\n' + headerContent;
                    }
                    if (!headerContent.includes('#import "PaysafeModule.h"')) {
                        headerContent += '\n#import "PaysafeModule.h"\n';
                    }

                    fs.writeFileSync(bridgingHeaderPath, headerContent);
                    console.log('Paysafe plugin: Updated bridging header');
                }

                console.log('Paysafe plugin: Successfully copied and configured all iOS files');

            } catch (error) {
                console.error('Paysafe plugin: Error copying iOS files:', error.message);
            }

            return config;
        }
    ]);
}

function withPaysafeXcodeProject(config) {
    return withDangerousMod(config, [
        "ios",
        async (config) => {
            console.log('Paysafe plugin: Configuring Xcode project...');

            try {
                const platformProjectRoot = config.modRequest.platformProjectRoot;
                const projectName = config.modRequest.projectName || config.name;
                const projectPath = path.join(platformProjectRoot, `${projectName}.xcodeproj`, 'project.pbxproj');

                if (!fs.existsSync(projectPath)) {
                    console.error(`Paysafe plugin: Could not find project.pbxproj at ${projectPath}`);
                    return config;
                }

                // Create backup
                const backupPath = projectPath + '.backup';
                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(projectPath, backupPath);
                    console.log('Paysafe plugin: Created backup of project.pbxproj');
                }

                let projectContent = fs.readFileSync(projectPath, 'utf8');

                // STEP 1: Remove all Swift Package Manager references to avoid CardinalMobile duplication
                console.log('Paysafe plugin: Removing conflicting Swift Package Manager dependencies...');

                // Remove XCRemoteSwiftPackageReference entries
                projectContent = projectContent.replace(
                    /\w+ \/\* XCRemoteSwiftPackageReference "paysafe_sdk_ios_payments_api" \*\/ = \{[\s\S]*?\};\n/g,
                    ''
                );

                // Remove XCSwiftPackageProductDependency entries  
                projectContent = projectContent.replace(
                    /\w+ \/\* (PaysafeCardPayments|Paysafe3DS) \*\/ = \{[\s\S]*?\};\n/g,
                    ''
                );

                // Remove packageReferences from project
                projectContent = projectContent.replace(
                    /packageReferences = \([\s\S]*?\);\n/g,
                    ''
                );

                // Remove packageProductDependencies from target
                projectContent = projectContent.replace(
                    /packageProductDependencies = \([\s\S]*?\);\n/g,
                    ''
                );

                // Remove empty sections
                projectContent = projectContent.replace(
                    /\/\* Begin XCRemoteSwiftPackageReference section \*\/\s*\/\* End XCRemoteSwiftPackageReference section \*\/\n/g,
                    ''
                );
                projectContent = projectContent.replace(
                    /\/\* Begin XCSwiftPackageProductDependency section \*\/\s*\/\* End XCSwiftPackageProductDependency section \*\/\n/g,
                    ''
                );

                console.log('Paysafe plugin: Removed all Swift Package Manager references');

                // STEP 2: Add our Swift files to the project if not already present
                if (!projectContent.includes('PaysafeModule.m')) {
                    console.log('Paysafe plugin: Adding PaysafeModule files to Xcode project...');

                    // Generate UUIDs for file references
                    function generateUUID() {
                        const firstChar = 'ABCDEF'[Math.floor(Math.random() * 6)];
                        const remainingChars = Array.from({ length: 23 }, () =>
                            Math.floor(Math.random() * 16).toString(16).toUpperCase()
                        ).join('');
                        return firstChar + remainingChars;
                    }

                    const headerFileRef = generateUUID();
                    const sourceFileRef = generateUUID();
                    const sourceBuildFile = generateUUID();
                    const swiftAppFileRef = generateUUID();
                    const swiftAppBuildFile = generateUUID();
                    const swiftContentFileRef = generateUUID();
                    const swiftContentBuildFile = generateUUID();
                    const constantsFileRef = generateUUID();
                    const constantsBuildFile = generateUUID();

                    // Add file references
                    const fileReferencePattern = /(\/\* Begin PBXFileReference section \*\/[\s\S]*?)(\/\* End PBXFileReference section \*\/)/;
                    const fileReferenceMatch = projectContent.match(fileReferencePattern);

                    if (fileReferenceMatch) {
                        const newFileReferences = `\t\t${headerFileRef} /* PaysafeModule.h */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; path = ${projectName}/PaysafeModule.h; sourceTree = "<group>"; };
\t\t${sourceFileRef} /* PaysafeModule.m */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; path = ${projectName}/PaysafeModule.m; sourceTree = "<group>"; };
\t\t${swiftAppFileRef} /* PaysafeWrappeApp.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${projectName}/PaysafeWrappeApp.swift; sourceTree = "<group>"; };
\t\t${swiftContentFileRef} /* ContentView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${projectName}/ContentView.swift; sourceTree = "<group>"; };
\t\t${constantsFileRef} /* Constants.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${projectName}/Utils/Constants.swift; sourceTree = "<group>"; };
`;

                        projectContent = projectContent.replace(
                            fileReferenceMatch[2],
                            newFileReferences + fileReferenceMatch[2]
                        );
                    }

                    // Add build files
                    const buildFilePattern = /(\/\* Begin PBXBuildFile section \*\/[\s\S]*?)(\/\* End PBXBuildFile section \*\/)/;
                    const buildFileMatch = projectContent.match(buildFilePattern);

                    if (buildFileMatch) {
                        const newBuildFiles = `\t\t${sourceBuildFile} /* PaysafeModule.m in Sources */ = {isa = PBXBuildFile; fileRef = ${sourceFileRef} /* PaysafeModule.m */; };
\t\t${swiftAppBuildFile} /* PaysafeWrappeApp.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${swiftAppFileRef} /* PaysafeWrappeApp.swift */; };
\t\t${swiftContentBuildFile} /* ContentView.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${swiftContentFileRef} /* ContentView.swift */; };
\t\t${constantsBuildFile} /* Constants.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${constantsFileRef} /* Constants.swift */; };
`;

                        projectContent = projectContent.replace(
                            buildFileMatch[2],
                            newBuildFiles + buildFileMatch[2]
                        );
                    }

                    // Add files to main group
                    const mainGroupPattern = new RegExp(`(\\w +) \\/\\* ${projectName} \\*\\/ = \\{ [\\s\\S] *? children = \\([\\s\\S] *?\\); `, 'g');
                    let mainGroupMatch;
                    while ((mainGroupMatch = mainGroupPattern.exec(projectContent)) !== null) {
                        const groupContent = mainGroupMatch[0];
                        if (groupContent.includes('isa = PBXGroup')) {
                            const childrenPattern = /(children = \([\s\S]*?)(\);)/;
                            const updatedGroup = groupContent.replace(childrenPattern,
                                `$1\t\t\t\t${headerFileRef} /* PaysafeModule.h */,
\t\t\t\t${sourceFileRef} /* PaysafeModule.m */,
\t\t\t\t${swiftAppFileRef} /* PaysafeWrappeApp.swift */,
\t\t\t\t${swiftContentFileRef} /* ContentView.swift */,
\t\t\t\t${constantsFileRef} /* Constants.swift */,
$2`);
                            projectContent = projectContent.replace(groupContent, updatedGroup);
                            break;
                        }
                    }

                    // Add to Sources build phase
                    const sourcesBuildPhases = [];
                    const sourcesPattern = /(\w+) \/\* Sources \*\/ = \{[\s\S]*?isa = PBXSourcesBuildPhase;[\s\S]*?files = \(([\s\S]*?)\);[\s\S]*?};/g;
                    let match;

                    while ((match = sourcesPattern.exec(projectContent)) !== null) {
                        sourcesBuildPhases.push({
                            id: match[1],
                            fullMatch: match[0],
                            filesSection: match[2]
                        });
                    }

                    if (sourcesBuildPhases.length > 0) {
                        const sourcesPhase = sourcesBuildPhases[0];
                        const newSourceEntries = `\t\t\t\t${sourceBuildFile} /* PaysafeModule.m in Sources */,
\t\t\t\t${swiftAppBuildFile} /* PaysafeWrappeApp.swift in Sources */,
\t\t\t\t${swiftContentBuildFile} /* ContentView.swift in Sources */,
\t\t\t\t${constantsBuildFile} /* Constants.swift in Sources */,
`;

                        const updatedFilesSection = newSourceEntries + sourcesPhase.filesSection;
                        const updatedPhase = sourcesPhase.fullMatch.replace(
                            `files = (${sourcesPhase.filesSection});`,
                            `files = (${updatedFilesSection});`
                        );

                        projectContent = projectContent.replace(sourcesPhase.fullMatch, updatedPhase);
                        console.log('Paysafe plugin: Successfully added files to Sources build phase');
                    }

                    console.log('Paysafe plugin: Successfully added all files to Xcode project');
                } else {
                    console.log('Paysafe plugin: Files already exist in Xcode project');
                }

                // Write the updated project file
                fs.writeFileSync(projectPath, projectContent, 'utf8');
                console.log('Paysafe plugin: Successfully configured Xcode project!');

            } catch (error) {
                console.error('Paysafe plugin: Error modifying Xcode project:', error.message);
            }

            return config;
        }
    ]);
}

function withPaysafePodfile(config) {
    return withDangerousMod(config, [
        "ios",
        async (config) => {
            console.log('Paysafe plugin: Configuring Podfile...');

            try {
                const platformProjectRoot = config.modRequest.platformProjectRoot;
                const podfilePath = path.join(platformProjectRoot, 'Podfile');

                if (!fs.existsSync(podfilePath)) {
                    console.error('Paysafe plugin: Podfile not found');
                    return config;
                }

                let podfileContent = fs.readFileSync(podfilePath, 'utf8');

                // Remove any existing Paysafe SDK dependencies
                podfileContent = podfileContent.replace(/\s*pod 'Paysafe_SDK'.*\n/g, '');
                podfileContent = podfileContent.replace(/\s*# Paysafe SDK dependencies.*\n/g, '');
                podfileContent = podfileContent.replace(/\s*pod 'PaysafePaymentsSDK'.*\n/g, '');

                // Add the correct dependency from GitHub
                const paysafeDependency = `
  # Paysafe SDK dependencies
  pod 'PaysafePaymentsSDK', :git => 'https://github.com/paysafegroup/paysafe_sdk_ios_payments_api.git'`;

                // Find the target block and add our dependency
                const targetRegex = /(target\s+['"][^'"]*['"]\s+do[\s\S]*?)(end\s*$)/m;
                const targetMatch = podfileContent.match(targetRegex);

                if (targetMatch && !podfileContent.includes('PaysafePaymentsSDK')) {
                    podfileContent = podfileContent.replace(
                        targetMatch[1] + targetMatch[2],
                        targetMatch[1] + paysafeDependency + '\n' + targetMatch[2]
                    );
                    console.log('Paysafe plugin: Added PaysafePaymentsSDK dependency to Podfile');
                }

                fs.writeFileSync(podfilePath, podfileContent);
                console.log('Paysafe plugin: Successfully configured Podfile');

            } catch (error) {
                console.error('Paysafe plugin: Error configuring Podfile:', error.message);
            }

            return config;
        }
    ]);
}

// Main plugin function
function withPaysafe(config) {
    console.log('Paysafe plugin: Starting configuration...');

    try {
        // Android configuration
        config = addComposeCompilerPlugin(config);
        config = withPaysafeAndroidManifest(config);
        config = withPaysafeAppBuildGradle(config);
        config = copyAARFiles(config);
        config = withPaysafeJavaFiles(config);
        config = withPaysafeMainApplication(config);

        // iOS configuration
        config = withPaysafeIOSFiles(config);
        config = withPaysafeXcodeProject(config);
        config = withPaysafePodfile(config);

        console.log('Paysafe plugin: Configuration completed successfully');
    } catch (error) {
        console.error('Paysafe plugin: Error during configuration:', error.message);
        throw error;
    }

    return config;
}

module.exports = withPaysafe;