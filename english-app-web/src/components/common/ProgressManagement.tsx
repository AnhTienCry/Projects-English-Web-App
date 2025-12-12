import { useState, useEffect } from 'react';
import api from '../../api/http';

interface StudentProgress {
  user: {
    id: string;
    email: string;
    nickname?: string;
    createdAt: string;
  };
  completedLessons: number;
  quizAttempts: number;
  averageScore: number;
  videosWatched: number;
}

interface UserProgress {
  user: {
    id: string;
    email: string;
    nickname?: string;
    role: string;
  };
  lessonProgress: any[];
  quizAttempts: any[];
  videoProgress: any[];
  stats: {
    totalLessons: number;
    completedLessons: number;
    lessonsInProgress: number;
    totalQuizAttempts: number;
    averageQuizScore: number;
    videosWatched: number;
  };
}

export default function ProgressManagement() {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllProgress();
  }, []);

  const fetchAllProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/reports/progress/all');
      setStudents(data.students);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to fetch progress');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/reports/progress/users/${userId}`);
      setSelectedUser(data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to fetch user progress');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatScore = (score: number) => {
    return score.toFixed(1);
  };

  return (
    <div style={{ maxWidth: 1400, margin: '40px auto', fontFamily: 'system-ui', padding: '0 20px' }}>
      <h1 style={{ marginBottom: 30 }}>Student Progress Dashboard</h1>

      {error && (
        <div style={{ padding: 15, backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 5, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && !selectedUser && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p>Loading...</p>
        </div>
      )}

      {!selectedUser ? (
        <div>
          <h2 style={{ marginBottom: 20 }}>All Students</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: 10 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: 15, textAlign: 'left' }}>Student</th>
                  <th style={{ padding: 15, textAlign: 'center' }}>Email</th>
                  <th style={{ padding: 15, textAlign: 'center' }}>Completed Lessons</th>
                  <th style={{ padding: 15, textAlign: 'center' }}>Quiz Attempts</th>
                  <th style={{ padding: 15, textAlign: 'center' }}>Avg Score</th>
                  <th style={{ padding: 15, textAlign: 'center' }}>Videos Watched</th>
                  <th style={{ padding: 15, textAlign: 'center' }}>Joined Date</th>
                  <th style={{ padding: 15, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={student.user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: 15 }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {student.user.nickname || 'Student ' + (idx + 1)}
                      </div>
                    </td>
                    <td style={{ padding: 15, textAlign: 'center' }}>{student.user.email}</td>
                    <td style={{ padding: 15, textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#d4edda',
                          color: '#155724',
                          borderRadius: 15,
                          fontWeight: 'bold'
                        }}
                      >
                        {student.completedLessons}
                      </span>
                    </td>
                    <td style={{ padding: 15, textAlign: 'center' }}>{student.quizAttempts}</td>
                    <td style={{ padding: 15, textAlign: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: student.averageScore >= 70 ? '#28a745' : '#dc3545' }}>
                        {formatScore(student.averageScore)}
                      </span>
                    </td>
                    <td style={{ padding: 15, textAlign: 'center' }}>{student.videosWatched}</td>
                    <td style={{ padding: 15, textAlign: 'center', fontSize: 14, color: '#666' }}>
                      {formatDate(student.user.createdAt)}
                    </td>
                    <td style={{ padding: 15, textAlign: 'center' }}>
                      <button
                        onClick={() => fetchUserProgress(student.user.id)}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: 5,
                          cursor: 'pointer'
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {students.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
              <p>No students found</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedUser(null)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              marginBottom: 20
            }}
          >
            ← Back to List
          </button>

          <div style={{ backgroundColor: '#f8f9fa', padding: 30, borderRadius: 10, marginBottom: 30 }}>
            <h2>{selectedUser.user.nickname || selectedUser.user.email}</h2>
            <p style={{ color: '#666' }}>Email: {selectedUser.user.email}</p>
            <p style={{ color: '#666' }}>Role: {selectedUser.user.role}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
            <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>Total Lessons</h3>
              <p style={{ fontSize: 32, fontWeight: 'bold', color: '#007bff' }}>{selectedUser.stats.totalLessons}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>Completed</h3>
              <p style={{ fontSize: 32, fontWeight: 'bold', color: '#28a745' }}>{selectedUser.stats.completedLessons}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>In Progress</h3>
              <p style={{ fontSize: 32, fontWeight: 'bold', color: '#ffc107' }}>{selectedUser.stats.lessonsInProgress}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>Quiz Attempts</h3>
              <p style={{ fontSize: 32, fontWeight: 'bold', color: '#17a2b8' }}>{selectedUser.stats.totalQuizAttempts}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>Avg Quiz Score</h3>
              <p style={{ fontSize: 32, fontWeight: 'bold', color: '#dc3545' }}>
                {formatScore(selectedUser.stats.averageQuizScore)}
              </p>
            </div>
            <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>Videos Watched</h3>
              <p style={{ fontSize: 32, fontWeight: 'bold', color: '#6f42c1' }}>{selectedUser.stats.videosWatched}</p>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 10, marginBottom: 30 }}>
            <h3 style={{ marginBottom: 20 }}>Lesson Progress</h3>
            {selectedUser.lessonProgress.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: 12, textAlign: 'left' }}>Lesson</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Progress</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Completed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.lessonProgress.map((lp) => (
                      <tr key={lp.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: 12 }}>{lp.lesson.title}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <div style={{ width: '100%', backgroundColor: '#e9ecef', borderRadius: 10, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${lp.progress}%`,
                                backgroundColor: lp.isCompleted ? '#28a745' : '#007bff',
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 12,
                                fontWeight: 'bold'
                              }}
                            >
                              {lp.progress}%
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              backgroundColor: lp.isCompleted ? '#d4edda' : '#fff3cd',
                              color: lp.isCompleted ? '#155724' : '#856404',
                              borderRadius: 15,
                              fontSize: 12,
                              fontWeight: 'bold'
                            }}
                          >
                            {lp.isCompleted ? 'Completed' : 'In Progress'}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center', fontSize: 14, color: '#666' }}>
                          {lp.completedAt ? formatDate(lp.completedAt) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#666', textAlign: 'center', padding: 20 }}>No lesson progress yet</p>
            )}
          </div>

          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 10 }}>
            <h3 style={{ marginBottom: 20 }}>Recent Quiz Attempts</h3>
            {selectedUser.quizAttempts.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: 12, textAlign: 'left' }}>Quiz</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Score</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Percentage</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Time Spent</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Completed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.quizAttempts.map((attempt) => {
                      const percentage = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;
                      return (
                        <tr key={attempt.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: 12 }}>{attempt.quiz.title}</td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            {attempt.score} / {attempt.maxScore}
                          </td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: percentage >= 70 ? '#28a745' : '#dc3545' }}>
                              {percentage}%
                            </span>
                          </td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            {attempt.timeSpent ? Math.floor(attempt.timeSpent / 60) + 'm ' + (attempt.timeSpent % 60) + 's' : '-'}
                          </td>
                          <td style={{ padding: 12, textAlign: 'center', fontSize: 14, color: '#666' }}>
                            {attempt.completedAt ? formatDate(attempt.completedAt) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#666', textAlign: 'center', padding: 20 }}>No quiz attempts yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}








