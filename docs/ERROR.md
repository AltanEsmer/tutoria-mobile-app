# Error Documentation File

## Errors found
C:\Users\esmer\Desktop\Projects\tutoria-mobile-app> npm run android

> tutoria-mobile-app@1.0.0 android
> expo start --android

Starting project at C:\Users\esmer\Desktop\Projects\tutoria-mobile-app
Using src/app as the root directory for Expo Router.
Starting Metro Bundler

The following packages should be updated for best compatibility with the installed expo version:
  expo@55.0.6 - expected version: ~55.0.12
  expo-auth-session@55.0.8 - expected version: ~55.0.12
  expo-constants@55.0.7 - expected version: ~55.0.12
  expo-font@55.0.4 - expected version: ~55.0.6
  expo-haptics@55.0.8 - expected version: ~55.0.13
  expo-linking@55.0.7 - expected version: ~55.0.11
  expo-router@55.0.5 - expected version: ~55.0.11
  expo-secure-store@55.0.8 - expected version: ~55.0.12
  expo-speech@55.0.8 - expected version: ~55.0.12
  expo-status-bar@55.0.4 - expected version: ~55.0.5
  expo-web-browser@55.0.9 - expected version: ~55.0.13
  react-dom@19.2.4 - expected version: 19.2.0
  react-native@0.83.2 - expected version: 0.83.4
Your project may not work correctly until you install the expected versions of the packages.
› Opening exp://192.168.0.109:8081 on SM_A725F
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █ ██▀▀ ▀▄▀█ ▄▄▄▄▄ █
█ █   █ █  ▀█ ▀█ ▄█ █   █ █
█ █▄▄▄█ █▀  █▄▀▀▄██ █▄▄▄█ █
█▄▄▄▄▄▄▄█▄█ ▀▄█ █▄█▄▄▄▄▄▄▄█
█▄ ▀▀  ▄▀▀█▄█▄█▄ ███ ▀▄▄ ▄█
█ █▀█ ▀▄▄█ ▄█▀▄█  ▀ █▄  ▀██
█▀ ████▄  █▀▄▀█▄▀▄▀▄▀▀▄ ▀██
███ ▀ ▄▄ ▄█  ▄██▄▄▄█▄▀ ▀███
█▄▄██▄█▄█▀▄▀█▄▀▄▄ ▄▄▄ ▀ ▄▄█
█ ▄▄▄▄▄ █▀▀▀█▀██▀ █▄█ ▀▀▀██
█ █   █ █▄▀█▄ █▄█▄▄ ▄▄▀ ▀▀█
█ █▄▄▄█ █▀██ ▄██▄██▄▀█▀▀ ██
█▄▄▄▄▄▄▄█▄█████▄████▄▄▄▄▄▄█

› Scan the QR code above to open in Expo Go.
› Metro: exp://192.168.0.109:8081
› Web: http://localhost:8081

› Using Expo Go (Press s to switch to development build)
› Press ? │ show all commands

Logs for your project will appear below. Press Ctrl+C to exit.
Android Bundling failed 397ms index.ts (1 module)
 ERROR  Error: Cannot find module 'babel-preset-expo'
Require stack:
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\index.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\index.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\metro-transform-worker.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\transform-worker.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\metro\src\DeltaBundler\Worker.flow.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\metro\src\DeltaBundler\Worker.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\jest-worker\build\workers\threadChild.js

Make sure that all the Babel plugins and presets you are using
are defined as dependencies or devDependencies in your package.json
file. It's possible that the missing plugin is loaded by a preset
you are using that forgot to add the plugin to its dependencies: you
can workaround this problem by explicitly adding the missing package
to your top-level package.json.

    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
    at resolve (node:internal/modules/helpers:157:19)
    at tryRequireResolve (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js:128:11)
    at resolveStandardizedNameForRequire (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js:162:19)
    at resolveStandardizedName (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js:183:12)
    at loadPreset (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js:68:7)
    at loadPreset.next (<anonymous>)
    at createDescriptor (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-descriptors.js:140:16)
    at createDescriptor.next (<anonymous>)
    at evaluateSync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:251:28)
    at C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:31:34
    at Array.map (<anonymous>)
    at Function.sync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:31:22)
    at Function.all (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:210:24)
    at Generator.next (<anonymous>)
    at createDescriptors (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-descriptors.js:102:41)
    at createDescriptors.next (<anonymous>)
    at createPresetDescriptors (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-descriptors.js:96:17)
    at createPresetDescriptors.next (<anonymous>)
    at C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\gensync-utils\functional.js:22:27
    at Generator.next (<anonymous>)
    at mergeChainOpts (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:350:34)
    at mergeChainOpts.next (<anonymous>)
    at chainWalker (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:316:14)
    at chainWalker.next (<anonymous>)
    at loadFileChain (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:191:24)
    at loadFileChain.next (<anonymous>)
    at mergeExtendsChain (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:328:28)
    at mergeExtendsChain.next (<anonymous>)
    at chainWalker (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:312:20)
    at chainWalker.next (<anonymous>)
    at buildRootChain (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:56:36)
    at buildRootChain.next (<anonymous>)
    at loadPrivatePartialConfig (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\partial.js:72:62)
    at loadPrivatePartialConfig.next (<anonymous>)
    at loadFullConfig (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\full.js:36:46)
    at loadFullConfig.next (<anonymous>)
    at transform (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\transform.js:20:44)
    at transform.next (<anonymous>)
    at evaluateSync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:251:28)
    at sync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:89:14)
    at stopHiding - secret - don't use this - v1 (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\errors\rewrite-stack-trace.js:47:12)
    at Object.transformSync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\transform.js:40:76)
    at parseWithBabel (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transformSync.js:75:18)
    at transformSync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transformSync.js:54:16)
    at Object.transform (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\babel-transformer.js:132:58)      
    at transformJSWithBabel (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\metro-transform-worker.js:478:47)
    at Object.transform (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\metro-transform-worker.js:595:12)
    at Object.transform (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\transform-worker.js:178:19)
Android Bundling failed 9ms index.ts (1 module)
 ERROR  Error: Cannot find module 'babel-preset-expo'
Require stack:
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\index.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\index.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\metro-transform-worker.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\transform-worker.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\metro\src\DeltaBundler\Worker.flow.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\metro\src\DeltaBundler\Worker.js
- C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\jest-worker\build\workers\threadChild.js

Make sure that all the Babel plugins and presets you are using
are defined as dependencies or devDependencies in your package.json
file. It's possible that the missing plugin is loaded by a preset
you are using that forgot to add the plugin to its dependencies: you
can workaround this problem by explicitly adding the missing package
to your top-level package.json.

    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
    at resolve (node:internal/modules/helpers:157:19)
    at tryRequireResolve (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js:128:11)
    at resolveStandardizedNameForRequire (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js:162:19)
    at resolveStandardizedName (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js:183:12)
    at loadPreset (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\files\plugins.js:68:7)
    at loadPreset.next (<anonymous>)
    at createDescriptor (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-descriptors.js:140:16)
    at createDescriptor.next (<anonymous>)
    at evaluateSync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:251:28)
    at C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:31:34
    at Array.map (<anonymous>)
    at Function.sync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:31:22)
    at Function.all (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:210:24)
    at Generator.next (<anonymous>)
    at createDescriptors (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-descriptors.js:102:41)
    at createDescriptors.next (<anonymous>)
    at createPresetDescriptors (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-descriptors.js:96:17)
    at createPresetDescriptors.next (<anonymous>)
    at C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\gensync-utils\functional.js:22:27
    at Generator.next (<anonymous>)
    at mergeChainOpts (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:350:34)
    at mergeChainOpts.next (<anonymous>)
    at chainWalker (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:316:14)
    at chainWalker.next (<anonymous>)
    at loadFileChain (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:191:24)
    at loadFileChain.next (<anonymous>)
    at mergeExtendsChain (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:328:28)
    at mergeExtendsChain.next (<anonymous>)
    at chainWalker (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:312:20)
    at chainWalker.next (<anonymous>)
    at buildRootChain (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\config-chain.js:56:36)
    at buildRootChain.next (<anonymous>)
    at loadPrivatePartialConfig (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\partial.js:72:62)
    at loadPrivatePartialConfig.next (<anonymous>)
    at loadFullConfig (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\config\full.js:36:46)
    at loadFullConfig.next (<anonymous>)
    at transform (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\transform.js:20:44)
    at transform.next (<anonymous>)
    at evaluateSync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:251:28)
    at sync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\gensync\index.js:89:14)
    at stopHiding - secret - don't use this - v1 (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\errors\rewrite-stack-trace.js:47:12)
    at Object.transformSync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\@babel\core\lib\transform.js:40:76)
    at parseWithBabel (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transformSync.js:75:18)
    at transformSync (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transformSync.js:54:16)
    at Object.transform (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\babel-transformer.js:132:58)      
    at transformJSWithBabel (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\metro-transform-worker.js:478:47)
    at Object.transform (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\metro-transform-worker.js:595:12)
    at Object.transform (C:\Users\esmer\Desktop\Projects\tutoria-mobile-app\node_modules\expo\node_modules\@expo\metro-config\build\transform-worker\transform-worker.js:178:19)
› Stopped server
PS C:\Users\esmer\Desktop\Projects\tutoria-mobile-app> 