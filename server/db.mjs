import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const DB_PATH = process.env.JOBPILOT_DB_PATH || path.join(DATA_DIR, "jobpilot.local.sqlite");

const submittedStatuses = ["APPLIED", "WRITTEN TEST", "INTERVIEWING", "WAITING", "OFFER"];
const opportunityStatusAction = {
  "TO APPLY": "P0",
  APPLIED: "P1",
  "WRITTEN TEST": "P1",
  INTERVIEWING: "P1",
  WAITING: "P2",
  OFFER: "P3",
};
const opportunityStatusNextAction = {
  "TO APPLY": "补齐材料后投递",
  APPLIED: "三天后跟进投递结果",
  "WRITTEN TEST": "完成笔试并记录结果",
  INTERVIEWING: "准备下一轮面试",
  WAITING: "等待反馈并定期跟进",
  OFFER: "整理 offer 对比和入职材料",
};

const nowIso = () => new Date().toISOString();
let idSequence = 0;
const makeId = (prefix) => {
  idSequence = (idSequence + 1) % 10000;
  return `${prefix}-${Date.now().toString().slice(-5)}-${idSequence.toString().padStart(4, "0")}-${Math.floor(Math.random() * 90 + 10)}`;
};
const sequenceIso = (index) => new Date(Date.now() + index).toISOString();

const rowsToMap = (rows, key) =>
  rows.reduce((groups, row) => {
    const groupKey = row[key];
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(row);
    return groups;
  }, new Map());

const parseJson = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const toOpportunity = (row, sourceAssets = [], timeline = []) => ({
  id: row.id,
  title: row.title,
  company: row.company,
  status: row.status,
  priority: row.priority,
  match: row.match,
  action: row.action,
  city: row.city,
  deadline: row.deadline,
  resumeId: row.resume_id ?? "",
  nextAction: row.next_action,
  jdSummary: row.jd_summary,
  jdText: row.jd_text,
  sourceAssets,
  timeline,
});

const toSourceAsset = (row) => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  detail: row.detail,
  createdAt: row.created_at,
  content: row.content ?? undefined,
});

const toTimelineEvent = (row) => ({
  id: row.id,
  occurredAt: row.occurred_at,
  title: row.title,
  detail: row.detail,
  status: row.status,
});

const toSessionFile = (row) => ({
  id: row.id,
  kind: row.kind,
  fileName: row.file_name,
  detail: row.detail,
  uploadedAt: row.uploaded_at,
  duration: row.duration ?? undefined,
});

const toQaPair = (row) => ({
  id: row.id,
  question: row.question,
  originalAnswer: row.original_answer,
  type: row.type,
  score: row.score,
  critique: row.critique,
  weak: Boolean(row.weak),
  framework: row.framework,
  optimizedAnswer: row.optimized_answer,
});

const toInterviewSession = (row, sourceFiles = [], qaPairs = []) => ({
  id: row.id,
  opportunityId: row.opportunity_id ?? undefined,
  company: row.company,
  role: row.role,
  round: row.round,
  date: row.date,
  sourceFiles,
  qaPairs,
});

const toAnswerCard = (row) => ({
  id: row.id,
  question: row.question,
  type: row.type,
  status: row.status,
  source: row.source,
  framework: row.framework,
  answer: row.answer,
  relatedRoles: row.related_roles,
  practiceStatus: row.practice_status,
});

const toResumeVersion = (row, linkedOpportunityIds = []) => ({
  id: row.id,
  name: row.name,
  fileName: row.file_name,
  fileType: row.file_type,
  fileSize: row.file_size,
  uploadedAt: row.uploaded_at,
  roles: row.roles,
  points: row.points,
  summary: row.summary,
  linkedOpportunityIds,
});

const toWeeklyTask = (row) => ({
  id: row.id,
  title: row.title,
  detail: row.detail,
  source: row.source,
  sourceLabel: row.source_label,
  relatedEntityId: row.related_entity_id ?? undefined,
  status: row.status,
});

const createSchema = (db) => {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      match TEXT NOT NULL,
      action TEXT NOT NULL,
      city TEXT NOT NULL,
      deadline TEXT NOT NULL,
      resume_id TEXT,
      next_action TEXT NOT NULL,
      jd_summary TEXT NOT NULL,
      jd_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS opportunity_source_assets (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      content TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS opportunity_timeline_events (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      round TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
    );

    CREATE TABLE IF NOT EXISTS interview_source_files (
      id TEXT PRIMARY KEY,
      interview_session_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      file_name TEXT NOT NULL,
      detail TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      duration TEXT,
      storage_uri TEXT,
      FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS qa_pairs (
      id TEXT PRIMARY KEY,
      interview_session_id TEXT NOT NULL,
      question TEXT NOT NULL,
      original_answer TEXT NOT NULL,
      type TEXT NOT NULL,
      score INTEGER NOT NULL,
      critique TEXT NOT NULL,
      weak INTEGER NOT NULL,
      framework TEXT NOT NULL,
      optimized_answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answer_cards (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      source_qa_pair_id TEXT,
      framework TEXT NOT NULL,
      answer TEXT NOT NULL,
      related_roles TEXT NOT NULL,
      practice_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resume_versions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      roles TEXT NOT NULL,
      points TEXT NOT NULL,
      summary TEXT NOT NULL,
      storage_uri TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_plans (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      target_applications INTEGER NOT NULL,
      focus_directions_json TEXT NOT NULL,
      focus_cities_json TEXT NOT NULL,
      focus_companies_json TEXT NOT NULL,
      practice_themes_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_tasks (
      id TEXT PRIMARY KEY,
      weekly_plan_id TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      source TEXT NOT NULL,
      source_label TEXT NOT NULL,
      related_entity_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE
    );
  `);
};

const seedDatabase = (db) => {
  const count = db.prepare("SELECT COUNT(*) AS count FROM opportunities").get().count;
  if (count > 0) return;

  const createdAt = nowIso();
  const insertOpportunity = db.prepare(`
    INSERT INTO opportunities (
      id, title, company, status, priority, match, action, city, deadline, resume_id,
      next_action, jd_summary, jd_text, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSource = db.prepare(`
    INSERT INTO opportunity_source_assets (
      id, opportunity_id, kind, title, detail, content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTimeline = db.prepare(`
    INSERT INTO opportunity_timeline_events (
      id, opportunity_id, occurred_at, title, detail, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertInterview = db.prepare(`
    INSERT INTO interview_sessions (
      id, opportunity_id, company, role, round, date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFile = db.prepare(`
    INSERT INTO interview_source_files (
      id, interview_session_id, kind, file_name, detail, uploaded_at, duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertQa = db.prepare(`
    INSERT INTO qa_pairs (
      id, interview_session_id, question, original_answer, type, score, critique,
      weak, framework, optimized_answer, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAnswer = db.prepare(`
    INSERT INTO answer_cards (
      id, question, type, status, source, framework, answer, related_roles,
      practice_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertResume = db.prepare(`
    INSERT INTO resume_versions (
      id, name, file_name, file_type, file_size, uploaded_at, roles, points,
      summary, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPlan = db.prepare(`
    INSERT INTO weekly_plans (
      id, week_start, target_applications, focus_directions_json, focus_cities_json,
      focus_companies_json, practice_themes_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTask = db.prepare(`
    INSERT INTO weekly_tasks (
      id, weekly_plan_id, title, detail, source, source_label, related_entity_id,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const opportunities = [
    [
      "OP-021",
      "前端开发实习生",
      "字节跳动",
      "TO APPLY",
      "A",
      "HIGH",
      "P0",
      "上海",
      "Tomorrow",
      "RV-101",
      "补充低代码项目指标后投递",
      "前端开发实习生，偏低代码平台和业务组件。需要 React、性能优化、组件库经验，并能讲清项目指标。",
      "岗位职责：参与低代码平台前端模块开发，负责业务组件沉淀、页面性能优化和跨端体验改进。岗位要求：熟悉 React、TypeScript、组件化开发，有性能优化或工程化经验优先。",
    ],
    [
      "OP-020",
      "增长产品实习生",
      "小红书",
      "INTERVIEWING",
      "A",
      "MEDIUM",
      "P1",
      "上海",
      "May 28",
      "RV-102",
      "准备业务拆解和反问",
      "增长产品实习生，关注用户增长、数据分析、实验设计和业务拆解。当前已进入面试阶段。",
      "岗位职责：参与增长策略设计、用户行为分析和实验复盘。岗位要求：具备数据分析意识，能拆解业务问题，有产品或运营项目经验优先。",
    ],
    [
      "OP-019",
      "数据分析实习生",
      "美团",
      "APPLIED",
      "B",
      "HIGH",
      "P1",
      "北京",
      "May 31",
      "RV-103",
      "三天后跟进内推人",
      "数据分析实习生，偏 SQL、Python、指标体系和业务分析。已投递，下一步是跟进内推反馈。",
      "岗位职责：负责业务数据分析、指标看板建设和专题分析。岗位要求：熟悉 SQL/Python，能建立指标体系，有互联网业务分析项目经验优先。",
    ],
    [
      "OP-018",
      "AI 产品运营实习生",
      "快手",
      "WAITING",
      "B",
      "MEDIUM",
      "P2",
      "杭州",
      "Jun 03",
      "RV-102",
      "整理 AIGC 案例库",
      "AI 产品运营实习生，关注 AIGC 案例库、运营策略和内容数据复盘。当前等待结果。",
      "岗位职责：参与 AI 产品运营、内容策略制定和用户反馈整理。岗位要求：理解 AIGC 工具，具备内容运营和数据复盘经验。",
    ],
  ];

  for (const item of opportunities) insertOpportunity.run(...item, createdAt, createdAt);

  [
    ["SRC-021-1", "OP-021", "jd-text", "岗位 JD 文本", "从岗位管理内新增后生成正式记录", opportunities[0][12], "May 24 22:11"],
    ["SRC-021-2", "OP-021", "screenshot", "招聘页截图", "保留原始招聘页，方便后续核对岗位要求", "截图预览占位：招聘页标题、公司、岗位要求、截止时间和投递入口会保存在本地文件库。", "May 24 22:12"],
    ["SRC-020-1", "OP-020", "job-link", "招聘链接", "来自小红书校招页面", "https://job.xiaohongshu.com/growth-product-intern", "May 20 19:40"],
    ["SRC-020-2", "OP-020", "referral-note", "内推备注", "内推人建议重点准备增长案例", "内推人备注：业务面会重点看增长拆解、指标意识和反问质量。", "May 21 10:05"],
    ["SRC-019-1", "OP-019", "job-link", "招聘链接", "来自美团招聘官网", "https://zhaopin.meituan.com/job/business-analysis-intern", "May 21 20:14"],
    ["SRC-019-2", "OP-019", "jd-text", "JD 原文", "系统从链接中提取并保留原文", opportunities[2][12], "May 21 20:16"],
    ["SRC-019-3", "OP-019", "referral-note", "内推沟通记录", "内推人建议突出 SQL 和指标体系", "沟通记录：简历里 SQL 和指标体系要放到第一屏，投递后 3 天可跟进。", "May 21 20:24"],
    ["SRC-018-1", "OP-018", "jd-text", "JD 文本", "来自手动粘贴的岗位说明", opportunities[3][12], "May 18 21:30"],
    ["SRC-018-2", "OP-018", "screenshot", "岗位截图", "保留招聘页面关键要求", "截图预览占位：快手 AI 产品运营实习生招聘页。", "May 18 21:31"],
  ].forEach((item) => insertSource.run(...item));

  [
    ["TL-021-1", "OP-021", "May 24 22:11", "导入 JD 文本", "分类为岗位 JD，备注：字节低代码前端实习", "done"],
    ["TL-021-2", "OP-021", "May 24 22:13", "生成岗位草稿", "系统提取公司、岗位、城市、技能关键词和截止时间", "done"],
    ["TL-021-3", "OP-021", "May 24 22:15", "确认进入岗位管理", "用户确认优先级 A，匹配度 HIGH，使用 FE Intern v7", "done"],
    ["TL-021-4", "OP-021", "Next", "补充项目指标后投递", "待补齐低代码项目的性能指标，再执行投递", "next"],
    ["TL-020-1", "OP-020", "May 20 19:40", "导入招聘链接", "分类为招聘链接，备注：增长产品实习", "done"],
    ["TL-020-2", "OP-020", "May 20 19:43", "确认岗位草稿", "提取岗位要求并选择 Product Hybrid v3", "done"],
    ["TL-020-3", "OP-020", "May 21 10:08", "完成内推投递", "通过内推渠道提交，补充增长案例说明", "done"],
    ["TL-020-4", "OP-020", "May 22 18:30", "收到业务面邀请", "面试复盘已关联到 INT-010", "done"],
    ["TL-020-5", "OP-020", "Next", "准备业务拆解和反问", "从本岗位 JD 和面试复盘生成练习任务", "next"],
    ["TL-019-1", "OP-019", "May 21 20:14", "导入招聘链接", "分类为招聘链接，备注：美团数据分析实习", "done"],
    ["TL-019-2", "OP-019", "May 21 20:16", "生成岗位草稿", "系统解析 JD，并保留原链接和 JD 原文", "done"],
    ["TL-019-3", "OP-019", "May 21 20:18", "确认进入岗位管理", "确认城市北京、优先级 B、匹配度 HIGH", "done"],
    ["TL-019-4", "OP-019", "May 21 20:22", "选择简历版本", "本次投递使用 Data v2，突出 SQL、Python 和指标体系", "done"],
    ["TL-019-5", "OP-019", "May 21 20:35", "完成投递", "通过官网投递并同步给内推人", "done"],
    ["TL-019-6", "OP-019", "May 24 09:00", "生成跟进动作", "三天后跟进内推人，已进入今日待办", "done"],
    ["TL-018-1", "OP-018", "May 18 21:30", "导入 JD", "分类为岗位 JD，备注：快手 AI 产品运营", "done"],
    ["TL-018-2", "OP-018", "May 18 21:33", "确认岗位信息", "确认城市杭州、优先级 B、使用 Product Hybrid v3", "done"],
    ["TL-018-3", "OP-018", "May 19 09:20", "完成投递", "已提交材料并进入等待结果状态", "done"],
    ["TL-018-4", "OP-018", "Next", "整理 AIGC 案例库", "补充可用于后续面试的运营案例", "next"],
  ].forEach((item) => insertTimeline.run(...item, createdAt));

  [
    ["INT-011", null, "腾讯", "前端开发实习生", "一面", "May 24"],
    ["INT-010", "OP-020", "小红书", "增长产品实习生", "业务面", "May 22"],
  ].forEach((item) => insertInterview.run(...item, createdAt, createdAt));

  [
    ["FILE-011-A", "INT-011", "audio", "tencent-round1-recording.m4a", "腾讯一面原录音，已和本场 4 个问题关联", "May 24 20:42", "42:18"],
    ["FILE-011-T", "INT-011", "transcript", "tencent-round1-transcript.md", "由录音转写后的文字稿，复盘问题从这里拆分", "May 24 20:47", null],
    ["FILE-010-A", "INT-010", "audio", "xiaohongshu-business-interview.m4a", "小红书业务面原录音，已和本场 2 个问题关联", "May 22 21:34", "36:05"],
    ["FILE-010-T", "INT-010", "transcript", "xiaohongshu-business-transcript.md", "面试文字稿，包含增长拆解和北极星指标追问", "May 22 21:40", null],
  ].forEach((item) => insertFile.run(...item));

  [
    ["QA-101", "INT-011", "你在低代码项目里如何衡量性能优化结果？", "我主要做了首屏优化、拆包和缓存，页面打开更快了，用户体验更好。", "PROJECT", 2, "原回答只有动作，没有基线、指标和复盘口径。面试官很难判断你到底贡献了多少。", 1, "基线 -> 目标 -> 动作 -> 指标结果 -> 复盘限制", "项目开始时首屏约 3.2s，目标是把核心页面压到 2s 内。我先用性能面板定位阻塞资源，再做路由级拆包、图片懒加载和缓存策略，最后首屏降到 1.7s，构建产物减少 28%。复盘来看，我会补一组真实用户监控数据，让结论更稳定。", 0],
    ["QA-102", "INT-011", "为什么从前端转向产品策略岗位？", "我觉得自己既懂技术，也对业务比较感兴趣，所以想尝试产品方向。", "MOTIVATION", 3, "动机可信，但需要把技术背景转成岗位优势，并说明不是逃离技术。", 1, "经历触发 -> 能力迁移 -> 岗位匹配 -> 短期学习计划", "我不是放弃技术，而是希望把技术理解用于更前置的判断。前端经历让我熟悉用户路径、性能约束和工程成本；在产品策略岗位上，这些能力能帮助我把需求拆得更可落地。短期我会补齐行业分析和指标体系，形成技术理解加业务判断的组合。", 1],
    ["QA-103", "INT-011", "React 状态管理你会如何选型？", "简单状态用 useState，跨组件用 Context，复杂项目可能会用 Zustand 或 Redux。", "TECHNICAL", 4, "结构完整，可以补充多人协作、调试能力和状态生命周期的取舍。", 0, "状态范围 -> 更新频率 -> 调试协作 -> 持久化需求", "我会先看状态范围和更新频率。局部 UI 状态用组件内 state；中等范围共享状态用 Context 或 Zustand；如果是复杂业务、多人协作、需要可追踪调试和中间件，就考虑 Redux Toolkit。选型时我会避免为了工具而工具。", 2],
    ["QA-201", "INT-010", "你会如何拆解一个新用户留存下降的问题？", "我会先看数据，然后分析用户路径，找到可能流失的环节。", "PRODUCT", 3, "方向对，但拆解层级不够，缺少分群、漏斗和假设验证。", 1, "定义指标 -> 分群定位 -> 漏斗拆解 -> 假设排序 -> 实验验证", "我会先明确留存口径，比如 D1/D7 和核心行为留存，再按渠道、首日行为、设备和新老版本分群。接着看注册、首刷、关注、互动等关键漏斗，找出异常最大的环节。最后把假设按影响面和验证成本排序，用小实验验证。", 0],
    ["QA-202", "INT-010", "如果你要做一个 AI 求职工具，核心北极星指标是什么？", "我觉得可以看用户使用次数和投递数量。", "PRODUCT", 4, "能想到行为指标，但还要贴近产品承诺：提升求职执行确定性。", 0, "产品承诺 -> 成功行为 -> 领先指标 -> 滞后指标", "我会把北极星指标定义为每周完成的有效求职动作数，比如确认岗位、完成投递、完成复盘和练习。投递数量只是其中之一，更重要的是从材料进入到行动完成的闭环率。辅助指标可以看草稿确认率、复盘完成率和 P0/P1 动作完成率。", 1],
  ].forEach((item) => insertQa.run(...item, createdAt, createdAt));

  [
    ["AC-101", "如何讲清楚项目结果？", "PROJECT", "NEEDS PRACTICE", "面试复盘", "背景 -> 目标 -> 动作 -> 指标 -> 复盘", "先说明项目背景和目标，再给出你负责的动作，最后用指标证明结果。重点是避免只说“做了优化”，要说优化前后差异。", "前端 / 全栈 / 技术产品", "练习中"],
    ["AC-102", "如何回答职业动机？", "HR", "DRAFT", "手动创建", "触发经历 -> 能力迁移 -> 岗位匹配 -> 短期计划", "我不是放弃技术，而是希望把技术理解用于更前置的业务判断。短期会补齐行业分析和指标体系。", "产品 / 策略 / 运营", "未练习"],
    ["AC-103", "如何解释技术选型？", "TECHNICAL", "ACTIVE", "JD 准备", "场景复杂度 -> 团队协作 -> 调试成本 -> 长期维护", "我会先看状态范围和更新频率，再判断团队协作、调试能力和持久化需求，不为了工具而工具。", "前端 / 全栈", "可复用"],
  ].forEach((item) => insertAnswer.run(...item, createdAt, createdAt));

  [
    ["RV-101", "FE Intern v7", "frontend-intern-v7.pdf", "PDF", "428 KB", "May 20", "前端 / 全栈", "React, 性能优化, 组件库", "强调前端工程能力、性能优化结果和组件抽象经验，适合技术岗投递。"],
    ["RV-102", "Product Hybrid v3", "product-hybrid-v3.pdf", "PDF", "392 KB", "May 18", "产品 / 策略", "用户增长, 数据分析, AI 工具", "弱化纯工程细节，突出用户路径、指标拆解和 AI 工具使用经验。"],
    ["RV-103", "Data v2", "data-analyst-v2.pdf", "PDF", "405 KB", "May 16", "数据分析", "SQL, Python, 指标体系", "突出数据清洗、指标体系和业务分析案例，适合数据分析实习。"],
  ].forEach((item) => insertResume.run(...item, createdAt, createdAt));

  insertPlan.run(
    "WP-2026-06-02",
    "2026-06-01",
    12,
    JSON.stringify(["前端实习", "AI 产品"]),
    JSON.stringify(["上海优先"]),
    JSON.stringify(["字节跳动", "小红书"]),
    JSON.stringify(["项目表达", "系统设计基础"]),
    createdAt,
    createdAt,
  );

  [
    ["WT-101", "补齐字节岗位投递材料", "来自本周重点：前端实习 / 上海优先", "opportunity", "岗位管理", "OP-021", "open"],
    ["WT-102", "练习项目结果表达", "来自本周练习主题：项目表达", "answer", "答案库", "AC-101", "open"],
  ].forEach((item) => insertTask.run(item[0], "WP-2026-06-02", ...item.slice(1), createdAt, createdAt));
};

export const openDatabase = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  createSchema(db);
  seedDatabase(db);
  return db;
};

export const createRepository = (db) => {
  const listOpportunitySourceAssets = (opportunityId) =>
    db
      .prepare("SELECT * FROM opportunity_source_assets WHERE opportunity_id = ? ORDER BY created_at ASC, id ASC")
      .all(opportunityId)
      .map(toSourceAsset);

  const listOpportunityTimeline = (opportunityId) =>
    db
      .prepare("SELECT * FROM opportunity_timeline_events WHERE opportunity_id = ? ORDER BY created_at ASC, id ASC")
      .all(opportunityId)
      .map(toTimelineEvent);

  const listOpportunities = () =>
    db
      .prepare("SELECT * FROM opportunities ORDER BY created_at DESC, id DESC")
      .all()
      .map((row) => toOpportunity(row, listOpportunitySourceAssets(row.id), listOpportunityTimeline(row.id)));

  const getOpportunity = (id) => {
    const row = db.prepare("SELECT * FROM opportunities WHERE id = ?").get(id);
    return row ? toOpportunity(row, listOpportunitySourceAssets(row.id), listOpportunityTimeline(row.id)) : null;
  };

  const replaceOpportunitySourceAssets = (opportunityId, sourceAssets = []) => {
    db.prepare("DELETE FROM opportunity_source_assets WHERE opportunity_id = ?").run(opportunityId);
    const insertSource = db.prepare(`
      INSERT INTO opportunity_source_assets (
        id, opportunity_id, kind, title, detail, content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    sourceAssets.forEach((asset, index) =>
      insertSource.run(
        asset.id || makeId("SRC"),
        opportunityId,
        asset.kind || "jd-text",
        asset.title?.trim() || "岗位 JD",
        asset.detail?.trim() || "岗位原始材料",
        asset.content ?? null,
        asset.createdAt?.trim() || sequenceIso(index),
      ),
    );
  };

  const replaceOpportunityTimeline = (opportunityId, timeline = []) => {
    db.prepare("DELETE FROM opportunity_timeline_events WHERE opportunity_id = ?").run(opportunityId);
    const insertTimeline = db.prepare(`
      INSERT INTO opportunity_timeline_events (
        id, opportunity_id, occurred_at, title, detail, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    timeline.forEach((event, index) =>
      insertTimeline.run(
        event.id || makeId("TL"),
        opportunityId,
        event.occurredAt?.trim() || "Now",
        event.title?.trim() || "岗位状态更新",
        event.detail?.trim() || "岗位管理操作记录",
        event.status || "done",
        sequenceIso(index),
      ),
    );
  };

  const createOpportunity = (input) => {
    const timestamp = nowIso();
    const status = input.status || "TO APPLY";
    const id = input.id || makeId("OP");
    db.prepare(`
      INSERT INTO opportunities (
        id, title, company, status, priority, match, action, city, deadline, resume_id,
        next_action, jd_summary, jd_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.title?.trim() || "未填写岗位",
      input.company?.trim() || "未填写公司",
      status,
      input.priority || "B",
      input.match || "MEDIUM",
      input.action || opportunityStatusAction[status] || "P2",
      input.city?.trim() || "待定",
      input.deadline?.trim() || "待定",
      input.resumeId || null,
      input.nextAction?.trim() || opportunityStatusNextAction[status] || "补齐材料后投递",
      input.jdSummary?.trim() || "由岗位管理内上传材料解析生成的岗位记录。",
      input.jdText?.trim() || "待补充 JD 原文。",
      timestamp,
      timestamp,
    );
    replaceOpportunitySourceAssets(id, input.sourceAssets ?? []);
    replaceOpportunityTimeline(id, input.timeline ?? []);
    return getOpportunity(id);
  };

  const updateOpportunity = (id, patch) => {
    const current = getOpportunity(id);
    if (!current) return null;
    const next = {
      ...current,
      ...patch,
    };
    db.prepare(`
      UPDATE opportunities
      SET title = ?,
          company = ?,
          status = ?,
          priority = ?,
          match = ?,
          action = ?,
          city = ?,
          deadline = ?,
          resume_id = ?,
          next_action = ?,
          jd_summary = ?,
          jd_text = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      next.title,
      next.company,
      next.status,
      next.priority,
      next.match,
      next.action,
      next.city,
      next.deadline,
      next.resumeId || null,
      next.nextAction,
      next.jdSummary,
      next.jdText,
      nowIso(),
      id,
    );
    if (patch.sourceAssets) replaceOpportunitySourceAssets(id, patch.sourceAssets);
    if (patch.timeline) replaceOpportunityTimeline(id, patch.timeline);
    return getOpportunity(id);
  };

  const addOpportunityProgress = (id, input) => {
    const current = getOpportunity(id);
    if (!current) return null;
    const status = input.status || current.status;
    const nextAction = input.nextAction || opportunityStatusNextAction[status] || current.nextAction;
    const progressEvent = {
      id: input.timelineEvent?.id || makeId("TL"),
      occurredAt: input.timelineEvent?.occurredAt || "Now",
      title: input.timelineEvent?.title || `更新为${status}`,
      detail: input.timelineEvent?.detail || "岗位进度更新",
      status: "done",
    };
    const nextTimeline = [
      ...current.timeline.filter((event) => event.status !== "next"),
      progressEvent,
      ...(status !== "OFFER"
        ? [
            {
              id: makeId("TL"),
              occurredAt: "Next",
              title: nextAction,
              detail: "由当前岗位进度生成下一步动作",
              status: "next",
            },
          ]
        : []),
    ];
    return updateOpportunity(id, {
      status,
      action: input.action || opportunityStatusAction[status] || current.action,
      nextAction,
      timeline: nextTimeline,
    });
  };

  const deleteOpportunity = (id) => {
    const current = getOpportunity(id);
    if (!current) return false;
    const timestamp = nowIso();
    db.prepare("UPDATE interview_sessions SET opportunity_id = NULL, updated_at = ? WHERE opportunity_id = ?").run(timestamp, id);
    db.prepare("DELETE FROM opportunities WHERE id = ?").run(id);
    return true;
  };

  const listInterviews = () => {
    const sessions = db.prepare("SELECT * FROM interview_sessions ORDER BY created_at DESC, id DESC").all();
    const filesBySession = rowsToMap(db.prepare("SELECT * FROM interview_source_files ORDER BY uploaded_at ASC, id ASC").all(), "interview_session_id");
    const qaBySession = rowsToMap(db.prepare("SELECT * FROM qa_pairs ORDER BY sort_order ASC, id ASC").all(), "interview_session_id");

    return sessions.map((session) =>
      toInterviewSession(
        session,
        (filesBySession.get(session.id) ?? []).map(toSessionFile),
        (qaBySession.get(session.id) ?? []).map(toQaPair),
      ),
    );
  };

  const getInterview = (id) => {
    const session = db.prepare("SELECT * FROM interview_sessions WHERE id = ?").get(id);
    if (!session) return null;
    const sourceFiles = db
      .prepare("SELECT * FROM interview_source_files WHERE interview_session_id = ? ORDER BY uploaded_at ASC, id ASC")
      .all(id)
      .map(toSessionFile);
    const qaPairs = db
      .prepare("SELECT * FROM qa_pairs WHERE interview_session_id = ? ORDER BY sort_order ASC, id ASC")
      .all(id)
      .map(toQaPair);
    return toInterviewSession(session, sourceFiles, qaPairs);
  };

  const getQaPair = (id) => {
    const row = db.prepare("SELECT * FROM qa_pairs WHERE id = ?").get(id);
    return row ? toQaPair(row) : null;
  };

  const createQaPair = (interviewId, input) => {
    const session = getInterview(interviewId);
    if (!session) return null;
    const timestamp = nowIso();
    const id = input.id || makeId("QA");
    const nextSortOrder =
      db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS sort_order FROM qa_pairs WHERE interview_session_id = ?").get(interviewId).sort_order ?? 0;
    db.prepare(`
      INSERT INTO qa_pairs (
        id, interview_session_id, question, original_answer, type, score, critique,
        weak, framework, optimized_answer, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      interviewId,
      input.question?.trim() || "新增问题：请在这里补充面试官原问题",
      input.originalAnswer?.trim() || "在这里记录你的原回答。",
      input.type?.trim() || "MANUAL",
      Number(input.score ?? 3),
      input.critique?.trim() || "在这里补充评价。",
      input.weak === undefined ? 1 : input.weak ? 1 : 0,
      input.framework?.trim() || "背景 -> 动作 -> 结果 -> 复盘",
      input.optimizedAnswer?.trim() || "在这里整理推荐回答表述。",
      nextSortOrder,
      timestamp,
      timestamp,
    );
    return getQaPair(id);
  };

  const createInterview = (input) => {
    const timestamp = nowIso();
    const id = input.id || makeId("INT");
    db.prepare(`
      INSERT INTO interview_sessions (
        id, opportunity_id, company, role, round, date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.opportunityId || null,
      input.company?.trim() || "未填写公司",
      input.role?.trim() || "未填写岗位",
      input.round?.trim() || "面试",
      input.date?.trim() || "Today",
      timestamp,
      timestamp,
    );

    const insertFile = db.prepare(`
      INSERT INTO interview_source_files (
        id, interview_session_id, kind, file_name, detail, uploaded_at, duration, storage_uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    (input.sourceFiles ?? []).forEach((file) =>
      insertFile.run(
        file.id || makeId("FILE"),
        id,
        file.kind || "transcript",
        file.fileName?.trim() || "interview-notes.txt",
        file.detail?.trim() || "面试原始材料",
        file.uploadedAt?.trim() || "Now",
        file.duration ?? null,
        file.storageUri ?? null,
      ),
    );

    (input.qaPairs ?? []).forEach((pair) => createQaPair(id, pair));
    return getInterview(id);
  };

  const updateInterview = (id, patch) => {
    const current = getInterview(id);
    if (!current) return null;
    const next = {
      ...current,
      ...patch,
    };
    db.prepare(`
      UPDATE interview_sessions
      SET opportunity_id = ?,
          company = ?,
          role = ?,
          round = ?,
          date = ?,
          updated_at = ?
      WHERE id = ?
    `).run(next.opportunityId || null, next.company, next.role, next.round, next.date, nowIso(), id);
    return getInterview(id);
  };

  const deleteInterview = (id) => {
    const current = getInterview(id);
    if (!current) return false;
    db.prepare("DELETE FROM interview_sessions WHERE id = ?").run(id);
    return true;
  };

  const updateQaPair = (id, patch) => {
    const current = getQaPair(id);
    if (!current) return null;
    const next = {
      ...current,
      ...patch,
    };
    db.prepare(`
      UPDATE qa_pairs
      SET question = ?,
          original_answer = ?,
          type = ?,
          score = ?,
          critique = ?,
          weak = ?,
          framework = ?,
          optimized_answer = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      next.question,
      next.originalAnswer,
      next.type,
      Number(next.score),
      next.critique,
      next.weak ? 1 : 0,
      next.framework,
      next.optimizedAnswer,
      nowIso(),
      id,
    );
    return getQaPair(id);
  };

  const deleteQaPair = (id) => {
    const current = getQaPair(id);
    if (!current) return false;
    db.prepare("DELETE FROM qa_pairs WHERE id = ?").run(id);
    return true;
  };

  const listAnswers = () => db.prepare("SELECT * FROM answer_cards ORDER BY created_at DESC, id DESC").all().map(toAnswerCard);

  const getAnswer = (id) => {
    const row = db.prepare("SELECT * FROM answer_cards WHERE id = ?").get(id);
    return row ? toAnswerCard(row) : null;
  };

  const createAnswer = (input) => {
    const timestamp = nowIso();
    const id = input.id || makeId("AC");
    db.prepare(`
      INSERT INTO answer_cards (
        id, question, type, status, source, source_qa_pair_id, framework, answer,
        related_roles, practice_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.question?.trim() || "未命名答案卡",
      input.type?.trim() || "MANUAL",
      input.status || "DRAFT",
      input.source?.trim() || "手动创建",
      input.sourceQaPairId ?? null,
      input.framework?.trim() || "背景 -> 动作 -> 结果 -> 复盘",
      input.answer?.trim() || "在这里补充可复用回答。",
      input.relatedRoles?.trim() || "待填写",
      input.practiceStatus?.trim() || "未练习",
      timestamp,
      timestamp,
    );
    return getAnswer(id);
  };

  const updateAnswer = (id, patch) => {
    const current = getAnswer(id);
    if (!current) return null;
    const next = {
      ...current,
      ...patch,
    };
    db.prepare(`
      UPDATE answer_cards
      SET question = ?,
          type = ?,
          status = ?,
          source = ?,
          framework = ?,
          answer = ?,
          related_roles = ?,
          practice_status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      next.question,
      next.type,
      next.status,
      next.source,
      next.framework,
      next.answer,
      next.relatedRoles,
      next.practiceStatus,
      nowIso(),
      id,
    );
    return getAnswer(id);
  };

  const deleteAnswer = (id) => {
    const current = getAnswer(id);
    if (!current) return false;
    db.prepare("DELETE FROM answer_cards WHERE id = ?").run(id);
    return true;
  };

  const listResumes = () => {
    const opportunities = db.prepare("SELECT id, resume_id FROM opportunities WHERE resume_id IS NOT NULL").all();
    const linkedByResume = rowsToMap(opportunities, "resume_id");
    return db
      .prepare("SELECT * FROM resume_versions ORDER BY uploaded_at DESC, id DESC")
      .all()
      .map((resume) => toResumeVersion(resume, (linkedByResume.get(resume.id) ?? []).map((row) => row.id)));
  };

  const getResume = (id) => {
    const row = db.prepare("SELECT * FROM resume_versions WHERE id = ?").get(id);
    if (!row) return null;
    const linkedOpportunityIds = db.prepare("SELECT id FROM opportunities WHERE resume_id = ? ORDER BY created_at DESC, id DESC").all(id).map((item) => item.id);
    return toResumeVersion(row, linkedOpportunityIds);
  };

  const listResumeLinkedOpportunities = (id) =>
    db
      .prepare("SELECT * FROM opportunities WHERE resume_id = ? ORDER BY created_at DESC, id DESC")
      .all(id)
      .map((row) => toOpportunity(row, listOpportunitySourceAssets(row.id), listOpportunityTimeline(row.id)));

  const createResume = (input) => {
    const timestamp = nowIso();
    const id = input.id || makeId("RV");
    db.prepare(`
      INSERT INTO resume_versions (
        id, name, file_name, file_type, file_size, uploaded_at, roles, points,
        summary, storage_uri, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name?.trim() || "未命名简历版本",
      input.fileName?.trim() || "resume.pdf",
      input.fileType?.trim() || "PDF",
      input.fileSize?.trim() || "待读取",
      input.uploadedAt?.trim() || "Now",
      input.roles?.trim() || "待填写",
      input.points?.trim() || "待填写核心卖点",
      input.summary?.trim() || "待填写文件摘要",
      input.storageUri ?? null,
      timestamp,
      timestamp,
    );
    return getResume(id);
  };

  const updateResume = (id, patch) => {
    const current = getResume(id);
    if (!current) return null;
    const next = {
      ...current,
      ...patch,
    };
    db.prepare(`
      UPDATE resume_versions
      SET name = ?,
          file_name = ?,
          file_type = ?,
          file_size = ?,
          uploaded_at = ?,
          roles = ?,
          points = ?,
          summary = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      next.name,
      next.fileName,
      next.fileType,
      next.fileSize,
      next.uploadedAt,
      next.roles,
      next.points,
      next.summary,
      nowIso(),
      id,
    );
    return getResume(id);
  };

  const deleteResume = (id) => {
    const current = getResume(id);
    if (!current) return false;
    db.prepare("UPDATE opportunities SET resume_id = NULL, updated_at = ? WHERE resume_id = ?").run(nowIso(), id);
    db.prepare("DELETE FROM resume_versions WHERE id = ?").run(id);
    return true;
  };

  const getCurrentWeeklyPlan = () => {
    const plan = db.prepare("SELECT * FROM weekly_plans ORDER BY week_start DESC LIMIT 1").get();
    if (!plan) return null;
    const tasks = db
      .prepare("SELECT * FROM weekly_tasks WHERE weekly_plan_id = ? ORDER BY created_at ASC, id ASC")
      .all(plan.id)
      .map(toWeeklyTask);

    return {
      targetApplications: plan.target_applications,
      focusDirections: parseJson(plan.focus_directions_json),
      focusCities: parseJson(plan.focus_cities_json),
      focusCompanies: parseJson(plan.focus_companies_json),
      practiceThemes: parseJson(plan.practice_themes_json),
      tasks,
    };
  };

  const getCurrentWeeklyPlanRow = () => db.prepare("SELECT * FROM weekly_plans ORDER BY week_start DESC LIMIT 1").get();

  const updateCurrentWeeklyPlan = (patch) => {
    const current = getCurrentWeeklyPlanRow();
    if (!current) return null;
    db.prepare(`
      UPDATE weekly_plans
      SET target_applications = ?,
          focus_directions_json = ?,
          focus_cities_json = ?,
          focus_companies_json = ?,
          practice_themes_json = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      Number(patch.targetApplications ?? current.target_applications) || 1,
      JSON.stringify(patch.focusDirections ?? parseJson(current.focus_directions_json)),
      JSON.stringify(patch.focusCities ?? parseJson(current.focus_cities_json)),
      JSON.stringify(patch.focusCompanies ?? parseJson(current.focus_companies_json)),
      JSON.stringify(patch.practiceThemes ?? parseJson(current.practice_themes_json)),
      nowIso(),
      current.id,
    );
    return getCurrentWeeklyPlan();
  };

  const getWeeklyTask = (id) => {
    const row = db.prepare("SELECT * FROM weekly_tasks WHERE id = ?").get(id);
    return row ? toWeeklyTask(row) : null;
  };

  const createWeeklyTask = (input) => {
    const plan = getCurrentWeeklyPlanRow();
    if (!plan) return null;
    const timestamp = nowIso();
    const id = input.id || makeId("WT");
    db.prepare(`
      INSERT INTO weekly_tasks (
        id, weekly_plan_id, title, detail, source, source_label, related_entity_id,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      plan.id,
      input.title?.trim() || "新增本周动作",
      input.detail?.trim() || "来自本周计划，可在这里改成具体行动",
      input.source || "manual",
      input.sourceLabel?.trim() || "手动计划",
      input.relatedEntityId ?? null,
      input.status || "open",
      timestamp,
      timestamp,
    );
    return getWeeklyTask(id);
  };

  const updateWeeklyTask = (id, patch) => {
    const current = getWeeklyTask(id);
    if (!current) return null;
    const next = {
      ...current,
      ...patch,
    };
    db.prepare(`
      UPDATE weekly_tasks
      SET title = ?,
          detail = ?,
          source = ?,
          source_label = ?,
          related_entity_id = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      next.title,
      next.detail,
      next.source,
      next.sourceLabel,
      next.relatedEntityId ?? null,
      next.status,
      nowIso(),
      id,
    );
    return getWeeklyTask(id);
  };

  const deleteWeeklyTask = (id) => {
    const current = getWeeklyTask(id);
    if (!current) return false;
    db.prepare("DELETE FROM weekly_tasks WHERE id = ?").run(id);
    return true;
  };

  const getDashboardSummary = () => {
    const opportunities = listOpportunities();
    const interviews = listInterviews();
    const weeklyPlan = getCurrentWeeklyPlan();
    const submittedApplications = opportunities.filter((item) => submittedStatuses.includes(item.status)).length;
    const urgentCount = opportunities.filter((item) => item.action === "P0" || item.action === "P1").length;
    const pendingReviewCount = interviews.flatMap((item) => item.qaPairs).filter((pair) => pair.weak).length;
    const toApplyCount = opportunities.filter((item) => item.status === "TO APPLY").length;
    const inProgressCount = opportunities.filter((item) => item.status !== "TO APPLY" && item.status !== "OFFER").length;
    const p0Count = opportunities.filter((item) => item.action === "P0").length;
    const p1Count = opportunities.filter((item) => item.action === "P1").length;
    const weakInterviewCount = interviews.filter((item) => item.qaPairs.some((pair) => pair.weak)).length;
    const targetApplications = weeklyPlan?.targetApplications ?? 0;

    return {
      opportunityCount: opportunities.length,
      toApplyCount,
      inProgressCount,
      urgentCount,
      p0Count,
      p1Count,
      weakQaCount: pendingReviewCount,
      weakInterviewCount,
      submittedApplications,
      targetApplications,
      applicationGap: Math.max(0, targetApplications - submittedApplications),
    };
  };

  const getTodayActions = () => {
    const opportunities = listOpportunities();
    const interviews = listInterviews();
    const weeklyPlan = getCurrentWeeklyPlan();
    const resumes = listResumes();
    const resumeName = (resumeId) => resumes.find((resume) => resume.id === resumeId)?.name ?? "未选择简历";

    const opportunityActions = opportunities
      .filter((item) => item.status !== "OFFER")
      .map((item) => ({
        level: item.action,
        title:
          item.status === "TO APPLY"
            ? `投递${item.company}${item.title}`
            : item.status === "WRITTEN TEST"
              ? `完成${item.company}${item.title}笔试`
              : item.status === "INTERVIEWING"
                ? `准备${item.company}${item.title}`
                : `跟进${item.company}${item.title}`,
        detail: `${item.nextAction} / 使用 ${resumeName(item.resumeId)}`,
        targetPage: "opportunityDetail",
        targetId: item.id,
      }));

    const interviewActions = interviews
      .filter((session) => session.qaPairs.some((pair) => pair.weak))
      .map((session) => ({
        level: "P1",
        title: `复盘${session.company}${session.round}`,
        detail: `${session.qaPairs.filter((pair) => pair.weak).length} 个薄弱回答需要处理`,
        targetPage: "interviews",
        targetId: session.id,
      }));

    const weeklyActions = (weeklyPlan?.tasks ?? [])
      .filter((task) => task.status === "open")
      .map((task) => ({
        level: "P2",
        title: task.title,
        detail: `${task.sourceLabel}: ${task.detail}`,
        targetPage: "weekly",
        targetId: task.id,
      }));

    const rawActions = [...opportunityActions, ...interviewActions, ...weeklyActions];
    return rawActions.filter((action, index, actions) => actions.findIndex((candidate) => candidate.title === action.title) === index);
  };

  return {
    dbPath: DB_PATH,
    listOpportunities,
    getOpportunity,
    createOpportunity,
    updateOpportunity,
    addOpportunityProgress,
    deleteOpportunity,
    listOpportunitySourceAssets,
    listOpportunityTimeline,
    listInterviews,
    getInterview,
    createInterview,
    updateInterview,
    deleteInterview,
    getQaPair,
    createQaPair,
    updateQaPair,
    deleteQaPair,
    listAnswers,
    getAnswer,
    createAnswer,
    updateAnswer,
    deleteAnswer,
    listResumes,
    getResume,
    listResumeLinkedOpportunities,
    createResume,
    updateResume,
    deleteResume,
    getCurrentWeeklyPlan,
    updateCurrentWeeklyPlan,
    getWeeklyTask,
    createWeeklyTask,
    updateWeeklyTask,
    deleteWeeklyTask,
    getDashboardSummary,
    getTodayActions,
  };
};
