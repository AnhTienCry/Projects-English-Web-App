// lib/config/api_config.dart
import 'package:english_app_mobile/config/network_config.dart';

class ApiConfig {
  static String get baseUrl => NetworkConfig.baseUrl;

  // ====== Endpoints ======
  static const String loginEndpoint = '/api/auth/login';
  static const String registerEndpoint = '/api/auth/register';
  static const String refreshEndpoint = '/api/auth/refresh';

  static const String profileEndpoint = '/api/protected/me';
  static const String progressionEndpoint = '/api/progressions/me';
  static const String initializeProgressEndpoint =
      '/api/progressions/initialize';

  static const String lessonsEndpoint = '/api/lessons';
  static const String publishedLessonsEndpoint = '/api/lessons/published';
  static const String topicsByLessonEndpoint = '/api/topics'; // + /:lessonId
  static const String vocabByTopicEndpoint = '/api/vocab/topic'; // + /:topicId
  static const String quizByTopicEndpoint = '/api/quizzes/topic'; // + /:topicId

  static const String vocabEndpoint = '/api/vocab';
  static const String quizzesEndpoint = '/api/quizzes';
  static const String storiesEndpoint = '/api/stories';

  static const String videosEndpoint = '/api/videos';
  static const String markVideoViewedEndpoint =
      '/api/videos'; // + /:id/mark-viewed
  static const String addSubtitlesEndpoint = '/api/videos'; // + /:id/subtitles
  static const String addWordDefinitionEndpoint = '/api/videos'; // + /:id/words
  static const String getWordDefinitionEndpoint =
      '/api/videos/words'; // + /:word
  // Download endpoints have been removed

  static const String translationEndpoint = '/api/translation';
  static const String badgesEndpoint = '/api/badges';
  static const String ranksEndpoint = '/api/ranks';
  static const String notificationsEndpoint = '/api/notifications';
  static const String rankUpdateEndpoint = '/api/rank/progress'; // POST
  static const String leaderboardEndpoint = '/api/progressions/leaderboard';
  static const String completeTopicEndpoint = '/api/progressions/complete-topic'; // POST
  static const String topicStatusEndpoint = '/api/progressions/topic-status'; // GET /api/progressions/topic-status/:lessonId
  
  // Quiz Rank endpoints
  static const String quizRankEndpoint = '/api/quiz-rank'; // GET /api/quiz-rank?lessonId=xxx
  static const String quizRankLessonsEndpoint = '/api/quiz-rank/lessons'; // GET /api/quiz-rank/lessons
}
