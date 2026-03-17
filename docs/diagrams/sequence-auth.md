# Authentication Flow Sequence Diagram

> Shows the Clerk-based authentication flow used by the Tutoria mobile app, including automatic user provisioning and profile management.

```mermaid
sequenceDiagram
    actor User as 👧 Parent
    participant App as React Native App
    participant Clerk as Clerk Auth
    participant API as Tutoria API<br/>(Cloudflare Worker)
    participant D1 as D1 Database

    User->>App: Opens App
    App->>Clerk: Check Session (expo-secure-store)

    alt No Active Session
        App->>User: Show Login Screen
        User->>App: Enter Credentials
        App->>Clerk: Sign In
        Clerk-->>App: Session Token (JWT)
        App->>App: Store Token (expo-secure-store)
    else Active Session
        Clerk-->>App: Existing JWT
    end

    App->>App: setAuthToken(jwt)<br/>Configure Axios Header

    App->>API: GET /v1/profiles/list<br/>Authorization: Bearer <jwt>
    API->>API: Verify JWT via Clerk JWKS
    API->>D1: Query profiles for userId

    alt User Not Found
        API->>D1: Auto-create user record
    end

    D1-->>API: Profile list
    API-->>App: { profiles: [...] }

    alt No Profiles
        App->>User: Show Create Profile
        User->>App: Enter Child's Name
        App->>API: POST /v1/profiles/create<br/>{ name: "Alice" }
        API->>D1: Insert profile
        API-->>App: { profileId, success }
    end

    App->>API: POST /v1/profiles/select<br/>{ profileId }
    API-->>App: { success, profileId, profileName }
    App->>App: Set Active Profile in Store
    App->>User: Navigate to Home Screen
```

## Flow Summary

1. **Session Check** — On launch the app checks `expo-secure-store` for an existing Clerk session JWT. If none exists, the parent is prompted to sign in.
2. **Token Configuration** — The JWT is set as the default `Authorization: Bearer` header on the shared Axios instance via `setAuthToken()`.
3. **Profile Loading** — `GET /v1/profiles/list` returns all child profiles for the authenticated parent. The Worker verifies the JWT against Clerk's JWKS endpoint and auto-creates a user record in D1 on first contact.
4. **Profile Creation** — If no profiles exist yet, the parent is guided through creating one (child's name). The API inserts the profile into D1.
5. **Profile Selection** — The parent selects (or the app auto-selects) an active profile via `POST /v1/profiles/select`. The selected `profileId` is stored in the Zustand store and used for all subsequent API calls.
