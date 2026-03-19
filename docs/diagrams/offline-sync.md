# Offline Sync Architecture

Tutoria queues progress updates locally when the device is offline and drains them sequentially once connectivity is restored. Curriculum and audio assets are cached in layers — in-memory (Zustand), persisted (AsyncStorage), and on-disk (expo-file-system) — with TTL-based invalidation to keep content fresh without unnecessary network calls.

---

## 1. Offline Queue Flow

```mermaid
flowchart TD
    A([User Action\ncomplete word / save progress]) --> B{Network\nstate?}

    B -- Online --> C[POST to API]
    C -- 2xx --> D([Done])
    C -- 5xx --> E

    B -- Offline --> E[Enqueue item\nto AsyncStorage]

    E --> F[("Queue item\n{ id, endpoint, method,\n  payload, timestamp,\n  retryCount }")]

    G([NetInfo: connectivity\nrestored]) --> H[Drain queue FIFO]
    H --> I[Retry item]
    I -- 2xx --> J[Remove from queue]
    I -- 4xx --> K[Discard item\nnon-recoverable]
    I -- 5xx --> L{retryCount\n< 3?}
    L -- Yes --> M[Increment retryCount\nre-enqueue at tail]
    L -- No --> N[Discard item\nmax retries reached]
    J & K & M & N --> O{Queue\nempty?}
    O -- No --> I
    O -- Yes --> P([Sync complete])
```

---

## 2. Caching Layers

```mermaid
flowchart TD
    API([API Response]) --> Z1
    API --> Z2
    API --> Z3

    subgraph L1 [Layer 1 · Zustand in-memory]
        Z1[Active session state\nScan state / UI state]
    end

    subgraph L2 [Layer 2 · AsyncStorage]
        Z2[Store snapshots\nOffline queue]
    end

    subgraph L3 [Layer 3 · expo-file-system]
        Z3[Audio .wav files\nCurriculum JSON]
    end

    L1 & L2 & L3 --> UI([UI Consumption])

    subgraph CF [Cache-first fetch pattern]
        direction TB
        CF1{Cache\nexists?} -- No --> CF2[Fetch from API]
        CF2 --> CF3[Write to cache]
        CF3 --> CF4([Return fresh data])
        CF1 -- Yes --> CF5{Cache\nfresh?}
        CF5 -- Yes --> CF6([Return cached data])
        CF5 -- Stale + Online --> CF2
        CF5 -- Stale + Offline --> CF7([Return stale data\nwith warning])
    end
```

---

## 3. Reconnection Sync Flow

```mermaid
sequenceDiagram
    participant NI as NetInfo
    participant App
    participant Q as Offline Queue\n(AsyncStorage)
    participant API

    NI->>App: connectivity restored
    App->>App: debounce 1.5 s

    App->>Q: read queue (FIFO)

    loop For each queued item
        App->>API: POST /endpoint (payload)
        alt 2xx success
            API-->>App: OK
            App->>Q: remove item
        else 4xx client error
            API-->>App: error
            App->>Q: discard item
        else 5xx server error
            API-->>App: error
            alt retryCount < 3
                App->>Q: increment retryCount, re-enqueue
            else max retries
                App->>Q: discard item
            end
        end
    end

    App->>API: GET /syllabus (If-None-Match: <etag>)
    API-->>App: 200 fresh syllabus (or 304 Not Modified)
    App->>API: GET /progress
    API-->>App: 200 latest progress
    App->>App: update caches & Zustand stores
```

---

## Constraints

- **Max queue size:** 200 items — oldest items are discarded when the limit is exceeded.
- **Max item age:** 7 days — items older than this are dropped on startup and during each drain cycle.
- **Audio cache budget:** 150 MB — LRU eviction removes least-recently-played files when the budget is exceeded.
- **Curriculum cache TTL:** 1 hour — revalidated via `ETag` / `If-None-Match`; a `304 Not Modified` response refreshes the TTL without re-downloading the payload.
