import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import TeacherLayout from './components/layout/TeacherLayout';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import './utils/light-theme.css';

// 🌍 Public pages
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

// 👩‍💼 Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminLessons from './pages/admin/Lessons';
import AdminLessonDetail from './pages/admin/LessonDetail';
import AdminTopics from './pages/admin/Topics';
import AdminTopicDetail from './pages/admin/TopicDetail';
import AdminUsers from './pages/admin/Users';
import AdminReports from './pages/admin/Reports';
import AdminVideos from './pages/admin/Videos';
import AdminQuizzes from './pages/admin/Quizzes';
import AdminVocabularies from './pages/admin/Vocabularies';
import AdminStudentDetail from './pages/admin/StudentDetail';
import AdminStories from './pages/admin/AdminStories';
import AdminQuizRank from './pages/admin/QuizRank';

// 👨‍🏫 Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherLessons from './pages/teacher/Lessons';
import TeacherLessonDetail from './pages/teacher/LessonDetail';
import TeacherTopics from './pages/teacher/Topics';
import TeacherTopicDetail from './pages/teacher/TopicDetail';
import TeacherQuizImport from './pages/teacher/QuizImport';
import TeacherVocabImport from './pages/teacher/VocabImport';
import TeacherStudents from './pages/teacher/Students';
import TeacherQuizzes from './pages/teacher/Quizzes';
import TeacherVideos from './pages/teacher/Videos';
import TeacherVocabularies from './pages/teacher/Vocabularies';
import TeacherReports from './pages/teacher/Reports';
import LessonResults from './pages/teacher/LessonResults';
import StudentDetail from './pages/teacher/StudentDetail';
import TeacherStories from './pages/teacher/TeacherStories';
import TeacherQuizRank from './pages/teacher/QuizRank';

// 🧠 Practice pages
import PracticeSets from './pages/teacher/PracticeSets';
import PracticeItems from './pages/teacher/PracticeItems';
import PracticePreview from './pages/teacher/PracticePreview';
import PracticeSections from './pages/teacher/PracticeSections';
import PracticeSubmissions from './pages/teacher/PracticeSubmissions';
import PracticeSubmissionDetail from './pages/teacher/PracticeSubmissionDetail';

// 🧠 Common components
import ProgressManagement from './components/common/ProgressManagement';
import NotFound from './components/notfound/NotFound';



const router = createBrowserRouter([
  // 🌍 Public routes
  { path: '/', element: <Home /> },
  { path: '/home', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },

  // 👩‍💼 Admin routes
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'lessons', element: <AdminLessons /> },
      { path: 'lessons/:id', element: <AdminLessonDetail /> },
      { path: 'topics', element: <AdminTopics /> },
      { path: 'topics/:id', element: <AdminTopicDetail /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'students/:userId', element: <AdminStudentDetail /> },
      { path: 'reports', element: <AdminReports /> },
      { path: 'videos', element: <AdminVideos /> },
      { path: 'quizzes', element: <AdminQuizzes /> },
      { path: 'vocabularies', element: <AdminVocabularies /> },
      { path: 'stories', element: <AdminStories /> },
      { path: 'quiz-rank', element: <AdminQuizRank /> },
    ],
  },

  // 👨‍🏫 Teacher routes
  {
    path: '/teacher',
    element: <TeacherLayout />,
    children: [
      { index: true, element: <TeacherDashboard /> },
      { path: 'dashboard', element: <TeacherDashboard /> },
      { path: 'lessons', element: <TeacherLessons /> },
      { path: 'lessons/:id', element: <TeacherLessonDetail /> },
      { path: 'topics', element: <TeacherTopics /> },
      { path: 'topics/:id', element: <TeacherTopicDetail /> },
      { path: 'quiz/import', element: <TeacherQuizImport /> },
      { path: 'vocab/import', element: <TeacherVocabImport /> },
      { path: 'students', element: <TeacherStudents /> },
      { path: 'students/:userId', element: <StudentDetail /> },
      { path: 'lessons/:lessonId/results', element: <LessonResults /> },
      { path: 'quizzes', element: <TeacherQuizzes /> },
      { path: 'videos', element: <TeacherVideos /> },
      { path: 'vocabularies', element: <TeacherVocabularies /> },
      { path: 'reports', element: <TeacherReports /> },
      { path: 'progress', element: <ProgressManagement /> },
      { path: 'stories', element: <TeacherStories /> },
      { path: 'quiz-rank', element: <TeacherQuizRank /> },
      // 🔥 Practice flow: Set → Section → Item → Preview
      { path: 'practice', element: <PracticeSets /> },
      { path: 'practice/:setId/sections', element: <PracticeSections /> },
      { path: 'practice/sections/:sectionId/items', element: <PracticeItems /> },
      { path: 'practice/preview/:setId', element: <PracticePreview /> },

      // 🧾 Bài nộp & chi tiết chấm điểm
      { path: 'practice/submissions', element: <PracticeSubmissions /> },
      { path: 'practice/submission/:id', element: <PracticeSubmissionDetail /> },
    ],
  },


  // 🚫 Not Found
  { path: '*', element: <NotFound /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);
