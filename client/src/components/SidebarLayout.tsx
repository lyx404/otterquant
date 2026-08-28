/*
 * SidebarLayout — Left sidebar navigation for authenticated dashboard pages
 * Design System: Indigo/Sky + Slate
 * Sidebar: Figma-aligned 186px expanded width, collapsible to 64px icon-only mode
 * Logo links to /, nav items with icons + labels
 * Bottom: account controls + user dropdown
 * Mobile: overlay sidebar with backdrop
 */
import { Link, useLocation, useSearch } from "wouter";
import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { type UiCopy, translateUi, useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  AlphaViewModeProvider,
  useAlphaViewMode,
  type AlphaViewMode,
  replaceAlphaTerms,
} from "@/contexts/AlphaViewModeContext";
import {
  FlaskConical,
  Settings2,
  Menu,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  CandlestickChart,
  Compass,
  Search,
  SquarePen,
  Bot,
  ChevronDown,
  Check,
} from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { CodeBlock } from "@/components/ui/code-block";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import {
  isStrategyCreationTaskComplete,
  isPaperDeploymentTaskComplete,
  isStrategyRunTaskComplete,
  PAPER_DEPLOYMENT_TASK_CHANGE_EVENT,
  STRATEGY_CREATION_TASK_CHANGE_EVENT,
  STRATEGY_RUN_TASK_CHANGE_EVENT,
} from "@/lib/strategyOnboarding";
import {
  isFactorCreationTaskComplete,
  FACTOR_CREATION_TASK_CHANGE_EVENT,
} from "@/lib/factorOnboarding";

const SIDEBAR_W = 186;
const SIDEBAR_COLLAPSED_W = 64;
const FIGMA_HEADER_H = 60;
const LEGACY_MARKETPLACE_STYLE_CLASSES = [
  "oq-marketplace-factory-active",
  "oq-marketplace-factory-industrial-active",
  "oq-marketplace-baseline-active",
  "oq-marketplace-current-4-active",
  "oq-marketplace-current-5-active",
];

type NavItem = {
  path: string;
  labelEn: string;
  labelZh: string;
  icon: any;
  children?: { path: string; labelEn: string; labelZh: string; icon: any }[];
};

const navItems: NavItem[] = [
  { path: "/marketplace", labelEn: "Explore", labelZh: "探索", icon: Compass },
  {
    path: "/alphas",
    labelEn: "Create",
    labelZh: "创建",
    icon: SquarePen,
    children: [
      { path: "/alphas", labelEn: "My Factors", labelZh: "我的因子", icon: FlaskConical },
      { path: "/strategies", labelEn: "My Strategy", labelZh: "我的策略", icon: Rocket },
      { path: "/trade", labelEn: "Paper Trading", labelZh: "模拟交易", icon: CandlestickChart },
    ],
  },
  { path: "/account", labelEn: "Settings", labelZh: "设置", icon: Settings2 },
];

const exploreTabs = [
  { key: "marketplace", href: "/marketplace", labelEn: "Explore", labelZh: "探索" },
  { key: "leaderboard", href: "/marketplace?tab=leaderboard", labelEn: "Leaderboard", labelZh: "排行榜" },
  { key: "mine", href: "/marketplace?tab=mine", labelEn: "My", labelZh: "我的" },
].filter((tab) => tab.key !== "leaderboard");

const pageHeaders = [
  {
    match: (path: string) => path === "/",
    titleEn: "Dashboard",
    titleZh: "仪表盘",
    subtitleEn: "Overview of factors, strategies, and account status",
    subtitleZh: "查看因子、策略与账户状态概览",
  },
  {
    match: (path: string) => path.startsWith("/alphas"),
    titleEn: "My Factors",
    titleZh: "我的因子",
    subtitleEn: "Create, review, and manage factor signals",
    subtitleZh: "创建、查看与管理因子信号",
  },
  {
    match: (path: string) => /^\/strategies\/STR-[^/]+$/.test(path),
    titleEn: "Strategy Detail",
    titleZh: "策略详情",
    subtitleEn: "Build and monitor strategy workflows",
    subtitleZh: "构建与监控策略工作流",
  },
  {
    match: (path: string) => path.startsWith("/strategies"),
    titleEn: "My Strategy",
    titleZh: "我的策略",
    subtitleEn: "Build and backtest strategies from your factor combinations",
    subtitleZh: "用你的因子组合策略并进行回测",
  },
  {
    match: (path: string) => /^\/trade\/[^/]+$/.test(path),
    titleEn: "Trade Detail",
    titleZh: "交易详情",
    subtitleEn: "Monitor executions and trading status",
    subtitleZh: "监控执行与交易状态",
  },
  {
    match: (path: string) => path.startsWith("/trade"),
    titleEn: "Trade",
    titleZh: "交易",
    subtitleEn: "Review assets, PnL & strategy status",
    subtitleZh: "查看资产、盈亏与策略运行状态",
  },
  {
    match: (path: string) => /^\/marketplace\/[^/]+$/.test(path),
    titleEn: "Portfolio Detail",
    titleZh: "投资组合详情",
    subtitleEn: "Review portfolio performance and copy-investing activity",
    subtitleZh: "查看投资组合表现与跟投数据",
  },
  {
    match: (path: string) => path.startsWith("/marketplace"),
    titleEn: "Marketplace",
    titleZh: "广场",
    subtitleEn: "Connect with the quantitative finance community",
    subtitleZh: "连接量化金融社区",
  },
  {
    match: (path: string) => path.startsWith("/subscription"),
    titleEn: "Subscription",
    titleZh: "订阅",
    subtitleEn: "Manage your plan and renewal status",
    subtitleZh: "管理套餐与续费状态",
  },
  {
    match: (path: string) => path.startsWith("/account"),
    titleEn: "Settings",
    titleZh: "设置",
    subtitleEn: "Manage preferences, profile & Agent settings",
    subtitleZh: "管理通用偏好、个人资料与 Agent 设置",
  },
];

const sidebarCopy: Record<string, UiCopy> = {
  Dashboard: { ja: "ダッシュボード", ko: "대시보드", es: "Panel", fr: "Tableau de bord" },
  Create: { ja: "作成", ko: "만들기", es: "Crear", fr: "Créer" },
  "My Factors": { ja: "マイファクター", ko: "내 팩터", es: "Mis factores", fr: "Mes facteurs" },
  "My Strategy": { ja: "マイストラテジー", ko: "내 전략", es: "Mis estrategias", fr: "Mes stratégies" },
  "Paper Trading": { ja: "ペーパートレード", ko: "모의 거래", es: "Trading simulado", fr: "Trading simulé" },
  Trade: { ja: "取引", ko: "거래", es: "Trading", fr: "Trading" },
  Explore: { ja: "探索", ko: "탐색", es: "Explorar", fr: "Explorer" },
  "Strategy Marketplace": { ja: "ストラテジーマーケット", ko: "전략 마켓", es: "Mercado de estrategias", fr: "Marché des stratégies" },
  Leaderboard: { ja: "ランキング", ko: "리더보드", es: "Clasificación", fr: "Classement" },
  My: { ja: "マイ", ko: "내 항목", es: "Mío", fr: "Mes éléments" },
  Marketplace: { ja: "マーケット", ko: "마켓", es: "Mercado", fr: "Marché" },
  Subscription: { ja: "サブスクリプション", ko: "구독", es: "Suscripción", fr: "Abonnement" },
  Settings: { ja: "設定", ko: "설정", es: "Configuración", fr: "Paramètres" },
  "Strategy Detail": { ja: "ストラテジー詳細", ko: "전략 상세", es: "Detalle de estrategia", fr: "Détail de la stratégie" },
  "Portfolio Detail": { ja: "ポートフォリオ詳細", ko: "포트폴리오 상세", es: "Detalle de cartera", fr: "Détail du portefeuille" },
  "Trade Detail": { ja: "取引詳細", ko: "거래 상세", es: "Detalle de operación", fr: "Détail de la transaction" },
  "Build and monitor strategy workflows": {
    ja: "ストラテジーワークフローを構築・監視",
    ko: "전략 워크플로를 구축하고 모니터링",
    es: "Crea y supervisa flujos de estrategia",
    fr: "Construire et surveiller les workflows de stratégie",
  },
  "Review performance and manage paper status & versions": {
    ja: "パフォーマンスを確認し、ペーパートレード状況とバージョンを管理",
    ko: "성과를 검토하고 모의 거래 상태와 버전을 관리",
    es: "Revisa el rendimiento y gestiona el estado de paper trading y las versiones",
    fr: "Analyser les performances et gérer le statut du paper trading et les versions",
  },
  "Overview of factors, strategies, and account status": {
    ja: "ファクター、ストラテジー、アカウント状況の概要",
    ko: "팩터, 전략, 계정 상태 개요",
    es: "Resumen de factores, estrategias y estado de cuenta",
    fr: "Vue d'ensemble des facteurs, stratégies et du compte",
  },
  "Create, review, and manage factor signals": {
    ja: "ファクターシグナルの作成、レビュー、管理",
    ko: "팩터 시그널 생성, 검토 및 관리",
    es: "Crea, revisa y gestiona señales de factores",
    fr: "Créer, examiner et gérer les signaux de facteurs",
  },
  "Monitor executions and trading status": {
    ja: "約定と取引ステータスを監視",
    ko: "체결 및 거래 상태 모니터링",
    es: "Supervisa ejecuciones y estado de trading",
    fr: "Surveiller les exécutions et le statut de trading",
  },
  "Review assets, PnL & strategy status": {
    ja: "資産、損益、ストラテジー稼働状況を確認",
    ko: "자산, 손익 및 전략 실행 상태 확인",
    es: "Revisa activos, PnL y estado de las estrategias",
    fr: "Consulter les actifs, le PnL et le statut des stratégies",
  },
  "Connect with the quantitative finance community": {
    ja: "クオンツ金融コミュニティとつながる",
    ko: "퀀트 금융 커뮤니티와 연결",
    es: "Conecta con la comunidad de finanzas cuantitativas",
    fr: "Rejoindre la communauté de finance quantitative",
  },
  "Manage your plan and renewal status": {
    ja: "プランと更新状況を管理",
    ko: "플랜 및 갱신 상태 관리",
    es: "Gestiona tu plan y el estado de renovación",
    fr: "Gérer l’offre et le statut de renouvellement",
  },
  "Manage preferences, profile & Agent settings": {
    ja: "一般設定、プロフィール、Agent 設定を管理",
    ko: "일반 환경설정, 프로필 및 Agent 설정 관리",
    es: "Gestiona las preferencias, el perfil y la configuración del Agent",
    fr: "Gérer les préférences, le profil et les paramètres de l’Agent",
  },
  "Back to strategies": { ja: "ストラテジー一覧に戻る", ko: "전략 목록으로 돌아가기", es: "Volver a estrategias", fr: "Retour aux stratégies" },
  "Back to Explore": { ja: "探索に戻る", ko: "탐색으로 돌아가기", es: "Volver a Explorar", fr: "Retour à Explorer" },
  Back: { ja: "戻る", ko: "뒤로", es: "Atrás", fr: "Retour" },
  "Pro plan": { ja: "Pro プラン", ko: "Pro 플랜", es: "Plan Pro", fr: "Offre Pro" },
  "Collapse sidebar": { ja: "サイドバーを折りたたむ", ko: "사이드바 접기", es: "Contraer barra lateral", fr: "Réduire la barre latérale" },
  "Expand sidebar": { ja: "サイドバーを展開", ko: "사이드바 펼치기", es: "Expandir barra lateral", fr: "Déployer la barre latérale" },
  "Search strategies, IDs, or symbols": {
    ja: "ストラテジー、ID、取引ペアを検索",
    ko: "전략, ID 또는 거래쌍 검색",
    es: "Buscar estrategias, ID o símbolos",
    fr: "Rechercher une stratégie, un ID ou un symbole",
  },
  "Clear search": {
    ja: "検索をクリア",
    ko: "검색 지우기",
    es: "Borrar búsqueda",
    fr: "Effacer la recherche",
  },
  "Beginner tasks": { ja: "初心者タスク", ko: "초보자 작업", es: "Tareas iniciales", fr: "Tâches de démarrage" },
  "AI agents": { ja: "AI エージェント", ko: "AI 에이전트", es: "Agentes de IA", fr: "Agents IA" },
  "You're making progress!": { ja: "順調に進んでいます！", ko: "잘 진행하고 있어요!", es: "¡Vas por buen camino!", fr: "Vous progressez bien !" },
  "Close beginner tasks": { ja: "初心者タスクを閉じる", ko: "초보자 작업 닫기", es: "Cerrar tareas iniciales", fr: "Fermer les tâches de démarrage" },
  "Task progress": { ja: "タスクの進行状況", ko: "작업 진행 상황", es: "Progreso de la tarea", fr: "Progression de la tâche" },
  "Create a factor": { ja: "ファクターを1つ作成", ko: "팩터 1개 만들기", es: "Crear un factor", fr: "Créer un facteur" },
  "Connect an AI agent": { ja: "AI エージェントを接続", ko: "AI 에이전트 연결", es: "Conectar un agente de IA", fr: "Connecter un agent IA" },
  "Create a factor with an AI agent": { ja: "AI エージェントでファクターを1つ作成", ko: "AI 에이전트에서 팩터 1개 만들기", es: "Crear un factor con un agente de IA", fr: "Créer un facteur avec un agent IA" },
  "Deploy a paper trading bot": { ja: "ペーパートレードボットをデプロイ", ko: "모의 거래 봇 배포", es: "Desplegar un bot de paper trading", fr: "Déployer un bot de paper trading" },
  "Create strategy": { ja: "ストラテジーを作成", ko: "전략 만들기", es: "Crear estrategia", fr: "Créer une stratégie" },
  "Run strategy": { ja: "ストラテジーを実行", ko: "전략 실행", es: "Ejecutar estrategia", fr: "Exécuter la stratégie" },
  "Deploy strategy to paper trading": { ja: "ストラテジーをペーパートレードへデプロイ", ko: "전략을 모의 거래에 배포", es: "Desplegar la estrategia en paper trading", fr: "Déployer la stratégie en paper trading" },
  "Create a factor with your AI agent": {
    ja: "AI エージェントでファクターを作成",
    ko: "AI 에이전트로 팩터 만들기",
    es: "Crear un factor con tu agente de IA",
    fr: "Créer un facteur avec votre agent IA",
  },
  "Check your new factor": {
    ja: "新しく作成したファクターを確認",
    ko: "새로 생성한 팩터 확인",
    es: "Revisar tu nuevo factor",
    fr: "Vérifier votre nouveau facteur",
  },
  "Paste the example prompt into an AI agent such as Claude or ChatGPT and let Quandora mine the factor.": {
    ja: "サンプルプロンプトを Claude や ChatGPT などの AI エージェントに貼り付け、Quandora でファクターを発掘します。",
    ko: "예시 프롬프트를 Claude 또는 ChatGPT 같은 AI 에이전트에 붙여 넣으면 Quandora가 팩터를 발굴합니다.",
    es: "Pega el prompt de ejemplo en un agente de IA como Claude o ChatGPT y deja que Quandora descubra el factor.",
    fr: "Collez le prompt d’exemple dans un agent IA tel que Claude ou ChatGPT, puis laissez Quandora extraire le facteur.",
  },
  "Return to My Factors to review the factor your AI agent created.": {
    ja: "マイファクターに戻り、AI エージェントが作成したファクターを確認します。",
    ko: "내 팩터로 돌아가 AI 에이전트가 만든 팩터를 확인하세요.",
    es: "Vuelve a Mis factores para revisar el factor creado por tu agente de IA.",
    fr: "Retournez à Mes facteurs pour examiner le facteur créé par votre agent IA.",
  },
  "Factor analysis prompt": { ja: "ファクター分析プロンプト", ko: "팩터 분석 프롬프트", es: "Prompt de análisis de factores", fr: "Prompt d’analyse de facteurs" },
  "Generated factor list": { ja: "生成されたファクター一覧", ko: "생성된 팩터 목록", es: "Lista de factores generados", fr: "Liste des facteurs générés" },
  "Example prompt": { ja: "サンプルプロンプト", ko: "예시 프롬프트", es: "Prompt de ejemplo", fr: "Prompt d’exemple" },
  "Factor analysis": { ja: "ファクター分析", ko: "팩터 분석", es: "Análisis de factores", fr: "Analyse de facteurs" },
  "Strategy building": { ja: "ストラテジー構築", ko: "전략 구축", es: "Construcción de estrategias", fr: "Construction de stratégies" },
  Copy: { ja: "コピー", ko: "복사", es: "Copiar", fr: "Copier" },
  Copied: { ja: "コピー済み", ko: "복사됨", es: "Copiado", fr: "Copié" },
  Skip: { ja: "スキップ", ko: "건너뛰기", es: "Omitir", fr: "Passer" },
  Next: { ja: "次へ", ko: "다음", es: "Siguiente", fr: "Suivant" },
  "View My Factors": { ja: "マイファクターを見る", ko: "내 팩터 보기", es: "Ver mis factores", fr: "Voir mes facteurs" },
  "2 connected": { ja: "2 件接続済み", ko: "2개 연결됨", es: "2 conectados", fr: "2 connectés" },
};

type OnboardingTaskStep = {
  id: string;
  label: string;
};

function FactorCreationGuideDialog({
  open,
  onOpenChange,
  step,
  onStepChange,
  onOpenFactors,
  tr,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: 0 | 1;
  onStepChange: (step: 0 | 1) => void;
  onOpenFactors: () => void;
  tr: (en: string, zh: string) => string;
}) {
  const factorAnalysisPrompt = "@quandora:factor-analysis analyze my latest factor result";
  const strategyBuildingPrompt = "@quandora:strategy-building help me build a strategy";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="oq-factor-guide-dialog w-[calc(100%-2rem)] max-w-[420px] gap-0 overflow-hidden rounded-[10px] border border-[#dc4900]/30 bg-[#fffaf6] p-0 text-[#171411] shadow-[0_10px_26px_rgba(60,40,20,0.16)] dark:border-[#ff6a1a]/35 dark:bg-[#241b17] dark:text-[#f7f1ea] sm:max-w-[420px]">
        <div className="px-5 pb-0 pt-5 sm:px-5 sm:pt-5">
          <DialogTitle className="text-[13px] font-bold leading-[18px] tracking-normal">
            {step === 0 ? tr("Create a factor with your AI agent", "在 AI 智能体中创建因子") : tr("Check your new factor", "查看新生成的因子")}
          </DialogTitle>
          <DialogDescription className="mb-3 mt-1 max-w-none text-[11px] font-normal leading-4 text-[#766d64] dark:text-[#b9aca0]">
            {step === 0
              ? tr("Paste the example prompt into an AI agent such as Claude or ChatGPT and let Quandora mine the factor.", "将示例提示词粘贴到 AI 智能体（如 Claude 或 ChatGPT）中，让 Quandora 自动完成因子挖掘。")
              : tr("Return to My Factors to review the factor your AI agent created.", "回到“我的因子”，查看 AI 智能体创建的因子。")}
          </DialogDescription>
        </div>

        <div className="px-5 pb-5 sm:px-5 sm:pb-5">
          {step === 0 ? (
            <div className="space-y-4">
              <div className="inline-flex max-w-full overflow-hidden rounded-[8px] border border-[#eadfd7] bg-[#f8f4f0] dark:border-[#4b4036] dark:bg-[#241b17]">
                <img src="/landing/factor-analysis-prompt.svg" alt={tr("Factor analysis prompt", "因子分析提示词界面")} className="block h-auto w-auto max-w-full rounded-[8px]" />
              </div>
              <section className="space-y-2" aria-label={tr("Example prompt", "示例提示词")}>
                <h3 className="text-[12px] font-semibold leading-4 text-[#2f2924] dark:text-[#f7f1ea]">{tr("Example prompt", "示例提示词")}</h3>
                <CodeBlock
                  tabs={[
                    { label: tr("Factor analysis", "因子分析"), code: factorAnalysisPrompt, language: "text" },
                    { label: tr("Strategy building", "策略构建"), code: strategyBuildingPrompt, language: "text" },
                  ]}
                  copyLabel={tr("Copy", "复制")}
                  copiedLabel={tr("Copied", "已复制")}
                />
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex max-w-full overflow-hidden rounded-[8px] border border-[#eadfd7] bg-[#f8f4f0] dark:border-[#4b4036] dark:bg-[#241b17]"><img src="/landing/my-factors-preview.png" alt={tr("Generated factor list", "生成的因子列表")} className="block h-auto w-auto max-w-full rounded-[8px]" /></div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row min-h-8 items-center justify-between gap-2 border-t-0 px-5 pb-5 pt-0 dark:border-t-0 sm:justify-between sm:px-5">
          <div className="flex-[0_0_auto] text-[10px] font-bold leading-8 text-[#dc4900] dark:text-[#ff6a1a]">{step + 1} / 2</div>
          <div className="flex flex-[0_0_auto] items-center justify-end gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-full border-0 bg-[#f1eee9] px-2.5 text-[10px] font-semibold leading-8 text-[#766d64] transition-colors hover:bg-[#e9e2db] hover:text-[#4a443d] dark:bg-[#2d2621] dark:text-[#cfc2b7] dark:hover:bg-[#3a3029] dark:hover:text-[#f7f1ea]">{tr("Skip", "跳过")}</button>
            {step === 1 ? <button type="button" onClick={() => onStepChange(0)} className="rounded-full border-0 bg-[#f1eee9] px-2.5 text-[10px] font-semibold leading-8 text-[#766d64] transition-colors hover:bg-[#e9e2db] hover:text-[#4a443d] dark:bg-[#2d2621] dark:text-[#cfc2b7] dark:hover:bg-[#3a3029] dark:hover:text-[#f7f1ea]">{tr("Back", "上一步")}</button> : null}
            <button type="button" onClick={() => step === 0 ? onStepChange(1) : onOpenFactors()} className="flex items-center rounded-full border-0 bg-[#dc4900] px-3 text-[10px] font-semibold leading-8 text-white transition-colors hover:bg-[#c84200]">{step === 0 ? tr("Next", "下一步") : tr("View My Factors", "查看我的因子")}</button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OnboardingTaskGroup({
  title,
  steps,
  progressLabel,
  completedSteps = 0,
  completedStepStates,
  onStepClick,
  clickCompletedSteps = false,
}: {
  title: string;
  steps: OnboardingTaskStep[];
  progressLabel: string;
  completedSteps?: number;
  completedStepStates?: boolean[];
  onStepClick?: (stepId: string) => void;
  clickCompletedSteps?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const stepCompletionStates = steps.map(
    (_, index) => completedStepStates?.[index] ?? index < completedSteps,
  );
  const completedCount = stepCompletionStates.filter(Boolean).length;
  const progress = steps.length > 0 ? Math.min(1, completedCount / steps.length) : 0;
  const isComplete = progress >= 1;
  const isInProgress = progress > 0 && !isComplete;
  const progressPercent = Math.round(progress * 100);
  return (
    <div className="oq-onboarding-task-group rounded-[8px] bg-white px-2.5 py-2 dark:bg-[#241812]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="oq-onboarding-task-step flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-[12px] font-semibold">
          <span
            className={`oq-onboarding-task-node relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${isComplete ? "is-complete" : isInProgress ? "is-progress" : "is-pending"}`}
            role="progressbar"
            aria-label={`${title} ${progressLabel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            style={isInProgress ? { "--oq-task-progress": `${progressPercent}%` } as React.CSSProperties : undefined}
          >
            {isComplete ? <Check className="h-3 w-3" /> : null}
          </span>
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#8c8378] transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.7} aria-hidden="true" />
      </button>
      {open && (
        <div className="oq-onboarding-task-children mt-2 space-y-1.5">
          {steps.map((step, index) => {
            const complete = stepCompletionStates[index];
            const canNavigate = onStepClick != null && (!complete || clickCompletedSteps);
            const stepContent = <>
              <span className={`oq-onboarding-task-node flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${complete ? "is-complete" : "is-pending"}`}>
                {complete && <Check className="h-2.5 w-2.5" strokeWidth={2.3} aria-hidden="true" />}
              </span>
              <span>{step.label}</span>
            </>;
            return (
              canNavigate ? (
                <button key={step.id} type="button" onClick={() => onStepClick(step.id)} className={`oq-onboarding-task-step flex w-full items-center gap-2 text-left text-[11px] leading-4 transition-colors hover:text-[#dc4900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:text-[#d5c9bc] dark:hover:text-[#ff6a1a] ${complete ? "text-[#8c8378] line-through" : "text-[#4a443d]"}`}>
                  {stepContent}
                </button>
              ) : (
                <div key={step.id} className={`oq-onboarding-task-step flex items-center gap-2 text-[11px] leading-4 ${complete ? "text-[#8c8378] line-through" : "text-[#4a443d] dark:text-[#d5c9bc]"}`}>
                  {stepContent}
                </div>
              )
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlphaViewModeProvider>
      <SidebarLayoutInner>{children}</SidebarLayoutInner>
    </AlphaViewModeProvider>
  );
}

function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const { uiLang } = useAppLanguage();
  const { theme } = useTheme();
  const { alphaViewMode } = useAlphaViewMode();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [factorGuideOpen, setFactorGuideOpen] = useState(false);
  const [factorGuideStep, setFactorGuideStep] = useState<0 | 1>(0);
  const [strategyCreationTaskComplete, setStrategyCreationTaskComplete] = useState(isStrategyCreationTaskComplete);
  const [strategyRunTaskComplete, setStrategyRunTaskComplete] = useState(isStrategyRunTaskComplete);
  const [paperDeploymentTaskComplete, setPaperDeploymentTaskComplete] = useState(isPaperDeploymentTaskComplete);
  const [factorCreationTaskComplete, setFactorCreationTaskComplete] = useState(isFactorCreationTaskComplete);
  const onboardingPopoverRef = useRef<HTMLElement>(null);
  const onboardingTriggerRef = useRef<HTMLButtonElement>(null);
  const [secondarySection, setSecondarySection] = useState<string | null>(null);
  const [navTransition, setNavTransition] = useState<"primary" | "secondary" | null>(null);
  const currentPathname = location.split("?")[0];
  const usesExplorePageCanvas = ["/alphas", "/strategies", "/trade"].some(
    (path) => currentPathname === path || currentPathname.startsWith(`${path}/`),
  );
  // Read the live URL so same-path query navigation updates the shared Explore tabs.
  const currentSearch = typeof window !== "undefined"
    ? window.location.search
    : search
      ? `?${search.replace(/^\?/, "")}`
      : "";
  const isMarketplaceFundDetail = /^\/marketplace\/[^/]+$/.test(currentPathname);
  const isMarketplaceStrategyDetail = /^\/marketplace\/[^/]+\/strategies\/[^/]+$/.test(currentPathname);
  const isMarketplaceUserProfile = /^\/marketplace\/users\/[^/]+$/.test(currentPathname);
  const isMarketplaceDetail = isMarketplaceFundDetail || isMarketplaceStrategyDetail;
  const isMarketplaceHeaderDetail = isMarketplaceDetail || isMarketplaceUserProfile;
  const marketplaceFundPath = isMarketplaceStrategyDetail
    ? currentPathname.split("/").slice(0, 3).join("/")
    : "/marketplace";
  const showExploreTabs = currentPathname === "/marketplace";
  const activeExploreTab = new URLSearchParams(currentSearch).get("tab") ?? "marketplace";
  const isExploreTabActive = (key: string) => showExploreTabs && activeExploreTab === key;
  const hasHeaderSearch =
    currentPathname === "/trade" ||
    currentPathname === "/strategies";
  const headerSearchQuery = new URLSearchParams(currentSearch).get("q") ?? "";
  const isOfficialAlphaDetail =
    currentPathname.startsWith("/alphas/") &&
    currentPathname !== "/alphas/official" &&
    new URLSearchParams(currentSearch).get("source") === "official";
  const isOfficialStrategyDetail =
    currentPathname.startsWith("/strategies/") &&
    currentPathname !== "/strategies/official" &&
    new URLSearchParams(currentSearch).get("source") === "official";
  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const matchingSection = navItems.find((item) =>
      item.children?.some((child) =>
        currentPathname === child.path || currentPathname.startsWith(`${child.path}/`)
      )
    );
    setSecondarySection(matchingSection?.path ?? null);
  }, [currentPathname]);

  useEffect(() => {
    if (!navTransition) return;
    const timeout = window.setTimeout(() => setNavTransition(null), 180);
    return () => window.clearTimeout(timeout);
  }, [navTransition]);

  useEffect(() => {
    if (!onboardingOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOnboardingOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        onboardingPopoverRef.current?.contains(target) ||
        onboardingTriggerRef.current?.contains(target)
      ) return;
      setOnboardingOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onboardingOpen]);

  useEffect(() => {
    const syncStrategyCreationTask = () => setStrategyCreationTaskComplete(isStrategyCreationTaskComplete());
    const syncStrategyRunTask = () => setStrategyRunTaskComplete(isStrategyRunTaskComplete());
    const syncPaperDeploymentTask = () => setPaperDeploymentTaskComplete(isPaperDeploymentTaskComplete());
    const syncFactorCreationTask = () => setFactorCreationTaskComplete(isFactorCreationTaskComplete());
    window.addEventListener("storage", syncStrategyCreationTask);
    window.addEventListener(STRATEGY_CREATION_TASK_CHANGE_EVENT, syncStrategyCreationTask);
    window.addEventListener("storage", syncStrategyRunTask);
    window.addEventListener(STRATEGY_RUN_TASK_CHANGE_EVENT, syncStrategyRunTask);
    window.addEventListener("storage", syncPaperDeploymentTask);
    window.addEventListener(PAPER_DEPLOYMENT_TASK_CHANGE_EVENT, syncPaperDeploymentTask);
    window.addEventListener(FACTOR_CREATION_TASK_CHANGE_EVENT, syncFactorCreationTask);
    return () => {
      window.removeEventListener("storage", syncStrategyCreationTask);
      window.removeEventListener(STRATEGY_CREATION_TASK_CHANGE_EVENT, syncStrategyCreationTask);
      window.removeEventListener("storage", syncStrategyRunTask);
      window.removeEventListener(STRATEGY_RUN_TASK_CHANGE_EVENT, syncStrategyRunTask);
      window.removeEventListener("storage", syncPaperDeploymentTask);
      window.removeEventListener(PAPER_DEPLOYMENT_TASK_CHANGE_EVENT, syncPaperDeploymentTask);
      window.removeEventListener(FACTOR_CREATION_TASK_CHANGE_EVENT, syncFactorCreationTask);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove(...LEGACY_MARKETPLACE_STYLE_CLASSES);
    window.localStorage.removeItem("otter_explore_design_mode");
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return currentPathname === "/";
    if (path === "/alphas/official") return currentPathname === "/alphas/official" || isOfficialAlphaDetail;
    if (path === "/strategies/official") return currentPathname === "/strategies/official" || isOfficialStrategyDetail;

    if (path === "/alphas") {
      return currentPathname === "/alphas" || (currentPathname.startsWith("/alphas/") && !currentPathname.startsWith("/alphas/official") && !isOfficialAlphaDetail);
    }

    if (path === "/strategies") {
      return currentPathname === "/strategies" || (currentPathname.startsWith("/strategies/") && !currentPathname.startsWith("/strategies/official") && !isOfficialStrategyDetail);
    }

    return currentPathname.startsWith(path);
  };

  const isSectionActive = (sectionPath: string) => {
    const section = navItems.find((item) => item.path === sectionPath);
    if (!section) return false;
    if (section.children?.length) return section.children.some((child) => isActive(child.path));
    return isActive(section.path);
  };
  const originalTextCacheRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const syncingCopyRef = useRef(false);
  const tr = (en: string, zh: string) => translateUi(uiLang, en, zh, sidebarCopy[en]);
  const marketplaceBackLabel = isMarketplaceStrategyDetail
    ? tr("Back to Portfolio Detail", "返回投资组合详情")
    : tr("Back to Explore", "返回探索");
  const displayName = user?.displayName || (user?.username ? `@${user.username}` : "Nicole Ong");
  const userHandle = user?.username
    ? `@${user.username}`
    : user?.email
      ? `@${user.email.split("@")[0]}`
      : "@nicoleo";
  const avatarInitial = (user?.displayName || user?.username || "Nicole Ong")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "NO";
  const pageHeader = pageHeaders.find((item) => item.match(currentPathname)) ?? pageHeaders[0];
  const updateHeaderSearch = (query: string) => {
    const nextSearchParams = new URLSearchParams(currentSearch);
    if (query) {
      nextSearchParams.set("q", query);
    } else {
      nextSearchParams.delete("q");
    }
    const nextSearch = nextSearchParams.toString();
    navigate(`${currentPathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
  };

  const syncAlphaCopy = useCallback((root: ParentNode, mode: AlphaViewMode) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current as Text);
      current = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const parent = textNode.parentElement;
      if (!parent) return;
      if (["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "NOSCRIPT"].includes(parent.tagName)) return;

      const cachedOriginal = originalTextCacheRef.current.get(textNode);
      const originalText = cachedOriginal ?? (textNode.nodeValue ?? "");
      if (!cachedOriginal) {
        originalTextCacheRef.current.set(textNode, originalText);
      }

      if (!/\bAlphas?\b/i.test(originalText)) return;

      const nextText = replaceAlphaTerms(originalText, mode);
      if (textNode.nodeValue !== nextText) {
        textNode.nodeValue = nextText;
      }
    });
  }, []);

  useEffect(() => {
    const root = document.body;
    if (!root) return;

    const scheduleSync = () => {
      if (syncingCopyRef.current) return;
      syncingCopyRef.current = true;
      syncAlphaCopy(root, alphaViewMode);
      requestAnimationFrame(() => {
        syncingCopyRef.current = false;
      });
    };

    scheduleSync();

    const observer = new MutationObserver(() => {
      if (syncingCopyRef.current) return;
      scheduleSync();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [alphaViewMode, syncAlphaCopy]);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;
  const shellStyle = { "--sidebar-width": `${sidebarWidth}px` } as CSSProperties;

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`oq-sidebar-content flex flex-col bg-white text-black dark:bg-[#14110f] dark:text-[#f7f1ea] ${isMobile ? "h-full" : "h-[100dvh]"}`}>
      {/* Logo + Collapse Toggle */}
      <div
        className={`flex shrink-0 items-center ${
          collapsed && !isMobile ? "h-[49px] justify-center px-2" : "h-[31px] items-start justify-between px-3 pt-[18px]"
        }`}
      >
        {collapsed && !isMobile ? (
          <button
            type="button"
            data-testid="sidebar-toggle"
            onClick={() => setCollapsed(false)}
            aria-expanded={false}
            aria-label={tr("Expand sidebar", "展开导航栏")}
            title={tr("Expand sidebar", "展开导航栏")}
            className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-[#fef6ef] hover:text-[#dc4900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:text-[#b2a69b] dark:hover:bg-[#1b1511] dark:hover:text-[#ff6a1a]"
          >
            <img
              src="/quandora-single-logo.svg"
              alt="Quandora"
              className="h-6 w-6 object-contain transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0"
            />
            <PanelLeftOpen
              className="pointer-events-none absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        ) : (
          <>
            <Link href="/">
              <div className="flex h-[13px] shrink-0 items-center">
                <img
                  src="/quandora-wordmark.png"
                  alt="Quandora"
                  className="h-[13px] w-24 shrink-0 object-contain object-left dark:hidden"
                />
                <img
                  src="/quandora-wordmark-dark.svg"
                  alt="Quandora"
                  className="hidden h-[13px] w-24 shrink-0 object-contain object-left dark:block"
                />
              </div>
            </Link>
          </>
        )}
        {!isMobile && !collapsed && (
          <button
            type="button"
            data-testid="sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? tr("Expand sidebar", "展开导航栏") : tr("Collapse sidebar", "折叠导航栏")}
            title={collapsed ? tr("Expand sidebar", "展开导航栏") : tr("Collapse sidebar", "折叠导航栏")}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-black/45 transition-colors hover:bg-[#fef6ef] hover:text-[#dc4900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:text-[#b2a69b] dark:hover:bg-[#1b1511] dark:hover:text-[#ff6a1a] ${
              collapsed ? "" : "-mt-[5px]"
            }`}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-black/50 hover:text-black dark:text-[#b2a69b] dark:hover:text-[#fff7ef]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>



      {/* Navigation */}
      <nav className={`min-h-0 flex-1 space-y-3 overflow-y-auto ${collapsed && !isMobile ? "px-2 pt-[27px]" : "px-3 pt-[27px]"}`}>
        {secondarySection && (!collapsed || isMobile) ? (() => {
          const secondaryItem = navItems.find((item) => item.path === secondarySection);
          if (!secondaryItem) return null;
          return (
            <div className={`oq-sidebar-nav-page space-y-3 ${navTransition === "secondary" ? "oq-sidebar-nav-page-secondary" : ""}`}>
              <button
                type="button"
                onClick={() => {
                  setNavTransition("primary");
                  setSecondarySection(null);
                }}
                className="flex w-full items-center gap-2 rounded-[6px] px-1.5 py-1.5 text-left text-[12px] font-medium text-black transition-colors hover:bg-[#fef6ef] hover:text-[#dc4900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:text-[#f7f1ea] dark:hover:bg-[#1b1511] dark:hover:text-[#ff6a1a]"
                aria-label={tr("Back", "返回")}
              >
                <ChevronLeft className="h-3 w-3 shrink-0" strokeWidth={1.7} aria-hidden="true" />
                <span>{tr(secondaryItem.labelEn, secondaryItem.labelZh)}</span>
              </button>
              <div className="space-y-3">
                {secondaryItem.children?.map((child) => {
                  const childActive = isActive(child.path);
                  const ChildIcon = child.icon;
                  return (
                    <button
                      key={child.path}
                      type="button"
                      onClick={() => navigate(child.path)}
                      className={`flex w-full items-center gap-1.5 rounded-[6px] p-1.5 text-[12px] font-normal transition-all duration-200 ease-in-out ${
                        childActive
                          ? "oq-sidebar-nav-active border border-[rgba(220,73,0,0.10)] bg-[#fef6ef] text-[#dc4900] dark:border-[#ff6a1a]/25 dark:bg-[#1b1511] dark:text-[#ff6a1a]"
                          : "border border-transparent text-black hover:border-[rgba(220,73,0,0.10)] hover:bg-[#fef6ef] hover:text-[#dc4900] dark:text-[#f7f1ea] dark:hover:border-[#ff6a1a]/25 dark:hover:bg-[#1b1511] dark:hover:text-[#ff6a1a]"
                      }`}
                    >
                      <ChildIcon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
                      <span>{tr(child.labelEn, child.labelZh)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })() : (
          <div className={`oq-sidebar-nav-page space-y-3 ${navTransition === "primary" ? "oq-sidebar-nav-page-primary" : ""}`}>
            {navItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const sectionActive = hasChildren ? isSectionActive(item.path) : isActive(item.path);
          const parentHighlighted = sectionActive && collapsed && !isMobile;

          if (hasChildren) {
            return (
              <div key={item.path}>
                {/* Parent item */}
                <button
                  onClick={() => {
                    setNavTransition("secondary");
                    setSecondarySection(item.path);
                    navigate(item.children![0].path);
                  }}
                  className={`flex w-full items-center rounded-[6px] text-[12px] font-normal transition-all duration-200 ease-in-out ${
                    collapsed && !isMobile
                      ? "justify-center p-1.5"
                      : "gap-1.5 p-1.5"
                  } ${parentHighlighted
                    ? "oq-sidebar-nav-active border border-[rgba(220,73,0,0.10)] bg-[#fef6ef] text-[#dc4900] dark:border-[#ff6a1a]/25 dark:bg-[#1b1511] dark:text-[#ff6a1a]"
                    : "border border-transparent text-black hover:border-[rgba(220,73,0,0.10)] hover:bg-[#fef6ef] hover:text-[#dc4900] dark:text-[#f7f1ea] dark:hover:border-[#ff6a1a]/25 dark:hover:bg-[#1b1511] dark:hover:text-[#ff6a1a]"
                  }`}
                  title={collapsed && !isMobile ? tr(item.labelEn, item.labelZh) : undefined}
                >
                  <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="flex-1 text-left">{tr(item.labelEn, item.labelZh)}</span>
                      <ChevronRight className="h-3 w-3 shrink-0" strokeWidth={1.7} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            );
          }

          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center rounded-[6px] text-[12px] font-normal transition-all duration-200 ease-in-out ${
                collapsed && !isMobile
                  ? "justify-center p-1.5"
                  : "gap-1.5 p-1.5"
              } ${item.path === "/marketplace" && collapsed && !isMobile ? "-mt-[18px]" : ""} ${
                active
                  ? "oq-sidebar-nav-active border border-[rgba(220,73,0,0.10)] bg-[#fef6ef] text-[#dc4900] dark:border-[#ff6a1a]/25 dark:bg-[#1b1511] dark:text-[#ff6a1a]"
                  : "border border-transparent text-black hover:border-[rgba(220,73,0,0.10)] hover:bg-[#fef6ef] hover:text-[#dc4900] dark:text-[#f7f1ea] dark:hover:border-[#ff6a1a]/25 dark:hover:bg-[#1b1511] dark:hover:text-[#ff6a1a]"
              }`}
              title={collapsed && !isMobile ? tr(item.labelEn, item.labelZh) : undefined}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
              {(!collapsed || isMobile) && <span>{tr(item.labelEn, item.labelZh)}</span>}
            </button>
          );
            })}
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className={`oq-sidebar-footer shrink-0 ${collapsed && !isMobile ? "px-2 py-3" : "mx-3 pb-[18px] pt-[18px]"}`}>
        {collapsed && !isMobile ? (
          /* === Collapsed: vertical stack === */
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => navigate("/account")}
              className="flex items-center justify-center rounded-full transition-all duration-200 ease-in-out"
              title={tr("Settings", "设置")}
            >
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#d99100] to-[#dc4900] text-[9px] font-semibold text-white">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </div>
            </button>
          </div>
        ) : (
          /* === Expanded: quick actions + user block === */
          <div className="space-y-2">
            <button
              ref={onboardingTriggerRef}
              type="button"
              onClick={() => setOnboardingOpen((open) => !open)}
              aria-expanded={onboardingOpen}
              aria-controls="oq-onboarding-popover"
              className="oq-sidebar-quick-card flex w-full items-center justify-between rounded-[8px] border-[0.5px] border-[#ece6df] bg-white px-2.5 py-2 text-left shadow-none transition-colors hover:border-[#dc4900]/35 hover:bg-[#fff1e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:border-[#4b4036] dark:bg-[#241812] dark:hover:border-[#ff6a1a]/45 dark:hover:bg-[#2d2113]"
            >
              <span className="flex items-center gap-2 text-[12px] font-medium text-[#171411] dark:text-[#f7f1ea]">
                <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#dc49001a] text-[#dc4900]">✦</span>
                {tr("Beginner tasks", "开启新手任务")}
              </span>
              <span className="text-[11px] tabular-nums text-[#8c8378]">33%</span>
            </button>
            <button
              type="button"
              onClick={() => { setOnboardingOpen(false); navigate("/account?tab=agent"); }}
              className="oq-sidebar-quick-card flex w-full items-center justify-between rounded-[8px] border-[0.5px] border-[#ece6df] bg-white px-2.5 py-2 text-left shadow-none transition-colors hover:border-[#dc4900]/35 hover:bg-[#fff1e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:border-[#4b4036] dark:bg-[#241812] dark:hover:border-[#ff6a1a]/45 dark:hover:bg-[#2d2113]"
            >
              <span className="flex min-w-0 items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#f1f1ed] text-[#4a443d] dark:bg-[#2b251f] dark:text-[#d5c9bc]"><Bot className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" /></span><span className="min-w-0"><span className="mb-[-2px] block truncate text-[12px] font-medium text-[#171411] dark:text-[#f7f1ea]">{tr("AI agents", "AI 智能体")}</span><span className="mt-0.5 block text-[10px] text-[#1f8a5b] dark:text-[#74d6a5]">{tr("2 connected", "已连接 2 个")}</span></span></span>
              <Settings2 className="h-3.5 w-3.5 shrink-0 text-[#8c8378]" strokeWidth={1.6} aria-hidden="true" />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate("/account")}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[6px] transition-all duration-200 ease-in-out hover:bg-[#fef6ef] dark:hover:bg-[#1b1511]"
              >
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#d99100] to-[#dc4900] text-[9px] font-semibold text-white">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    avatarInitial
                  )}
                </div>
                <span className="flex w-[72px] min-w-0 flex-col items-start gap-[3px] text-left leading-none">
                  <span className="w-full truncate text-[12px] font-medium text-black dark:text-[#f7f1ea]">{displayName}</span>
                  <span className="w-full truncate text-[10px] font-normal text-black/60 dark:text-[#b2a69b]">{userHandle}</span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`oq-app-shell flex min-h-screen bg-[#faf8f6] dark:bg-[#14110f] md:min-h-[1024px] md:pl-[var(--sidebar-width)] ${
        currentPathname.startsWith("/account") ||
        currentPathname.startsWith("/alphas") ||
        currentPathname.startsWith("/marketplace") ||
        currentPathname.startsWith("/trade") ||
        currentPathname.startsWith("/strategies")
          ? "md:min-w-0"
          : "md:min-w-[1440px]"
      }`}
      style={shellStyle}
    >
      {/* Desktop Sidebar */}
      <aside
        className="oq-sidebar-aside fixed bottom-0 left-0 top-0 z-20 hidden h-[100dvh] shrink-0 flex-col overflow-hidden border-r-[0.5px] border-[#eef0f4] bg-white transition-all duration-300 ease-in-out dark:border-[#4b4036] dark:bg-[#14110f] md:flex"
        style={{ width: sidebarWidth }}
      >
        <SidebarContent />
      </aside>

      {onboardingOpen && (
        <section
          ref={onboardingPopoverRef}
          id="oq-onboarding-popover"
          role="dialog"
          aria-label={tr("Beginner tasks", "新手任务")}
          className="fixed bottom-[126px] left-4 z-40 mb-8 -ml-1.5 w-[min(300px,calc(100vw-32px))] overflow-hidden rounded-[12px] border border-[#ece6df] bg-[#faf8f6] p-2.5 text-[#171411] shadow-[0_12px_34px_rgba(60,40,20,0.14)] dark:border-[#4b4036] dark:bg-[#1b1511] dark:text-[#f7f1ea] dark:shadow-[0_16px_42px_oklch(0_0_0_/_0.5)] md:bottom-[128px]"
        >
          <div className="flex items-center justify-between px-2 pb-2"><h2 className="text-[15px] font-semibold tracking-[-0.01em]">{tr("You're making progress!", "你渐入佳境啦!")}</h2><button type="button" onClick={() => setOnboardingOpen(false)} aria-label={tr("Close beginner tasks", "关闭新手任务")} className="mr-[-4px] flex h-6 w-6 items-center justify-center rounded-full text-[#8c8378] transition-colors hover:bg-[#f0e8e1] hover:text-[#171411] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:hover:bg-[#2d2113] dark:hover:text-[#f7f1ea]"><X className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" /></button></div>
        <div className="space-y-2"><OnboardingTaskGroup title={tr("Create a factor", "创建 1 个因子")} progressLabel={tr("Task progress", "任务进度")} steps={[{ id: "connect-agent", label: tr("Connect an AI agent", "连接 AI 智能体") }, { id: "create-factor-with-agent", label: tr("Create a factor with an AI agent", "在 AI 智能体中创建 1 个因子") }]} completedStepStates={[false, factorCreationTaskComplete]} clickCompletedSteps onStepClick={(stepId) => { if (stepId === "connect-agent") { setOnboardingOpen(false); navigate("/account?tab=installGuide"); } if (stepId === "create-factor-with-agent") { setOnboardingOpen(false); setFactorGuideStep(0); setFactorGuideOpen(true); } }} /><OnboardingTaskGroup title={tr("Deploy a paper trading bot", "创建 1 个模拟交易")} progressLabel={tr("Task progress", "任务进度")} steps={[{ id: "create-strategy", label: tr("Create strategy", "创建策略") }, { id: "run-strategy", label: tr("Run strategy", "运行策略") }, { id: "deploy-paper", label: tr("Deploy strategy to paper trading", "将策略部署到模拟交易") }]} completedStepStates={[strategyCreationTaskComplete, strategyRunTaskComplete, paperDeploymentTaskComplete]} clickCompletedSteps onStepClick={(stepId) => { if (stepId === "create-strategy") { setOnboardingOpen(false); navigate("/strategies?onboarding=create-strategy"); } if (stepId === "run-strategy") { setOnboardingOpen(false); navigate("/strategies?onboarding=run-strategy"); } if (stepId === "deploy-paper") { setOnboardingOpen(false); navigate("/trade?onboarding=deploy-paper"); } }} /></div>
        </section>
      )}

      <FactorCreationGuideDialog
        open={factorGuideOpen}
        onOpenChange={setFactorGuideOpen}
        step={factorGuideStep}
        onStepChange={setFactorGuideStep}
        onOpenFactors={() => {
          setFactorGuideOpen(false);
          navigate("/alphas");
        }}
        tr={tr}
      />

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`oq-sidebar-aside fixed left-0 top-0 z-50 h-full border-r-[0.5px] border-[#eef0f4] bg-white transition-transform duration-300 ease-in-out dark:border-[#4b4036] dark:bg-[#14110f] md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: SIDEBAR_W }}
      >
        <SidebarContent isMobile />
      </aside>

      {/* Main Content */}
      <div className={`oq-app-main-column flex min-w-0 flex-1 flex-col bg-[#faf8f6] dark:bg-[#14110f] ${usesExplorePageCanvas ? "oq-app-explore-canvas" : ""}`}>
        <header
          className="oq-app-header fixed left-[var(--sidebar-width)] right-0 top-0 z-10 hidden shrink-0 items-center justify-between border-b-[0.5px] border-[#ece6df] bg-[#faf8f6]/85 backdrop-blur-[4.5px] dark:border-[#4b4036] dark:bg-[#14110f]/85 md:flex"
          style={{ height: FIGMA_HEADER_H }}
        >
          <div className="ml-[21px] flex h-full min-w-0 items-center gap-[26px]">
            {!showExploreTabs && (
              <div className={`flex min-w-0 ${isMarketplaceHeaderDetail ? "h-[30px] items-center gap-2" : "h-[35px] flex-col justify-start"}`}>
                {isMarketplaceHeaderDetail ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(isMarketplaceStrategyDetail ? marketplaceFundPath : "/marketplace")}
                      aria-label={marketplaceBackLabel}
                      title={marketplaceBackLabel}
                      className="flex h-6 w-6 shrink-0 items-center justify-center text-[#6f675f] transition-colors hover:text-[#dc4900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:text-[#b2a69b] dark:hover:text-[#ff6a1a]"
                    >
                      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    </button>
                    <nav
                      aria-label={tr("Page path", "页面路径")}
                      className="flex min-w-0 items-center gap-[8px]"
                    >
                      <Link
                        href="/marketplace"
                        className="text-[12px] font-normal leading-[18px] text-[#8c8378] transition-colors hover:text-[#dc4900] dark:text-[#b2a69b] dark:hover:text-[#ff6a1a]"
                      >
                        {tr("Explore", "探索")}
                      </Link>
                      <span aria-hidden="true" className="text-[12px] text-[#b5aba0] dark:text-[#75695e]">/</span>
                      {isMarketplaceStrategyDetail ? (
                        <>
                          <Link
                            href={marketplaceFundPath}
                            className="text-[12px] font-normal leading-[18px] text-[#8c8378] transition-colors hover:text-[#dc4900] dark:text-[#b2a69b] dark:hover:text-[#ff6a1a]"
                          >
                            {tr("Portfolio Detail", "投资组合详情")}
                          </Link>
                          <span aria-hidden="true" className="text-[12px] text-[#b5aba0] dark:text-[#75695e]">/</span>
                        </>
                      ) : null}
                      {isMarketplaceUserProfile ? (
                        <>
                          <h1 className="text-[16.5px] font-bold leading-[18.15px] tracking-[-0.33px] text-[#0d0d0d] dark:text-[#fff7ef]">
                            {tr("User Profile", "用户主页")}
                          </h1>
                        </>
                      ) : (
                      <h1 className="text-[16.5px] font-bold leading-[18.15px] tracking-[-0.33px] text-[#0d0d0d] dark:text-[#fff7ef]">
                        {isMarketplaceStrategyDetail ? tr("Strategy Detail", "策略详情") : tr("Portfolio Detail", "投资组合详情")}
                      </h1>
                      )}
                    </nav>
                  </>
                ) : (
                  <div>
                    <h1 className="text-[16.5px] font-bold leading-[18.15px] tracking-[-0.33px] text-[#0d0d0d] dark:text-[#fff7ef]">
                      {tr(pageHeader.titleEn, pageHeader.titleZh)}
                    </h1>
                    <p className="mt-[2.6px] text-[9.375px] font-normal leading-[15.188px] text-[#8c8378] dark:text-[#b2a69b]">
                      {tr(pageHeader.subtitleEn, pageHeader.subtitleZh)}
                    </p>
                  </div>
                )}
              </div>
            )}
            {showExploreTabs && (
              <nav
                aria-label={tr("Explore navigation", "探索导航")}
                className="hidden h-full items-stretch gap-[2px] lg:flex"
              >
                {exploreTabs.map((tab) => {
                  const active = isExploreTabActive(tab.key);
                  return (
                    <Link
                      key={tab.key}
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={`oq-explore-tab flex h-full items-center border-b-0 px-[10px] pt-[1px] text-[14px] font-medium transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 ${
                        active
                          ? "is-active"
                          : "border-transparent text-[#8c8378] hover:text-[#0d0d0d] dark:text-[#b2a69b] dark:hover:text-[#fff7ef]"
                      }`}
                    >
                      {tr(tab.labelEn, tab.labelZh)}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="mr-[21px] flex h-[30px] items-center gap-[20px]">
            {hasHeaderSearch && (
              <label className="flex h-[27.75px] w-[180px] shrink-0 items-center gap-[6px] rounded-[749.25px] border-[0.75px] border-[#e2dad0] bg-white px-[10.5px] shadow-[0_0.75px_0.75px_rgba(60,40,20,0.06)] transition-colors focus-within:border-[#dc4900]/45 focus-within:ring-2 focus-within:ring-[#dc4900]/10 dark:border-[#4b4036] dark:bg-[#241e18] dark:focus-within:border-[#ff6a1a]/60 dark:focus-within:ring-[#ff6a1a]/10">
                <Search
                  className="h-[11.25px] w-[10.078px] shrink-0 text-black dark:text-[oklch(0.8_0.022_65)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={headerSearchQuery}
                  onChange={(event) => updateHeaderSearch(event.target.value)}
                  placeholder={tr("Search strategies, IDs, or symbols", "搜索策略、ID 或交易对")}
                  aria-label={tr("Search strategies, IDs, or symbols", "搜索策略、ID 或交易对")}
                  className="min-w-0 flex-1 bg-transparent p-0 text-[9.75px] font-normal leading-[1.2] text-[#0d0d0d] outline-none placeholder:text-[#b5aba0] dark:text-[#f7f1ea] dark:placeholder:text-[#8c8176] [&::-webkit-search-cancel-button]:hidden"
                />
                {headerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => updateHeaderSearch("")}
                    aria-label={tr("Clear search", "清空搜索")}
                    className="-mr-[7px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#8c8378] transition-colors hover:bg-[#f5f0eb] hover:text-[#0d0d0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:text-[oklch(0.68_0.021_67)] dark:hover:bg-[oklch(0.295_0.014_65)] dark:hover:text-[oklch(0.95_0.014_68)]"
                  >
                    <X className="h-[10px] w-[10px]" aria-hidden="true" />
                  </button>
                )}
              </label>
            )}
            <div className="flex items-center gap-[9px]">
              <AnimatedThemeToggler
                aria-label={theme === "dark" ? tr("Switch to light mode", "切换到浅色模式") : tr("Switch to dark mode", "切换到深色模式")}
                aria-pressed={theme === "dark"}
                title={theme === "dark" ? tr("Switch to light mode", "切换到浅色模式") : tr("Switch to dark mode", "切换到深色模式")}
                className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#e2dad0] bg-white p-0 text-[var(--oq-text-soft)] shadow-[0_0.75px_0.75px_rgba(60,40,20,0.06)] transition-colors hover:border-[#d2c8bc] hover:bg-[#fef6ef] hover:text-[#dc4900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:border-[#4b4036] dark:bg-[#241e18] dark:hover:border-[#6a5b4d] dark:hover:bg-[#2d2113] dark:hover:text-[#ff6a1a]"
              />
              <NotificationPanel
                triggerClassName="relative flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#e2dad0] bg-white shadow-[0_0.75px_0.75px_rgba(60,40,20,0.06)] dark:border-[#4b4036] dark:bg-[#241e18]"
                iconClassName="h-[12.75px] w-[12.75px] text-[var(--oq-text-soft)]"
                panelStyle={{ position: "fixed", top: "52px", right: "21px", width: "380px" }}
                showBadge={false}
              />
            </div>
          </div>
        </header>

        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-30 h-12 bg-card/80 backdrop-blur-xl border-b border-border flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {isMarketplaceHeaderDetail ? (
            <>
              <button
                type="button"
                onClick={() => navigate(isMarketplaceStrategyDetail ? marketplaceFundPath : "/marketplace")}
                aria-label={marketplaceBackLabel}
                title={marketplaceBackLabel}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <nav aria-label={tr("Page path", "页面路径")} className="flex min-w-0 items-center gap-1.5">
                <Link href="/marketplace" className="text-xs font-normal text-muted-foreground">{tr("Explore", "探索")}</Link>
                <span aria-hidden="true" className="text-xs text-muted-foreground/60">/</span>
                <h1 className="text-[15px] font-semibold text-foreground">
                  {isMarketplaceUserProfile ? tr("User Profile", "用户主页") : tr("Portfolio Detail", "投资组合详情")}
                </h1>
              </nav>
            </>
          ) : (
            <Link href="/">
              <div className="flex items-center gap-2">
                <img
                  src="/quandora-wordmark.png"
                  alt="Quandora"
                  className="h-[13px] w-24 object-contain object-left dark:hidden"
                />
                <img
                  src="/quandora-wordmark-dark.svg"
                  alt="Quandora"
                  className="hidden h-[13px] w-24 object-contain object-left dark:block"
                />
              </div>
            </Link>
          )}
          <div className="ml-auto flex items-center gap-2">
            <AnimatedThemeToggler
              aria-label={theme === "dark" ? tr("Switch to light mode", "切换到浅色模式") : tr("Switch to dark mode", "切换到深色模式")}
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? tr("Switch to light mode", "切换到浅色模式") : tr("Switch to dark mode", "切换到深色模式")}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#e2dad0] bg-white p-0 text-[var(--oq-text-soft)] shadow-[0_0.75px_0.75px_rgba(60,40,20,0.06)] transition-colors hover:bg-[#fef6ef] hover:text-[#dc4900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc4900]/25 dark:border-[#4b4036] dark:bg-[#241e18] dark:hover:bg-[#2d2113] dark:hover:text-[#ff6a1a]"
            />
            <NotificationPanel
              triggerClassName="oq-notification-mobile-trigger relative flex h-11 w-11 items-center justify-center rounded-full border border-[#e2dad0] bg-white shadow-[0_0.75px_0.75px_rgba(60,40,20,0.06)] dark:border-[#4b4036] dark:bg-[#241e18]"
              iconClassName="h-[13px] w-[13px] text-[var(--oq-text-soft)]"
              panelStyle={{ position: "fixed", top: "56px", right: "12px", width: "390px" }}
              showBadge={false}
            />
          </div>
        </header>

        {/* Page Content */}
        <main
          className={`mx-auto w-full flex-1 py-6 md:pt-[calc(60px+1.5rem)] lg:pb-8 lg:pt-[calc(60px+2rem)] ${
            currentPathname.startsWith("/marketplace")
              ? "max-w-none px-4 md:px-6 lg:px-8"
              : currentPathname === "/alphas" || currentPathname === "/strategies" || currentPathname === "/trade"
                ? "max-w-[1200px] px-0"
                : "max-w-[1100px] px-0"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
