# Lesson Screen State Machine

The lesson screen at `src/app/(public)/lesson/[moduleId].tsx` is the busiest user-facing
component in the application. Its state is the product of three concerns — session
hydration, word-by-word progression, and the pronunciation attempt cycle — that are
encoded as an implicit state machine across `useLessonStore` and component-local state.

---

## 1. High-level lesson lifecycle

```mermaid
stateDiagram-v2
    [*] --> Loading: route mounted

    Loading --> NoSession: GET /v1/modules/:id returns canAttempt false
    Loading --> Eligible: canAttempt true

    Eligible --> Starting: POST /v1/modules/:id
    Starting --> Active: SessionData received

    Active --> WordIdle: word loaded
    WordIdle --> Recording: tap record
    Recording --> Grading: stop record
    Grading --> WordCorrect: overallIsCorrect true
    Grading --> WordWrong: overallIsCorrect false
    Grading --> WordError: errorType present
    Grading --> Cooldown: 429 with retryAfter

    WordCorrect --> Advance: animation done
    WordWrong --> WordIdle: shake done, attempts++
    WordError --> WordIdle: banner dismissed
    Cooldown --> WordIdle: timer elapsed

    Advance --> WordIdle: next word
    Advance --> Complete: all words done

    Complete --> [*]: navigate to results
    NoSession --> [*]: navigate home with toast
```

---

## 2. Hydration and resume logic

```mermaid
flowchart TD
    Mount([Lesson screen mount]) --> Params[useLocalSearchParams<br/>moduleId]
    Params --> Eligibility[GET /v1/modules/:id]
    Eligibility --> Eligible{canAttempt?}
    Eligible -- false --> Locked[Show "come back later"]
    Eligible -- true --> Start[POST /v1/modules/:id]
    Start --> Hydrate[useLessonStore.hydrateFromSession]

    Hydrate --> Find[Find first word not in<br/>completedWords]
    Find --> Pos{position > 0?}
    Pos -- yes --> Resume[Resume at position]
    Pos -- no --> Edge{any words in<br/>completedWords?}
    Edge -- yes --> Recover[Override position<br/>to first uncompleted index]
    Edge -- no --> Begin[Begin at index 0]

    Resume & Recover & Begin --> Render[Render WordCard]
```

The "edge" branch addresses a known backend race where a previous session crashed after
words were marked complete but before `position` was advanced. Trusting `position` blindly
would replay completed words; trusting `completedWords` alone breaks if the list is empty
on a clean start. The reconciliation logic uses `position` *or* the first uncompleted
index, whichever advances further.

---

## 3. Per-word attempt cycle

```mermaid
sequenceDiagram
    participant U as User
    participant LS as Lesson Screen
    participant UP as usePronunciation
    participant API as /v1/pronunciation/check
    participant LSt as useLessonStore

    LS->>U: show WordCard (display_text, ipa)
    U->>LS: tap "Play audio"
    LS->>LS: useAudio.play(audioPath)

    U->>LS: tap "Record"
    LS->>UP: startRecording
    U->>LS: tap "Stop"
    LS->>UP: stopAndCheck

    alt silence gate did not fire
        UP-->>LS: null (no submission)
        LS->>U: hint "Speak louder"
    else valid recording
        UP->>API: POST audio + text + ipa
        API-->>UP: response
        UP-->>LS: PronunciationCheckResponse

        alt errorType present
            LS->>U: informational banner
        else overallIsCorrect
            LS->>LSt: completeWord
            LSt->>API: POST /v1/modules/:id/word
            LS->>U: success animation + haptic
        else wrong
            LS->>LSt: incrementAttempt
            LS->>U: shake + retry CTA
        end
    end
```
