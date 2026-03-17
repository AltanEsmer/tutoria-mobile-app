# Domain Class Diagram

Class diagram representing the core domain entities of the Tutoria mobile app and API.

## Key Relationships

- **User → Profile**: One user (parent) can create multiple learner profiles (children).
- **Profile → ModuleProgress**: Each profile independently tracks progress through modules.
- **Profile → Progress**: Each profile tracks per-activity mastery (days correct, mastered flag).
- **Stage → Module → WordData**: The curriculum hierarchy — stages contain modules, modules contain word exercises.
- **ModuleProgress → SessionData**: A module progress record may have one active session at a time (the in-flight learning session).
- **NFCManager → PhysicalCard → Module**: Physical NFC cards are read by the device and mapped to a specific module.
- **WordData → PronunciationResult**: Each word exercise produces a pronunciation check result via the AI pipeline.

## Cardinalities

| Relationship | Cardinality | Notes |
|---|---|---|
| User → Profile | 1 to many | Parent account owns learner profiles |
| Profile → ModuleProgress | 1 to many | One entry per module attempted |
| Profile → Progress | 1 to many | One entry per activity tracked |
| Stage → Module | 1 to many | Curriculum is organized into stages |
| Module → WordData | 1 to many | Each module has multiple word exercises |
| ModuleProgress → SessionData | 1 to 0..1 | At most one active session per module |
| Progress → Activity | Many to 1 | Multiple profiles can track the same activity |

```mermaid
classDiagram
    class User {
        +String id
        +String clerkId
        +String email
        +String name
        +DateTime createdAt
        +DateTime updatedAt
        +DateTime deletedAt
    }

    class Profile {
        +String id
        +String userId
        +String name
        +DateTime createdAt
    }

    class Stage {
        +String id
        +String title
        +String description
        +String preReading
        +String[] moduleFiles
    }

    class Module {
        +String id
        +String name
        +WordData[] exercises
    }

    class ModuleProgress {
        +String id
        +String profileId
        +String moduleId
        +Number attempts
        +Number lastAttemptAt
        +Number completedAt
        +SessionData currentSession
    }

    class SessionData {
        +String[] words
        +WordData[] wordData
        +Number totalWords
        +Number position
        +Number started
        +String[] completedWords
        +String[] remainingWords
        +String[] failedWords
    }

    class WordData {
        +String id
        +String displayText
        +String targetIPA
        +String audioPath
    }

    class Activity {
        +String id
        +String displayText
        +String targetIPA
        +DateTime createdAt
    }

    class Progress {
        +String id
        +String profileId
        +String activityId
        +Number daysCorrect
        +Boolean mastered
        +String lastCorrectDate
        +DateTime masteredAt
    }

    class PhysicalCard {
        +String tagId
        +String moduleId
        +Boolean isValid
        +String rawData
        +parse()
    }

    class NFCManager {
        +Boolean isSupported
        +Boolean isEnabled
        +initialize()
        +readTag()
        +cleanup()
    }

    class PronunciationResult {
        +Boolean overallIsCorrect
        +Number similarity
        +String feedback
        +String ipaReference
        +String ipaUser
        +String resultType
    }

    User "1" --> "*" Profile : has
    Profile "1" --> "*" ModuleProgress : tracks
    Profile "1" --> "*" Progress : records
    Stage "1" --> "*" Module : contains
    Module "1" --> "*" WordData : includes
    ModuleProgress "1" --> "0..1" SessionData : activeSession
    SessionData "1" --> "*" WordData : references
    Progress "*" --> "1" Activity : measures
    NFCManager ..> PhysicalCard : reads
    PhysicalCard ..> Module : mapsTo
    WordData ..> PronunciationResult : produces
```
