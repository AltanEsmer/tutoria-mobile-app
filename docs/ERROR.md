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

---

### Audio mode not set before playback

**Context:** Lesson screen — tapping the Play button after a recording session  
**Error:** No audio plays; silent failure with no error message  
**Cause:** `useAudio.loadAndPlay` never called `setAudioModeAsync()` before creating the player. iOS requires the audio session to be explicitly configured for output. After `usePronunciation` sets `allowsRecording: true`, the audio session is stuck in recording mode and blocks all speaker output.  
**Fix:** Added `await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })` at the start of `loadAndPlay` in `src/hooks/useAudio.ts`, before `cleanupPlayer()`.

---

### FileReader not defined in Hermes (recording crash)

**Context:** Lesson screen — pressing and holding the record button  
**Error:** App crashes / restarts immediately after holding the record button. In debug mode: `ReferenceError: FileReader is not defined`  
**Cause:** `usePronunciation.stopAndCheck` used `fetch(uri)` → `response.blob()` → `new FileReader()` to convert the recorded audio to base64. `FileReader` and `Blob` are Web browser APIs that do not exist in React Native's Hermes JS engine.  
**Fix:** Replaced the entire `fetch/blob/FileReader` chain with `FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })` from `expo-file-system/legacy`. Also added `setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })` after `recorder.stop()` to reset the audio session back to playback mode.

---

### NFC scan returns null with no user feedback

**Context:** Home screen — tapping the NFC scan button when a scan times out or hardware fails  
**Error:** User taps scan, waits, nothing happens — no feedback, no error, UI just resets to "Ready to learn?"  
**Cause:** `readTag()` returns `null` on timeout/cancel/error (swallowed in the `catch` block). `handleNfcScan` in `home.tsx` only handled `tag.isValid === false`; the `tag === null` case had no branch — silent no-op.  
**Fix:** Added `else if (!tag)` branch in `handleNfcScan` showing `Alert.alert('Scan Failed', 'No card detected. Please hold the card closer and try again.')`.

---

### Audio proxy 401 — native player lacks auth header

**Context:** Lesson screen — pressing the Play button for any word  
**Error:** No audio plays; `audioError` stays null (no `⚠️` shown), button appears functional but silent  
**Cause:** `loadAndPlay` in `useAudio.ts` fell back to calling `createAudioPlayer({ uri: proxyUrl })` directly when audio wasn't cached. The native AVPlayer/MediaPlayer fetches URLs using system networking — it does **not** inherit the Axios `Authorization: Bearer` header. The audio proxy (`/v1/audio/proxy`) requires auth, so the native player receives a 401, never loads, and `player.play()` becomes a no-op. Same issue affected `prefetchAudioFiles`, which silently failed to cache anything.  
**Fix:** Added `downloadAndCacheAudio(r2Path)` to `audioCache.ts` that downloads via `FileSystem.downloadAsync(..., { headers: { Authorization: getAuthHeader() } })`. `loadAndPlay` now always plays from a local cached file — never from a raw proxy URL. `prefetchAudioFiles` also updated to pass auth headers. Exported `getAuthHeader()` from `src/services/api/client.ts`.

---

### Recording crash — race condition between startRecording and stopAndCheck

**Context:** Lesson screen — quickly pressing and releasing the Hold-to-Record button  
**Error:** App crashes and restarts; on Android `IllegalStateException: stop called in invalid state`; on iOS AVFoundation native exception  
**Cause:** `onPressIn` calls `startRecording()` (async: awaits permissions → `setAudioModeAsync` → `prepareToRecordAsync` → `record()`). If the user releases before `recorder.record()` completes, `onPressOut` fires `stopAndCheck()` which immediately calls `recorder.stop()` on a recorder that was never started. Calling `stop()` on a non-recording native recorder throws an unhandled native exception that bypasses React Native's JS error boundary.  
**Fix:** Added `isCancelledRef` in `usePronunciation.ts`. `startRecording` checks this ref after every async step — if `stopAndCheck` has already set it, the function aborts. `stopAndCheck` now checks `recorder.isRecording` before calling `stop()`; if recording never started it returns `null` early. Also removed the incorrect `audioFormat: 'wav'` from the `checkPronunciation` call — the `HIGH_QUALITY` preset records `.m4a`, not WAV.


---

### Empty `audio_path` crashes Play button

**Context:** Lesson screen — tapping the Play button for a word whose `audio_path` is missing or empty in the backend response  
**Error:** `[Audio] Playback failed: [Error: No audio path provided]` thrown from `useAudio.loadAndPlay`  
**Cause:** `audio.play(currentWord.audio_path ?? '')` in the lesson screen passes an empty string when the field is absent. Inside `loadAndPlay` the empty string flowed through `getCachedAudioUri('') → null` and the `r2Path ? downloadAndCacheAudio(...) : null` ternary returned `null`, hitting a generic `throw new Error('No audio path provided')`. The error was scary and unactionable for users.  
**Fix:** Added an early-return guard at the top of `loadAndPlay` in `src/hooks/useAudio.ts` that sets `audioError` to `'No audio available for this word'` and returns silently when `r2Path` is empty/blank. Also rewrote the cache-miss throw to include the failing path: `Failed to load audio for path: <r2Path>`. Generalised rule: hooks that wrap network-bound resources must validate inputs before throwing — empty/missing optional fields are not exceptional.

---

### Hold-to-Record silently crashes the iOS app

**Context:** Lesson screen — pressing the Hold-to-Record button on iOS  
**Error:** App crashes / restarts immediately on press. **No JS error logged in Metro or device console.**  
**Cause:** Native `ios/Tutoria/Info.plist` was missing `NSMicrophoneUsageDescription`. The key was correctly declared in `app.json` under `ios.infoPlist`, but the prebuilt iOS project had not been regenerated since that field was added, so the bundled binary lacked the usage description. On iOS, requesting microphone access without `NSMicrophoneUsageDescription` is an immediate hard native crash that bypasses React Native's JS error boundary entirely — exact match for "crashes with no errors in terminal".  
**Fix:** Added `NSMicrophoneUsageDescription` and `NFCReaderUsageDescription` directly to `ios/Tutoria/Info.plist` (matching the strings already in `app.json`). Converted the bare `"expo-audio"` plugin entry in `app.json` to its array form with `microphonePermission` config so future `expo prebuild` runs regenerate the key correctly via the config plugin rather than relying on `ios.infoPlist`. Generalised rule: when the prebuilt `ios/` directory is committed, native Info.plist must be patched directly — `app.json` `infoPlist` changes only propagate via `expo prebuild`. Add a config-plugin-driven source of truth for any permission key.

---

### Mock NFC scan returns 404 for non-existent moduleId

**Context:** Home screen — tapping "Ready to learn?" with `EXPO_PUBLIC_ENABLE_NFC_MOCK=true`  
**Error:** `[API] 404: Module not found` from `apiClient` after navigating into the lesson screen  
**Cause:** The NFC mock branch in `src/services/nfc/nfcManager.ts` returns the moduleId from `EXPO_PUBLIC_NFC_MOCK_MODULE_ID` (default `'module-a'`). When that env var is unset or points at a moduleId that does not exist in the dev backend, `POST /v1/modules/<id>` returns 404 and the lesson screen rendered the raw axios error string. There was also no log of which moduleId the mock was returning, making the misconfiguration hard to spot.  
**Fix:** (1) Documented `EXPO_PUBLIC_NFC_MOCK_MODULE_ID` in `.env.example` with a note that it must match a real backend moduleId from `GET /v1/modules/missions`. (2) Added `console.warn('[NFC] Mock scan returning moduleId:', moduleId)` in the mock branch of `readTag()`. (3) In `src/app/(public)/lesson/[moduleId].tsx`, the `loadModule` catch block now detects axios-shaped 404 errors and shows the friendly message `'This lesson is not available right now. Try a different card.'`, alongside both `Retry` and `Go Home` buttons. Generalised rule: any env-driven mock value that flows into a backend lookup must be (a) documented with the constraint, (b) logged on use, and (c) produce a friendly UI message on mismatch.

---

### Pronunciation 500 — `audio, displayText, and targetIPA are required`

**Context:** Lesson screen — releasing the Hold-to-Record button after a brief recording  
**Error:** Backend returns `500: audio, displayText, and targetIPA are required` from `POST /v1/pronunciation/check`  
**Cause:** One or more of three things produces an empty/missing field that reaches the backend: (a) iOS hasn't flushed the m4a file to disk by the time `FileSystem.readAsStringAsync` reads it, returning empty base64; (b) the user pressed the button so briefly that the recorder produced an essentially empty file; or (c) the current word from `SessionData.wordData` is missing `display_text`/`target_ipa`. The original code sent the request blind in all three cases, so the user saw a generic 500 instead of an actionable message.  
**Fix:** Hardened `usePronunciation.stopAndCheck` in `src/hooks/usePronunciation.ts` with three pre-flight gates: (1) 100ms `setTimeout` after `recorder.stop()` so iOS finishes writing the m4a; (2) `FileSystem.getInfoAsync` size check — if the file is missing or under 1KB, set `'Recording too short — please hold the button longer.'` and bump `consecutiveFailures` instead of calling the API; (3) trim-validate `displayText` and `targetIPA` — if either is blank, set `'Word data incomplete — try a different word.'` and bump failures. Each step also `console.log`s its diagnostic (`recording file size`, `base64 length`, `payload sizes`) so future regressions are debuggable from Metro alone. Generalised rule: any client that uploads a file produced by a hardware recorder must validate (a) the file is finalised on disk and (b) every required body field is non-empty before sending — never let a generic backend 4xx/5xx be the first sign that the upload pipeline is broken.

---

### Finding a valid `EXPO_PUBLIC_NFC_MOCK_MODULE_ID`

**Context:** Setting up local dev with `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` — every mock NFC scan returns this moduleId, and the lesson API returns 404 if it doesn't exist in the backend  
**Error:** `[API] 404: Module not found` after a mock scan navigates into the lesson screen  
**Cause:** Developers had no documented way to discover which moduleIds the dev backend actually exposes — the mock ships with `module-a` as a placeholder which is unlikely to match any real backend module.  
**Fix:** (1) Added `console.log('[Missions] Available moduleIds (use one for EXPO_PUBLIC_NFC_MOCK_MODULE_ID):', data.map(m => m.moduleId))` after the missions fetch in `src/app/(public)/(tabs)/home.tsx`. (2) Rewrote the `.env.example` comment block to explicitly walk through: launch app → load home with active profile → copy any moduleId from the `[Missions]` log line, with a `curl` fallback for non-UI discovery. Generalised rule: any env-driven mock value that maps onto a backend identifier must have a documented, in-app discovery path — not just a comment saying "must be valid".

---

### Audio Play silently fails — cache `downloadAsync` ignored HTTP status

**Context:** Lesson screen — Play button does nothing after a fresh install / cache wipe  
**Error:** No JS error; `audioError` stays null; the button looks functional but no sound plays  
**Cause:** `downloadAndCacheAudio` in `src/services/cache/audioCache.ts` called `FileSystem.downloadAsync` but discarded the return value. When the proxy returned 401/403/404 (e.g. expired bypass token, missing R2 object, wrong path), `downloadAsync` still wrote a small "error body" file to disk and returned successfully. `getCachedAudioUri` then "found" the file on subsequent loads and `createAudioPlayer` was handed a non-audio file, which silently failed to play.  
**Fix:** Captured `result = await FileSystem.downloadAsync(...)`, logged `[AudioCache] downloadAsync status: <n> localUri: <uri>`, and added `if (result.status !== 200) throw new Error('Audio proxy returned status ' + result.status + ' for path ' + r2Path)`. Combined with the new step-level `[Audio]` logs in `useAudio.loadAndPlay` (cache hit/miss, downloading, download complete, creating player, play called) and defensive logging of `err.name`/`code`/`status` in the catch, future Play failures surface their exact step in Metro. Generalised rule: any wrapper around `FileSystem.downloadAsync` (or any "best-effort, never throws" native API) must explicitly check the HTTP status — silent-pass on non-2xx responses produces poison cache entries that are hard to diagnose later.

---

### Play button silent no-op — missing audio_path not surfaced to user

**Context:** Lesson screen — tapping the 🔊 Play button when the current word's `audio_path` is missing or empty  
**Error:** No sound plays, no error message, no log line — button appears functional but is silently a no-op  
**Cause:** Three compounding issues: (1) `loadAndPlay` silently set `audioError` state when `r2Path` was empty but never logged it, so the Metro console gave no hint. (2) `audioError` was never rendered — the hook returned it but the lesson screen discarded it, so users saw no feedback. (3) The Play `Pressable` was only disabled while `audio.isLoading`, not when `audio_path` itself was absent — so the button looked tappable on words with no audio.  
**Fix:** (a) Added `console.warn('[Audio] play called with empty r2Path')` in `useAudio.loadAndPlay` before the early return. (b) Changed `console.log('[Audio] audio mode set')` to `console.log('[Audio] mode switched to playback')` for clarity. (c) In `[moduleId].tsx` — added unconditional `console.log('[Audio] play button pressed, audio_path:', ...)` inside the Pressable `onPress`. (d) Disabled the Play button (`disabled + disabledButton` style, opacity 0.4) when `!currentWord.audio_path`. (e) Rendered `audio.audioError` in a `<Text testID="lesson-audio-error">` with `audioErrorText` style (red, centred, 14px) directly below the action buttons. **Generalised rule:** any error state returned by a hook must be rendered somewhere in the UI — an unrendered error state is indistinguishable from a silent success; always add an inline error surface at the call site.

### Progress tab shows stale data after lesson word completion

**Context:** Progress tab — returning from a completed lesson; activity list shows outdated entries  
**Error:** `getProgress` returns old activities even after the child has completed words in a lesson. The Progress tab appears frozen on the pre-lesson state despite a successful `useFocusEffect` fetch.  
**Cause:** Three compounding issues: (1) `advanceToNextWord` in `[moduleId].tsx` called `completeWord` (module session API) but never invalidated `useProgressStore`, so stale `activities` lingered in the store. (2) The `finally` block in `progress.tsx` used `if (!cancelled) setLoading(false)` — if the user quickly navigated away mid-fetch, `cancelled = true` and `setLoading(false)` was never called, leaving `isLoading` stuck at `true` and hiding the stale data under an infinite spinner on next focus. (3) No diagnostic logging made either failure invisible in Metro.  
**Fix:** (a) Added `invalidate()` action to `useProgressStore` — sets `activities: []`, `streakDays: 0`, `isLoading: false` — so the next Progress-tab focus always shows a clean slate then fresh fetched data. (b) Called `useProgressStore.getState().invalidate()` inside the `try` block of `advanceToNextWord` immediately after a successful `completeWord`. (c) Removed the `cancelled` guard from the `finally` block in `progress.tsx` (`setLoading(false)` now always fires, unsticking any in-flight cancellation). (d) Added `console.log('[Progress] focus effect fired, fetching…')` and `console.log('[Progress] received activities:', data.activities.length)` for diagnostic visibility.  
**Generalised rule:** Any store that holds data mutated by a user action in another screen must expose an `invalidate()` method, and that method must be called at the mutation call site. Never rely solely on a focus-triggered fetch to surface fresh data — if `isLoading` can be stuck from a prior cancelled request, the spinner will hide the fetch result silently.

---

### Stale missions after completing a lesson (Home tab not refreshing on focus)
**Context:** Home tab — returning from a completed lesson; missions list shows outdated order/availability  
**Error:** Missions are stale after a lesson completes because `getMissions` is only triggered when `activeProfile` changes, not when the tab regains focus. With a 1-hour `MODULE_CACHE_TTL`, even a forced re-render would serve the same cached data.  
**Cause:** (1) `useEffect([activeProfile])` only re-runs on profile change, not on tab focus. (2) `getMissions` caches results for 1 hour without any invalidation path, so a focus-triggered call would still return stale data.  
**Fix:** (a) Replaced `useEffect` with `useFocusEffect(useCallback(...))` in `home.tsx`, using the same `cancelled`-flag pattern as `progress.tsx`. (b) Added `force?: boolean` parameter to `getMissions` in `modules.ts` — when `true`, calls `clearCache(key)` before fetching, bypassing the 1-hour TTL. (c) Home screen passes `force: true` on every focus refetch. (d) Added `console.log('[Home] focus → refetching missions for', activeProfile.id)` for diagnostics.  
**Generalised rule:** Any data that can be mutated by a user action in another screen (lesson completion → mission availability) must be refetched on tab focus using `useFocusEffect`, not a plain `useEffect`. Cache busting must be explicit at the call site — a long-lived TTL silently defeats focus-based refresh.

---

### Silent pronunciation failure — empty `target_ipa` / `display_text` fields not surfaced to user

**Context:** Lesson screen — Hold-to-Record records successfully (~80–90 KB audio) but the pronunciation check never runs; loop repeats silently  
**Error:** Terminal shows `[Pronunciation] payload sizes: { audio: 119788, displayText: 1, targetIPA: 0 }`. The `stopAndCheck` guard fires (`!targetIPA.trim()` → true) and calls `setError('Word data incomplete — try a different word.')`, but the user sees **no visible feedback** because `pronunciation.error` was never rendered in the lesson screen.  
**Cause (compound — 3 factors):**  
1. **Silent UI gap (Fix A):** `pronunciation.error` was returned by `usePronunciation` but discarded by the lesson screen — no `<Text>` rendered it. Any guard path inside `stopAndCheck` was therefore invisible to the user.  
2. **API field-name mismatch (Fix B):** The curriculum JSON stored in R2 may contain camelCase word fields (`displayText`, `targetIpa`, `audioPath`). The backend normalises them to snake_case in the D1 `activities` table, but historically serialised sessions stored in `module_progress.current_session` (a JSON blob) retained camelCase keys. When the app re-reads such a session, `WordData.target_ipa` (snake_case) is `undefined`, producing `targetIPA: 0` after `?? ''`.  
3. **Stale-closure risk (Fix C):** `handleRecordStop` captured `currentWord` from the render closure rather than reading fresh store state. Under rapid state transitions (e.g., word auto-advance) this could deliver a stale word to `stopAndCheck`.  
**Fix:**  
A. Added `<Text testID="lesson-pronunciation-error" style={styles.pronunciationErrorText}>` in `[moduleId].tsx` below the action buttons, shown whenever `pronunciation.error` is set and `feedbackResult` is null.  
B. Added `normalizeWordData` + `normalizeSession` in `src/services/api/modules.ts` that coalesces `display_text`/`displayText`, `target_ipa`/`targetIpa`/`targetIPA`, and `audio_path`/`audioPath` into canonical snake_case before the data is stored or returned. Applied in `startOrResumeModule` (fresh fetch + stale cache path).  
C. Rewrote `handleRecordStop` to call `useLessonStore.getState().currentWord` instead of the closure-captured `currentWord`. Empty `useCallback` dep array (`[]`) since the function no longer closes over React state.  
D. Added `__DEV__` diagnostic logs: `[Lesson] session.wordData[0]` after `setSession`, and `[Lesson] currentWord` before `stopAndCheck`.  
**Generalised rule:** (1) Every error state returned by a custom hook **must** be rendered somewhere in the UI — an unrendered error is indistinguishable from a silent success. (2) Always validate and normalise API response shapes at the service boundary (`modules.ts`) — never trust raw field names deep in hooks or components. (3) `useCallback` handlers that read Zustand state should use `useLessonStore.getState()` inside the function body rather than closing over render-snapshot values.

---

### Play button disabled — `audio_path` absent when API uses `audio_files` curriculum format

**Context:** Lesson screen — Play button is greyed out (disabled) immediately after lesson load; no audio plays  
**Error:** `audio_path` is `undefined` on `WordData` even after `normalizeWordData` runs. Play button was correctly disabled (`disabled={!currentWord.audio_path}`) but the user has no way to hear the word.  
**Cause:** The curriculum JSON stored in R2 does not include a flat `audio_path` field. Instead it carries an `audio_files: [{ipa, role}]` array with IPA/role metadata. The normalizer only coalesces `audio_path`/`audioPath` — neither exists in this format — so `audio_path` stays `undefined`.  
**Fix:** Added `resolveSessionAudioPaths(session)` in `src/services/api/modules.ts`. After `startOrResumeModule`, the lesson screen calls this function which, for every word without `audio_path`, picks the first `audio_files` entry whose `role` starts with `"primary"`, calls `resolveSounds(ipa)` → `/v1/audio/sounds-resolve`, and stamps the returned `audioPath` onto the word. All resolutions run in parallel (`Promise.allSettled`); individual failures are swallowed so one unresolvable word doesn't break the whole lesson. Called in `loadModule` in `[moduleId].tsx` before `store.setSession` and audio prefetch.  
**Generalised rule:** When the API evolves from a flat field (`audio_path`) to a richer structure (`audio_files`), add a dedicated async resolution step at the service layer — do not try to resolve asynchronously inside a synchronous normalizer. Always call it at session-load time so downstream code (hooks, stores, UI) can assume `audio_path` is populated.

---

### sounds-resolve returns `resolved:false` for all IPA values — backend database not populated

**Context:** `resolveSessionAudioPaths` in `modules.ts` — called on every lesson load
**Error:** `[Modules] resolveSounds resolved:false for <word> ipa: /m/` (and all other IPA values including `/mə/`, `/f/`, `/b/`, etc.)
**Cause:** The backend `/v1/audio/sounds-resolve` endpoint returns `{ resolved: false }` for every IPA queried. The sounds database on the backend is either empty or the endpoint is misconfigured. This is a **backend data issue**, not a client bug.
**Fix (client-side workaround):** Added IPA-without-slashes fallback — tries `/m/` first, then `m` (slashes stripped). Exhausts all `audio_files` candidates before giving up. Added final `console.warn` with explicit message so it's clear the backend sounds database is the root cause. Play button remains disabled until backend populates the sounds database.
**Generalised rule:** When an API lookup returns a "not found" result for every input, suspect the backend data layer (empty table, wrong environment, missing seed data) before debugging the client. Add a terminal log that names the backend endpoint and explains the failure clearly.

---

### Pronunciation API returns `similarity: 0, resultType: "FAIL"` for all recordings

**Context:** `checkPronunciation` call in `usePronunciation.ts` — after every successful recording
**Error:** API responds `{ overallIsCorrect: false, similarity: 0, resultType: "FAIL" }` with no `audioIssue` or `errorType` fields. User sees "Almost there! 0%".
**Cause:** The backend pronunciation model is returning 0% similarity for all audio. Since `audioIssue` is absent, the backend did decode the audio — this is likely a model configuration or model availability issue on the backend (wrong environment, model not loaded, speech recognition service not connected). Client-side audio is valid: file size ~79KB, base64 ~105KB, targetIPA now correctly populated.
**Fix:** No client fix applicable. The similarity IS on a 0–100 scale (not 0–1). The ScoreBadge, PASSING_THRESHOLD=80, and API response scale are all consistent. Root cause is backend.
**Generalised rule:** When `similarity: 0` appears with no `audioIssue`, the audio was decoded but the model failed to produce a match — check backend model/service availability rather than client audio encoding.

---

### Pronunciation always returns `similarity: 0` — AAC bytes inside `.wav` container (root cause)

**Context:** `usePronunciation.ts` — `useAudioRecorder(RecordingPresets.HIGH_QUALITY)` on iOS
**Error:** API returns `similarity: 0` / `resultType: "FAIL"` for all iOS recordings despite valid audio. The previous error entry suspected the backend model; the actual root cause is client-side audio encoding.
**Cause:** `RecordingPresets.HIGH_QUALITY` does not set an explicit `ios.outputFormat`. iOS `AVAudioRecorder` then defaults to MPEG4-AAC encoding and writes AAC bytes into a file named `.wav`. The server's WAV decoder parses the container header, extracts the raw bytes, and forwards them to Azure Speech as PCM. Azure receives AAC data masquerading as PCM — transcription fails, forced alignment produces 0 similarity.
**Fix:** Replaced `RecordingPresets.HIGH_QUALITY` with an explicit recorder config in `usePronunciation.ts`:
- `ios.outputFormat: IOSOutputFormat.LINEARPCM` — forces real PCM encoding
- `ios.audioQuality: AudioQuality.HIGH`, `linearPCMBitDepth: 16`, `linearPCMIsBigEndian: false`, `linearPCMIsFloat: false`
- `sampleRate: 16000`, `numberOfChannels: 1` — matches Azure Speech expected input
Also added `useAudioRecorderState` for metering, `peakDetected` silence gate (skips silent clips without incrementing failure counter), explicit `audioFormat: 'wav'` + `unitType: 'word'` + `language: 'english'` + `profileId` + `validation` in the request payload.
**Generalised rule:** Never rely on a "HIGH_QUALITY" preset for platform-specific audio encoding — always specify `outputFormat` explicitly on iOS. When Azure Speech returns all-zero scores with no `audioIssue`, first verify the audio container actually contains the codec it claims to before blaming the model.

---

### Sounds-resolve `publicUrl`/`publicUrls`/`path` fields silently dropped → Play button stayed disabled

**Context:** `resolveSessionAudioPaths` in `src/services/api/modules.ts` — every lesson load
**Error:** All resolutions reported `resolved:false` and warned "backend sounds database not populated", but `audio_path` stayed `undefined` even on words whose IPA the backend HAD resolved. Play button rendered disabled (`disabled={!currentWord.audio_path}`).
**Cause:** `SoundsResolveResponse` was typed only as `{ resolved, audioPath, acceptableIPAs }`. The actual API response (per `docs/audio-api-integration.md` §4.1) carries `publicUrls[]` (compound mode), `publicUrl` (single), and `path` (proxy fallback). The client read only `audioPath` — when the resolver returned a CDN URL via `publicUrl`/`publicUrls`, it was discarded as "unresolved". This was misdiagnosed as a backend data issue.
**Fix:** Extended `SoundsResolveResponse` with `publicUrls?: string[]; publicUrl?: string; path?: string`. Rewrote `resolveSessionAudioPaths` to honour the supervisor's URL priority: `publicUrls[0] → publicUrl → getAudioProxyUrl(path) → getAudioProxyUrl(audioPath)`. CDN URLs are used directly; R2 paths are wrapped through the auth-required proxy.
**Generalised rule:** When the API response shape evolves (especially adding richer URL variants), the TypeScript interface MUST be the single source of truth. Before blaming a backend for "missing data", grep the response handler for every field name documented in the contract — silently dropping a populated field looks identical to a backend returning nothing.

---

### Missing boot-time `setAudioModeAsync` → silent app on muted iOS devices

**Context:** App startup — `src/app/_layout.tsx`
**Error:** Play button "works" (no error, state transitions correctly) but no audible sound on iPhone with the ring/silent switch flipped to silent. Symptom only reproducible on hardware, not on simulator (which ignores the silent switch).
**Cause:** No boot-time `setAudioModeAsync` call existed. iOS defaults playback to "ambient" category which honours the hardware mute switch. Children's devices are almost always muted; without `playsInSilentMode: true` the app appears broken.
**Fix:** Added one boot-time `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', shouldPlayInBackground: false })` in `RootLayoutInner`. Wrapped in try/catch (non-fatal). Crucially does NOT set `allowsRecording: true` — that flag puts iOS into `PlayAndRecord` mode which routes output to the earpiece (not the speaker). `allowsRecording` is toggled locally inside `usePronunciation.ts` only for the capture window.
**Generalised rule:** Every Expo/React Native app that plays audio must call `setAudioModeAsync({ playsInSilentMode: true })` exactly once at boot. The grep gate is "exactly 1 boot call + 2 calls inside the recorder hook = 3 total in `src/`". More than that means a stray surface is overriding the global session and routing audio to the wrong sink.

---

---

## peakDetected silence gate too strict — "We couldn't hear you" on normal speech

**Symptom:** Hold-to-record returns "We couldn't hear you — try holding the button while speaking clearly" even when the child is speaking at normal volume. No POST is made; the attempt is silently discarded.

**Cause:** Two compounding bugs in `src/hooks/usePronunciation.ts` metering effect:
1. **Calibration window too long.** Required 800ms / 10 frames before the noise floor was set, and the effect early-returned during that window. Short presses (single short words like "cat", "the") frequently release in <800ms, so `isCalibrationDoneRef` stays false and `peakDetected` can never fire — guaranteed silence-gate trip.
2. **Calibration self-poisoning.** If the user starts speaking immediately on press, the calibration averages their voice into the noise floor (capped at 0.35). After calibration, sustained speech rarely exceeds that inflated floor for 5 consecutive frames.

**Fix:** Two parallel detection paths — Path A (peak ≥ 0.35 in any single frame, evaluated even during calibration) and Path B (sustained frames above noise floor, post-calibration). Either firing sets `peakDetected = true`. Calibration window shortened to 240ms. Frame requirement reduced from 5 to 3. Diagnostic log on stop emits `{peakDetected, peakLevel, noiseFloor, calibrated}` for future tuning.

**Generalized rule:** Client-side VAD/silence gates must have a fast-path that survives without calibration — short user interactions can complete before any calibration window the gate assumes. Always log gate decisions so threshold misses can be traced; a silently-dropped POST is indistinguishable from a server failure.

---

### Progress tab not updating after lesson completion

**Context:** After completing words or a full lesson session, navigating to the Progress tab showed no changes.

**Error:** Progress tab displayed stale (empty or outdated) activities after lesson completion.

**Cause:** Three related invalidation gaps:
1. `completeSession()` in `[moduleId].tsx` was fire-and-forget with no `invalidate()` call — if the backend records progress on session completion, the cache was never marked stale.
2. `drainQueue()` in `_layout.tsx` synced offline word completions on reconnect but never called `invalidate()` afterward.
3. `invalidate()` clears `activities: []` synchronously — if the Progress tab was already focused when `invalidate()` fired (e.g., drainQueue path), `useFocusEffect` wouldn't re-trigger, leaving the tab blank permanently.

**Fix:**
- `[moduleId].tsx`: chained `.then(() => useProgressStore.getState().invalidate())` onto `completeSession()`.
- `_layout.tsx`: chained `.then(() => useProgressStore.getState().invalidate()).catch(() => {})` onto `drainQueue()`.
- `useProgressStore.ts`: added `lastInvalidatedAt: number` field; `invalidate()` now sets it to `Date.now()`.
- `progress.tsx`: added `useEffect` watching `lastInvalidatedAt` — when it changes while the tab is already focused, triggers an immediate re-fetch via `setTimeout(0)`.

**Generalized rule:** Any store `invalidate()` that clears data must also set a timestamp/counter field. Screens that use `useFocusEffect` for data fetching must additionally watch that timestamp via a separate `useEffect` so they re-fetch when already focused. Never rely solely on focus transitions to drive refresh.

---

### Progress table never populated — "Words Practiced" always empty

**Context:** Progress tab showed 0 streak and no word activity even after correctly completing words in a lesson.

**Error:** `GET /v1/progress/:profileId` returns empty `activities: []` at all times.

**Cause:** The backend has two separate tables: `module_progress` (session state, updated by `POST /v1/modules/:moduleId/word`) and `progress` (per-word activity history, updated by `POST /v1/progress/:profileId/:activityId`). The lesson flow called `completeWord` which only updates `module_progress`, but never called `saveProgress` — so the `progress` table was always empty and `GET /v1/progress` always returned nothing.

**Fix:** In `advanceToNextWord` (`src/app/(public)/lesson/[moduleId].tsx`), after `completeWord` succeeds, also call `saveProgress(profileId, wordId, { isCorrect, displayText })`. The offline queue `catch` branch now also enqueues a `saveProgress` item alongside the `completeWord` item so both sync when connectivity is restored.

**Generalized rule:** When the backend has separate endpoints for session state and analytics/progress history, both must be called from the client. A successful `completeWord` does NOT imply a progress record was written — check the API schema for separate tables.

---

## Play button disabled in some modules — `audio_files` shape mismatch

**Symptom:** Audio play button works in module 1-1 but is disabled / silent in module 2-1 (and other modules). Only one word per session resolves successfully; the rest fall through with no `audio_path`.

**Cause:** `resolveSessionAudioPaths` in `src/services/api/modules.ts` assumed `audio_files` was always `Array<{ipa, role}>`. Some modules return it as `Array<string>` of raw IPAs (e.g. `["/kæt/","/k/","/æ/","/t/"]`). On string entries, `f.role` is `undefined`, the `find` calls miss, fallback `audioFiles[0]` returns a raw string, and `.ipa` on that string is `undefined` → `resolveSounds(undefined)` is called for every word and silently fails.

**Fix:** Normalize `audio_files` to the canonical `{ipa, role}` shape at the top of the per-word resolver. String entries are wrapped: index 0 → `role: 'primary:pure'`, rest → `role: 'phoneme'`.

**Generalized rule:** Any field coming from the curriculum JSON that has shape variability across modules (raw vs object, snake vs camel, scalar vs array) MUST be normalized at the API service boundary before the resolver/parser logic runs. Treat the boundary as the only place that knows about backend variants — never sprinkle shape checks through downstream code.

---

## saveProgress 500 — curriculum word ID used as D1 activityId

**Symptom:** `ERROR [API] 500: Failed to save progress` when completing a word in a lesson.

**Cause:** `saveProgress` was called with `currentWord.id` as the `activityId` URL parameter. Curriculum word IDs come from R2 JSON files and are R2-local identifiers (e.g. slug strings) — they do NOT match the UUIDs in the D1 `activities` table. The backend tried to find or create an activity using this foreign ID, which fails D1 insertion.

**Fix:** Use `currentWord.display_text` as the `activityId` (URL-encoded via `encodeURIComponent` in `saveProgress`). The display text is a stable, human-readable identifier that the backend uses as the activity's `displayText` field for find-or-create. The offline queue endpoint was updated to match. (`src/services/api/progress.ts` + `src/app/(public)/lesson/[moduleId].tsx`)

**Generalized rule:** The `activityId` in `POST /v1/progress/:profileId/:activityId` must be a D1-compatible identifier. Curriculum/R2 word IDs are NOT activity IDs — use `display_text` (the word itself) as the stable cross-table key. Always `encodeURIComponent` path segments that may contain spaces or special characters.

---

## saveProgress 500 — empty display_text produces collapsed activityId URL

**Symptom:** `ERROR [API] 500: Failed to save progress` on every word completion, even after the fix to use `display_text` instead of `currentWord.id`. The Progress tab shows nothing or stale data.

**Cause:** `normalizeWordData()` in `src/services/api/modules.ts` falls back to `display_text = ''` when both `display_text` and `displayText` are absent on the raw word record (some R2 curriculum words carry only `audio_files` IPA payloads and no display text). With an empty string, `encodeURIComponent('')` returns `''`, so the constructed URL becomes `/v1/progress/{profileId}/` — a path with an empty `:activityId` segment — and the backend returns 500.

**Fix:** Two-layer guard:
1. **Service layer** (`src/services/api/progress.ts`): `saveProgress` now checks `activityId.trim()` and `req.displayText.trim()` before making the request. If either is empty/whitespace, it logs `console.warn('[API] saveProgress skipped — empty activityId/displayText for profile X')` and returns early without calling the backend. A `__DEV__` `console.debug` also logs the resolved URL and payload before each real request.
2. **Call site** (`src/app/(public)/lesson/[moduleId].tsx`): `activityKey = (currentWord.display_text ?? '').trim()` is computed once. Both the `saveProgress` call and its offline-queue enqueue are wrapped in `if (activityKey) { … }`, so words with no `display_text` never generate a broken request or a useless offline payload. `completeWord` and its offline enqueue are unaffected.

**Generalized rule:** Before using any field derived from curriculum/R2 JSON as a URL path segment, guard for empty/whitespace at both the call site (skip the call entirely) and at the service boundary (defensive early-return). A silent normalizer fallback to `''` can propagate far from its source — adding defensive guards at two layers catches it regardless of which layer is reached first.

---

## Lesson restarts from word 1 on resume — useLessonStore not hydrated from SessionData.position

### Lesson restarts from word 1 on resume

**Context:** User completes some words in a module (e.g. reaches word 5 of 7), quits the lesson screen (back button or force-kill), then reopens the same module via NFC or the missions list.

**Error (symptom):** Progress bar shows "Word 1 of N" instead of the expected resume position. After the first pronunciation attempt, `advanceWord()` increments from index 0 → 1, discarding the real backend-tracked position. Words already marked completed/failed by the backend are not honoured client-side.

**Cause:** `loadModule()` in `src/app/(public)/lesson/[moduleId].tsx` called `store.setSession(resolvedSession)` to store the `SessionData` returned by the backend (which includes `session.position`, `completedWords`, and `failedWords`), but never wrote those values into `useLessonStore`'s session-tracking fields (`currentWordIndex`, `completedWords`, `failedWords`, `sessionScore`). The store was initialised with `sessionDefaults` (index 0, empty arrays) and was never hydrated from the backend response.

**Fix:** Added a `hydrateFromSession(session: SessionData)` action to `useLessonStore` that atomically sets `currentWordIndex = session.position ?? 0`, `completedWords = session.completedWords ?? []`, `failedWords = session.failedWords ?? []`, `sessionScore = completedWords.length` (reflecting prior progress on the results screen), and guards `sessionComplete = true` if `position >= totalWords`. In `loadModule()`, `store.hydrateFromSession(resolvedSession)` is called immediately after `store.setSession(resolvedSession)` and before `store.setCurrentWord(startWord)`, so all subsequent store reads (progress bar, `advanceWord`) operate from the correct resume position. (`src/stores/useLessonStore.ts` + `src/app/(public)/lesson/[moduleId].tsx`)

**Generalized rule:** Whenever a store holds derived tracking state (indexes, counters, arrays) that mirrors a backend model, there must be an explicit hydration action that writes ALL fields from the backend response in a single atomic `set()` call. Calling only `setSession(data)` while leaving tracking fields at their defaults silently diverges client state from server state — especially after navigation away and back.

---

## saveProgress 500 — missing X-Idempotency-Key header (and thin diagnostics)

**Symptom:** `ERROR [API] 500: Failed to save progress` continued to fire on every `POST /v1/progress/:profileId/:activityId` call even after the empty-`display_text` guard was added — including for words with valid display text (e.g. `"a"`, `"cat"`) and on the Skip button. The Progress tab stayed empty.

**Cause:** Two compounding issues. (1) `docs/message.txt` (the curriculum-team API reference) explicitly lists `X-Idempotency-Key` as a required header on both `POST /v1/modules/{moduleId}/word` and `POST /v1/progress/{profileId}/{activityId}` for offline-replay safety; the mobile client was never sending it, so the backend rejected every save attempt. (2) The shared response interceptor only logged `data?.error`, hiding nested validation messages (`message`, request URL, request body, full response payload) — so every 500 looked identical and the real cause was invisible from Metro alone.

**Fix:**
1. **New helper** `src/services/api/idempotency.ts` exposing `makeIdempotencyKey()` — a sufficient-uniqueness key (`Date.now()` + random base36) generated per-request.
2. **`saveProgress`** (`src/services/api/progress.ts`) and **`completeWord`** (`src/services/api/modules.ts`) now attach `{ headers: { 'X-Idempotency-Key': makeIdempotencyKey() } }` on every POST.
3. **Response interceptor** (`src/services/api/client.ts`) now logs, for every ≥400 response: HTTP method + full URL, the request body, and the **full** stringified response body. The previous one-line log lives on for 2xx-shaped errors; nested errors are now visible in Metro.

**Generalized rule:** When a backend documents a required header for replay-safety (`X-Idempotency-Key`, `X-Request-Id`, etc.), the client must send it on **every** `POST`/`PUT`/`PATCH` of the affected endpoint, not just the offline-queue replay path. Generate the key per-request and never reuse one across two distinct user actions. Independently: response interceptors must log the full response body on errors — surfacing only `data?.error` makes every server-side validation failure look identical and prevents diagnosis from the client console.

---

## saveProgress 500 — backend handler degraded (client-side graceful degradation) ✅ RESOLVED

**Symptom:** `POST /v1/progress/:profileId/:activityId` returns `500 {"error":"Failed to save progress"}` for every well-formed request — verified via the new full-body interceptor logging. Example reproducer: `POST /v1/progress/49b9ca02-…/cat` body `{"isCorrect":false,"displayText":"cat"}` with `X-Idempotency-Key` header → still 500. Every other endpoint (auth, modules, completeWord, syllabus, pronunciation) works for the same profile, so this is isolated to the progress handler.

**Cause:** Two backend SQLite bugs — the activities INSERT and the progress INSERT/UPDATE both targeted columns that don't exist in the schema. SQLite threw, the catch swallowed it, returning the generic 500. **Not a client-fixable bug.** Backend fixed and shipped to api.tutoria.ac on 2026-04-25.

**Client-side mitigation that was applied (now reverted):**
1. **`apiClient` config flag `_silenceErrorLogging`** — suppressed per-request noise for the broken endpoint.
2. **`saveProgress` self-contained the failure** — try/catch swallowing the error with a once-per-session warn.
3. **Lesson screen** — removed the `saveProgress` enqueue from the offline-queue catch branch to avoid replaying a permanently-broken endpoint.

**Revert applied (2026-04-25):**
- Removed try/catch and `_saveProgressWarnedThisSession` flag from `saveProgress`.
- Removed `_silenceErrorLogging: true` from the request.
- Re-added `saveProgress` enqueue in the lesson screen catch branch (with `X-Idempotency-Key` stored in `OfflineQueueItem.headers`).
- Added `headers?: Record<string, string>` to `OfflineQueueItem` and `drainQueue` now passes headers on replay.

**Generalized rule:** When a client-side endpoint is provably correct (verified via full request/response logging) but the backend is degraded, do not let the noise spam Metro and do not enqueue retries on a known-broken endpoint. Add a per-request silencing flag to the interceptor, swallow the error in the service function, log once, and document the regression with a clear "what to revert when fixed" checklist so the mitigation is reversible.

### Lesson resume restarts from word 1 instead of continuing where left off
**Context:** Lesson screen (`src/app/(public)/lesson/[moduleId].tsx`) on re-entry after mid-lesson exit  
**Error:** After exiting a lesson with N words completed and re-entering, all N words must be repeated from the start  
**Cause:** `loadModule` used `resolvedSession.position` (which the backend returns as 0 even for resumed sessions) to pick `startWord`, and `hydrateFromSession` similarly trusted `session.position` as `currentWordIndex` — ignoring `completedWords` as the source of truth  
**Fix:** `hydrateFromSession` now computes `effectivePosition` = `wordData.findIndex(w => !completedSet.has(w.id))`, clamped to `Math.max(effectivePosition, session.position)`. `loadModule` reads `currentWordIndex` from `useLessonStore.getState()` after hydration instead of using `resolvedSession.position` directly.

### Jest mock default export resolves to undefined when `__esModule` flag is missing
**Context:** Jest unit tests for stores/services that mock Axios `apiClient` (default export)  
**Error:** `TypeError: Cannot read properties of undefined (reading 'mockResolvedValue')` — the `mockPost` constant is `undefined` at test time  
**Cause:** When a Jest mock factory returns `{ default: { post: jest.fn() } }` without `__esModule: true`, Babel's `interopRequireDefault` wraps the whole object in another `{ default: ... }` layer. The default import resolves to the original mock object (which has a `.default` sub-key, not `.post`), making `apiClient.post` undefined.  
**Fix:** Add `__esModule: true` to every Jest mock factory that uses a `default` export: `jest.mock('./module', () => ({ __esModule: true, default: { ... } }))`.  
**Generalized rule:** Any Jest mock for a module that uses `export default` must include `__esModule: true` in the factory return object, otherwise Babel's interop wrapper double-nests the default, making the imported value one level off.

### `eslint-plugin-react-native` incompatible with ESLint 9 flat config
**Context:** `eslint.config.js` (ESLint 9 flat config) with `eslint-plugin-react-native@^4`  
**Error:** `TypeError: context.getScope is not a function` on rules `no-unused-styles`, `split-platform-components`, `no-inline-styles`  
**Cause:** ESLint 9 removed `context.getScope()` in favour of `sourceCode.getScope(node)`. `eslint-plugin-react-native@4` still uses the old API internally and has not been updated for ESLint 9 flat config.  
**Fix:** Register the plugin but set all its rules to `'off'` until an ESLint 9-compatible version is released. The plugin can still be listed in `plugins` for future activation without breaking the lint run.  
**Generalized rule:** When adding an ESLint plugin for a React Native project using ESLint 9 flat config, verify the plugin version supports the new `sourceCode.getScope(node)` API. If not, register it but disable its rules with `'off'` rather than removing it entirely.

### Progress tab double-refresh after returning from lesson
**Context:** `src/app/(public)/(tabs)/progress.tsx` — `useFocusEffect` + `useEffect([lastInvalidatedAt])`
**Error:** Progress tab briefly shows loading → data → loading → data (two fetch cycles) every time the user navigates back from a completed lesson, making it look like an infinite auto-refresh.
**Cause:** Both `useFocusEffect` (fires on tab focus) and `useEffect([lastInvalidatedAt])` (fires when progress store is invalidated) call `fetchData()`. After a lesson, `invalidate()` is called AND the tab gains focus simultaneously, so both effects fire within the same render cycle — two concurrent API calls with two loading states.
**Fix:** Added a `fetchDebounceRef` (50ms debounce) and `debouncedFetch` callback in `progress.tsx`. Both `useFocusEffect` and `useEffect([lastInvalidatedAt])` now call `debouncedFetch`, ensuring at most one `fetchData()` call per 50ms window.
**Generalized rule:** When a screen has two independent triggers for the same side-effect (e.g., focus event + store invalidation), deduplicate them with a debounce ref rather than letting both fire. Both triggers are needed (one handles "just focused", the other handles "already focused when data changes"), but they must not fire concurrently.

### MissionCard lessons don't save word progress (display_text empty)
**Context:** `src/app/(public)/lesson/[moduleId].tsx` — `advanceToNextWord()` and `handleRecordStop()`
**Error:** Words practiced via the "Ready to Learn" MissionCard button are not saved to the progress backend — the progress tab shows no new entries after the lesson.
**Cause:** `activityKey = (currentWord.display_text ?? '').trim()` returns `''` for IPA-only curriculum words (those with only `audio_files` / no `display_text`). The guard `if (activityKey)` then silently skips `saveProgress`. NFC-launched lessons happened to use modules with `display_text` populated, masking the bug.
**Fix:** Fall back to `currentWord.id` as `activityKey` when `display_text` is empty: `const activityKey = rawActivityKey || currentWord.id || ''`. A `console.warn` is emitted when the fallback is used so the data gap is visible in dev logs.
**Generalized rule:** Activity identifiers derived from API data should always have a fallback (`word.id`, a stable UUID) so that progress is never silently dropped due to a missing optional field in the word payload.

### Progress lost when user does not click Next after correct pronunciation
**Context:** `src/app/(public)/lesson/[moduleId].tsx` — `handleRecordStop()` and `advanceToNextWord()`
**Error:** If the user gets a correct pronunciation verdict but closes the app or navigates away before clicking "Next", `saveProgress` is never called and the attempt is not recorded in the backend.
**Cause:** `saveProgress` was only called inside `advanceToNextWord`, which is triggered by the Next button. Correct result + no Next click = no backend write.
**Fix:** `handleRecordStop` now calls `saveProgress` immediately (fire-and-forget) when `passed=true`, adding the word's `activityKey` to `savedWordsRef`. `advanceToNextWord` checks `savedWordsRef` and skips `saveProgress` if the word was already persisted. On `saveProgress` failure, the word is removed from `savedWordsRef` so `advanceToNextWord` retries it.
**Generalized rule:** Progress persistence should happen at the earliest safe point (correct verdict confirmed) rather than at a later UI interaction (button click). UI navigation and data persistence are separate concerns — data must be committed as soon as the result is known.

### Lesson restarts from the completed word after exiting without pressing "Next"
**Context:** `src/app/(public)/lesson/[moduleId].tsx` — `handleRecordStop()` and `advanceToNextWord()`  
**Error:** When a user pronounces a word correctly and exits without pressing "Next", the Progress tab correctly shows the word as completed, but returning to the lesson restarts from that same word instead of the next one.  
**Cause:** Two separate API calls track word completion. `saveProgress()` (writes to the progress/activity table — what the Progress tab shows) was called eagerly on pronunciation success in `handleRecordStop()`. But `completeWord()` (updates the module session's `completedWords[]` on the backend — what `startOrResumeModule` / `hydrateFromSession` uses to compute the resume position) was only called in `advanceToNextWord()` triggered by the "Next" button. Exiting before pressing Next left the backend session's `completedWords[]` without the just-completed word, so on re-entry `hydrateFromSession()` found it as the first uncompleted word and started from it again.  
**Fix:** Call `completeWord()` eagerly in `handleRecordStop()` at pronunciation success alongside `saveProgress()`. A new `completedWordsRef` tracks which words already had `completeWord()` called so `advanceToNextWord()` skips the duplicate API call.  
**Generalized rule:** Any time two APIs must both be called to fully record an event (e.g., progress activity AND module session completion), both must be called at the same trigger point. Deferring one of them to a later user action (like "Next") creates a data split where partial state is visible in one view but not another, and resume logic breaks.
