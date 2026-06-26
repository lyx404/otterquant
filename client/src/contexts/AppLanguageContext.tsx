import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UiLang = "en" | "zh" | "ja" | "ko" | "es" | "fr";
type TranslationKey = Exclude<UiLang, "en">;
type TranslationTable = Record<string, Partial<Record<TranslationKey, string>>>;

interface AppLanguageContextType {
  uiLang: UiLang;
  setUiLang: (lang: UiLang) => void;
  t: (en: string, zh?: string) => string;
}

const AppLanguageContext = createContext<AppLanguageContextType | undefined>(undefined);
const TRANSLATIONS: TranslationTable = {
  "Pond": { zh: "鱼塘", ja: "池", ko: "연못", es: "Estanque", fr: "Étang" },
  "Fish Market": { zh: "鱼市场", ja: "魚市場", ko: "어시장", es: "Mercado", fr: "Marché" },
  "Inventory": { zh: "图鉴", ja: "図鑑", ko: "도감", es: "Inventario", fr: "Inventaire" },
  "Scratch": { zh: "刮刮乐", ja: "スクラッチ", ko: "스크래치", es: "Rasca", fr: "Grattage" },
  "Leaderboard": { zh: "排行榜", ja: "ランキング", ko: "순위표", es: "Clasificación", fr: "Classement" },
  "Settings": { zh: "设置", ja: "設定", ko: "설정", es: "Ajustes", fr: "Paramètres" },
  "Navigation": { zh: "功能入口", ja: "ナビゲーション", ko: "내비게이션", es: "Navegación", fr: "Navigation" },
  "Primary action": { zh: "主按钮", ja: "主操作", ko: "기본 동작", es: "Acción principal", fr: "Action principale" },
  "Demo scenarios": { zh: "测试场景", ja: "デモシナリオ", ko: "데모 시나리오", es: "Escenarios demo", fr: "Scénarios démo" },
  "Test scenarios": { zh: "测试场景", ja: "テストシナリオ", ko: "테스트 시나리오", es: "Escenarios de prueba", fr: "Scénarios de test" },
  "Version": { zh: "版本", ja: "バージョン", ko: "버전", es: "Versión", fr: "Version" },
  "Normal version": { zh: "普通版本", ja: "通常版", ko: "일반 버전", es: "Versión normal", fr: "Version normale" },
  "MVP version": { zh: "MVP版本", ja: "MVP版", ko: "MVP 버전", es: "Versión MVP", fr: "Version MVP" },
  "Data state": { zh: "数据状态", ja: "データ状態", ko: "데이터 상태", es: "Estado de datos", fr: "État des données" },
  "Basket badge: hidden": { zh: "鱼篓角标：隐藏", ja: "かごバッジ：非表示", ko: "바구니 배지: 숨김", es: "Insignia cesta: oculta", fr: "Badge panier : masqué" },
  "Basket badge: 1": { zh: "鱼篓角标：1", ja: "かごバッジ：1", ko: "바구니 배지: 1", es: "Insignia cesta: 1", fr: "Badge panier : 1" },
  "Game coins: empty": { zh: "游戏币状态：无数据", ja: "ゲームコイン：データなし", ko: "게임 코인: 데이터 없음", es: "Monedas: sin datos", fr: "Pièces : aucune donnée" },
  "Game coins: has data": { zh: "游戏币状态：有数据", ja: "ゲームコイン：データあり", ko: "게임 코인: 데이터 있음", es: "Monedas: con datos", fr: "Pièces : avec données" },
  "Cash: empty": { zh: "现金状态：无数据", ja: "現金：データなし", ko: "현금: 데이터 없음", es: "Efectivo: sin datos", fr: "Cash : aucune donnée" },
  "Cash: has data": { zh: "现金状态：有数据", ja: "現金：データあり", ko: "현금: 데이터 있음", es: "Efectivo: con datos", fr: "Cash : avec données" },
  "Inventory: multiple": { zh: "图鉴状态：多个数据", ja: "図鑑：複数データ", ko: "도감: 여러 데이터", es: "Inventario: varios datos", fr: "Inventaire : plusieurs données" },
  "Inventory: single": { zh: "图鉴状态：1个数据", ja: "図鑑：1件", ko: "도감: 1개 데이터", es: "Inventario: 1 dato", fr: "Inventaire : 1 donnée" },
  "Inventory: empty": { zh: "图鉴状态：无数据", ja: "図鑑：データなし", ko: "도감: 데이터 없음", es: "Inventario: sin datos", fr: "Inventaire : aucune donnée" },
  "Agent connection": { zh: "Agent连接", ja: "Agent接続", ko: "Agent 연결", es: "Conexión Agent", fr: "Connexion Agent" },
  "Logged out": { zh: "未登录", ja: "ログアウト", ko: "로그아웃됨", es: "Sin sesión", fr: "Déconnecté" },
  "Free trial": { zh: "免费试用", ja: "無料試用", ko: "무료 체험", es: "Prueba gratis", fr: "Essai gratuit" },
  "Agent disconnected": { zh: "Agent未连接", ja: "Agent未接続", ko: "Agent 연결 끊김", es: "Agent desconectado", fr: "Agent déconnecté" },
  "Web agent": { zh: "网页Agent", ja: "Web Agent", ko: "웹 Agent", es: "Agent web", fr: "Agent web" },
  "Client agent": { zh: "客户端Agent", ja: "クライアントAgent", ko: "클라이언트 Agent", es: "Agent cliente", fr: "Agent client" },
  "Authorization popup preview": { zh: "授权弹窗预览", ja: "認可ポップアップのプレビュー", ko: "권한 팝업 미리보기", es: "Vista de autorización", fr: "Aperçu autorisation" },
  "Timeout popup preview": { zh: "超时弹窗预览", ja: "タイムアウト表示のプレビュー", ko: "시간 초과 팝업 미리보기", es: "Vista de expiración", fr: "Aperçu expiration" },
  "Collapse": { zh: "收起", ja: "折りたたむ", ko: "접기", es: "Contraer", fr: "Réduire" },
  "Expand": { zh: "展开", ja: "展開", ko: "펼치기", es: "Expandir", fr: "Développer" },
  "Collapse demo scenarios": { zh: "收起测试场景", ja: "デモシナリオを折りたたむ", ko: "데모 시나리오 접기", es: "Contraer demos", fr: "Réduire les démos" },
  "Expand demo scenarios": { zh: "展开测试场景", ja: "デモシナリオを展開", ko: "데모 시나리오 펼치기", es: "Expandir demos", fr: "Développer les démos" },
  "Cast": { zh: "抛竿", ja: "キャスト", ko: "캐스팅", es: "Lanzar", fr: "Lancer" },
  "Basket": { zh: "鱼篓", ja: "かご", ko: "바구니", es: "Cesta", fr: "Panier" },
  "Enable auto cast": { zh: "开启自动抛竿", ja: "自動キャストを有効化", ko: "자동 캐스팅 켜기", es: "Activar auto lanzar", fr: "Activer auto-lancer" },
  "Auto cast settings": { zh: "自动抛竿设置", ja: "自動キャスト設定", ko: "자동 캐스팅 설정", es: "Ajustes auto lanzar", fr: "Réglages auto-lancer" },
  "Connect an agent to use": { zh: "连接agent后使用", ja: "Agent接続後に使用", ko: "Agent 연결 후 사용", es: "Conecta un Agent para usar", fr: "Connectez un Agent pour utiliser" },
  "Use the connected local agent": { zh: "请到已连接的本地agent上操作", ja: "接続済みのローカルAgentで操作してください", ko: "연결된 로컬 Agent에서 작업하세요", es: "Usa el Agent local conectado", fr: "Utilisez l’Agent local connecté" },
  "Waiting": { zh: "等待中", ja: "待機中", ko: "대기 중", es: "Esperando", fr: "En attente" },
  "Stop": { zh: "停止", ja: "停止", ko: "중지", es: "Detener", fr: "Arrêter" },
  "Stop auto cast": { zh: "停止自动抛竿", ja: "自動キャストを停止", ko: "자동 캐스팅 중지", es: "Detener auto lanzar", fr: "Arrêter auto-lancer" },
  "Stop casting": { zh: "停止抛竿", ja: "キャストを停止", ko: "캐스팅 중지", es: "Detener lanzamiento", fr: "Arrêter le lancer" },
  "Empty": { zh: "空空如也", ja: "空です", ko: "비어 있음", es: "Vacío", fr: "Vide" },
  "Shop": { zh: "商店", ja: "ショップ", ko: "상점", es: "Tienda", fr: "Boutique" },
  "Language": { zh: "语言设置", ja: "言語", ko: "언어", es: "Idioma", fr: "Langue" },
  "Choose language": { zh: "选择语言", ja: "言語を選択", ko: "언어 선택", es: "Elegir idioma", fr: "Choisir la langue" },
  "General": { zh: "通用设置", ja: "一般", ko: "일반", es: "General", fr: "Général" },
  "Profile": { zh: "个人资料", ja: "プロフィール", ko: "프로필", es: "Perfil", fr: "Profil" },
  "Nickname": { zh: "昵称", ja: "ニックネーム", ko: "닉네임", es: "Apodo", fr: "Pseudo" },
  "Email": { zh: "邮箱", ja: "メール", ko: "이메일", es: "Email", fr: "Email" },
  "Save": { zh: "保存", ja: "保存", ko: "저장", es: "Guardar", fr: "Enregistrer" },
  "Cancel": { zh: "取消", ja: "キャンセル", ko: "취소", es: "Cancelar", fr: "Annuler" },
  "Confirm": { zh: "确认", ja: "確認", ko: "확인", es: "Confirmar", fr: "Confirmer" },
  "Close": { zh: "关闭", ja: "閉じる", ko: "닫기", es: "Cerrar", fr: "Fermer" },
  "Done": { zh: "完成", ja: "完了", ko: "완료", es: "Listo", fr: "Terminé" },
  "Start": { zh: "开始", ja: "開始", ko: "시작", es: "Iniciar", fr: "Démarrer" },
  "Collect": { zh: "收取", ja: "受け取る", ko: "받기", es: "Recoger", fr: "Collecter" },
  "Congratulations": { zh: "恭喜获得", ja: "おめでとう", ko: "축하합니다", es: "Felicidades", fr: "Félicitations" },
  "Basket rewards": { zh: "鱼篓奖励", ja: "かご報酬", ko: "바구니 보상", es: "Recompensas de cesta", fr: "Récompenses du panier" },
  "Reward cards": { zh: "奖励卡片", ja: "報酬カード", ko: "보상 카드", es: "Cartas de recompensa", fr: "Cartes de récompense" },
  "Previous reward page": { zh: "上一页奖励", ja: "前の報酬ページ", ko: "이전 보상 페이지", es: "Página anterior", fr: "Page précédente" },
  "Next reward page": { zh: "下一页奖励", ja: "次の報酬ページ", ko: "다음 보상 페이지", es: "Página siguiente", fr: "Page suivante" },
  "Reward pages": { zh: "奖励分页", ja: "報酬ページ", ko: "보상 페이지", es: "Páginas de recompensa", fr: "Pages de récompense" },
  "Auto cast started": { zh: "自动抛竿已开始", ja: "自動キャスト開始", ko: "자동 캐스팅 시작", es: "Auto lanzar iniciado", fr: "Auto-lancer démarré" },
  "Auto cast stopped": { zh: "自动抛竿已停止", ja: "自動キャスト停止", ko: "자동 캐스팅 중지됨", es: "Auto lanzar detenido", fr: "Auto-lancer arrêté" },
  "Verification code sent": { zh: "验证码已发送", ja: "認証コードを送信しました", ko: "인증 코드를 보냈습니다", es: "Código enviado", fr: "Code envoyé" },
  "Welcome back!": { zh: "欢迎回来", ja: "おかえりなさい", ko: "다시 오신 것을 환영합니다", es: "¡Bienvenido de nuevo!", fr: "Bon retour !" },
  "Account created": { zh: "账号创建成功", ja: "アカウントを作成しました", ko: "계정이 생성되었습니다", es: "Cuenta creada", fr: "Compte créé" },
  "Password reset": { zh: "密码已重设", ja: "パスワードをリセットしました", ko: "비밀번호가 재설정되었습니다", es: "Contraseña restablecida", fr: "Mot de passe réinitialisé" },
};

function translateText(lang: UiLang, en: string, zh?: string) {
  if (lang === "en") return en;
  if (lang === "zh") return zh ?? TRANSLATIONS[en]?.zh ?? en;
  return TRANSLATIONS[en]?.[lang] ?? translatePattern(lang, en) ?? en;
}

function translatePattern(lang: Exclude<UiLang, "en" | "zh">, en: string) {
  const freeTrialsMatch = en.match(/^Free trials remaining: (.+)$/);
  if (freeTrialsMatch) {
    const labels = {
      ja: "残り無料試用回数",
      ko: "남은 무료 체험",
      es: "Pruebas gratis restantes",
      fr: "Essais gratuits restants",
    };
    return `${labels[lang]}: ${freeTrialsMatch[1]}`;
  }

  const thisRunCastsMatch = en.match(/^This run will cast (.+) times\.$/);
  if (thisRunCastsMatch) {
    const labels = {
      ja: `この実行では${thisRunCastsMatch[1]}回キャストします。`,
      ko: `이번 실행은 ${thisRunCastsMatch[1]}회 캐스팅합니다.`,
      es: `Esta ronda lanzará ${thisRunCastsMatch[1]} veces.`,
      fr: `Cette session lancera ${thisRunCastsMatch[1]} fois.`,
    };
    return labels[lang];
  }

  const stoppedMatch = en.match(/^Stopped at (.+) of (.+)\.$/);
  if (stoppedMatch) {
    const labels = {
      ja: `${stoppedMatch[2]}回中${stoppedMatch[1]}回で停止しました。`,
      ko: `${stoppedMatch[2]}회 중 ${stoppedMatch[1]}회에서 중지했습니다.`,
      es: `Detenido en ${stoppedMatch[1]} de ${stoppedMatch[2]}.`,
      fr: `Arrêté à ${stoppedMatch[1]} sur ${stoppedMatch[2]}.`,
    };
    return labels[lang];
  }

  const castWaitingMatch = en.match(/^Cast waiting (.+)$/);
  if (castWaitingMatch) {
    const labels = {
      ja: `キャスト待機中 ${castWaitingMatch[1]}`,
      ko: `캐스팅 대기 중 ${castWaitingMatch[1]}`,
      es: `Lanzamiento en espera ${castWaitingMatch[1]}`,
      fr: `Lancer en attente ${castWaitingMatch[1]}`,
    };
    return labels[lang];
  }

  const autoCastProgressMatch = en.match(/^Auto cast in progress (.+) (.+)$/);
  if (autoCastProgressMatch) {
    const labels = {
      ja: `自動キャスト進行中 ${autoCastProgressMatch[1]} ${autoCastProgressMatch[2]}`,
      ko: `자동 캐스팅 진행 중 ${autoCastProgressMatch[1]} ${autoCastProgressMatch[2]}`,
      es: `Auto lanzar en progreso ${autoCastProgressMatch[1]} ${autoCastProgressMatch[2]}`,
      fr: `Auto-lancer en cours ${autoCastProgressMatch[1]} ${autoCastProgressMatch[2]}`,
    };
    return labels[lang];
  }

  const copiedMatch = en.match(/^(.+) copied\.$/);
  if (copiedMatch) {
    const labels = {
      ja: `${copiedMatch[1]}をコピーしました。`,
      ko: `${copiedMatch[1]} 복사됨.`,
      es: `${copiedMatch[1]} copiado.`,
      fr: `${copiedMatch[1]} copié.`,
    };
    return labels[lang];
  }

  return undefined;
}

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
  const [uiLang, setUiLang] = useState<UiLang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("otter_ui_lang");
    if (stored === "zh" || stored === "ja" || stored === "ko" || stored === "es" || stored === "fr" || stored === "en") {
      return stored;
    }
    return "en";
  });

  useEffect(() => {
    localStorage.setItem("otter_ui_lang", uiLang);
    if (typeof document !== "undefined") {
      document.documentElement.lang =
        uiLang === "zh" ? "zh-CN" :
        uiLang === "ja" ? "ja-JP" :
        uiLang === "ko" ? "ko-KR" :
        uiLang === "es" ? "es-ES" :
        uiLang === "fr" ? "fr-FR" :
        "en";
    }
  }, [uiLang]);

  const t = useMemo(() => (en: string, zh?: string) => translateText(uiLang, en, zh), [uiLang]);
  const value = useMemo(() => ({ uiLang, setUiLang, t }), [t, uiLang]);

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error("useAppLanguage must be used within AppLanguageProvider");
  }
  return context;
}
