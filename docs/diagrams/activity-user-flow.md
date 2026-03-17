# User Flow Activity Diagram

Complete activity diagram covering the full user journey in the Tutoria mobile app — from authentication through profile selection, NFC scanning, module sessions, pronunciation checking, and progress tracking.

## Flow Summary

1. **Authentication**: User logs in via Clerk. Unauthenticated users are redirected to the login screen.
2. **Profile Selection**: Parent selects (or creates) a learner profile for the session.
3. **Home Screen**: The central hub with mission cards, NFC listener, progress dashboard, and syllabus browser.
4. **Module Entry**: Users can enter a module via NFC card scan, mission card selection, or syllabus browsing.
5. **Eligibility Check**: The API enforces max 3 attempts per module with a 12-hour cooldown between attempts.
6. **Learning Session**: Words are presented one at a time with audio playback. The user records their pronunciation.
7. **Pronunciation Check**: The recording is sent to the AI validation pipeline (`POST /pronunciation/check`) which returns IPA comparison and correctness.
8. **Progress Tracking**: Each word result is saved. When all words are complete, the module attempt is incremented.

```mermaid
flowchart TD
    Start([User Opens App]) --> AuthCheck{Is Logged In?}

    AuthCheck -->|No| Login[Login Screen<br/>Clerk Authentication]
    Login --> AuthCheck
    AuthCheck -->|Yes| ProfileCheck{Has Profiles?}

    ProfileCheck -->|No| CreateProfile[Create Learner Profile]
    CreateProfile --> SelectProfile
    ProfileCheck -->|Yes| SelectProfile[Select Learner Profile]

    SelectProfile --> Home[Home Screen<br/>Mission Cards + NFC Listener]

    Home --> ScanChoice{User Action}

    ScanChoice -->|View Missions| Missions[Browse Mission Cards<br/>Quick Win / Continue / Retry]
    ScanChoice -->|Tap NFC Card| NFCScan[NFC Tag Detected]
    ScanChoice -->|View Progress| ProgressScreen[Progress Dashboard<br/>Streak + Mastery]
    ScanChoice -->|Browse Curriculum| Syllabus[Syllabus Browser<br/>Stages + Modules]

    Missions -->|Select Mission| CheckAttempt
    Syllabus -->|Select Module| CheckAttempt

    NFCScan --> ParseTag[Read NDEF Data]
    ParseTag --> ValidTag{Tag Valid?}
    ValidTag -->|No| InvalidCard[Show: Unknown Card]
    InvalidCard --> Home
    ValidTag -->|Yes| CheckAttempt{Can Attempt?}

    CheckAttempt -->|Max Attempts| MaxAttempts[Show: Max Attempts Reached]
    CheckAttempt -->|In Cooldown| Cooldown[Show: Cooldown Timer<br/>12h between attempts]
    MaxAttempts --> Home
    Cooldown --> Home
    CheckAttempt -->|Yes| StartSession[Start / Resume<br/>Module Session]

    StartSession --> LoadWord[Load Next Word<br/>Display Text + Target IPA]

    LoadWord --> PlayAudio[Play Phonics Audio<br/>Visual Cue Display]
    PlayAudio --> WaitInput{User Interaction}

    WaitInput -->|Record| Recording[Record Pronunciation]
    WaitInput -->|Replay Audio| PlayAudio
    WaitInput -->|Quit| AbandonSession[Abandon Session<br/>No Attempt Cost]
    AbandonSession --> Home

    Recording --> CheckPronunciation[POST /pronunciation/check<br/>AI Validation Pipeline]
    CheckPronunciation --> ShowResult{Correct?}

    ShowResult -->|Yes| CorrectFeedback[✅ Show Success<br/>Haptic + Audio Feedback]
    ShowResult -->|No| IncorrectFeedback[❌ Show Feedback<br/>IPA Comparison]

    CorrectFeedback --> SaveProgress[Save Progress<br/>Update Days Correct]
    IncorrectFeedback --> SaveProgress

    SaveProgress --> MarkWord[Mark Word Complete<br/>in Session]
    MarkWord --> MoreWords{More Words?}

    MoreWords -->|Yes| LoadWord
    MoreWords -->|No| ModuleComplete[🎉 Module Complete!<br/>Increment Attempt Count]
    ModuleComplete --> Home

    ProgressScreen --> Home
```
