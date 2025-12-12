import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, Select, Input, message } from "antd";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

interface Submission {
  _id: string;
  userId?: { email: string; nickname: string };
  sectionId?: { title: string; skill: string };
  setId?: { title: string; examType: string };
  score: number;
  total: number;
  analytics?: { accuracy?: number };
  createdAt: string;
}

const PracticeSubmissions: React.FC = () => {
  const [data, setData] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    skill: "",
    sectionId: searchParams.get("sectionId") || "",
    userId: "",
  });

  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v2/practice/submissions", {
        params: filters,
      });
      const submissions = res.data || [];
      
      // ✅ Chỉ hiển thị submission mới nhất của mỗi học viên cho mỗi section
      const latestSubmissionsMap = new Map<string, Submission>();
      submissions.forEach((sub: Submission) => {
        const userId = typeof sub.userId === 'object' && sub.userId?._id 
          ? sub.userId._id 
          : typeof sub.userId === 'string' 
          ? sub.userId 
          : '';
        const sectionId = typeof sub.sectionId === 'object' && sub.sectionId?._id
          ? sub.sectionId._id
          : typeof sub.sectionId === 'string'
          ? sub.sectionId
          : '';
        const key = `${userId}-${sectionId}`;
        const existing = latestSubmissionsMap.get(key);
        if (!existing || new Date(sub.createdAt) > new Date(existing.createdAt)) {
          latestSubmissionsMap.set(key, sub);
        }
      });
      
      setData(Array.from(latestSubmissionsMap.values()));
    } catch (err) {
      console.error(err);
      message.error("Không tải được danh sách bài nộp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const columns = [
    {
      title: "Học viên",
      dataIndex: ["userId", "nickname"],
      render: (_: any, r: Submission) => r.userId?.nickname || "—",
    },
    {
      title: "Đề thi / Bộ đề",
      render: (r: Submission) => (
        <>
          <b>{r.setId?.title}</b>
          <div className="text-xs text-gray-500">{r.sectionId?.title}</div>
        </>
      ),
    },
    {
      title: "Kỹ năng",
      dataIndex: ["sectionId", "skill"],
      render: (v: string) => (
        <Tag color={v === "reading" ? "blue" : v === "listening" ? "green" : "orange"}>
          {v?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Điểm",
      render: (r: Submission) => (
        <>
          <b>{r.score}</b> / {r.total}
          {r.analytics?.accuracy != null && (
            <span style={{ marginLeft: 6, color: "#999" }}>
              ({(r.analytics.accuracy * 100).toFixed(0)}%)
            </span>
          )}
        </>
      ),
    },
    {
      title: "Ngày nộp",
      dataIndex: "createdAt",
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: "Thao tác",
      render: (r: Submission) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/teacher/practice/submission/${r._id}`)}
        >
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 className="text-xl font-semibold mb-3">📋 Danh sách bài nộp</h2>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Chọn kỹ năng"
          style={{ width: 150 }}
          allowClear
          onChange={(v) => setFilters({ ...filters, skill: v || "" })}
          options={[
            { label: "Listening", value: "listening" },
            { label: "Reading", value: "reading" },
            { label: "Writing", value: "writing" },
            { label: "Speaking", value: "speaking" },
          ]}
        />
        <Input
          placeholder="User ID hoặc tên"
          style={{ width: 200 }}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>
          Làm mới
        </Button>
      </Space>

      <Table
        rowKey="_id"
        dataSource={data}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default PracticeSubmissions;
