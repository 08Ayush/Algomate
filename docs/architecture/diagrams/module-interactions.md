# Module Interaction Diagrams

This document contains sequence diagrams and flow charts showing how modules interact with each other.

---

## 1. Timetable Approval Workflow

```mermaid
sequenceDiagram
    participant User
    participant API as API Route
    participant Auth as Auth Middleware
    participant UC as ApproveTimetableUseCase
    participant Repo as TimetableRepository
    participant EventBus
    participant Handler as Event Handler
    participant NotifModule as Notifications

    User->>API: POST /api/timetables/{id}/approve
    API->>Auth: Authenticate request
    Auth-->>API: User context
    
    API->>UC: execute(timetableId, userId)
    UC->>Repo: findById(timetableId)
    Repo-->>UC: Timetable entity
    
    UC->>UC: Validate user permissions
    UC->>Repo: updateStatus(id, 'published')
    Repo-->>UC: Updated timetable
    
    UC->>Repo: logWorkflowAction(...)
    UC->>EventBus: publish(TimetableApprovedEvent)
    
    EventBus->>Handler: TimetableApprovedEvent
    Handler->>NotifModule: Send approval notification
    
    UC-->>API: { success, message }
    API-->>User: 200 OK
```

---

## 2. Elective Bucket Creation & Publishing

```mermaid
sequenceDiagram
    participant Admin
    participant API as Buckets API
    participant CreateUC as CreateBucketUseCase
    participant BucketRepo as BucketRepository
    participant PublishAPI as Publish API
    participant EventBus
    participant Students

    Admin->>API: POST /api/nep/buckets
    API->>CreateUC: execute(dto)
    CreateUC->>BucketRepo: create(bucketData)
    BucketRepo-->>CreateUC: New bucket
    CreateUC-->>API: { success, bucket }
    API-->>Admin: Bucket created
    
    Admin->>PublishAPI: POST /buckets/{id}/publish
    PublishAPI->>BucketRepo: update(id, {is_published: true})
    PublishAPI->>EventBus: publish(BucketPublishedEvent)
    
    EventBus->>Students: Bucket now visible for selection
```

---

## 3. Student Subject Choice Flow

```mermaid
flowchart TD
    A[Student Views Buckets] --> B{Bucket Published?}
    B -->|No| C[Not Visible]
    B -->|Yes| D[Display Bucket]
    
    D --> E[Student Selects Subjects]
    E --> F{Min/Max Valid?}
    F -->|No| G[Show Error]
    F -->|Yes| H[Submit Choices]
    
    H --> I[Save to Database]
    I --> J[Publish ChoiceSubmittedEvent]
    J --> K[Trigger Notifications]
    J --> L[Update Analytics]
```

---

## 4. Cache Invalidation Flow

```mermaid
flowchart LR
    A[User Updates Course] --> B[UpdateCourseUseCase]
    B --> C[@CacheInvalidate Decorator]
    C --> D[Execute Update]
    D --> E[Delete Cache Key]
    E --> F[Update Database]
    F --> G[Return Updated Course]
    
    H[Next Request] --> I[Read Cache]
    I --> J{Cache Hit?}
    J -->|No - Invalidated| K[Fetch from DB]
    K --> L[Cache Result]
    J -->|Yes| M[Return Cached]
```

---

## 5. Event-Driven Module Communication

```mermaid
graph TB
    subgraph "TimetableModule"
        T1[ApproveTimetableUseCase]
        T2[TimetableApprovedEvent]
    end
    
    subgraph "EventBus"
        EB[Event Bus<br/>Pub/Sub]
    end
    
    subgraph "NotificationsModule"
        N1[Event Handler]
        N2[Send Notification]
    end
    
    subgraph "DashboardModule"
        D1[Event Handler]
        D2[Update Statistics]
    end
    
    subgraph "AnalyticsModule"
        A1[Event Handler]
        A2[Track Metrics]
    end
    
    T1 -->|Publishes| T2
    T2 --> EB
    
    EB -->|Subscribes| N1
    EB -->|Subscribes| D1
    EB -->|Subscribes| A1
    
    N1 --> N2
    D1 --> D2
    A1 --> A2
    
    style EB fill:#f9f,stroke:#333
    style T2 fill:#bbf,stroke:#333
```

---

## 6. Request Flow with Observability

```mermaid
sequenceDiagram
    participant Client
    participant Middleware as Correlation ID Middleware
    participant Logger
    participant Metrics
    participant UseCase
    participant Cache
    participant DB

    Client->>Middleware: HTTP Request
    Middleware->>Middleware: Generate Correlation ID
    Middleware->>Logger: Log request start
    Middleware->>Metrics: Increment request counter
    
    Middleware->>UseCase: Execute with correlation ID
    UseCase->>Logger: Log use case start
    
    UseCase->>Cache: Check cache
    alt Cache Hit
        Cache-->>UseCase: Cached data
        UseCase->>Metrics: Increment cache hit
    else Cache Miss
        UseCase->>DB: Query database
        DB-->>UseCase: Data
        UseCase->>Cache: Store in cache
        UseCase->>Metrics: Increment cache miss
    end
    
    UseCase->>Logger: Log use case success
    UseCase->>Metrics: Record execution duration
    UseCase-->>Middleware: Result
    
    Middleware->>Logger: Log request complete
    Middleware->>Metrics: Record request duration
    Middleware-->>Client: HTTP Response with correlation ID
```

---

## 7. Module Dependency Hierarchy

```mermaid
graph TD
    API[API Routes Layer]
    
    subgraph Shared
        AUTH[Auth Middleware]
        DB[Database Clients]
        CACHE[Cache Service]
        EVENTS[Event Bus]
        LOG[Logger]
        MET[Metrics]
    end
    
    subgraph Modules
        ELECT[ElectiveModule]
        TIME[TimetableModule]
        BATCH[BatchModule]
        CLASS[ClassroomModule]
        COURSE[CourseModule]
    end
    
    API --> AUTH
    API --> DB
    API --> ELECT
    API --> TIME
    API --> BATCH
    API --> CLASS
    API --> COURSE
    
    ELECT --> DB
    ELECT --> CACHE
    ELECT --> EVENTS
    ELECT --> LOG
    
    TIME --> DB
    TIME --> CACHE
    TIME --> EVENTS
    TIME --> LOG
    
    BATCH --> DB
    BATCH --> LOG
    
    CLASS --> DB
    CLASS --> LOG
    
    COURSE --> DB
    COURSE --> CACHE
    
    style API fill:#e1f5ff
    style Shared fill:#fff4e6
    style Modules fill:#e8f5e9
```

---

## 8. Data Flow: Create to Publish

```mermaid
flowchart TD
    A[Admin Creates Bucket] --> B[Validate DTO]
    B --> C[CreateBucketUseCase]
    C --> D[BucketRepository.create]
    D --> E[Insert into Database]
    E --> F[Return Bucket Entity]
    
    F --> G[Admin Adds Subjects]
    G --> H[BucketRepository.linkSubjects]
    H --> I[Insert into bucket_subjects]
    
    I --> J[Admin Publishes Bucket]
    J --> K[Update is_published=true]
    K --> L[Publish BucketPublishedEvent]
    
    L --> M[Invalidate Cache]
    L --> N[Send Notifications]
    L --> O[Update Analytics]
    
    O --> P[Students Can See Bucket]
```

---

## Diagram Usage

These diagrams are written in **Mermaid** syntax and will render automatically in:
- GitHub
- Markdown previews that support Mermaid
- Documentation sites (Docusaurus, MkDocs, etc.)

To view locally, use a Mermaid preview extension or paste into [Mermaid Live Editor](https://mermaid.live).
