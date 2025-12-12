import { Request, Response } from "express";
import User from "../models/User";
import Lesson from "../models/Lesson";
import Quiz from "../models/Quiz";
import Video from "../models/Video";
import Rank from "../models/Rank";
import Badge from "../models/Badge";
import { AuthRequest } from "../middleware/auth";
import UserProgress from "../models/UserProgress"; // Thêm import nếu chưa có

/**
 * 👑 Admin xem báo cáo toàn hệ thống
 * - Tổng số học viên, giảng viên, bài học, điểm trung bình
 */
export const getAdminReport = async (_req: Request, res: Response) => {
  try {
    const studentCount = await User.countDocuments({ role: "STUDENT" });
    const teacherCount = await User.countDocuments({ role: "TEACHER" });
    const lessonCount = await Lesson.countDocuments();
    const quizCount = await Quiz.countDocuments();
    const videoCount = await Video.countDocuments();

    const avgPoints =
      (await Rank.aggregate([{ $group: { _id: null, avg: { $avg: "$points" } } }]))[0]?.avg || 0;

    res.json({
      studentCount,
      teacherCount,
      lessonCount,
      quizCount,
      videoCount,
      avgPoints: Math.round(avgPoints),
      lessons: lessonCount,
      quizzes: quizCount,
      videos: videoCount,
      recentActivity: []
    });
  } catch (err) {
    console.error("getAdminReport error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 👩‍🏫 Teacher xem báo cáo lớp học / học viên của mình
 * - Tổng bài học do mình tạo, số học viên, thứ tự bài học trung bình
 */
export const getTeacherReport = async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.sub;
    if (!teacherId) return res.status(401).json({ message: "Unauthorized" });

    // Giả sử mỗi Lesson có trường createdBy = id của giáo viên tạo
    const lessons = await Lesson.find({ createdBy: teacherId }).lean();

    const totalLessons = lessons.length;
    const studentCount = await User.countDocuments({ role: "STUDENT" });
    const avgLessonOrder =
      lessons.reduce((sum, l) => sum + (l.order || 0), 0) / (lessons.length || 1);

    res.json({
      teacherId,
      totalLessons,
      studentCount,
      avgLessonOrder: Math.round(avgLessonOrder),
    });
  } catch (err) {
    console.error("getTeacherReport error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 👩‍🏫 Teacher xem tiến trình cụ thể của một học viên
 * - Thông tin học viên, điểm, tầng (level), huy hiệu đạt được
 * Route: GET /api/reports/student/:id
 */
export const getStudentProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("email nickname role");
    if (!user) return res.status(404).json({ message: "Student not found" });

    const rank = await Rank.findOne({ userId: id }).lean();
    const badges = await Badge.find({ users: id }).select("name");

    res.json({
      user,
      progress: rank || { points: 0, level: 1, completedLessons: 0 },
      badges,
    });
  } catch (err) {
    console.error("getStudentProgress error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 👨‍🎓 Student xem tiến trình của chính mình
 * - Không cần truyền ID, lấy từ token JWT
 * Route: GET /api/reports/me
 */
export const getStudentProgressSelf = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("email nickname role");
    const rank = await Rank.findOne({ userId });
    const badges = await Badge.find({ users: userId }).select("name");

    res.json({
      user,
      progress: rank || { points: 0, level: 1, completedLessons: 0 },
      badges,
    });
  } catch (err) {
    console.error("getStudentProgressSelf error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 👥 TEACHER xem danh sách học viên và tiến trình
 * - Thêm hàm mới để trả về danh sách students với progress
 */
export const getTeacherStudents = async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.sub;
    if (!teacherId) return res.status(401).json({ message: "Unauthorized" });

    // Lấy danh sách tất cả students (chỉ STUDENT role)
    const allStudents = await User.find({ role: 'STUDENT' })
      .select('email nickname createdAt')
      .lean();

    // Lấy tiến trình của từng student
    const studentsWithProgress = await Promise.all(
      allStudents.map(async (student: any) => {
        const userProgress: any = await UserProgress.findOne({ userId: student._id }).lean();
        
        // Lấy rank thông tin
        const rank: any = await Rank.findOne({ userId: student._id }).lean();
        
        // Đếm completed lessons
        const completedLessons = userProgress?.completedLessons?.length || 0;
        const completedTopics = userProgress?.completedTopics?.length || 0;
        
        // Tính tổng điểm
        const totalScore = rank?.points || 0;
        const level = rank?.level || 1;

        return {
          userId: student._id,
          email: student.email || 'N/A',
          name: student.nickname || 'Student',
          completedLessons,
          completedTopics,
          totalScore,
          totalStudyTime: userProgress?.totalStudyTime || 0,
          level,
          points: totalScore
        };
      })
    );

    res.json({ students: studentsWithProgress });
  } catch (err) {
    console.error("getTeacherStudents error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};
