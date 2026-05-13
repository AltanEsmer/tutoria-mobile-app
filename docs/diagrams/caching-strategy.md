# Caching Strategy

The mobile app maintains three cache tiers backed by distinct storage substrates. Tier
selection is determined by the data type and lifetime: short-lived UI state lives in
memory, curriculum metadata lives in AsyncStorage, and binary audio assets live on the
device file-system.

---

## 1. Three-tier cache topology

```mermaid
flowchart TB
    subgraph T1 [Tier 1 · In-memory · Zustand]
        Z[Active store slices<br/>scan state, current word,<br/>active profile]
    end

    subgraph T2 [Tier 2 · AsyncStorage · cacheManager.ts]
        A1[Modules JSON<br/>TTL 24 h]
        A2[Stages JSON<br/>TTL 24 h]
        A3[Syllabus tree<br/>TTL 24 h]
        A4[Offline queue<br/>persisted via Zustand]
    end

    subgraph T3 [Tier 3 · expo-file-system · audioCache.ts]
        F1[Phoneme audio .wav<br/>indefinite, LRU 150 MB]
        F2[Sound effects<br/>shipped in bundle]
    end

    UI([UI / Hooks]) --> Z
    UI --> A1 & A2 & A3
    UI --> F1

    A1 -. miss / stale .-> API([API])
    A2 -. miss / stale .-> API
    A3 -. miss / stale .-> API
    F1 -. miss .-> R2([R2 via /v1/audio/proxy])
```

---

## 2. Stale-while-revalidate decision

```mermaid
flowchart TD
    Get([cacheManager.get key]) --> Read[Read CacheEntry<T>]
    Read --> Exists{entry?}
    Exists -- no --> Miss[Cache miss]
    Exists -- yes --> Fresh{now < expiresAt?}
    Fresh -- yes --> Return1([Return data])
    Fresh -- no --> Stale[Mark stale]
    Stale --> Online{network?}
    Online -- online --> Background[Trigger background<br/>revalidate]
    Background --> Return2([Return stale data now])
    Online -- offline --> Return3([Return stale data<br/>with offline indicator])
    Miss --> Fetch[Fetch from API]
    Fetch --> Write[Write CacheEntry]
    Write --> Return4([Return fresh data])
```

---

## 3. Cache budgets and policies

| Cache | Substrate | Capacity | Eviction | TTL | Invalidation trigger |
|---|---|---|---|---|---|
| Active session | Zustand memory | unbounded* | lifetime of process | session | sign-out, session end |
| Modules / stages | AsyncStorage | ~5 MB (platform soft limit) | manual on schema bump | 24 h | curriculum push notification |
| Audio files | File-system | 150 MB | LRU | none | user "clear cache" action |
| Pronunciation results | not cached | — | — | — | always re-graded |
| Offline queue | AsyncStorage | 200 items / 7 days | FIFO + age drop | per-item 7 d | drain on reconnect |

* Active session is bounded by lesson length (typically 6–12 words). It is not a leak risk.

---

## 4. Cache-key naming convention

| Domain | Key template | Example |
|---|---|---|
| Modules list | `cache:modules:v1` | `cache:modules:v1` |
| Module detail | `cache:module:{id}:v1` | `cache:module:module-a:v1` |
| Stage | `cache:stage:{id}:v1` | `cache:stage:stage-foundations:v1` |
| Syllabus tree | `cache:syllabus:v1` | `cache:syllabus:v1` |
| Audio | `audio:{sha1(r2-path)}` | `audio:9f3a…b21` |

The trailing `:v1` segment is bumped manually whenever the on-the-wire schema for a domain
changes incompatibly, forcing all clients to refresh on the next read.
