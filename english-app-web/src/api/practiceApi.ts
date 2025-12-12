// API cho Practice module (khớp backend: /api/v2/practice + /api/upload)
import http from "./http";

// ---- Sets
export const listPracticeSets = () =>
  http.get("/api/v2/practice/sets");

export const createPracticeSet = (data: { examType: "ielts"|"toeic"; title: string }) =>
  http.post("/api/v2/practice/sets", data);

export const deletePracticeSet = (id: string) =>
  http.delete(`/api/v2/practice/sets/${id}`);

export const getPracticeSet = (id: string) =>
  http.get(`/api/v2/practice/sets/${id}`);

// ---- Sections
export const listSections = (setId: string) =>
  http.get(`/api/v2/practice/sets/${setId}/sections`);

export const getSection = (sectionId: string) =>
  http.get(`/api/v2/practice/sections/${sectionId}`);

export const updateSection = (sectionId: string, data: any) =>
  http.patch(`/api/v2/practice/sections/${sectionId}`, data);

// ---- Items
export const listItems = (sectionId: string) =>
  http.get(`/api/v2/practice/sections/${sectionId}/items`);

export const addItem = (sectionId: string, data: any) =>
  http.post(`/api/v2/practice/sections/${sectionId}/items`, data);

export const updateItem = (itemId: string, data: any) =>
  http.put(`/api/v2/practice/items/${itemId}`, data);

export const deleteItem = (itemId: string) =>
  http.delete(`/api/v2/practice/items/${itemId}`);


// ---- Upload (audio)
export const uploadAudio = async (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await http.post("/api/upload/audio", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as { url: string };
};


