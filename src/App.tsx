import {
  Archive,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileAudio,
  FileDown,
  FileText,
  Home,
  KanbanSquare,
  Library,
  Moon,
  PanelRight,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  buildOpportunityPipeline,
  formatNow,
  makeId,
  opportunityStatusAction,
  opportunityStatusFlow,
  opportunityStatusNextAction,
  sourceKindLabel,
  statusLabel,
  submittedStatuses,
} from "./domain";
import {
  createModuleComposerDraft,
  createModuleComposerSource,
  detectCity,
  detectCompany,
  detectRoleTitle,
  fileBaseName,
  inferComposerSourceKind,
} from "./composerModel";
import {
  createAnswerCardApi,
  createInterviewSessionApi,
  createOpportunityApi,
  createQaPairApi,
  createResumeVersionApi,
  createWeeklyTaskApi,
  deleteAnswerCardApi,
  deleteQaPairApi,
  deleteResumeVersionApi,
  deleteWeeklyTaskApi,
  loadInitialApiData,
  updateAnswerCardApi,
  updateOpportunityApi,
  updateQaPairApi,
  updateResumeVersionApi,
  updateWeeklyPlanApi,
  updateWeeklyTaskApi,
} from "./apiClient";
import { isApiEnabled, isPublicDemo } from "./appConfig";
import { baseAnswerCards, baseWeeklyPlan, resumeVersions, seedInterviewSessions, seedOpportunities } from "./mockData";
import { selectDashboardSummary, selectResumeName, selectTodayActions } from "./selectors";
import type {
  AnswerCard,
  ComposerStep,
  InterviewSession,
  ModuleComposer,
  ModuleComposerDraft,
  ModuleComposerSource,
  Opportunity,
  OpportunityStatus,
  Page,
  PipelineStage,
  QaPair,
  ResumeVersion,
  SessionFile,
  SourceAsset,
  ViewMode,
  WeeklyPlan,
  WeeklyTask,
} from "./types";

const navItems: Array<{ id: Page; label: string; icon: typeof Home }> = [
  { id: "home", label: "今日待办", icon: Home },
  { id: "opportunities", label: "岗位管理", icon: BriefcaseBusiness },
  { id: "interviews", label: "面试复盘", icon: FileAudio },
  { id: "answers", label: "答案库", icon: Library },
  { id: "resumes", label: "简历版本", icon: FileText },
  { id: "weekly", label: "本周计划", icon: CalendarClock },
  { id: "exports", label: "设置导出", icon: FileDown },
];

const flowPipelineSteps = [
  { title: "模块内新增", hint: "上传或粘贴原始材料" },
  { title: "补齐必填", hint: "确认解析与关键字段" },
  { title: "写入模块", hint: "岗位 / 面试 / 答案 / 简历" },
  { title: "今日待办", hint: "从正式记录自动汇总" },
] as const;

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

function App() {
  const [page, setPage] = useState<Page>("home");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [opportunities, setOpportunities] = useState<Opportunity[]>(seedOpportunities);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(seedOpportunities[0].id);
  const [interviewSessions, setInterviewSessions] = useState(seedInterviewSessions);
  const [selectedInterviewId, setSelectedInterviewId] = useState(seedInterviewSessions[0].id);
  const [selectedQaId, setSelectedQaId] = useState(seedInterviewSessions[0].qaPairs[0].id);
  const [query, setQuery] = useState("");
  const [interviewQuery, setInterviewQuery] = useState("");
  const [interviewPage, setInterviewPage] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [systemMessage, setSystemMessage] = useState("[READY]");
  const [answerCards, setAnswerCards] = useState<AnswerCard[]>(baseAnswerCards);
  const [selectedAnswerId, setSelectedAnswerId] = useState(baseAnswerCards[0].id);
  const [resumeList, setResumeList] = useState<ResumeVersion[]>(resumeVersions);
  const [selectedResumeId, setSelectedResumeId] = useState(resumeVersions[0].id);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(baseWeeklyPlan);
  const [previewAsset, setPreviewAsset] = useState<SourceAsset | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [composer, setComposer] = useState<ModuleComposer | null>(null);
  const [composerStep, setComposerStep] = useState<ComposerStep>("source");
  const [composerSource, setComposerSource] = useState<ModuleComposerSource>(() => createModuleComposerSource());
  const [composerDraft, setComposerDraft] = useState<ModuleComposerDraft>(() =>
    createModuleComposerDraft(resumeVersions[0]?.id ?? "", seedOpportunities[0]?.id ?? ""),
  );
  const apiOpportunityIdsRef = useRef(new Set(seedOpportunities.map((item) => item.id)));

  useEffect(() => {
    if (!isApiEnabled) {
      setSystemMessage(isPublicDemo ? "[PUBLIC DEMO]" : "[LOCAL MOCK]");
      return;
    }

    let cancelled = false;
    loadInitialApiData()
      .then((data) => {
        if (cancelled) return;
        setOpportunities(data.opportunities);
        apiOpportunityIdsRef.current = new Set(data.opportunities.map((item) => item.id));
        setSelectedOpportunityId(data.opportunities[0]?.id ?? "");
        setInterviewSessions(data.interviewSessions);
        setSelectedInterviewId(data.interviewSessions[0]?.id ?? "");
        setSelectedQaId(data.interviewSessions[0]?.qaPairs[0]?.id ?? "");
        setAnswerCards(data.answerCards);
        setSelectedAnswerId(data.answerCards[0]?.id ?? "");
        setResumeList(data.resumeVersions);
        setSelectedResumeId(data.resumeVersions[0]?.id ?? "");
        setWeeklyPlan(data.weeklyPlan);
        setComposerDraft(createModuleComposerDraft(data.resumeVersions[0]?.id ?? "", data.opportunities[0]?.id ?? ""));
        setSystemMessage("[API HYDRATED]");
      })
      .catch(() => {
        if (!cancelled) setSystemMessage("[LOCAL MOCK]");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedOpportunity = opportunities.find((item) => item.id === selectedOpportunityId) ?? opportunities[0];
  const selectedInterview = interviewSessions.find((item) => item.id === selectedInterviewId) ?? interviewSessions[0];
  const selectedQa = selectedInterview.qaPairs.find((item) => item.id === selectedQaId) ?? selectedInterview.qaPairs[0];
  const selectedAnswer = answerCards.find((item) => item.id === selectedAnswerId) ?? answerCards[0];
  const selectedResume = resumeList.find((item) => item.id === selectedResumeId) ?? resumeList[0];
  const {
    submittedApplications,
    urgentCount,
    pendingReviewCount,
    toApplyCount,
    inProgressCount,
    p0Count,
    p1Count,
    weakInterviewCount,
    applicationGap,
  } = selectDashboardSummary(opportunities, interviewSessions, weeklyPlan);
  const getResumeName = (resumeId: string) => selectResumeName(resumeList, resumeId);
  const todayActions = selectTodayActions(opportunities, interviewSessions, weeklyPlan, resumeList);
  const filteredInterviewSessions = interviewSessions.filter((session) =>
    `${session.company} ${session.role} ${session.round} ${session.date}`.toLowerCase().includes(interviewQuery.toLowerCase()),
  );
  const interviewPageSize = 4;
  const interviewPageCount = Math.max(1, Math.ceil(filteredInterviewSessions.length / interviewPageSize));
  const visibleInterviewSessions = filteredInterviewSessions.slice(interviewPage * interviewPageSize, interviewPage * interviewPageSize + interviewPageSize);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((item) => {
      const resumeName = resumeList.find((resume) => resume.id === item.resumeId)?.name ?? item.resumeId;
      const haystack = `${item.title} ${item.company} ${item.city} ${item.nextAction} ${resumeName}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesFilter =
        filter === "ALL" ||
        item.action === filter ||
        (filter === "A PRIORITY" && item.priority === "A") ||
        (filter === "HIGH MATCH" && item.match === "HIGH") ||
        (filter === "DUE SOON" && ["Tomorrow", "May 28"].includes(item.deadline));
      return matchesQuery && matchesFilter;
    });
  }, [opportunities, query, filter, resumeList]);

  const linkedResumeOpportunities = selectedResume
    ? opportunities.filter((item) => item.resumeId === selectedResume.id || selectedResume.linkedOpportunityIds.includes(item.id))
    : [];
  const selectedOpportunitySessions = interviewSessions.filter((session) => session.opportunityId === selectedOpportunity?.id);
  const selectedOpportunityPipeline = selectedOpportunity ? buildOpportunityPipeline(selectedOpportunity, selectedOpportunitySessions) : [];

  const goTo = (nextPage: Page) => {
    setPage(nextPage);
    setSystemMessage(`[OPENED: ${nextPage.toUpperCase()}]`);
  };

  const openComposer = (kind: ModuleComposer, linkedOpportunityId = "") => {
    setComposer(kind);
    setComposerStep(kind === "answer" ? "review" : "source");
    setComposerSource(createModuleComposerSource(kind === "resume" ? "resume-file" : kind === "interview" ? "audio" : kind === "opportunity" ? "jd-text" : "manual"));
    setComposerDraft(createModuleComposerDraft(resumeList[0]?.id ?? "", linkedOpportunityId));
    setSystemMessage(`[NEW ${kind.toUpperCase()}]`);
  };

  const updateComposerSource = (field: keyof ModuleComposerSource, value: string) => {
    setComposerSource((source) => ({ ...source, [field]: value } as ModuleComposerSource));
  };

  const updateComposerDraft = (field: keyof ModuleComposerDraft, value: string) => {
    setComposerDraft((draft) => ({ ...draft, [field]: value } as ModuleComposerDraft));
  };

  const handleComposerFileSelected = (fileList: FileList | null) => {
    if (!composer) return;
    const file = fileList?.[0];
    if (!file) return;
    setComposerSource((source) => ({
      ...source,
      fileName: file.name,
      sourceKind: inferComposerSourceKind(file.name, composer),
    }));
    setSystemMessage("[SOURCE SELECTED]");
  };

  const runComposerParse = () => {
    if (!composer) return;
    const rawText = composerSource.rawText.trim();
    const fileName = composerSource.fileName.trim();
    if (composer !== "answer" && !rawText && !fileName) {
      setSystemMessage("[SELECT SOURCE FIRST]");
      return;
    }

    const parseText = `${rawText} ${fileBaseName(fileName)}`.trim();
    const defaultResumeId = composerDraft.resumeId || resumeList[0]?.id || "";
    const linkedOpportunity = opportunities.find((item) => item.id === composerDraft.linkedOpportunityId);

    if (composer === "opportunity") {
      const company = detectCompany(parseText) || composerDraft.company || "待填写公司";
      const title = detectRoleTitle(parseText, composerDraft.title);
      const parsedSourceText =
        rawText ||
        (composerSource.sourceKind === "screenshot"
          ? `截图文件：${fileName}。前端原型中模拟 OCR/AI 解析，真实版本会从截图提取 JD 原文。`
          : `上传文件：${fileName}。前端原型中模拟解析，真实版本会读取文件内容。`);
      setComposerDraft((draft) => ({
        ...draft,
        company,
        title,
        city: detectCity(parseText),
        deadline: parseText.includes("今晚") ? "Tonight" : parseText.includes("明天") ? "Tomorrow" : draft.deadline,
        match: parseText.match(/React|前端|TypeScript|组件|性能/i) ? "HIGH" : draft.match,
        priority: parseText.includes("内推") || parseText.includes("急") ? "A" : draft.priority,
        action: parseText.includes("今晚") || parseText.includes("明天") ? "P0" : draft.action,
        resumeId: defaultResumeId,
        nextAction: `确认 ${getResumeName(defaultResumeId)} 后投递`,
        sourceLabel: fileName || (composerSource.sourceKind === "job-link" ? "招聘链接" : "文字 JD"),
        sourceText: parsedSourceText,
      }));
    }

    if (composer === "interview") {
      const isAudio = composerSource.sourceKind === "audio";
      const transcript =
        rawText ||
        (isAudio
          ? `录音文件：${fileName}。真实版本会先转写，再识别问题和回答。当前原型模拟拆出 3 个复盘问题。`
          : `文字稿文件：${fileName}。真实版本会读取文字稿并拆分 QA。当前原型模拟拆出 3 个复盘问题。`);
      setComposerDraft((draft) => ({
        ...draft,
        linkedOpportunityId: draft.linkedOpportunityId,
        company: detectCompany(parseText) || linkedOpportunity?.company || draft.company || "待填写公司",
        role: detectRoleTitle(parseText, linkedOpportunity?.title || draft.role),
        round: parseText.includes("二面") ? "二面" : parseText.includes("HR") ? "HR 面" : draft.round,
        date: draft.date || "Today",
        fileName: fileName || draft.fileName || "interview-transcript.md",
        sourceText: transcript,
        nextAction: composerSource.note,
      }));
    }

    if (composer === "resume") {
      const baseName = fileBaseName(fileName) || "New Resume Version";
      setComposerDraft((draft) => ({
        ...draft,
        title: draft.title || baseName,
        fileName,
        roles: rawText.match(/产品|策略|增长/) ? "产品 / 策略" : rawText.match(/数据|SQL|Python/) ? "数据分析" : "前端 / 全栈",
        points: rawText || "系统会从简历文件里解析项目、技能、教育经历和可复用卖点。",
        summary: composerSource.note || "由上传简历自动解析，备注可后续补充。",
      }));
    }

    setComposerStep("review");
    setSystemMessage("[SOURCE PARSED]");
  };

  const openOpportunity = (id: string) => {
    setSelectedOpportunityId(id);
    setPage("opportunityDetail");
    setSystemMessage("[OPENED: OPPORTUNITY DETAIL]");
  };

  const selectInterview = (id: string) => {
    const nextSession = interviewSessions.find((item) => item.id === id);
    if (!nextSession) return;
    setSelectedInterviewId(id);
    setSelectedQaId(nextSession.qaPairs[0]?.id ?? "");
  };

  const updateSelectedQa = (field: keyof Pick<QaPair, "originalAnswer" | "critique" | "framework" | "optimizedAnswer">, value: string) => {
    const patch = { [field]: value } as Partial<QaPair>;
    setInterviewSessions((sessions) =>
      sessions.map((session) =>
        session.id === selectedInterviewId
          ? {
              ...session,
              qaPairs: session.qaPairs.map((pair) => (pair.id === selectedQa.id ? { ...pair, [field]: value } : pair)),
            }
          : session,
      ),
    );
    syncUpdatedQaPair(selectedQa.id, patch);
  };

  const addQaPair = () => {
    const newQa: QaPair = {
      id: makeId("QA"),
      question: "新增问题：请在这里补充面试官原问题",
      originalAnswer: "在这里记录你的原回答。",
      type: "MANUAL",
      score: 3,
      critique: "在这里补充评价。",
      weak: true,
      framework: "背景 -> 动作 -> 结果 -> 复盘",
      optimizedAnswer: "在这里整理推荐回答表述。",
    };

    setInterviewSessions((sessions) =>
      sessions.map((session) => (session.id === selectedInterviewId ? { ...session, qaPairs: [...session.qaPairs, newQa] } : session)),
    );
    setSelectedQaId(newQa.id);
    syncCreatedQaPair(selectedInterviewId, newQa);
    setSystemMessage("[QA ADDED]");
  };

  const requestConfirm = (config: ConfirmDialogState) => setConfirmDialog(config);

  useEffect(() => {
    if (!confirmDialog && !previewAsset) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmDialog) setConfirmDialog(null);
      else if (previewAsset) setPreviewAsset(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmDialog, previewAsset]);

  const syncCreatedAnswerCard = (card: AnswerCard) => {
    void createAnswerCardApi(card)
      .then((savedCard) => {
        setAnswerCards((cards) => cards.map((item) => (item.id === card.id ? savedCard : item)));
        setSelectedAnswerId((id) => (id === card.id ? savedCard.id : id));
      })
      .catch(() => setSystemMessage("[ANSWER LOCAL ONLY]"));
  };

  const syncUpdatedAnswerCard = (id: string, patch: Partial<AnswerCard>) => {
    void updateAnswerCardApi(id, patch).catch(() => setSystemMessage("[ANSWER LOCAL ONLY]"));
  };

  const syncDeletedAnswerCard = (id: string) => {
    void deleteAnswerCardApi(id).catch(() => setSystemMessage("[ANSWER LOCAL ONLY]"));
  };

  const syncWeeklyPlanPatch = (patch: Partial<Omit<WeeklyPlan, "tasks">>) => {
    void updateWeeklyPlanApi(patch).catch(() => setSystemMessage("[WEEKLY LOCAL ONLY]"));
  };

  const syncCreatedWeeklyTask = (task: WeeklyTask) => {
    void createWeeklyTaskApi(task).catch(() => setSystemMessage("[WEEKLY LOCAL ONLY]"));
  };

  const syncUpdatedWeeklyTask = (id: string, patch: Partial<WeeklyTask>) => {
    void updateWeeklyTaskApi(id, patch).catch(() => setSystemMessage("[WEEKLY LOCAL ONLY]"));
  };

  const syncDeletedWeeklyTask = (id: string) => {
    void deleteWeeklyTaskApi(id).catch(() => setSystemMessage("[WEEKLY LOCAL ONLY]"));
  };

  const syncCreatedResumeVersion = (resume: ResumeVersion) => {
    void createResumeVersionApi(resume)
      .then((savedResume) => {
        setResumeList((items) => items.map((item) => (item.id === resume.id ? savedResume : item)));
        setSelectedResumeId((id) => (id === resume.id ? savedResume.id : id));
      })
      .catch(() => setSystemMessage("[RESUME LOCAL ONLY]"));
  };

  const syncUpdatedResumeVersion = (id: string, patch: Partial<ResumeVersion>) => {
    void updateResumeVersionApi(id, patch).catch(() => setSystemMessage("[RESUME LOCAL ONLY]"));
  };

  const syncDeletedResumeVersion = (id: string) => {
    void deleteResumeVersionApi(id).catch(() => setSystemMessage("[RESUME LOCAL ONLY]"));
  };

  const syncCreatedInterviewSession = (session: InterviewSession) => {
    if (session.opportunityId && !apiOpportunityIdsRef.current.has(session.opportunityId)) {
      setSystemMessage("[INTERVIEW LOCAL ONLY]");
      return;
    }
    void createInterviewSessionApi(session)
      .then((savedSession) => {
        setInterviewSessions((sessions) => sessions.map((item) => (item.id === session.id ? savedSession : item)));
        setSelectedInterviewId((id) => (id === session.id ? savedSession.id : id));
        setSelectedQaId((id) => (session.qaPairs.some((pair) => pair.id === id) ? savedSession.qaPairs.find((pair) => pair.id === id)?.id ?? id : id));
      })
      .catch(() => setSystemMessage("[INTERVIEW LOCAL ONLY]"));
  };

  const syncCreatedQaPair = (interviewId: string, qaPair: QaPair) => {
    void createQaPairApi(interviewId, qaPair).catch(() => setSystemMessage("[INTERVIEW LOCAL ONLY]"));
  };

  const syncUpdatedQaPair = (id: string, patch: Partial<QaPair>) => {
    void updateQaPairApi(id, patch).catch(() => setSystemMessage("[INTERVIEW LOCAL ONLY]"));
  };

  const syncDeletedQaPair = (id: string) => {
    void deleteQaPairApi(id).catch(() => setSystemMessage("[INTERVIEW LOCAL ONLY]"));
  };

  const syncCreatedOpportunity = (opportunity: Opportunity) => {
    void createOpportunityApi(opportunity)
      .then((savedOpportunity) => {
        apiOpportunityIdsRef.current.add(savedOpportunity.id);
        setOpportunities((items) => {
          const currentOpportunity = items.find((item) => item.id === savedOpportunity.id);
          if (currentOpportunity && JSON.stringify(currentOpportunity) !== JSON.stringify(savedOpportunity)) {
            void updateOpportunityApi(savedOpportunity.id, currentOpportunity).catch(() => setSystemMessage("[OPPORTUNITY LOCAL ONLY]"));
            return items;
          }
          return items.map((item) => (item.id === opportunity.id ? savedOpportunity : item));
        });
        setSelectedOpportunityId((id) => (id === opportunity.id ? savedOpportunity.id : id));
      })
      .catch(() => setSystemMessage("[OPPORTUNITY LOCAL ONLY]"));
  };

  const syncUpdatedOpportunity = (id: string, patch: Partial<Opportunity>) => {
    if (!apiOpportunityIdsRef.current.has(id)) {
      setSystemMessage("[OPPORTUNITY LOCAL ONLY]");
      return;
    }
    void updateOpportunityApi(id, patch).catch(() => setSystemMessage("[OPPORTUNITY LOCAL ONLY]"));
  };

  const deleteSelectedQa = () => {
    const qaId = selectedQa.id;
    const remaining = selectedInterview.qaPairs.filter((pair) => pair.id !== selectedQa.id);
    if (remaining.length === 0) {
      setSystemMessage("[KEEP AT LEAST ONE QA]");
      return;
    }
    setInterviewSessions((sessions) =>
      sessions.map((session) => (session.id === selectedInterviewId ? { ...session, qaPairs: remaining } : session)),
    );
    setSelectedQaId(remaining[0].id);
    syncDeletedQaPair(qaId);
    setSystemMessage("[QA DELETED]");
  };

  const addAnswerCard = () => {
    const newCard: AnswerCard = {
      id: makeId("AC"),
      question: "新增答案卡：请输入常见面试问题",
      type: "MANUAL",
      status: "DRAFT",
      source: "手动创建",
      framework: "背景 -> 动作 -> 结果 -> 复盘",
      answer: "在这里写你希望下次面试复用的回答。",
      relatedRoles: "待填写",
      practiceStatus: "未练习",
    };
    setAnswerCards((cards) => [newCard, ...cards]);
    setSelectedAnswerId(newCard.id);
    syncCreatedAnswerCard(newCard);
    setSystemMessage("[ANSWER CARD ADDED]");
  };

  const updateSelectedAnswer = (field: keyof Pick<AnswerCard, "question" | "type" | "framework" | "answer" | "relatedRoles" | "practiceStatus" | "status">, value: string) => {
    const patch = { [field]: value } as Partial<AnswerCard>;
    setAnswerCards((cards) => cards.map((card) => (card.id === selectedAnswer.id ? { ...card, [field]: value } : card)));
    syncUpdatedAnswerCard(selectedAnswer.id, patch);
  };

  const deleteSelectedAnswer = () => {
    const answerId = selectedAnswer.id;
    const remaining = answerCards.filter((card) => card.id !== selectedAnswer.id);
    if (remaining.length === 0) {
      setSystemMessage("[KEEP AT LEAST ONE ANSWER]");
      return;
    }
    setAnswerCards(remaining);
    setSelectedAnswerId(remaining[0].id);
    syncDeletedAnswerCard(answerId);
    setSystemMessage("[ANSWER CARD DELETED]");
  };

  const addResumeVersion = () => {
    openComposer("resume");
  };

  const updateSelectedResume = (field: keyof Pick<ResumeVersion, "name" | "roles" | "points" | "summary">, value: string) => {
    const patch = { [field]: value } as Partial<ResumeVersion>;
    setResumeList((items) => items.map((resume) => (resume.id === selectedResume.id ? { ...resume, [field]: value } : resume)));
    syncUpdatedResumeVersion(selectedResume.id, patch);
  };

  const deleteSelectedResume = () => {
    const resumeId = selectedResume.id;
    const remaining = resumeList.filter((resume) => resume.id !== selectedResume.id);
    if (remaining.length === 0) {
      setSystemMessage("[KEEP AT LEAST ONE RESUME]");
      return;
    }
    setResumeList(remaining);
    setSelectedResumeId(remaining[0].id);
    syncDeletedResumeVersion(resumeId);
    setSystemMessage("[RESUME VERSION DELETED]");
  };

  const addWeeklyTask = () => {
    const newTask: WeeklyTask = {
      id: makeId("WT"),
      title: "新增本周动作",
      detail: "来自本周计划，可在这里改成具体行动",
      source: "manual",
      sourceLabel: "手动计划",
      status: "open",
    };
    setWeeklyPlan((plan) => ({ ...plan, tasks: [newTask, ...plan.tasks] }));
    syncCreatedWeeklyTask(newTask);
    setSystemMessage("[WEEKLY TASK ADDED]");
  };

  const updateWeeklyTask = (id: string, field: keyof Pick<WeeklyTask, "title" | "detail" | "status">, value: string) => {
    const patch = { [field]: value } as Partial<WeeklyTask>;
    setWeeklyPlan((plan) => ({
      ...plan,
      tasks: plan.tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task)),
    }));
    syncUpdatedWeeklyTask(id, patch);
  };

  const deleteWeeklyTask = (id: string) => {
    setWeeklyPlan((plan) => ({ ...plan, tasks: plan.tasks.filter((task) => task.id !== id) }));
    syncDeletedWeeklyTask(id);
    setSystemMessage("[WEEKLY TASK DELETED]");
  };

  const addWeeklyFocus = (field: keyof Pick<WeeklyPlan, "focusDirections" | "focusCities" | "focusCompanies" | "practiceThemes">, value: string) => {
    if (!value.trim()) return;
    const nextValues = [...weeklyPlan[field], value.trim()];
    setWeeklyPlan((plan) => ({ ...plan, [field]: [...plan[field], value.trim()] }));
    syncWeeklyPlanPatch({ [field]: nextValues });
    setSystemMessage("[WEEKLY FOCUS ADDED]");
  };

  const createWeeklyTask = (task: Omit<WeeklyTask, "id" | "status">) => {
    const newTask: WeeklyTask = {
      id: makeId("WT"),
      status: "open",
      ...task,
    };
    setWeeklyPlan((plan) => ({ ...plan, tasks: [newTask, ...plan.tasks] }));
    syncCreatedWeeklyTask(newTask);
    setSystemMessage("[WEEKLY TASK CONNECTED]");
  };

  const updateWeeklyTargetApplications = (targetApplications: number) => {
    const nextTarget = targetApplications || 1;
    setWeeklyPlan((plan) => ({ ...plan, targetApplications: nextTarget }));
    syncWeeklyPlanPatch({ targetApplications: nextTarget });
  };

  const promoteFocusToTask = (label: string, value: string) => {
    createWeeklyTask({
      title: `推进${value}`,
      detail: `由本周计划的「${label}」生成，今天可以拆成一个具体动作。`,
      source: "weekly-focus",
      sourceLabel: "本周计划",
    });
  };

  const createOpportunityDirect = () => {
    if (!composerDraft.company.trim() || !composerDraft.title.trim() || !composerDraft.sourceText.trim()) {
      setSystemMessage("[COMPLETE COMPANY / TITLE / JD]");
      return;
    }

    const now = formatNow();
    const sourceKind: SourceAsset["kind"] =
      composerSource.sourceKind === "screenshot" ? "screenshot" : composerSource.sourceKind === "job-link" ? "job-link" : "jd-text";
    const nextOpportunity: Opportunity = {
      id: makeId("OP"),
      title: composerDraft.title.trim(),
      company: composerDraft.company.trim(),
      status: "TO APPLY",
      priority: composerDraft.priority,
      match: composerDraft.match,
      action: composerDraft.action,
      city: composerDraft.city.trim() || "待定",
      deadline: composerDraft.deadline.trim() || "待定",
      resumeId: composerDraft.resumeId || resumeList[0]?.id || "",
      nextAction: composerDraft.nextAction.trim() || "补齐材料后投递",
      jdSummary: composerSource.note || "由岗位管理内上传材料解析生成的岗位记录。",
      jdText: composerDraft.sourceText.trim(),
      sourceAssets: [
        {
          id: makeId("SRC"),
          kind: sourceKind,
          title: composerSource.fileName || composerDraft.sourceLabel || "岗位 JD",
          detail: composerSource.note || "模块内上传后自动解析并写入岗位管理",
          createdAt: now,
          content: composerDraft.sourceText.trim(),
        },
      ],
      timeline: [
        { id: makeId("TL"), occurredAt: now, title: "写入岗位管理", detail: "必填信息满足后直接生成正式岗位记录", status: "done" },
        { id: makeId("TL"), occurredAt: "Next", title: composerDraft.nextAction.trim() || "补齐材料后投递", detail: "由当前岗位进度生成下一步动作", status: "next" },
      ],
    };

    setOpportunities((items) => [nextOpportunity, ...items]);
    setSelectedOpportunityId(nextOpportunity.id);
    syncCreatedOpportunity(nextOpportunity);
    setComposer(null);
    setPage("opportunityDetail");
    setSystemMessage("[OPPORTUNITY CREATED]");
  };

  const createInterviewDirect = () => {
    if (!composerDraft.company.trim() || !composerDraft.role.trim() || !composerDraft.round.trim()) {
      setSystemMessage("[COMPLETE COMPANY / ROLE / ROUND]");
      return;
    }

    const fileName = composerDraft.fileName.trim() || composerDraft.company.trim() + "-" + composerDraft.round.trim() + "-notes.txt";
    const isAudio = composerSource.sourceKind === "audio" || /\.(m4a|mp3|wav|aac|ogg)$/i.test(fileName);
    const now = formatNow();
    const transcriptFileName = isAudio ? fileName.replace(/\.[^.]+$/, "-transcript.md") : fileName;
    const sourceFiles: SessionFile[] = [
      {
        id: makeId("FILE"),
        kind: isAudio ? "audio" : "transcript",
        fileName,
        detail: composerSource.note || (isAudio ? "原录音，系统会先转写再拆分 QA" : "原始文字稿，系统会拆分 QA"),
        uploadedAt: now,
        duration: isAudio ? "待识别" : undefined,
      },
    ];

    if (isAudio) {
      sourceFiles.push({
        id: makeId("FILE"),
        kind: "transcript",
        fileName: transcriptFileName,
        detail: "由录音转写生成的文字稿，复盘问题从这里拆分",
        uploadedAt: now,
      });
    }

    const qaPairs: QaPair[] = [
      {
        id: makeId("QA"),
        question: "你在低代码项目里如何衡量性能优化结果？",
        originalAnswer: composerDraft.sourceText.trim() || "待补充原问题和原回答。",
        type: "PROJECT",
        score: 2,
        critique: "原回答只有动作，没有基线、指标和复盘口径。",
        weak: true,
        framework: "基线 -> 目标 -> 动作 -> 指标结果 -> 复盘限制",
        optimizedAnswer: "先说明优化前的加载或交互基线，再说明目标和具体动作，最后用指标收束结果。",
      },
      {
        id: makeId("QA"),
        question: "为什么从前端转向产品策略岗位？",
        originalAnswer: "我对业务和用户增长更感兴趣，也希望把技术背景用在产品判断里。",
        type: "MOTIVATION",
        score: 3,
        critique: "动机可信，但需要把技术背景转成岗位优势。",
        weak: true,
        framework: "过往能力 -> 转向原因 -> 岗位匹配 -> 未来贡献",
        optimizedAnswer: "用前端经历证明你理解实现约束，再说明你想更前置地参与问题定义和指标设计。",
      },
      {
        id: makeId("QA"),
        question: "React 状态管理你会如何选型？",
        originalAnswer: "看业务复杂度，简单局部状态用 useState，复杂协作用 Zustand 或 Redux。",
        type: "TECHNICAL",
        score: 4,
        critique: "结构完整，可以补充协作、调试能力和生命周期取舍。",
        weak: false,
        framework: "状态范围 -> 协作复杂度 -> 调试和可维护性 -> 迁移成本",
        optimizedAnswer: "先判断状态是否跨页面、是否需要可追踪，再结合团队规模选择轻量或规范化方案。",
      },
    ];

    const nextSession: InterviewSession = {
      id: makeId("INT"),
      opportunityId: composerDraft.linkedOpportunityId || undefined,
      company: composerDraft.company.trim(),
      role: composerDraft.role.trim(),
      round: composerDraft.round.trim(),
      date: composerDraft.date.trim() || "Today",
      sourceFiles,
      qaPairs,
    };

    setInterviewSessions((sessions) => [nextSession, ...sessions]);
    setSelectedInterviewId(nextSession.id);
    setSelectedQaId(nextSession.qaPairs[0]?.id ?? "");
    syncCreatedInterviewSession(nextSession);
    if (nextSession.opportunityId) {
      applyOpportunityProgress(nextSession.opportunityId, "INTERVIEWING", "system", "新增" + nextSession.round + "面试复盘后自动推进");
    }
    setComposer(null);
    setPage("interviews");
    setSystemMessage("[INTERVIEW CREATED]");
  };

  const createResumeDirect = () => {
    if (!composerDraft.title.trim() || !composerDraft.fileName.trim()) {
      setSystemMessage("[COMPLETE RESUME NAME / FILE]");
      return;
    }

    const fileName = composerDraft.fileName.trim();
    const nextResume: ResumeVersion = {
      id: makeId("RV"),
      name: composerDraft.title.trim(),
      fileName,
      fileType: fileName.split(".").pop()?.toUpperCase() ?? "FILE",
      fileSize: "待读取",
      uploadedAt: "Now",
      roles: composerDraft.roles.trim() || "待填写",
      points: composerDraft.points.trim() || "待填写核心卖点",
      summary: composerDraft.summary.trim() || composerSource.note || "待填写文件摘要",
      linkedOpportunityIds: [],
    };

    setResumeList((items) => [nextResume, ...items]);
    setSelectedResumeId(nextResume.id);
    syncCreatedResumeVersion(nextResume);
    setComposer(null);
    setPage("resumes");
    setSystemMessage("[RESUME CREATED]");
  };

  const createAnswerDirect = () => {
    if (!composerDraft.question.trim()) {
      setSystemMessage("[COMPLETE QUESTION]");
      return;
    }

    const newCard: AnswerCard = {
      id: makeId("AC"),
      question: composerDraft.question.trim(),
      type: "MANUAL",
      status: "DRAFT",
      source: "手动创建",
      framework: composerDraft.framework.trim() || "背景 -> 动作 -> 结果 -> 复盘",
      answer: composerDraft.answer.trim() || "在这里补充可复用回答。",
      relatedRoles: composerDraft.relatedRoles.trim() || "待填写",
      practiceStatus: "未练习",
    };

    setAnswerCards((cards) => [newCard, ...cards]);
    setSelectedAnswerId(newCard.id);
    syncCreatedAnswerCard(newCard);
    setComposer(null);
    setPage("answers");
    setSystemMessage("[ANSWER CREATED]");
  };

  const submitComposer = () => {
    if (composer === "opportunity") createOpportunityDirect();
    if (composer === "interview") createInterviewDirect();
    if (composer === "resume") createResumeDirect();
    if (composer === "answer") createAnswerDirect();
  };

  const applyOpportunityProgress = (
    opportunityId: string,
    status: OpportunityStatus,
    source: "system" | "manual",
    detailOverride?: string,
  ) => {
    const targetOpportunity = opportunities.find((item) => item.id === opportunityId);
    if (!targetOpportunity) return;
    const alreadySubmitted = submittedStatuses.includes(targetOpportunity.status);
    const now = formatNow();
    const nextAction = opportunityStatusNextAction[status];
    const nextTimeline = [
      ...targetOpportunity.timeline.filter((event) => event.status !== "next"),
      {
        id: makeId("TL"),
        occurredAt: now,
        title: source === "system" ? `系统推进到${statusLabel[status]}` : `手动更新为${statusLabel[status]}`,
        detail: detailOverride || (source === "system" ? "系统根据模块关联信息自动更新岗位进度" : "用户手动覆盖当前岗位阶段"),
        status: "done" as const,
      },
      ...(status !== "OFFER"
        ? [
            {
              id: makeId("TL"),
              occurredAt: "Next",
              title: nextAction,
              detail: "由当前岗位进度生成下一步动作",
              status: "next" as const,
            },
          ]
        : []),
    ];

    setOpportunities((items) =>
      items.map((item) =>
        item.id === opportunityId
          ? {
              ...item,
              status,
              action: opportunityStatusAction[status],
              nextAction,
              timeline: nextTimeline,
            }
          : item,
      ),
    );
    syncUpdatedOpportunity(opportunityId, {
      status,
      action: opportunityStatusAction[status],
      nextAction,
      timeline: nextTimeline,
    });

    if (submittedStatuses.includes(status)) {
      setResumeList((items) =>
        items.map((resume) =>
          resume.id === targetOpportunity.resumeId && !resume.linkedOpportunityIds.includes(targetOpportunity.id)
            ? { ...resume, linkedOpportunityIds: [...resume.linkedOpportunityIds, targetOpportunity.id] }
            : resume,
        ),
      );
    }

    if (status === "APPLIED" && !alreadySubmitted) {
      createWeeklyTask({
        title: `跟进${targetOpportunity.company}${targetOpportunity.title}`,
        detail: "投递后自动生成的跟进动作，避免投完就丢。",
        source: "opportunity",
        sourceLabel: "岗位管理",
        relatedEntityId: targetOpportunity.id,
      });
    }

    setSystemMessage(`[STATUS: ${status}]`);
  };

  const markOpportunityApplied = () => {
    if (!selectedOpportunity) return;
    applyOpportunityProgress(selectedOpportunity.id, "APPLIED", "manual", `使用 ${getResumeName(selectedOpportunity.resumeId)} 完成投递`);
  };

  const addSelectedQaToPractice = () => {
    createWeeklyTask({
      title: `练习：${selectedQa.question}`,
      detail: `来自${selectedInterview.company} / ${selectedInterview.round}，按推荐框架重写并练习表达。`,
      source: "interview",
      sourceLabel: "面试复盘",
      relatedEntityId: selectedInterview.id,
    });
    setPage("weekly");
  };

  const createAnswerCard = () => {
    const exists = answerCards.some((card) => card.question === selectedQa.question);
    if (!exists) {
      const newCard: AnswerCard = {
        id: makeId("AC"),
        question: selectedQa.question,
        type: selectedQa.type,
        status: selectedQa.weak ? "NEEDS PRACTICE" : "DRAFT",
        source: "面试复盘",
        framework: selectedQa.framework,
        answer: selectedQa.optimizedAnswer,
        relatedRoles: selectedInterview.role,
        practiceStatus: selectedQa.weak ? "练习中" : "未练习",
      };
      setAnswerCards((cards) => [newCard, ...cards]);
      setSelectedAnswerId(newCard.id);
      syncCreatedAnswerCard(newCard);
    }
    setPage("answers");
    setSystemMessage("[ANSWER CARD CREATED]");
  };

  return (
    <div className={`app ${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">JP</div>
          <div>
            <div className="brand-title">JobPilot</div>
            <div className="brand-subtitle">LOCAL OPS</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id || (page === "opportunityDetail" && item.id === "opportunities");
            return (
              <button key={item.id} className={`nav-item ${active ? "active" : ""}`} onClick={() => goTo(item.id)}>
                <Icon size={18} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="system-readout">
            <span>LOCAL DATA</span>
            <strong>{systemMessage}</strong>
          </div>
          <button className="icon-button" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="search-box">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索岗位、公司、下一步动作" />
          </div>
        </header>

        {page === "home" && (
          <section className="home-stack">
            <section className="flow-pipeline" aria-label="产品主链路">
              <div className="flow-pipeline-intro">
                <span className="eyebrow">主链路</span>
                <p>在对应模块里创建正式记录，系统再收束到今日待办。</p>
              </div>
              <ol className="flow-pipeline-steps">
                {flowPipelineSteps.map((step, index) => (
                  <li key={step.title} className="flow-step">
                    <span className="flow-step-index" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="flow-step-copy">
                      <strong>{step.title}</strong>
                      <span>{step.hint}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="home-main">
              <div className="today-panel surface">
                <div className="eyebrow">今日待办</div>
                <div className="today-heading">
                  <div>
                    <h1>今天先处理这几件事</h1>
                    <p>系统从岗位、面试、答案库和本周计划里收束出今天要执行的动作。</p>
                  </div>
                  <div className="hero-number small">{todayActions.length}</div>
                </div>
                <div className="hero-actions">
                  <button className="primary-button" onClick={() => openComposer("opportunity")}>
                    <BriefcaseBusiness size={16} />
                    <span>新增岗位</span>
                  </button>
                  <button className="secondary-button" onClick={() => goTo("opportunities")}>
                    <BriefcaseBusiness size={16} />
                    <span>查看岗位</span>
                  </button>
                </div>
                <div className="action-list attached">
                  {todayActions.map((action) => (
                    <button
                      className="action-row"
                      key={action.title}
                      onClick={() => {
                        if (action.filter) setFilter(action.filter);
                        if (action.page === "opportunityDetail") {
                          const targetOpportunityId = action.targetId || opportunities.find((item) => item.action === "P0")?.id || opportunities[0]?.id;
                          if (targetOpportunityId) openOpportunity(targetOpportunityId);
                        } else if (action.page === "interviews" && action.targetId) {
                          selectInterview(action.targetId);
                          goTo("interviews");
                        } else {
                          goTo(action.page);
                        }
                      }}
                    >
                      <span className={`priority ${action.level.toLowerCase()}`}>{action.level}</span>
                      <span>
                        <strong>{action.title}</strong>
                        <small>{action.detail}</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </div>

              <aside className="home-side">
                <div className="instrument-panel compact-metrics">
                  <button className="metric" onClick={() => goTo("opportunities")}>
                    <span>正式岗位</span>
                    <strong className="success">{opportunities.length}</strong>
                    <small>待投递 {toApplyCount} · 进行中 {inProgressCount}</small>
                  </button>
                  <button
                    className="metric"
                    onClick={() => {
                      setFilter("P0");
                      goTo("opportunities");
                    }}
                  >
                    <span>高优先级岗位</span>
                    <strong className="accent">{urgentCount}</strong>
                    <small>P0 {p0Count} · P1 {p1Count}</small>
                  </button>
                  <button className="metric" onClick={() => goTo("interviews")}>
                    <span>薄弱回答</span>
                    <strong className="warning">{pendingReviewCount}</strong>
                    <small>来自 {weakInterviewCount} 场面试</small>
                  </button>
                </div>

                <button
                  type="button"
                  className="surface weekly-strip weekly-strip-button"
                  onClick={() => goTo("weekly")}
                >
                  <SectionTitle label="本周进度" title="投递目标" action={`${submittedApplications}/${weeklyPlan.targetApplications}`} />
                  <SegmentedProgress value={(submittedApplications / weeklyPlan.targetApplications) * 100} segments={12} />
                  <div className="stat-rows">
                    <StatRow label="已投递" value={submittedApplications} />
                    <StatRow label="本周目标" value={weeklyPlan.targetApplications} />
                    <StatRow label="还差" value={applicationGap > 0 ? `${applicationGap} 个` : "已达标"} />
                    <StatRow label="本周面试" value="2" />
                  </div>
                </button>
              </aside>
            </section>
          </section>
        )}

        {page === "opportunities" && (
          <section className="surface table-page">
            <PageIntro
              label="岗位管理"
              title="你正在跟进的岗位"
              detail="按优先级、匹配度和截止时间安排下一步：投递、准备或跟进。"
              action={`${filteredOpportunities.length} ACTIVE`}
            />
            <div className="toolbar-row">
              <div className="filter-bar">
                {["ALL", "P0", "P1", "A PRIORITY", "HIGH MATCH", "DUE SOON"].map((item) => (
                  <button key={item} className={filter === item ? "active-filter" : ""} onClick={() => setFilter(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <div className="view-toggle">
                <button className="primary-chip" onClick={() => openComposer("opportunity")}>
                  <Plus size={14} />
                  新增岗位 / 上传 JD
                </button>
                <button className={viewMode === "table" ? "active-filter" : ""} onClick={() => setViewMode("table")}>
                  <FileText size={14} />
                  表格
                </button>
                <button className={viewMode === "board" ? "active-filter" : ""} onClick={() => setViewMode("board")}>
                  <KanbanSquare size={14} />
                  看板
                </button>
              </div>
            </div>

            {viewMode === "table" ? (
              <div className="opportunity-table">
                <div className="table-head">
                  <span>岗位</span>
                  <span>状态</span>
                  <span>优先级</span>
                  <span>截止</span>
                  <span>下一步动作</span>
                </div>
                {filteredOpportunities.map((item) => (
                  <button className="table-row table-button" key={item.id} onClick={() => openOpportunity(item.id)}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.company} / {item.city} / {getResumeName(item.resumeId)}</small>
                    </span>
                    <StatusPill status={item.status} />
                    <span className="signal-stack">
                      <b className={`priority ${item.action.toLowerCase()}`}>{item.action}</b>
                      <small>{item.priority} / {item.match}</small>
                    </span>
                    <span className="mono">{item.deadline}</span>
                    <span>{item.nextAction}</span>
                  </button>
                ))}
              </div>
            ) : (
              <BoardView opportunities={filteredOpportunities} openOpportunity={openOpportunity} />
            )}
          </section>
        )}

        {page === "opportunityDetail" && (
          <section className="split-page">
            <div className="surface">
              <button className="ghost-button back-button" onClick={() => goTo("opportunities")}>
                <ChevronLeft size={16} />
                <span>返回岗位管理</span>
              </button>
              <PageIntro
                label={selectedOpportunity.id}
                title={selectedOpportunity.title}
                detail="岗位详情把投递状态、使用的简历、下一步动作和时间线串在一起。后续面试、复盘和答案卡也会挂到这个岗位下。"
                action={selectedOpportunity.action}
              />
              <div className="source-panel">
                <SectionTitle label="原材料与 JD" title="投递依据都留在这里" action={`${selectedOpportunity.sourceAssets.length} FILES`} />
                <div className="source-list">
                  {selectedOpportunity.sourceAssets.map((asset) => (
                    <button className="source-item source-button" key={asset.id} onClick={() => setPreviewAsset(asset)}>
                      <div>
                        <span>{sourceKindLabel[asset.kind]}</span>
                        <strong>{asset.title}</strong>
                        <small>{asset.detail}</small>
                      </div>
                      <em>{asset.createdAt}</em>
                    </button>
                  ))}
                </div>
                <div className="jd-brief">
                  <span>JD 摘要</span>
                  <p>{selectedOpportunity.jdSummary}</p>
                  <span>JD 原文</span>
                  <textarea readOnly value={selectedOpportunity.jdText} />
                </div>
              </div>
              <div className="draft-grid">
                <StatRow label="公司" value={selectedOpportunity.company} />
                <StatRow label="状态" value={statusLabel[selectedOpportunity.status]} />
                <StatRow label="主观优先级" value={selectedOpportunity.priority} />
                <StatRow label="匹配度" value={selectedOpportunity.match} />
                <StatRow label="城市" value={selectedOpportunity.city} />
                <StatRow label="使用简历" value={getResumeName(selectedOpportunity.resumeId)} />
                <StatRow label="截止时间" value={selectedOpportunity.deadline} />
                <StatRow label="下一步" value={selectedOpportunity.nextAction} />
              </div>
              <div className="button-row">
                <button className="primary-button" onClick={markOpportunityApplied}>标记已投递</button>
                <button className="secondary-button" onClick={() => openComposer("interview", selectedOpportunity.id)}>添加面试</button>
              </div>
            </div>
            <div className="surface">
              <SectionTitle label="岗位进度" title="这条机会走到哪一步" action={statusLabel[selectedOpportunity.status]} />
              <OpportunityPipelineView stages={selectedOpportunityPipeline} />
              <div className="progress-controls">
                <span>手动覆盖进度</span>
                <div>
                  {opportunityStatusFlow.map((status) => (
                    <button
                      key={status}
                      className={selectedOpportunity.status === status ? "active-filter" : ""}
                      onClick={() => applyOpportunityProgress(selectedOpportunity.id, status, "manual")}
                    >
                      {statusLabel[status]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="timeline-log">
                <SectionTitle label="系统日志" title="系统和手动操作记录" action={`${selectedOpportunity.timeline.filter((item) => item.status === "done").length} DONE`} />
                <div className="timeline timeline-real">
                  {selectedOpportunity.timeline.map((event) => (
                    <div className={`timeline-row ${event.status}`} key={event.id}>
                      <span>{event.occurredAt}</span>
                      <div>
                        <strong>{event.title}</strong>
                        <small>{event.detail}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {page === "interviews" && (
          <section className="interview-page">
            <div className="surface interview-list-pane">
              <PageIntro
                label="面试复盘"
                title="按场次管理每次面试"
                detail="先选择一场面试，再点左侧问题。右侧会显示该问题的原回答、评价、推荐框架和具体回答表述，并且都可以编辑。"
                action={`${interviewSessions.length} SESSIONS`}
              />

              <div className="button-row tight-row">
                <button className="primary-button" onClick={() => openComposer("interview")}>
                  <Upload size={16} />
                  <span>上传录音 / 文字稿</span>
                </button>
              </div>

              <div className="interview-search">
                <Search size={14} />
                <input
                  value={interviewQuery}
                  onChange={(event) => {
                    setInterviewQuery(event.target.value);
                    setInterviewPage(0);
                  }}
                  placeholder="搜索公司、岗位、轮次"
                />
              </div>

              <div className="interview-tabs">
                {visibleInterviewSessions.map((session) => (
                  <button key={session.id} className={session.id === selectedInterview.id ? "active-session" : ""} onClick={() => selectInterview(session.id)}>
                    <strong>{session.company} / {session.round}</strong>
                    <small>{session.role} · {session.date}</small>
                  </button>
                ))}
              </div>

              <div className="pager-row">
                <button className="ghost-button compact-button" disabled={interviewPage === 0} onClick={() => setInterviewPage((pageIndex) => Math.max(0, pageIndex - 1))}>
                  上一页
                </button>
                <span>{interviewPage + 1} / {interviewPageCount}</span>
                <button className="ghost-button compact-button" disabled={interviewPage >= interviewPageCount - 1} onClick={() => setInterviewPage((pageIndex) => Math.min(interviewPageCount - 1, pageIndex + 1))}>
                  下一页
                </button>
              </div>

              <div className="interview-toolbar">
                <span>{selectedInterview.qaPairs.length} 个问题</span>
                <div className="mini-actions">
                  <button className="secondary-button compact-button" onClick={addQaPair}>
                    <Plus size={14} />
                    <span>添加问题</span>
                  </button>
                </div>
              </div>

              <div className="qa-list">
                {selectedInterview.qaPairs.map((pair) => (
                  <button className={`qa-card qa-card-button ${pair.weak ? "weak" : ""} ${pair.id === selectedQa.id ? "selected-qa" : ""}`} key={pair.id} onClick={() => setSelectedQaId(pair.id)}>
                    <div>
                      <span className="type-pill">{pair.type}</span>
                      <h3>{pair.question}</h3>
                      <p>{pair.critique}</p>
                    </div>
                    <div className="score">{pair.score}/5</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="surface review-editor">
              <SectionTitle label={`${selectedInterview.company} / ${selectedInterview.round}`} title={selectedQa.question} action={selectedQa.weak ? "需练习" : "可复用"} />

              <div className="source-panel compact-source">
                <SectionTitle label="原始材料" title="对应这场面试的文件" action={`${selectedInterview.sourceFiles?.length ?? 0} FILES`} />
                <div className="source-list">
                  {(selectedInterview.sourceFiles ?? []).map((file) => {
                    const Icon = file.kind === "audio" ? FileAudio : FileText;
                    return (
                      <div className="source-item file-source" key={file.id}>
                        <Icon size={18} />
                        <div>
                          <span>{file.kind === "audio" ? "原录音" : "文字稿"}</span>
                          <strong>{file.fileName}</strong>
                          <small>{file.detail}{file.duration ? ` / ${file.duration}` : ""}</small>
                        </div>
                        <em>{file.uploadedAt}</em>
                      </div>
                    );
                  })}
                </div>
              </div>

              <ReviewBlock label="记录原问题" value={selectedQa.question} readOnly />
              <ReviewBlock
                label="记录原回答"
                value={selectedQa.originalAnswer}
                onChange={(value) => updateSelectedQa("originalAnswer", value)}
              />
              <ReviewBlock
                label="评价"
                value={selectedQa.critique}
                onChange={(value) => updateSelectedQa("critique", value)}
              />
              <ReviewBlock
                label="推荐回答框架"
                value={selectedQa.framework}
                onChange={(value) => updateSelectedQa("framework", value)}
              />
              <ReviewBlock
                label="具体回答表述"
                value={selectedQa.optimizedAnswer}
                onChange={(value) => updateSelectedQa("optimizedAnswer", value)}
              />

              <div className="button-row">
                <button className="primary-button" onClick={createAnswerCard}>
                  <BookOpenCheck size={16} />
                  <span>生成答案卡</span>
                </button>
                <button
                  className="secondary-button"
                  onClick={addSelectedQaToPractice}
                >
                  <ClipboardList size={16} />
                  <span>加入练习</span>
                </button>
              </div>

              <div className="danger-zone">
                <span>危险操作</span>
                <button
                  className="destructive-button"
                  onClick={() =>
                    requestConfirm({
                      title: "删除这个问题？",
                      description: `「${selectedQa.question}」及其回答、评价会一并删除，且无法恢复。`,
                      confirmLabel: "删除问题",
                      onConfirm: deleteSelectedQa,
                    })
                  }
                >
                  删除当前问题
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "answers" && (
          <section className="answer-workspace">
            <div className="surface answer-list-pane">
              <PageIntro
                label="答案库"
                title="可复用回答和手动准备都在这里"
                detail="答案卡可以来自面试复盘，也可以手动创建。这里不再用“使用次数”做主要指标，而是看来源、适用岗位和练习状态。"
                action={`${answerCards.length} CARDS`}
              />
              <div className="button-row tight-row">
                <button className="primary-button" onClick={() => openComposer("answer")}>
                  <Plus size={16} />
                  <span>新增答案卡</span>
                </button>
                <button className="secondary-button" onClick={() => goTo("interviews")}>
                  <FileAudio size={16} />
                  <span>从复盘生成</span>
                </button>
              </div>
              <div className="answer-list">
                {answerCards.map((card) => (
                  <button
                    className={`answer-card answer-card-button ${selectedAnswer.id === card.id ? "selected-answer" : ""}`}
                    key={card.id}
                    onClick={() => setSelectedAnswerId(card.id)}
                  >
                    <span className="type-pill">{card.type}</span>
                    <h3>{card.question}</h3>
                    <small>{card.source} / {card.practiceStatus}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="surface answer-editor">
              <SectionTitle label={selectedAnswer.source} title={selectedAnswer.question} action={selectedAnswer.status} />
              <ReviewBlock label="问题" value={selectedAnswer.question} onChange={(value) => updateSelectedAnswer("question", value)} />
              <ReviewBlock label="回答框架" value={selectedAnswer.framework} onChange={(value) => updateSelectedAnswer("framework", value)} />
              <ReviewBlock label="推荐回答" value={selectedAnswer.answer} onChange={(value) => updateSelectedAnswer("answer", value)} />
              <ReviewBlock label="适用岗位" value={selectedAnswer.relatedRoles} onChange={(value) => updateSelectedAnswer("relatedRoles", value)} />
              <div className="inline-controls">
                <label>
                  <span>状态</span>
                  <select value={selectedAnswer.status} onChange={(event) => updateSelectedAnswer("status", event.target.value)}>
                    <option>DRAFT</option>
                    <option>ACTIVE</option>
                    <option>NEEDS PRACTICE</option>
                  </select>
                </label>
                <label>
                  <span>练习状态</span>
                  <select value={selectedAnswer.practiceStatus} onChange={(event) => updateSelectedAnswer("practiceStatus", event.target.value)}>
                    <option>未练习</option>
                    <option>练习中</option>
                    <option>可复用</option>
                  </select>
                </label>
              </div>

              <div className="danger-zone">
                <span>危险操作</span>
                <button
                  className="destructive-button"
                  onClick={() =>
                    requestConfirm({
                      title: "删除这张答案卡？",
                      description: `「${selectedAnswer.question}」删除后无法恢复。`,
                      confirmLabel: "删除卡片",
                      onConfirm: deleteSelectedAnswer,
                    })
                  }
                >
                  删除当前卡
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "resumes" && (
          <section className="resume-workspace">
            <div className="surface resume-list-pane">
              <PageIntro
                label="简历版本"
                title="管理你上传的几份不同简历文件"
                detail="这里存的是简历文件本身和它的定位。某个岗位实际用了哪版简历，会在岗位详情里作为投递记录出现。"
                action={`${resumeList.length} FILES`}
              />
              <div className="button-row tight-row">
                <button className="primary-button" onClick={addResumeVersion}>
                  <Upload size={16} />
                  <span>上传简历版本</span>
                </button>
                <button className="secondary-button" onClick={() => goTo("opportunities")}>
                  <BriefcaseBusiness size={16} />
                  <span>查看投递使用</span>
                </button>
              </div>
              <div className="resume-list">
                {resumeList.map((resume) => (
                  <button
                    className={`resume-row resume-button ${selectedResume.id === resume.id ? "selected-resume" : ""}`}
                    key={resume.id}
                    onClick={() => setSelectedResumeId(resume.id)}
                  >
                    <FileText size={18} />
                    <span>
                      <strong>{resume.name}</strong>
                      <small>{resume.fileName}</small>
                    </span>
                    <span>{resume.roles}</span>
                    <b>{resume.fileType}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className="surface resume-detail-pane">
              <SectionTitle label={selectedResume.id} title={selectedResume.name} action={selectedResume.fileType} />
              <div className="file-preview">
                <FileText size={28} />
                <div>
                  <strong>{selectedResume.fileName}</strong>
                  <small>{selectedResume.fileSize} / uploaded {selectedResume.uploadedAt}</small>
                </div>
                <button className="secondary-button compact-button" onClick={() => setSystemMessage("[FILE PREVIEW OPENED]")}>预览文件</button>
              </div>
              <ReviewBlock label="版本名称" value={selectedResume.name} onChange={(value) => updateSelectedResume("name", value)} />
              <ReviewBlock label="适合方向" value={selectedResume.roles} onChange={(value) => updateSelectedResume("roles", value)} />
              <ReviewBlock label="核心卖点" value={selectedResume.points} onChange={(value) => updateSelectedResume("points", value)} />
              <ReviewBlock label="文件摘要" value={selectedResume.summary} onChange={(value) => updateSelectedResume("summary", value)} />
              <div className="linked-list">
                <span>已关联岗位</span>
                {linkedResumeOpportunities.length === 0 ? (
                  <small>暂未用于投递。使用关系会从岗位详情产生。</small>
                ) : (
                  linkedResumeOpportunities.map((opportunity) => {
                    return (
                      <button key={opportunity.id} onClick={() => openOpportunity(opportunity.id)}>
                        <strong>{opportunity.title}</strong>
                        <small>{opportunity.company}</small>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="danger-zone">
                <span>危险操作</span>
                <button
                  className="destructive-button"
                  onClick={() =>
                    requestConfirm({
                      title: "删除这个简历版本？",
                      description: `「${selectedResume.name}」删除后无法恢复；已关联此版本的岗位需要重新选择简历。`,
                      confirmLabel: "删除简历版本",
                      onConfirm: deleteSelectedResume,
                    })
                  }
                >
                  删除当前简历版本
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "weekly" && (
          <section className="weekly-workspace">
            <div className="surface weekly-editor">
              <PageIntro
                label="本周计划"
                title="把方向约束成可执行动作"
                detail="本周计划不是日历，而是求职行动的上游约束：手动设目标和方向，系统从岗位、面试和答案库里自动生成可执行动作。"
                action={`${weeklyPlan.tasks.filter((task) => task.status === "open").length} OPEN`}
              />
              <div className="weekly-linkage">
                <div>
                  <span>自动进入</span>
                  <strong>已投递数量、岗位跟进、面试练习、答案复用</strong>
                </div>
                <div>
                  <span>手动维护</span>
                  <strong>目标投递数、重点方向、城市、公司、额外动作</strong>
                </div>
              </div>
              <div className="weekly-target-row">
                <label>
                  <span>系统统计已投递</span>
                  <input
                    type="number"
                    value={submittedApplications}
                    readOnly
                  />
                </label>
                <label>
                  <span>目标投递</span>
                  <input
                    type="number"
                    value={weeklyPlan.targetApplications}
                    onChange={(event) => updateWeeklyTargetApplications(Number(event.target.value))}
                  />
                </label>
              </div>
              <SegmentedProgress value={(submittedApplications / weeklyPlan.targetApplications) * 100} segments={12} />

              <WeeklyTagEditor label="重点方向" values={weeklyPlan.focusDirections} onAdd={(value) => addWeeklyFocus("focusDirections", value)} onUse={promoteFocusToTask} />
              <WeeklyTagEditor label="重点城市" values={weeklyPlan.focusCities} onAdd={(value) => addWeeklyFocus("focusCities", value)} onUse={promoteFocusToTask} />
              <WeeklyTagEditor label="重点公司" values={weeklyPlan.focusCompanies} onAdd={(value) => addWeeklyFocus("focusCompanies", value)} onUse={promoteFocusToTask} />
              <WeeklyTagEditor label="练习主题" values={weeklyPlan.practiceThemes} onAdd={(value) => addWeeklyFocus("practiceThemes", value)} onUse={promoteFocusToTask} />
            </div>

            <div className="surface weekly-task-pane">
              <SectionTitle label="会进入今日待办" title="本周动作" action="CONNECTED" />
              <button className="primary-button" onClick={addWeeklyTask}>
                <Plus size={16} />
                <span>添加本周动作</span>
              </button>
              <div className="weekly-task-list">
                {weeklyPlan.tasks.map((task) => (
                  <div className="weekly-task" key={task.id}>
                    <span>{task.sourceLabel}</span>
                    <input value={task.title} onChange={(event) => updateWeeklyTask(task.id, "title", event.target.value)} />
                    <textarea value={task.detail} onChange={(event) => updateWeeklyTask(task.id, "detail", event.target.value)} />
                    <button
                      className={task.status === "done" ? "secondary-button compact-button" : "primary-button compact-button"}
                      onClick={() => updateWeeklyTask(task.id, "status", task.status === "done" ? "open" : "done")}
                    >
                      {task.status === "done" ? "重新打开" : "标记完成"}
                    </button>
                    <button
                      className="destructive-button compact-button"
                      onClick={() =>
                        requestConfirm({
                          title: "删除这条本周动作？",
                          description: `「${task.title}」删除后不再出现在本周计划和今日待办。`,
                          confirmLabel: "删除动作",
                          onConfirm: () => deleteWeeklyTask(task.id),
                        })
                      }
                    >
                      删除动作
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {page === "exports" && (
          <section className="surface">
            <PageIntro
              label="设置导出"
              title="本地数据的备份和导出"
              detail="MVP 先保证数据可带走：答案卡、面试复盘、知识库和数据库备份都应该能导出。"
              action="MANUAL"
            />
            <div className="settings-grid">
              <ExportAction icon={Archive} title="备份数据库和上传文件" detail="生成本地 zip 备份包。" onClick={() => setSystemMessage("[BACKUP QUEUED]")} />
              <ExportAction icon={FileDown} title="导出答案卡" detail="导出 Markdown 复习材料。" onClick={() => setSystemMessage("[ANSWER CARDS EXPORTED]")} />
              <ExportAction icon={PanelRight} title="导出面试复盘" detail="包含 QA、批评点和优化答案。" onClick={() => setSystemMessage("[REVIEWS EXPORTED]")} />
              <ExportAction icon={Settings} title="AI 设置" detail="后续配置模型和解析能力。" onClick={() => setSystemMessage("[SETTINGS OPENED]")} />
            </div>
          </section>
        )}

        {composer && (
          <div className="asset-preview" role="dialog" aria-modal="true">
            <div className="asset-preview-panel module-composer-panel">
              <SectionTitle
                label={composerStep === "source" ? "步骤 1 / 2" : "步骤 2 / 2"}
                title={
                  composer === "opportunity"
                    ? "新增岗位 / 上传 JD"
                    : composer === "interview"
                      ? "新增面试复盘"
                      : composer === "resume"
                        ? "上传简历版本"
                        : "新增答案卡"
                }
                action={composerStep === "source" ? "SOURCE" : "PARSED"}
              />
              <p>
                {composerStep === "source"
                  ? "先选择原始文件，或直接粘贴文字内容。下一步会在前端原型里模拟自动解析，生成可编辑的字段草稿。"
                  : "系统已经生成字段草稿。你只需要检查自动解析结果，并补齐必填字段或可选备注，然后创建正式记录。"}
              </p>

              <div className="composer-steps">
                <span className={composerStep === "source" ? "active-step" : ""}>01 原始材料</span>
                <span className={composerStep === "review" ? "active-step" : ""}>02 解析与补齐</span>
              </div>

              {composerStep === "source" && composer !== "answer" && (
                <div className="composer-source-grid">
                  <label className="upload-dropzone">
                    <Upload size={22} />
                    <strong>{composerSource.fileName || "选择文件"}</strong>
                    <small>
                      {composer === "opportunity"
                        ? "支持 JD 截图、PDF、文本文件，也可以只粘贴文字 JD。"
                        : composer === "interview"
                          ? "支持录音、录音转写稿或面试文字稿。"
                          : "支持 PDF / DOC / DOCX 简历文件。"}
                    </small>
                    <input
                      type="file"
                      accept={
                        composer === "opportunity"
                          ? "image/*,.pdf,.txt,.md"
                          : composer === "interview"
                            ? "audio/*,.txt,.md,.doc,.docx"
                            : ".pdf,.doc,.docx"
                      }
                      onChange={(event) => handleComposerFileSelected(event.target.files)}
                    />
                  </label>

                  <div className="source-side">
                    <label>
                      <span>材料类型</span>
                      <select value={composerSource.sourceKind} onChange={(event) => updateComposerSource("sourceKind", event.target.value)}>
                        {composer === "opportunity" && (
                          <>
                            <option value="jd-text">文字 JD / PDF</option>
                            <option value="screenshot">JD 截图</option>
                            <option value="job-link">招聘链接</option>
                          </>
                        )}
                        {composer === "interview" && (
                          <>
                            <option value="audio">面试录音</option>
                            <option value="transcript">文字稿</option>
                          </>
                        )}
                        {composer === "resume" && <option value="resume-file">简历文件</option>}
                      </select>
                    </label>
                    <label>
                      <span>备注（可选）</span>
                      <input value={composerSource.note} onChange={(event) => updateComposerSource("note", event.target.value)} placeholder="来源、轮次、重点方向等" />
                    </label>
                  </div>

                  <label className="wide-field source-text-input">
                    <span>
                      {composer === "opportunity"
                        ? "JD 文字内容（可选）"
                        : composer === "interview"
                          ? "面试文字稿 / 录音转写（可选）"
                          : "简历文字或补充说明（可选）"}
                    </span>
                    <textarea
                      value={composerSource.rawText}
                      onChange={(event) => updateComposerSource("rawText", event.target.value)}
                      placeholder={
                        composer === "opportunity"
                          ? "如果没有文件，可以直接粘贴 JD。真实版本会从截图 / PDF 自动解析。"
                          : composer === "interview"
                            ? "如果上传录音，这里可以留空；真实版本会自动转写并拆分问题。"
                            : "可以粘贴简历摘要，真实版本会从文件自动解析。"
                      }
                    />
                  </label>
                </div>
              )}

              {composerStep === "review" && (
              <div className="draft-edit-grid composer-grid">
                {composer === "opportunity" && (
                  <>
                    <label>
                      <span>公司 *</span>
                      <input value={composerDraft.company} onChange={(event) => updateComposerDraft("company", event.target.value)} />
                    </label>
                    <label>
                      <span>岗位名称 *</span>
                      <input value={composerDraft.title} onChange={(event) => updateComposerDraft("title", event.target.value)} />
                    </label>
                    <label>
                      <span>城市</span>
                      <input value={composerDraft.city} onChange={(event) => updateComposerDraft("city", event.target.value)} />
                    </label>
                    <label>
                      <span>截止时间</span>
                      <input value={composerDraft.deadline} onChange={(event) => updateComposerDraft("deadline", event.target.value)} />
                    </label>
                    <label>
                      <span>主观优先级</span>
                      <select value={composerDraft.priority} onChange={(event) => updateComposerDraft("priority", event.target.value)}>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </label>
                    <label>
                      <span>匹配度</span>
                      <select value={composerDraft.match} onChange={(event) => updateComposerDraft("match", event.target.value)}>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </label>
                    <label>
                      <span>今日动作级别</span>
                      <select value={composerDraft.action} onChange={(event) => updateComposerDraft("action", event.target.value)}>
                        <option value="P0">P0</option>
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                        <option value="P3">P3</option>
                      </select>
                    </label>
                    <label>
                      <span>投递简历</span>
                      <select value={composerDraft.resumeId} onChange={(event) => updateComposerDraft("resumeId", event.target.value)}>
                        {resumeList.map((resume) => (
                          <option value={resume.id} key={resume.id}>{resume.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="wide-field">
                      <span>来源 / 备注</span>
                      <input value={composerDraft.sourceLabel} onChange={(event) => updateComposerDraft("sourceLabel", event.target.value)} />
                    </label>
                    <label className="wide-field">
                      <span>下一步动作</span>
                      <input value={composerDraft.nextAction} onChange={(event) => updateComposerDraft("nextAction", event.target.value)} />
                    </label>
                    <label className="wide-field">
                      <span>JD 原文 *</span>
                      <textarea value={composerDraft.sourceText} onChange={(event) => updateComposerDraft("sourceText", event.target.value)} />
                    </label>
                  </>
                )}

                {composer === "interview" && (
                  <>
                    <label>
                      <span>公司 *</span>
                      <input value={composerDraft.company} onChange={(event) => updateComposerDraft("company", event.target.value)} />
                    </label>
                    <label>
                      <span>岗位 *</span>
                      <input value={composerDraft.role} onChange={(event) => updateComposerDraft("role", event.target.value)} />
                    </label>
                    <label>
                      <span>轮次 *</span>
                      <input value={composerDraft.round} onChange={(event) => updateComposerDraft("round", event.target.value)} />
                    </label>
                    <label>
                      <span>日期</span>
                      <input value={composerDraft.date} onChange={(event) => updateComposerDraft("date", event.target.value)} />
                    </label>
                    <label className="wide-field">
                      <span>关联岗位</span>
                      <select value={composerDraft.linkedOpportunityId} onChange={(event) => updateComposerDraft("linkedOpportunityId", event.target.value)}>
                        <option value="">暂不关联</option>
                        {opportunities.map((opportunity) => (
                          <option value={opportunity.id} key={opportunity.id}>{opportunity.company} / {opportunity.title}</option>
                        ))}
                      </select>
                    </label>
                    <label className="wide-field">
                      <span>原文件名</span>
                      <input value={composerDraft.fileName} onChange={(event) => updateComposerDraft("fileName", event.target.value)} placeholder="recording.m4a 或 transcript.txt" />
                    </label>
                    <label className="wide-field">
                      <span>原录音转写 / 面试文字稿</span>
                      <textarea value={composerDraft.sourceText} onChange={(event) => updateComposerDraft("sourceText", event.target.value)} />
                    </label>
                  </>
                )}

                {composer === "resume" && (
                  <>
                    <label>
                      <span>版本名称 *</span>
                      <input value={composerDraft.title} onChange={(event) => updateComposerDraft("title", event.target.value)} />
                    </label>
                    <label>
                      <span>文件名 *</span>
                      <input value={composerDraft.fileName} onChange={(event) => updateComposerDraft("fileName", event.target.value)} placeholder="resume-v1.pdf" />
                    </label>
                    <label className="wide-field">
                      <span>适合方向</span>
                      <input value={composerDraft.roles} onChange={(event) => updateComposerDraft("roles", event.target.value)} />
                    </label>
                    <label className="wide-field">
                      <span>核心卖点</span>
                      <textarea value={composerDraft.points} onChange={(event) => updateComposerDraft("points", event.target.value)} />
                    </label>
                    <label className="wide-field">
                      <span>文件摘要</span>
                      <textarea value={composerDraft.summary} onChange={(event) => updateComposerDraft("summary", event.target.value)} />
                    </label>
                  </>
                )}

                {composer === "answer" && (
                  <>
                    <label className="wide-field">
                      <span>问题 *</span>
                      <input value={composerDraft.question} onChange={(event) => updateComposerDraft("question", event.target.value)} />
                    </label>
                    <label className="wide-field">
                      <span>回答框架</span>
                      <textarea value={composerDraft.framework} onChange={(event) => updateComposerDraft("framework", event.target.value)} />
                    </label>
                    <label className="wide-field">
                      <span>具体回答</span>
                      <textarea value={composerDraft.answer} onChange={(event) => updateComposerDraft("answer", event.target.value)} />
                    </label>
                    <label className="wide-field">
                      <span>适用岗位</span>
                      <input value={composerDraft.relatedRoles} onChange={(event) => updateComposerDraft("relatedRoles", event.target.value)} />
                    </label>
                  </>
                )}
              </div>
              )}

              <div className="button-row">
                {composerStep === "source" && composer !== "answer" ? (
                  <button className="primary-button" onClick={runComposerParse}>
                    <Sparkles size={16} />
                    <span>开始解析</span>
                  </button>
                ) : (
                  <button className="primary-button" onClick={submitComposer}>
                    <Check size={16} />
                    <span>创建正式记录</span>
                  </button>
                )}
                {composerStep === "review" && composer !== "answer" && (
                  <button className="secondary-button" onClick={() => setComposerStep("source")}>返回材料</button>
                )}
                <button className="ghost-button" onClick={() => setComposer(null)}>取消</button>
              </div>
            </div>
          </div>
        )}

        {previewAsset && (
          <div className="asset-preview" role="dialog" aria-modal="true">
            <div className="asset-preview-panel">
              <SectionTitle label={sourceKindLabel[previewAsset.kind]} title={previewAsset.title} action={previewAsset.createdAt} />
              <p>{previewAsset.detail}</p>
              <textarea readOnly value={previewAsset.content || "当前原材料只有元信息。后续接文件库后，这里会打开真实文件、截图或链接内容。"} />
              <div className="button-row">
                {previewAsset.kind === "job-link" && previewAsset.content?.startsWith("http") && (
                  <button className="secondary-button" onClick={() => window.open(previewAsset.content, "_blank", "noopener,noreferrer")}>打开链接</button>
                )}
                <button className="primary-button" onClick={() => setPreviewAsset(null)}>关闭预览</button>
              </div>
            </div>
          </div>
        )}

        {confirmDialog && (
          <div
            className="asset-preview confirm-dialog"
            role="dialog"
            aria-modal="true"
            onClick={() => setConfirmDialog(null)}
          >
            <div className="asset-preview-panel confirm-panel" onClick={(event) => event.stopPropagation()}>
              <div className="section-title">
                <span>确认删除</span>
                <h2>{confirmDialog.title}</h2>
              </div>
              <p>{confirmDialog.description}</p>
              <div className="button-row confirm-actions">
                <button className="secondary-button" onClick={() => setConfirmDialog(null)}>
                  取消
                </button>
                <button
                  className="destructive-button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                >
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PageIntro({ label, title, detail, action }: { label: string; title: string; detail: string; action: string }) {
  return (
    <div className="page-intro">
      <div className="section-title">
        <span>{label}</span>
        <h2>{title}</h2>
        <em>{action}</em>
      </div>
      <p>{detail}</p>
    </div>
  );
}

function SectionTitle({ label, title, action }: { label: string; title: string; action: string }) {
  return (
    <div className="section-title">
      <span>{label}</span>
      <h2>{title}</h2>
      <em>{action}</em>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OpportunityPipelineView({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="opportunity-pipeline">
      {stages.map((stage, index) => (
        <div className={`pipeline-stage ${stage.state}`} key={stage.key}>
          <span className="pipeline-index">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <div className="pipeline-title-row">
              <strong>{stage.label}</strong>
              <em>{stage.source === "system" ? "SYSTEM" : "MANUAL"}</em>
            </div>
            <small>{stage.detail}</small>
            {stage.subItems && stage.subItems.length > 0 && (
              <div className="pipeline-subitems">
                {stage.subItems.map((item) => (
                  <span className={item.state} key={`${stage.key}-${item.label}-${item.detail}`}>
                    <b>{item.label}</b>
                    <small>{item.detail}</small>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewBlock({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="review-block">
      <span>{label}</span>
      <textarea readOnly={readOnly} value={value} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

function WeeklyTagEditor({
  label,
  values,
  onAdd,
  onUse,
}: {
  label: string;
  values: string[];
  onAdd: (value: string) => void;
  onUse: (label: string, value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="weekly-tags">
      <span>{label}</span>
      <div className="focus-grid">
        {values.map((item) => (
          <button key={item} onClick={() => onUse(label, item)}>{item}</button>
        ))}
      </div>
      <div className="tag-input-row">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`添加${label}`} />
        <button
          className="secondary-button compact-button"
          onClick={() => {
            onAdd(draft);
            setDraft("");
          }}
        >
          添加
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Opportunity["status"] }) {
  return <span className={`status-pill ${status.toLowerCase().replace(/\s/g, "-")}`}>{statusLabel[status]}</span>;
}


function SegmentedProgress({ value, segments }: { value: number; segments: number }) {
  const filled = Math.round((value / 100) * segments);
  return (
    <div className="segmented-progress" aria-label={`${value}%`} style={{ "--segments": segments } as CSSProperties}>
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className={index < filled ? "filled" : ""} />
      ))}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

function BoardView({ opportunities, openOpportunity }: { opportunities: Opportunity[]; openOpportunity: (id: string) => void }) {
  return (
    <section className="board board-embedded">
      {opportunityStatusFlow.map((status) => (
        <div className="board-column" key={status}>
          <SectionTitle label="看板分组" title={statusLabel[status as Opportunity["status"]]} action={`${opportunities.filter((item) => item.status === status).length}`} />
          {opportunities
            .filter((item) => item.status === status)
            .map((item) => (
              <button className="job-card job-card-button" key={item.id} onClick={() => openOpportunity(item.id)}>
                <span className={`priority ${item.action.toLowerCase()}`}>{item.action}</span>
                <h3>{item.title}</h3>
                <p>{item.company}</p>
                <small>{item.nextAction}</small>
              </button>
            ))}
        </div>
      ))}
    </section>
  );
}

function ExportAction({
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  icon: typeof Archive;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className="export-action" onClick={onClick}>
      <Icon size={20} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <Send size={16} />
    </button>
  );
}

export default App;
