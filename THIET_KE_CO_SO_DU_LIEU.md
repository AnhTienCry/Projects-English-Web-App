# THIẾT KẾ CƠ SỞ DỮ LIỆU
## HỆ THỐNG HỌC TIẾNG ANH GAMIFICATION

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mục đích
Hệ thống học tiếng Anh gamification được thiết kế để cung cấp trải nghiệm học tập tương tác, có tính cạnh tranh và thú vị cho người dùng. Hệ thống hỗ trợ 3 loại người dùng chính: Student, Teacher và Admin.

### 1.2 Công nghệ sử dụng
- **Database**: MongoDB (NoSQL)
- **ORM**: Mongoose (Node.js)
- **Backend**: Node.js + TypeScript
- **Frontend**: React (Web) + Flutter (Mobile)

### 1.3 Các chức năng chính
- Quản lý người dùng và phân quyền
- Hệ thống bài học đa cấp độ
- Gamification (Badge, Ranking, Tower climbing)
- Quiz và đánh giá
- Dịch thuật và từ vựng
- Thông báo realtime
- Báo cáo và thống kê

---

## 2. PHÂN TÍCH USE CASE VÀ YÊU CẦU DỮ LIỆU

### 2.1 Use Case Student
- **UC-01**: Đăng ký tài khoản → Bảng User
- **UC-02**: Đăng nhập & Refresh token → Bảng User + JWT
- **UC-03**: Học từ vựng - Flashcard → Bảng Vocab, UserProgress
- **UC-04**: Luyện phát âm - Speech-to-Text → Bảng LessonResult
- **UC-05**: Làm quiz & Nộp bài → Bảng Quiz, QuizResult
- **UC-06**: Xem tiến trình cá nhân → Bảng UserProgress, LessonResult
- **UC-07**: Xem video - Đánh dấu đã xem → Bảng Video, UserProgress
- **UC-08**: Nhận thông báo realtime → Bảng Notification
- **UC-09**: Leo tháp – Xếp hạng & Huy hiệu → Bảng Rank, Badge
- **UC-28**: Quản lý hồ sơ cá nhân → Bảng User

### 2.2 Use Case Teacher
- **UC-10**: CRUD Bài học → Bảng Lesson
- **UC-11**: CRUD Từ vựng → Bảng Vocab
- **UC-12**: CRUD Quiz → Bảng Quiz
- **UC-13**: Xem tiến trình lớp → Bảng UserProgress, LessonResult
- **UC-14**: Quản lý Video → Bảng Video
- **UC-15**: Gửi thông báo realtime → Bảng Notification
- **UC-26**: Tạo Thử thách tuần → Bảng Challenge (cần thêm)
- **UC-31**: Quản lý Ngân hàng câu hỏi → Bảng QuestionBank (cần thêm)
- **UC-30**: Quản lý Tháp & Tầng → Bảng Tower, Floor (cần thêm)
- **UC-32**: Xem Leaderboard học viên → Bảng Rank

### 2.3 Use Case Admin
- **UC-16**: Quản lý người dùng & Vai trò → Bảng User
- **UC-17**: Kiểm duyệt nội dung → Bảng ContentModeration (cần thêm)
- **UC-18**: Báo cáo tổng hợp → Các bảng thống kê
- **UC-19**: Cấu hình hệ thống → Bảng SystemConfig (cần thêm)
- **UC-33**: Cấu hình Gamification → Bảng GamificationConfig (cần thêm)
- **UC-34**: Quản lý Season Leaderboard → Bảng Season, SeasonRank (cần thêm)
- **UC-29**: Phát hiện & Xử lý gian lận → Bảng AntiCheat (cần thêm)

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU

### 3.1 Sơ đồ ERD (Entity Relationship Diagram)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    User     │    │   Level     │    │   Badge     │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ _id         │    │ _id         │    │ _id         │
│ email       │    │ number      │    │ name        │
│ passwordHash│    │ name        │    │ condition   │
│ role        │    │ description │    │ icon        │
│ nickname    │    │ required... │    │ users[]     │
│ createdAt   │    │ badge       │    └─────────────┘
└─────────────┘    │ isActive    │           │
       │           │ createdAt   │           │
       │           │ updatedAt   │           │
       │           └─────────────┘           │
       │                 │                   │
       │                 │                   │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│UserProgress │    │   Lesson    │    │   Rank      │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ _id         │    │ _id         │    │ _id         │
│ userId      │    │ title       │    │ userId      │
│ currentLevel│    │ description │    │ points      │
│ currentLesson│   │ level       │    │ level       │
│ completed...│    │ order       │    │ completed...│
│ totalScore  │    │ isUnlocked  │    │ updatedAt   │
│ streak      │    │ isCompleted │    └─────────────┘
│ badges[]    │    │ components  │
│ lastActive..│    │ required... │
│ totalStudy..│    │ createdAt   │
│ createdAt   │    │ updatedAt   │
│ updatedAt   │    └─────────────┘
└─────────────┘           │
       │                  │
       │                  │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│LessonResult │    │    Quiz     │    │QuizResult   │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ _id         │    │ _id         │    │ _id         │
│ userId      │    │ title       │    │ user        │
│ lessonId    │    │ description │    │ quiz        │
│ score       │    │ lesson      │    │ answers[]   │
│ isPassed    │    │ questions[] │    │ score       │
│ timeSpent   │    │ timeLimit   │    │ timeSpent   │
│ answers     │    │ passingScore│    │ passed      │
│ completedAt │    │ isActive    │    │ completedAt │
│ createdAt   │    │ createdAt   │    └─────────────┘
│ updatedAt   │    │ updatedAt   │
└─────────────┘    └─────────────┘
       │                  │
       │                  │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Video     │    │    Vocab    │    │Translation  │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ _id         │    │ _id         │    │ _id         │
│ title       │    │ word        │    │ userId      │
│ description │    │ meaning     │    │ originalText│
│ lesson      │    │ example     │    │ translated..│
│ videoUrl    │    │ lesson      │    │ sourceLang  │
│ thumbnailUrl│    │ level       │    │ targetLang  │
│ duration    │    │ createdAt   │    │ timestamp   │
│ transcript  │    └─────────────┘    │ isVocab     │
│ subtitles   │                       │ wordId      │
│ isActive    │                       └─────────────┘
│ order       │
│ createdAt   │
│ updatedAt   │
└─────────────┘
       │
       │
┌─────────────┐
│Notification │
├─────────────┤
│ _id         │
│ userId      │
│ title       │
│ body        │
│ sentAt      │
│ read        │
└─────────────┘
```

### 3.2 Chi tiết các bảng dữ liệu

#### 3.2.1 Bảng User
```typescript
interface IUser {
  _id: ObjectId;
  email: string;           // Email đăng nhập (unique)
  passwordHash: string;    // Mã hóa password
  role: 'ADMIN' | 'TEACHER' | 'STUDENT'; // Vai trò người dùng
  nickname?: string;       // Tên hiển thị
  createdAt: Date;         // Ngày tạo tài khoản
}
```

**Mục đích**: Quản lý thông tin người dùng và phân quyền
**Indexes**: 
- `email` (unique)
- `role`

#### 3.2.2 Bảng Level
```typescript
interface ILevel {
  _id: ObjectId;
  number: number;                    // Số thứ tự level (1,2,3...)
  name: string;                      // Tên level
  description?: string;              // Mô tả level
  requiredLessonsToUnlock: number;   // Số lesson cần hoàn thành để unlock
  badge?: string;                    // Badge ID khi hoàn thành level
  isActive: boolean;                 // Trạng thái hoạt động
  createdAt: Date;
  updatedAt: Date;
}
```

**Mục đích**: Quản lý các cấp độ học tập
**Indexes**: 
- `number` (unique)
- `isActive`

#### 3.2.3 Bảng Lesson
```typescript
interface ILesson {
  _id: ObjectId;
  title: string;                     // Tiêu đề bài học
  description?: string;              // Mô tả bài học
  level: number;                     // Cấp độ bài học
  order: number;                     // Thứ tự trong level
  isUnlocked: boolean;               // Trạng thái mở khóa
  isCompleted: boolean;              // Trạng thái hoàn thành
  components: {
    reading: ReadingComponent;       // Phần đọc hiểu
    listening: ListeningComponent;   // Phần nghe hiểu
    quiz: QuizComponent;            // Phần quiz
  };
  requiredScore: number;             // Điểm tối thiểu để pass
  unlockNextLesson: boolean;         // Có mở khóa bài tiếp theo
  createdAt: Date;
  updatedAt: Date;
}
```

**Mục đích**: Quản lý nội dung bài học
**Indexes**: 
- `level, order`
- `isUnlocked, isCompleted`

#### 3.2.4 Bảng UserProgress
```typescript
interface IUserProgress {
  _id: ObjectId;
  userId: string;                    // ID người dùng
  currentLevel: number;              // Level hiện tại
  currentLesson: string;             // Lesson hiện tại
  completedLessons: string[];        // Danh sách lesson đã hoàn thành
  totalScore: number;                // Tổng điểm
  streak: number;                    // Số ngày học liên tiếp
  badges: string[];                  // Danh sách badge đã đạt
  lastActiveDate: Date;              // Ngày hoạt động cuối
  totalStudyTime: number;            // Tổng thời gian học (phút)
  createdAt: Date;
  updatedAt: Date;
}
```

**Mục đích**: Theo dõi tiến trình học tập của người dùng
**Indexes**: 
- `userId` (unique)
- `currentLevel`
- `totalScore` (descending - cho leaderboard)

#### 3.2.5 Bảng Badge
```typescript
interface IBadge {
  _id: ObjectId;
  name: string;                      // Tên badge
  condition?: string;                // Điều kiện đạt badge
  icon?: string;                     // Icon badge
  users: ObjectId[];                 // Danh sách user đã đạt badge
}
```

**Mục đích**: Quản lý hệ thống huy hiệu gamification
**Indexes**: 
- `name`

#### 3.2.6 Bảng Rank
```typescript
interface IRank {
  _id: ObjectId;
  userId: ObjectId;                  // ID người dùng
  points: number;                    // Điểm số
  level: number;                     // Level hiện tại
  completedLessons: number;          // Số lesson đã hoàn thành
  updatedAt: Date;                   // Thời gian cập nhật cuối
}
```

**Mục đích**: Quản lý bảng xếp hạng
**Indexes**: 
- `userId` (unique)
- `points` (descending)
- `level` (descending)

#### 3.2.7 Bảng Quiz
```typescript
interface IQuiz {
  _id: ObjectId;
  title: string;                     // Tiêu đề quiz
  description?: string;              // Mô tả quiz
  lesson: ObjectId;                  // ID bài học liên quan
  questions: Array<{
    question: string;                // Câu hỏi
    options: string[];               // Các lựa chọn
    correctAnswer: number;           // Index đáp án đúng
    explanation?: string;            // Giải thích
  }>;
  timeLimit?: number;                // Thời gian giới hạn (phút)
  passingScore?: number;             // Điểm đạt (phần trăm)
  isActive: boolean;                 // Trạng thái hoạt động
  createdAt: Date;
  updatedAt: Date;
}
```

**Mục đích**: Quản lý các bài quiz
**Indexes**: 
- `lesson`
- `isActive`

#### 3.2.8 Bảng QuizResult
```typescript
interface IQuizResult {
  _id: ObjectId;
  user: ObjectId;                    // ID người dùng
  quiz: ObjectId;                    // ID quiz
  answers: Array<{
    questionIndex: number;           // Index câu hỏi
    selectedAnswer: number;          // Đáp án đã chọn
    isCorrect: boolean;              // Có đúng không
  }>;
  score: number;                     // Điểm số (phần trăm)
  timeSpent: number;                 // Thời gian làm bài (giây)
  passed: boolean;                   // Có đạt không
  completedAt: Date;                 // Thời gian hoàn thành
}
```

**Mục đích**: Lưu kết quả làm quiz
**Indexes**: 
- `user, quiz` (unique - compound)
- `user, completedAt` (descending)

#### 3.2.9 Bảng LessonResult
```typescript
interface ILessonResult {
  _id: ObjectId;
  userId: string;                    // ID người dùng
  lessonId: string;                  // ID bài học
  score: number;                     // Điểm số (0-100)
  isPassed: boolean;                 // Có đạt không
  timeSpent: number;                 // Thời gian hoàn thành (phút)
  answers: {
    reading: {
      highlightedWordsClicked: string[]; // Từ đã click để dịch
      timeSpent: number;
    };
    listening: {
      questions: Array<{
        questionId: string;
        userAnswer: string;
        isCorrect: boolean;
        timeSpent: number;
      }>;
      totalTimeSpent: number;
    };
    quiz: {
      questions: Array<{
        questionId: string;
        userAnswer: string;
        isCorrect: boolean;
        timeSpent: number;
      }>;
      totalTimeSpent: number;
    };
  };
  completedAt: Date;                 // Thời gian hoàn thành
  createdAt: Date;
  updatedAt: Date;
}
```

**Mục đích**: Lưu kết quả hoàn thành bài học
**Indexes**: 
- `userId, lessonId` (unique - compound)
- `userId, completedAt` (descending)
- `lessonId, score` (descending)
- `isPassed`

#### 3.2.10 Bảng Video
```typescript
interface IVideo {
  _id: ObjectId;
  title: string;                     // Tiêu đề video
  description?: string;              // Mô tả video
  lesson: ObjectId;                  // ID bài học liên quan
  videoUrl: string;                  // URL video
  thumbnailUrl?: string;             // URL thumbnail
  duration?: number;                 // Thời lượng (giây)
  transcript?: string;               // Transcript
  subtitles?: string;                // Phụ đề
  isActive: boolean;                 // Trạng thái hoạt động
  order?: number;                    // Thứ tự trong lesson
  createdAt: Date;
  updatedAt: Date;
}
```

**Mục đích**: Quản lý video học tập
**Indexes**: 
- `lesson`
- `isActive`
- `order`

#### 3.2.11 Bảng Vocab
```typescript
interface IVocab {
  _id: ObjectId;
  word: string;                      // Từ vựng
  meaning: string;                   // Nghĩa
  example?: string;                  // Ví dụ
  lesson?: ObjectId;                 // ID bài học liên quan
  level?: string;                    // Cấp độ (A1, A2, B1, B2, C1, C2)
  createdAt: Date;                   // Ngày tạo
}
```

**Mục đích**: Quản lý từ vựng
**Indexes**: 
- `word`
- `lesson`
- `level`

#### 3.2.12 Bảng Translation
```typescript
interface ITranslation {
  _id: ObjectId;
  userId?: ObjectId;                 // ID người dùng (optional)
  originalText: string;              // Văn bản gốc
  translatedText: string;            // Văn bản dịch
  sourceLanguage: string;            // Ngôn ngữ nguồn
  targetLanguage: string;            // Ngôn ngữ đích
  timestamp: Date;                   // Thời gian dịch
  isVocab?: boolean;                 // Có phải từ vựng không
  wordId?: ObjectId;                 // ID từ vựng nếu có
}
```

**Mục đích**: Lưu lịch sử dịch thuật
**Indexes**: 
- `userId, timestamp` (descending)
- `sourceLanguage, targetLanguage`

#### 3.2.13 Bảng TranslationHistory
```typescript
interface ITranslationHistory {
  _id: ObjectId;
  userId?: string;                   // ID người dùng
  originalText: string;              // Văn bản gốc
  translatedText: string;            // Văn bản dịch
  sourceLanguage: string;            // Ngôn ngữ nguồn
  targetLanguage: string;            // Ngôn ngữ đích
  translationType: 'contextual' | 'manual' | 'vocab'; // Loại dịch
  context?: string;                  // Ngữ cảnh
  wordId?: string;                   // ID từ vựng
  lessonId?: string;                 // ID bài học
  confidence?: number;               // Độ tin cậy (0-1)
  isVocab: boolean;                  // Có phải từ vựng
  timestamp: Date;                   // Thời gian
  createdAt: Date;                   // Ngày tạo
}
```

**Mục đích**: Lưu lịch sử dịch thuật chi tiết
**Indexes**: 
- `userId, timestamp` (descending)
- `lessonId`
- `wordId`
- `translationType`
- `sourceLanguage, targetLanguage`

#### 3.2.14 Bảng Notification
```typescript
interface INotification {
  _id: ObjectId;
  userId: ObjectId;                  // ID người dùng
  title: string;                     // Tiêu đề thông báo
  body: string;                      // Nội dung thông báo
  sentAt: Date;                      // Thời gian gửi
  read: boolean;                     // Đã đọc chưa
}
```

**Mục đích**: Quản lý thông báo
**Indexes**: 
- `userId`
- `sentAt` (descending)
- `read`

---

## 4. CÁC BẢNG CẦN BỔ SUNG

Dựa trên phân tích use case, cần bổ sung các bảng sau:

### 4.1 Bảng Challenge (Thử thách tuần)
```typescript
interface IChallenge {
  _id: ObjectId;
  title: string;                     // Tiêu đề thử thách
  description: string;               // Mô tả thử thách
  type: 'weekly' | 'monthly' | 'special'; // Loại thử thách
  startDate: Date;                   // Ngày bắt đầu
  endDate: Date;                     // Ngày kết thúc
  requirements: {
    minLessons?: number;             // Số lesson tối thiểu
    minScore?: number;               // Điểm tối thiểu
    minStreak?: number;              // Streak tối thiểu
  };
  rewards: {
    points: number;                  // Điểm thưởng
    badges?: string[];               // Badge thưởng
  };
  participants: ObjectId[];          // Danh sách tham gia
  isActive: boolean;                 // Trạng thái hoạt động
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.2 Bảng QuestionBank (Ngân hàng câu hỏi)
```typescript
interface IQuestionBank {
  _id: ObjectId;
  question: string;                  // Câu hỏi
  type: 'multiple_choice' | 'fill_in_blank' | 'true_false'; // Loại câu hỏi
  options?: string[];                // Các lựa chọn (cho multiple choice)
  correctAnswer: string;             // Đáp án đúng
  explanation: string;               // Giải thích
  difficulty: 'easy' | 'medium' | 'hard'; // Độ khó
  category: string;                  // Danh mục
  tags: string[];                    // Tags
  createdBy: ObjectId;               // Người tạo
  isActive: boolean;                 // Trạng thái hoạt động
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.3 Bảng Tower & Floor (Tháp và tầng)
```typescript
interface ITower {
  _id: ObjectId;
  name: string;                      // Tên tháp
  description: string;               // Mô tả tháp
  totalFloors: number;               // Tổng số tầng
  isActive: boolean;                 // Trạng thái hoạt động
  createdAt: Date;
  updatedAt: Date;
}

interface IFloor {
  _id: ObjectId;
  towerId: ObjectId;                 // ID tháp
  floorNumber: number;               // Số tầng
  name: string;                      // Tên tầng
  description: string;               // Mô tả tầng
  requirements: {
    minLevel?: number;               // Level tối thiểu
    minScore?: number;               // Điểm tối thiểu
    completedLessons?: number;       // Số lesson đã hoàn thành
  };
  rewards: {
    points: number;                  // Điểm thưởng
    badges?: string[];               // Badge thưởng
  };
  isUnlocked: boolean;               // Trạng thái mở khóa
  isActive: boolean;                 // Trạng thái hoạt động
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.4 Bảng Season & SeasonRank (Mùa và xếp hạng mùa)
```typescript
interface ISeason {
  _id: ObjectId;
  name: string;                      // Tên mùa
  description: string;               // Mô tả mùa
  startDate: Date;                   // Ngày bắt đầu
  endDate: Date;                     // Ngày kết thúc
  isActive: boolean;                 // Trạng thái hoạt động
  createdAt: Date;
  updatedAt: Date;
}

interface ISeasonRank {
  _id: ObjectId;
  seasonId: ObjectId;                // ID mùa
  userId: ObjectId;                  // ID người dùng
  points: number;                    // Điểm số trong mùa
  rank: number;                      // Thứ hạng
  completedChallenges: number;       // Số thử thách hoàn thành
  updatedAt: Date;                   // Thời gian cập nhật cuối
}
```

### 4.5 Bảng AntiCheat (Chống gian lận)
```typescript
interface IAntiCheat {
  _id: ObjectId;
  userId: ObjectId;                  // ID người dùng
  activityType: 'quiz' | 'lesson' | 'challenge'; // Loại hoạt động
  suspiciousActions: Array<{
    action: string;                  // Hành động đáng nghi
    timestamp: Date;                 // Thời gian
    details: any;                    // Chi tiết
  }>;
  riskScore: number;                 // Điểm rủi ro (0-100)
  status: 'pending' | 'investigating' | 'resolved' | 'banned'; // Trạng thái
  adminNotes?: string;               // Ghi chú admin
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.6 Bảng SystemConfig (Cấu hình hệ thống)
```typescript
interface ISystemConfig {
  _id: ObjectId;
  key: string;                       // Khóa cấu hình
  value: any;                        // Giá trị
  description: string;               // Mô tả
  category: string;                  // Danh mục
  isActive: boolean;                 // Trạng thái hoạt động
  updatedBy: ObjectId;               // Người cập nhật
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.7 Bảng GamificationConfig (Cấu hình gamification)
```typescript
interface IGamificationConfig {
  _id: ObjectId;
  configType: 'badge' | 'ranking' | 'tower' | 'challenge'; // Loại cấu hình
  configData: any;                   // Dữ liệu cấu hình
  isActive: boolean;                 // Trạng thái hoạt động
  updatedBy: ObjectId;               // Người cập nhật
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.8 Bảng ContentModeration (Kiểm duyệt nội dung)
```typescript
interface IContentModeration {
  _id: ObjectId;
  contentType: 'lesson' | 'quiz' | 'video' | 'vocab'; // Loại nội dung
  contentId: ObjectId;               // ID nội dung
  status: 'pending' | 'approved' | 'rejected' | 'flagged'; // Trạng thái
  flaggedBy?: ObjectId;              // Người báo cáo
  reviewedBy?: ObjectId;             // Người duyệt
  reviewNotes?: string;              // Ghi chú duyệt
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 5. QUAN HỆ GIỮA CÁC BẢNG

### 5.1 Quan hệ 1-N (One-to-Many)
- User → UserProgress (1:1)
- User → LessonResult (1:N)
- User → QuizResult (1:N)
- User → Notification (1:N)
- User → TranslationHistory (1:N)
- Level → Lesson (1:N)
- Lesson → Quiz (1:N)
- Lesson → Video (1:N)
- Lesson → Vocab (1:N)
- Lesson → LessonResult (1:N)
- Quiz → QuizResult (1:N)
- Badge → User (N:M qua UserProgress.badges)

### 5.2 Quan hệ N-M (Many-to-Many)
- User ↔ Badge (qua UserProgress.badges)
- User ↔ Challenge (qua Challenge.participants)
- User ↔ Floor (qua UserProgress và Floor requirements)

### 5.3 Quan hệ tham chiếu
- UserProgress.currentLesson → Lesson
- UserProgress.badges → Badge
- LessonResult.answers.reading.highlightedWordsClicked → Vocab
- TranslationHistory.wordId → Vocab
- TranslationHistory.lessonId → Lesson

---

## 6. INDEXES VÀ TỐI ƯU HÓA

### 6.1 Indexes chính
```javascript
// User
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })

// Level
db.levels.createIndex({ "number": 1 }, { unique: true })
db.levels.createIndex({ "isActive": 1 })

// Lesson
db.lessons.createIndex({ "level": 1, "order": 1 })
db.lessons.createIndex({ "isUnlocked": 1, "isCompleted": 1 })

// UserProgress
db.userprogress.createIndex({ "userId": 1 }, { unique: true })
db.userprogress.createIndex({ "currentLevel": 1 })
db.userprogress.createIndex({ "totalScore": -1 })

// Rank
db.ranks.createIndex({ "userId": 1 }, { unique: true })
db.ranks.createIndex({ "points": -1 })
db.ranks.createIndex({ "level": -1 })

// QuizResult
db.quizresults.createIndex({ "user": 1, "quiz": 1 }, { unique: true })
db.quizresults.createIndex({ "user": 1, "completedAt": -1 })

// LessonResult
db.lessonresults.createIndex({ "userId": 1, "lessonId": 1 }, { unique: true })
db.lessonresults.createIndex({ "userId": 1, "completedAt": -1 })
db.lessonresults.createIndex({ "lessonId": 1, "score": -1 })

// TranslationHistory
db.translationhistories.createIndex({ "userId": 1, "timestamp": -1 })
db.translationhistories.createIndex({ "lessonId": 1 })
db.translationhistories.createIndex({ "wordId": 1 })
db.translationhistories.createIndex({ "translationType": 1 })

// Notification
db.notifications.createIndex({ "userId": 1 })
db.notifications.createIndex({ "sentAt": -1 })
db.notifications.createIndex({ "read": 1 })
```

### 6.2 Compound Indexes
```javascript
// Cho leaderboard
db.userprogress.createIndex({ "currentLevel": 1, "totalScore": -1 })

// Cho báo cáo tiến trình
db.lessonresults.createIndex({ "userId": 1, "completedAt": -1, "isPassed": 1 })

// Cho thống kê quiz
db.quizresults.createIndex({ "quiz": 1, "completedAt": -1, "passed": 1 })
```

---

## 7. QUY TẮC NGHIỆP VỤ

### 7.1 Quy tắc User
- Email phải unique
- Role mặc định là 'STUDENT'
- Password phải được hash trước khi lưu

### 7.2 Quy tắc Level & Lesson
- Level phải có số thứ tự unique
- Lesson phải có level và order
- Lesson chỉ unlock khi đạt yêu cầu của level trước

### 7.3 Quy tắc UserProgress
- Mỗi user chỉ có 1 UserProgress record
- Tự động cập nhật khi hoàn thành lesson/quiz
- Tự động tính toán streak dựa trên lastActiveDate

### 7.4 Quy tắc Badge & Rank
- Badge được cấp tự động khi đạt điều kiện
- Rank được cập nhật realtime khi có thay đổi điểm số
- Leaderboard được tính toán dựa trên totalScore

### 7.5 Quy tắc Quiz & LessonResult
- QuizResult unique cho mỗi cặp (user, quiz)
- LessonResult unique cho mỗi cặp (user, lesson)
- Điểm số được tính tự động dựa trên câu trả lời

---

## 8. BẢO MẬT VÀ PHÂN QUYỀN

### 8.1 Phân quyền theo Role
- **STUDENT**: Chỉ đọc/ghi dữ liệu của bản thân
- **TEACHER**: Đọc/ghi dữ liệu học sinh, quản lý nội dung
- **ADMIN**: Toàn quyền truy cập hệ thống

### 8.2 Bảo mật dữ liệu
- Password được hash bằng bcrypt
- JWT token cho authentication
- API endpoints được bảo vệ bằng middleware
- Dữ liệu nhạy cảm được mã hóa

### 8.3 Anti-cheat
- Theo dõi thời gian làm bài
- Phát hiện hành vi bất thường
- Ghi log các hoạt động đáng nghi
- Tự động flag và báo cáo

---

## 9. BACKUP VÀ RECOVERY

### 9.1 Backup Strategy
- Daily backup toàn bộ database
- Weekly backup với retention 4 tuần
- Monthly backup với retention 12 tháng
- Real-time replication cho production

### 9.2 Recovery Plan
- Point-in-time recovery
- Disaster recovery procedures
- Data validation sau recovery
- Testing backup integrity

---

## 10. MONITORING VÀ PERFORMANCE

### 10.1 Monitoring
- Database performance metrics
- Query execution time
- Index usage statistics
- Connection pool monitoring

### 10.2 Performance Optimization
- Query optimization
- Index tuning
- Connection pooling
- Caching strategy

---

## 11. KẾT LUẬN

Thiết kế cơ sở dữ liệu này đáp ứng đầy đủ các yêu cầu từ use case diagram và hỗ trợ tất cả chức năng của hệ thống học tiếng Anh gamification. Cấu trúc dữ liệu được thiết kế để:

1. **Mở rộng**: Dễ dàng thêm tính năng mới
2. **Hiệu suất**: Tối ưu cho các truy vấn thường xuyên
3. **Bảo mật**: Đảm bảo an toàn dữ liệu người dùng
4. **Gamification**: Hỗ trợ đầy đủ các tính năng game hóa
5. **Báo cáo**: Dễ dàng tạo báo cáo và thống kê

Hệ thống sẵn sàng cho việc triển khai và có thể mở rộng theo nhu cầu phát triển trong tương lai.
