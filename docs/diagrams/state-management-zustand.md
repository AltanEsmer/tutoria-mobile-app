# Zustand Store Topology

Tutoria maintains five global stores under `src/stores/`. Each store owns a narrow
responsibility and is consumed through individual selectors by the hook layer rather than
directly by components. Only `useProgressStore` persists state across launches; the other
four are rehydrated from API responses on application start.

---

## 1. Store responsibilities and persistence

```mermaid
flowchart LR
    subgraph Hooks [Hook layer]
        H1[useNfc]
        H2[usePronunciation]
        H3[useAudio]
        H4[useNetworkState]
    end

    subgraph Stores [Zustand stores]
        S1[useAuthStore<br/>session flags<br/><i>memory</i>]
        S2[useProfileStore<br/>active learner<br/><i>memory</i>]
        S3[useLessonStore<br/>word index, attempts<br/><i>memory</i>]
        S4[useNfcStore<br/>scan state, lastTag<br/><i>memory</i>]
        S5[useProgressStore<br/>activities, queue<br/><i>persist: offlineQueue</i>]
        S6[useNetworkStore<br/>isConnected<br/><i>memory</i>]
    end

    subgraph Services [Service layer]
        SV1[api/client.ts]
        SV2[nfc/nfcManager.ts]
        SV3[cache/audioCache.ts]
    end

    H1 --> S4
    H1 --> SV2
    H2 --> S3
    H2 --> S2
    H2 --> SV1
    H3 --> SV3
    H4 --> S6
    H4 --> S5

    SV1 -.401.-> S1

    S5 -. AsyncStorage .-> Disk[(AsyncStorage)]
```

---

## 2. Per-store data ownership

| Store | Owns | Persisted slice | Primary writer | Primary reader |
|---|---|---|---|---|
| `useAuthStore` | `isSignedIn`, `userId`, `token` | none | Clerk session listener | root layout auth guard |
| `useProfileStore` | `activeProfile`, `profiles[]` | none | profile picker screen | `usePronunciation`, progress API calls |
| `useLessonStore` | `currentSession`, word index, attempts, cooldown | none | `hydrateFromSession`, word completion hooks | lesson screen |
| `useNfcStore` | `isSupported`, `isEnabled`, `isScanning`, `lastTag`, `error` | none | `nfcManager` lifecycle, `useNfc` | home screen, scan button |
| `useProgressStore` | `activities[]`, `streak`, `offlineQueue[]`, `isSyncing` | `offlineQueue` only | progress API calls, `addToQueue` | progress tab, `drainQueue` |
| `useNetworkStore` | `isConnected`, `lastChangeAt` | none | `useNetworkState` NetInfo listener | `OfflineBanner`, `useProgressStore.drainQueue` |

---

## 3. Cross-store invariants

- `useAuthStore.isSignedIn === false` ⇒ Expo Router redirect to `(auth)/sign-in`; all
  authenticated stores are reset by `clearAuth`.
- `useNetworkStore.isConnected` transition `false → true` ⇒ `useNetworkState` fires
  `useProgressStore.drainQueue()` after a 1.5 s debounce.
- `useLessonStore.currentSession === null` ⇒ lesson screen renders the resume CTA rather
  than the word card.
