const API_URL = process.env.API_URL || "http://127.0.0.1:8787";

const checks = [
  ["/api/health", (data) => data.ok === true],
  ["/api/opportunities", (data) => Array.isArray(data) && data.length >= 1],
  ["/api/interviews", (data) => Array.isArray(data) && data.length >= 1],
  ["/api/answers", (data) => Array.isArray(data) && data.length >= 1],
  ["/api/resumes", (data) => Array.isArray(data) && data.length >= 1],
  ["/api/weekly-plan/current", (data) => data && typeof data.targetApplications === "number"],
  ["/api/dashboard/summary", (data) => data && typeof data.opportunityCount === "number"],
  ["/api/dashboard/today-actions", (data) => Array.isArray(data) && data.length >= 1],
];

for (const [path, validate] of checks) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  const data = await response.json();
  if (!validate(data)) {
    throw new Error(`${path} returned unexpected payload`);
  }
  console.log(`PASS ${path}`);
}

const existingResumes = await fetch(`${API_URL}/api/resumes`).then((response) => response.json());
const tempOpportunity = {
  id: `OP-CHECK-${Date.now()}`,
  title: "API check temporary opportunity",
  company: "API check temporary company",
  status: "TO APPLY",
  priority: "B",
  match: "MEDIUM",
  action: "P2",
  city: "Test City",
  deadline: "Today",
  resumeId: existingResumes[0]?.id ?? "",
  nextAction: "temporary next action",
  jdSummary: "temporary",
  jdText: "temporary",
  sourceAssets: [
    {
      id: `SRC-CHECK-${Date.now()}`,
      kind: "jd-text",
      title: "API check JD",
      detail: "temporary",
      createdAt: "Now",
      content: "temporary",
    },
  ],
  timeline: [
    {
      id: `TL-CHECK-${Date.now()}`,
      occurredAt: "Now",
      title: "API check created",
      detail: "temporary",
      status: "done",
    },
  ],
};

const createdOpportunity = await fetch(`${API_URL}/api/opportunities`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(tempOpportunity),
});
if (!createdOpportunity.ok) throw new Error(`POST /api/opportunities returned ${createdOpportunity.status}`);
const createdOpportunityPayload = await createdOpportunity.json();
if (createdOpportunityPayload.id !== tempOpportunity.id || createdOpportunityPayload.sourceAssets.length !== 1) {
  throw new Error("POST /api/opportunities returned unexpected opportunity");
}
console.log("PASS POST /api/opportunities");

const fetchedOpportunity = await fetch(`${API_URL}/api/opportunities/${encodeURIComponent(tempOpportunity.id)}`);
if (!fetchedOpportunity.ok) throw new Error(`GET /api/opportunities/:id returned ${fetchedOpportunity.status}`);
console.log("PASS GET /api/opportunities/:id");

const fetchedSourceAssets = await fetch(`${API_URL}/api/opportunities/${encodeURIComponent(tempOpportunity.id)}/source-assets`);
if (!fetchedSourceAssets.ok) throw new Error(`GET /api/opportunities/:id/source-assets returned ${fetchedSourceAssets.status}`);
const fetchedSourceAssetsPayload = await fetchedSourceAssets.json();
if (!Array.isArray(fetchedSourceAssetsPayload) || fetchedSourceAssetsPayload.length !== 1) {
  throw new Error("GET /api/opportunities/:id/source-assets returned unexpected payload");
}
console.log("PASS GET /api/opportunities/:id/source-assets");

const fetchedTimeline = await fetch(`${API_URL}/api/opportunities/${encodeURIComponent(tempOpportunity.id)}/timeline`);
if (!fetchedTimeline.ok) throw new Error(`GET /api/opportunities/:id/timeline returned ${fetchedTimeline.status}`);
const fetchedTimelinePayload = await fetchedTimeline.json();
if (!Array.isArray(fetchedTimelinePayload) || fetchedTimelinePayload.length !== 1) {
  throw new Error("GET /api/opportunities/:id/timeline returned unexpected payload");
}
console.log("PASS GET /api/opportunities/:id/timeline");

const updatedOpportunity = await fetch(`${API_URL}/api/opportunities/${encodeURIComponent(tempOpportunity.id)}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ priority: "A", nextAction: "updated next action" }),
});
if (!updatedOpportunity.ok) throw new Error(`PATCH /api/opportunities/:id returned ${updatedOpportunity.status}`);
const updatedOpportunityPayload = await updatedOpportunity.json();
if (updatedOpportunityPayload.priority !== "A" || updatedOpportunityPayload.nextAction !== "updated next action") {
  throw new Error("PATCH /api/opportunities/:id did not update opportunity");
}
console.log("PASS PATCH /api/opportunities/:id");

const progressedOpportunity = await fetch(`${API_URL}/api/opportunities/${encodeURIComponent(tempOpportunity.id)}/progress`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    status: "APPLIED",
    timelineEvent: {
      title: "API check applied",
      detail: "temporary",
      occurredAt: "Now",
    },
  }),
});
if (!progressedOpportunity.ok) throw new Error(`POST /api/opportunities/:id/progress returned ${progressedOpportunity.status}`);
const progressedOpportunityPayload = await progressedOpportunity.json();
if (progressedOpportunityPayload.status !== "APPLIED" || progressedOpportunityPayload.nextAction !== "三天后跟进投递结果") {
  throw new Error("POST /api/opportunities/:id/progress did not update progress");
}
console.log("PASS POST /api/opportunities/:id/progress");

const deletedOpportunity = await fetch(`${API_URL}/api/opportunities/${encodeURIComponent(tempOpportunity.id)}`, { method: "DELETE" });
if (!deletedOpportunity.ok) throw new Error(`DELETE /api/opportunities/:id returned ${deletedOpportunity.status}`);
console.log("PASS DELETE /api/opportunities/:id");

const tempAnswer = {
  id: `AC-CHECK-${Date.now()}`,
  question: "API check temporary answer",
  type: "MANUAL",
  status: "DRAFT",
  source: "api:check",
  framework: "背景 -> 动作 -> 结果",
  answer: "temporary",
  relatedRoles: "test",
  practiceStatus: "未练习",
};

const created = await fetch(`${API_URL}/api/answers`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(tempAnswer),
});
if (!created.ok) throw new Error(`POST /api/answers returned ${created.status}`);
const createdAnswer = await created.json();
if (createdAnswer.id !== tempAnswer.id) throw new Error("POST /api/answers returned unexpected answer");
console.log("PASS POST /api/answers");

const updated = await fetch(`${API_URL}/api/answers/${encodeURIComponent(tempAnswer.id)}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ practiceStatus: "练习中" }),
});
if (!updated.ok) throw new Error(`PATCH /api/answers/:id returned ${updated.status}`);
const updatedAnswer = await updated.json();
if (updatedAnswer.practiceStatus !== "练习中") throw new Error("PATCH /api/answers/:id did not update practiceStatus");
console.log("PASS PATCH /api/answers/:id");

const deleted = await fetch(`${API_URL}/api/answers/${encodeURIComponent(tempAnswer.id)}`, { method: "DELETE" });
if (!deleted.ok) throw new Error(`DELETE /api/answers/:id returned ${deleted.status}`);
console.log("PASS DELETE /api/answers/:id");

const originalWeeklyPlan = await fetch(`${API_URL}/api/weekly-plan/current`).then((response) => response.json());
const tempFocus = `api-check-${Date.now()}`;
const patchedPlan = await fetch(`${API_URL}/api/weekly-plan/current`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    targetApplications: originalWeeklyPlan.targetApplications + 1,
    focusDirections: [...originalWeeklyPlan.focusDirections, tempFocus],
  }),
});
if (!patchedPlan.ok) throw new Error(`PATCH /api/weekly-plan/current returned ${patchedPlan.status}`);
const updatedPlan = await patchedPlan.json();
if (!updatedPlan.focusDirections.includes(tempFocus)) throw new Error("PATCH /api/weekly-plan/current did not update focusDirections");
console.log("PASS PATCH /api/weekly-plan/current");

const restoredPlan = await fetch(`${API_URL}/api/weekly-plan/current`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    targetApplications: originalWeeklyPlan.targetApplications,
    focusDirections: originalWeeklyPlan.focusDirections,
    focusCities: originalWeeklyPlan.focusCities,
    focusCompanies: originalWeeklyPlan.focusCompanies,
    practiceThemes: originalWeeklyPlan.practiceThemes,
  }),
});
if (!restoredPlan.ok) throw new Error(`restore PATCH /api/weekly-plan/current returned ${restoredPlan.status}`);

const tempTask = {
  id: `WT-CHECK-${Date.now()}`,
  title: "API check temporary weekly task",
  detail: "temporary",
  source: "manual",
  sourceLabel: "api:check",
  status: "open",
};

const createdTask = await fetch(`${API_URL}/api/weekly-plan/current/tasks`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(tempTask),
});
if (!createdTask.ok) throw new Error(`POST /api/weekly-plan/current/tasks returned ${createdTask.status}`);
const createdWeeklyTask = await createdTask.json();
if (createdWeeklyTask.id !== tempTask.id) throw new Error("POST /api/weekly-plan/current/tasks returned unexpected task");
console.log("PASS POST /api/weekly-plan/current/tasks");

const updatedTask = await fetch(`${API_URL}/api/weekly-tasks/${encodeURIComponent(tempTask.id)}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "done" }),
});
if (!updatedTask.ok) throw new Error(`PATCH /api/weekly-tasks/:id returned ${updatedTask.status}`);
const updatedWeeklyTask = await updatedTask.json();
if (updatedWeeklyTask.status !== "done") throw new Error("PATCH /api/weekly-tasks/:id did not update status");
console.log("PASS PATCH /api/weekly-tasks/:id");

const deletedTask = await fetch(`${API_URL}/api/weekly-tasks/${encodeURIComponent(tempTask.id)}`, { method: "DELETE" });
if (!deletedTask.ok) throw new Error(`DELETE /api/weekly-tasks/:id returned ${deletedTask.status}`);
console.log("PASS DELETE /api/weekly-tasks/:id");

const tempResume = {
  id: `RV-CHECK-${Date.now()}`,
  name: "API check temporary resume",
  fileName: "api-check-resume.pdf",
  fileType: "PDF",
  fileSize: "1 KB",
  uploadedAt: "Now",
  roles: "test",
  points: "temporary",
  summary: "temporary",
  linkedOpportunityIds: [],
};

const createdResume = await fetch(`${API_URL}/api/resumes`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(tempResume),
});
if (!createdResume.ok) throw new Error(`POST /api/resumes returned ${createdResume.status}`);
const createdResumePayload = await createdResume.json();
if (createdResumePayload.id !== tempResume.id) throw new Error("POST /api/resumes returned unexpected resume");
console.log("PASS POST /api/resumes");

const fetchedResume = await fetch(`${API_URL}/api/resumes/${encodeURIComponent(tempResume.id)}`);
if (!fetchedResume.ok) throw new Error(`GET /api/resumes/:id returned ${fetchedResume.status}`);
console.log("PASS GET /api/resumes/:id");

const updatedResume = await fetch(`${API_URL}/api/resumes/${encodeURIComponent(tempResume.id)}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ roles: "updated test role" }),
});
if (!updatedResume.ok) throw new Error(`PATCH /api/resumes/:id returned ${updatedResume.status}`);
const updatedResumePayload = await updatedResume.json();
if (updatedResumePayload.roles !== "updated test role") throw new Error("PATCH /api/resumes/:id did not update roles");
console.log("PASS PATCH /api/resumes/:id");

const linkedOpportunities = await fetch(`${API_URL}/api/resumes/${encodeURIComponent(tempResume.id)}/linked-opportunities`);
if (!linkedOpportunities.ok) throw new Error(`GET /api/resumes/:id/linked-opportunities returned ${linkedOpportunities.status}`);
const linkedOpportunitiesPayload = await linkedOpportunities.json();
if (!Array.isArray(linkedOpportunitiesPayload)) throw new Error("GET /api/resumes/:id/linked-opportunities returned unexpected payload");
console.log("PASS GET /api/resumes/:id/linked-opportunities");

const deletedResume = await fetch(`${API_URL}/api/resumes/${encodeURIComponent(tempResume.id)}`, { method: "DELETE" });
if (!deletedResume.ok) throw new Error(`DELETE /api/resumes/:id returned ${deletedResume.status}`);
console.log("PASS DELETE /api/resumes/:id");

const tempInterview = {
  id: `INT-CHECK-${Date.now()}`,
  company: "API check temporary company",
  role: "Temporary role",
  round: "API Check",
  date: "Today",
  sourceFiles: [
    {
      id: `FILE-CHECK-${Date.now()}`,
      kind: "transcript",
      fileName: "api-check-interview.txt",
      detail: "temporary",
      uploadedAt: "Now",
    },
  ],
  qaPairs: [
    {
      id: `QA-CHECK-${Date.now()}`,
      question: "API check temporary question",
      originalAnswer: "temporary",
      type: "MANUAL",
      score: 3,
      critique: "temporary",
      weak: true,
      framework: "背景 -> 动作 -> 结果",
      optimizedAnswer: "temporary",
    },
  ],
};

const createdInterview = await fetch(`${API_URL}/api/interviews`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(tempInterview),
});
if (!createdInterview.ok) throw new Error(`POST /api/interviews returned ${createdInterview.status}`);
const createdInterviewPayload = await createdInterview.json();
if (createdInterviewPayload.id !== tempInterview.id || createdInterviewPayload.qaPairs.length !== 1) {
  throw new Error("POST /api/interviews returned unexpected interview");
}
console.log("PASS POST /api/interviews");

const fetchedInterview = await fetch(`${API_URL}/api/interviews/${encodeURIComponent(tempInterview.id)}`);
if (!fetchedInterview.ok) throw new Error(`GET /api/interviews/:id returned ${fetchedInterview.status}`);
console.log("PASS GET /api/interviews/:id");

const updatedInterview = await fetch(`${API_URL}/api/interviews/${encodeURIComponent(tempInterview.id)}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ round: "Updated API Check" }),
});
if (!updatedInterview.ok) throw new Error(`PATCH /api/interviews/:id returned ${updatedInterview.status}`);
const updatedInterviewPayload = await updatedInterview.json();
if (updatedInterviewPayload.round !== "Updated API Check") throw new Error("PATCH /api/interviews/:id did not update round");
console.log("PASS PATCH /api/interviews/:id");

const extraQa = {
  id: `QA-CHECK-EXTRA-${Date.now()}`,
  question: "API check extra temporary question",
  originalAnswer: "temporary",
  type: "MANUAL",
  score: 2,
  critique: "temporary",
  weak: true,
  framework: "背景 -> 动作 -> 结果",
  optimizedAnswer: "temporary",
};
const createdQa = await fetch(`${API_URL}/api/interviews/${encodeURIComponent(tempInterview.id)}/qa`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(extraQa),
});
if (!createdQa.ok) throw new Error(`POST /api/interviews/:id/qa returned ${createdQa.status}`);
const createdQaPayload = await createdQa.json();
if (createdQaPayload.id !== extraQa.id) throw new Error("POST /api/interviews/:id/qa returned unexpected QA pair");
console.log("PASS POST /api/interviews/:id/qa");

const updatedQa = await fetch(`${API_URL}/api/qa-pairs/${encodeURIComponent(extraQa.id)}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ weak: false, critique: "updated" }),
});
if (!updatedQa.ok) throw new Error(`PATCH /api/qa-pairs/:id returned ${updatedQa.status}`);
const updatedQaPayload = await updatedQa.json();
if (updatedQaPayload.weak !== false || updatedQaPayload.critique !== "updated") throw new Error("PATCH /api/qa-pairs/:id did not update QA pair");
console.log("PASS PATCH /api/qa-pairs/:id");

const deletedQa = await fetch(`${API_URL}/api/qa-pairs/${encodeURIComponent(extraQa.id)}`, { method: "DELETE" });
if (!deletedQa.ok) throw new Error(`DELETE /api/qa-pairs/:id returned ${deletedQa.status}`);
console.log("PASS DELETE /api/qa-pairs/:id");

const deletedInterview = await fetch(`${API_URL}/api/interviews/${encodeURIComponent(tempInterview.id)}`, { method: "DELETE" });
if (!deletedInterview.ok) throw new Error(`DELETE /api/interviews/:id returned ${deletedInterview.status}`);
console.log("PASS DELETE /api/interviews/:id");

console.log(`API check passed: ${API_URL}`);
