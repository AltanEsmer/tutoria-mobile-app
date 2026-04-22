# Error Documentation File

> **Agent instruction:** When you encounter an error and apply a fix, append a new entry to this file under **Errors found** using the format below. Keep entries concise.
>
> ```
> ### [Short title]
> **Context:** Where/when the error occurs  
> **Error:** The exact error message or symptom  
> **Cause:** Root cause  
> **Fix:** What was done to resolve it  
> ```

---

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
---

### False "You're offline" banner on connected device

**Context:** OfflineBanner shows on home screen even when device has internet  
**Error:** Banner visible immediately after `hasBeenOnline` is set, though device is online  
**Cause (v1):** `state.isConnected !== false` accepted `null` as "online", but NetInfo briefly fires `isConnected: false` during startup triggering the banner  
**Cause (v2):** After switching to `=== true`, the `else` branch treated `isConnected: null` (unknown/transitioning state) as **offline** — this is what caused the banner to persist on iPhones  
**Fix:** Use a **three-way check** — `isConnected === true` → online, `isConnected === false` → offline, `null` → skip entirely. NetInfo emits `null` during every network transition; it must never trigger a state change

---

### OfflineBanner partially visible behind iPhone status bar when "hidden"

**Context:** Banner uses `position: absolute, top: insets.top + 8` with `translateY: -BANNER_HEIGHT` for hidden state  
**Error:** On iPhones with Dynamic Island / notch (`insets.top ≈ 59px`), hidden banner sits at `59 + 8 - 44 = 23px` from top — visible behind the status bar icons  
**Cause:** Hide offset `-BANNER_HEIGHT (-44)` only pushes the banner up 44px, but the status bar is 59px tall — so the banner peeks behind the clock/battery icons  
**Fix:** Calculate `hideOffset = -(BANNER_HEIGHT + insets.top + 16)` which pushes the banner fully above the screen. Also added `initialWindowMetrics` to `SafeAreaProvider` so `insets.top` is correct on the very first render (not 0)

---

### App re-renders continuously / "refreshing without stop"

**Context:** Entire app re-renders on every NetInfo event, making the UI feel like it's constantly refreshing  
**Error:** No error message — visual flicker and continuous layout re-render  
**Cause:** `useNetworkState.ts` called `useNetworkStore()` with **no selector**, subscribing the entire `RootLayoutInner` to the full Zustand store object. Any store write (even `isInternetReachable: null → true`) triggered a full re-render cascade from root  
**Fix:** Replaced `useNetworkStore()` with targeted selectors (`useNetworkStore((s) => s.setNetworkState)` etc.). Rule: always pass a selector to Zustand hooks — never subscribe to the entire store object

---

### iOS build fails — AsyncStorageSpec-generated.mm not found

**Context:** Running `npx expo run:ios --device` after a dependency update or interrupted build  
**Error:** `Build input file cannot be found: '.../ReactCodegen/AsyncStorageSpec/AsyncStorageSpec-generated.mm'` — xcodebuild exits with code 65  
**Cause:** Xcode DerivedData cache holds stale file-reference records that conflict with the current `ios/build/generated/` state — triggers even when the `.mm` file physically exists  
**Fix:** `rm -rf ios/build ~/Library/Developer/Xcode/DerivedData/tutoria* && cd ios && pod install`, then re-run `npx expo run:ios --device`
