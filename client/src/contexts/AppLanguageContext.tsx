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
  "Lucky Scratch": { zh: "幸运刮刮乐", ja: "ラッキースクラッチ", ko: "럭키 스크래치", es: "Rasca de la suerte", fr: "Grattage chanceux" },
  "Scratch for luck. Cash surprises land instantly.": { zh: "刮开好运，现金惊喜即刻到手", ja: "幸運をスクラッチ。現金サプライズがすぐに届きます。", ko: "행운을 긁어 보세요. 현금 보상이 즉시 도착합니다.", es: "Rasca tu suerte. Las sorpresas en efectivo llegan al instante.", fr: "Grattez votre chance. Les surprises cash arrivent instantanément." },
  "Stats": { zh: "数值统计", ja: "ステータス", ko: "상태", es: "Estadísticas", fr: "Statistiques" },
  "Close scratch card": { zh: "关闭刮刮乐", ja: "スクラッチを閉じる", ko: "스크래치 닫기", es: "Cerrar rasca", fr: "Fermer le grattage" },
  "Scratch action": { zh: "刮奖操作", ja: "スクラッチ操作", ko: "스크래치 동작", es: "Acción de rasca", fr: "Action de grattage" },
  "Purchase info": { zh: "购买信息", ja: "購入情報", ko: "구매 정보", es: "Información de compra", fr: "Infos d’achat" },
  "Open game coins": { zh: "打开游戏币", ja: "ゲームコインを開く", ko: "게임 코인 열기", es: "Abrir monedas", fr: "Ouvrir les pièces" },
  "Open cash": { zh: "打开现金", ja: "現金を開く", ko: "현금 열기", es: "Abrir efectivo", fr: "Ouvrir le cash" },
  "Qty": { zh: "购买张数", ja: "枚数", ko: "수량", es: "Cantidad", fr: "Quantité" },
  "Decrease qty": { zh: "减少购买张数", ja: "枚数を減らす", ko: "수량 줄이기", es: "Reducir cantidad", fr: "Réduire la quantité" },
  "Increase qty": { zh: "增加购买张数", ja: "枚数を増やす", ko: "수량 늘리기", es: "Aumentar cantidad", fr: "Augmenter la quantité" },
  "Scratch card ticket": { zh: "刮刮乐彩票", ja: "スクラッチカード", ko: "스크래치 티켓", es: "Boleto de rasca", fr: "Ticket de grattage" },
  "Winning Numbers": { zh: "中奖号码", ja: "当選番号", ko: "당첨 번호", es: "Números ganadores", fr: "Numéros gagnants" },
  "Scratch Area": { zh: "待刮区", ja: "スクラッチエリア", ko: "스크래치 영역", es: "Área de rasca", fr: "Zone à gratter" },
  "tix": { zh: "张", ja: "枚", ko: "장", es: "boletos", fr: "tickets" },
  "Reveal": { zh: "一键刮开", ja: "開く", ko: "열기", es: "Revelar", fr: "Révéler" },
  "Reveal All": { zh: "一键全开", ja: "すべて開く", ko: "모두 열기", es: "Revelar todo", fr: "Tout révéler" },
  "Prize Amount": { zh: "中奖金额", ja: "当選金額", ko: "당첨 금액", es: "Premio", fr: "Gain" },
  "Total Prize": { zh: "总中奖金额", ja: "合計当選金額", ko: "총 당첨 금액", es: "Premio total", fr: "Gain total" },
  "No Prize": { zh: "未中奖", ja: "はずれ", ko: "꽝", es: "Sin premio", fr: "Aucun gain" },
  "Total": { zh: "累计", ja: "累計", ko: "누적", es: "Total", fr: "Total" },
  "Close wallet": { zh: "关闭钱包", ja: "ウォレットを閉じる", ko: "지갑 닫기", es: "Cerrar cartera", fr: "Fermer le portefeuille" },
  "Insufficient balance": { zh: "余额不足", ja: "残高不足", ko: "잔액 부족", es: "Saldo insuficiente", fr: "Solde insuffisant" },
  "Leaderboard": { zh: "排行榜", ja: "ランキング", ko: "순위표", es: "Clasificación", fr: "Classement" },
  "Leaderboard period": { zh: "排行榜周期", ja: "ランキング期間", ko: "순위표 기간", es: "Periodo de clasificación", fr: "Période du classement" },
  "Leaderboard list": { zh: "排行榜列表", ja: "ランキング一覧", ko: "순위표 목록", es: "Lista de clasificación", fr: "Liste du classement" },
  "Close leaderboard": { zh: "关闭排行榜", ja: "ランキングを閉じる", ko: "순위표 닫기", es: "Cerrar clasificación", fr: "Fermer le classement" },
  "Weekly": { zh: "周榜", ja: "週間", ko: "주간", es: "Semanal", fr: "Hebdo" },
  "Monthly": { zh: "月榜", ja: "月間", ko: "월간", es: "Mensual", fr: "Mensuel" },
  "Rank": { zh: "排名", ja: "ランク", ko: "순위", es: "Rango", fr: "Rang" },
  "New balance": { zh: "新增余额", ja: "新規残高", ko: "신규 잔액", es: "Nuevo saldo", fr: "Nouveau solde" },
  "Casts": { zh: "抛竿数", ja: "キャスト数", ko: "캐스팅 수", es: "Lances", fr: "Lancers" },
  "Unranked": { zh: "未上榜", ja: "ランク外", ko: "순위 밖", es: "Sin rango", fr: "Non classé" },
  "Updates Mon 00:00": { zh: "每周一 0点 刷新", ja: "毎週月曜 00:00 更新", ko: "매주 월요일 00:00 업데이트", es: "Actualiza lunes 00:00", fr: "Mis à jour lundi 00:00" },
  "Updates 1st 00:00": { zh: "每月1日 0点 刷新", ja: "毎月1日 00:00 更新", ko: "매월 1일 00:00 업데이트", es: "Actualiza el día 1 00:00", fr: "Mis à jour le 1er 00:00" },
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
  "Settings categories": { zh: "设置分类", ja: "設定カテゴリ", ko: "설정 카테고리", es: "Categorías de ajustes", fr: "Catégories de paramètres" },
  "Agent settings": { zh: "agent设置", ja: "Agent設定", ko: "Agent 설정", es: "Ajustes de Agent", fr: "Paramètres Agent" },
  "Close settings": { zh: "关闭设置", ja: "設定を閉じる", ko: "설정 닫기", es: "Cerrar ajustes", fr: "Fermer les paramètres" },
  "Profile": { zh: "个人资料", ja: "プロフィール", ko: "프로필", es: "Perfil", fr: "Profil" },
  "Nickname": { zh: "昵称", ja: "ニックネーム", ko: "닉네임", es: "Apodo", fr: "Pseudo" },
  "Enter nickname": { zh: "请输入昵称", ja: "ニックネームを入力", ko: "닉네임 입력", es: "Introduce un apodo", fr: "Saisir un pseudo" },
  "Email": { zh: "邮箱", ja: "メール", ko: "이메일", es: "Email", fr: "Email" },
  "Edit": { zh: "编辑", ja: "編集", ko: "편집", es: "Editar", fr: "Modifier" },
  "Save": { zh: "保存", ja: "保存", ko: "저장", es: "Guardar", fr: "Enregistrer" },
  "Save profile": { zh: "保存资料", ja: "プロフィールを保存", ko: "프로필 저장", es: "Guardar perfil", fr: "Enregistrer le profil" },
  "Cancel": { zh: "取消", ja: "キャンセル", ko: "취소", es: "Cancelar", fr: "Annuler" },
  "Confirm": { zh: "确认", ja: "確認", ko: "확인", es: "Confirmar", fr: "Confirmer" },
  "Close": { zh: "关闭", ja: "閉じる", ko: "닫기", es: "Cerrar", fr: "Fermer" },
  "Change email": { zh: "修改邮箱", ja: "メールを変更", ko: "이메일 변경", es: "Cambiar email", fr: "Changer l’email" },
  "Current email": { zh: "当前邮箱", ja: "現在のメール", ko: "현재 이메일", es: "Email actual", fr: "Email actuel" },
  "Verification code": { zh: "验证码", ja: "認証コード", ko: "인증 코드", es: "Código de verificación", fr: "Code de vérification" },
  "Enter verification code": { zh: "请输入验证码", ja: "認証コードを入力", ko: "인증 코드 입력", es: "Introduce el código", fr: "Saisir le code" },
  "Code sent": { zh: "验证码已发送", ja: "コードを送信しました", ko: "코드를 보냈습니다", es: "Código enviado", fr: "Code envoyé" },
  "Verification code sent to your current email.": { zh: "验证码已发送至当前邮箱。", ja: "現在のメールに認証コードを送信しました。", ko: "현재 이메일로 인증 코드를 보냈습니다.", es: "Código enviado a tu email actual.", fr: "Code envoyé à votre email actuel." },
  "Verification code sent to your email.": { zh: "验证码已发送至邮箱。", ja: "メールに認証コードを送信しました。", ko: "이메일로 인증 코드를 보냈습니다.", es: "Código enviado a tu email.", fr: "Code envoyé à votre email." },
  "Send": { zh: "发送", ja: "送信", ko: "보내기", es: "Enviar", fr: "Envoyer" },
  "Resend": { zh: "重新发送", ja: "再送信", ko: "다시 보내기", es: "Reenviar", fr: "Renvoyer" },
  "New email": { zh: "新邮箱", ja: "新しいメール", ko: "새 이메일", es: "Nuevo email", fr: "Nouvel email" },
  "Enter new email address": { zh: "请输入新邮箱地址", ja: "新しいメールアドレスを入力", ko: "새 이메일 주소 입력", es: "Introduce el nuevo email", fr: "Saisir le nouvel email" },
  "Enter a valid email address": { zh: "请输入有效的邮箱地址", ja: "有効なメールアドレスを入力してください", ko: "유효한 이메일 주소를 입력하세요", es: "Introduce un email válido", fr: "Saisir un email valide" },
  "Save email": { zh: "保存邮箱", ja: "メールを保存", ko: "이메일 저장", es: "Guardar email", fr: "Enregistrer l’email" },
  "Change password": { zh: "修改密码", ja: "パスワードを変更", ko: "비밀번호 변경", es: "Cambiar contraseña", fr: "Changer le mot de passe" },
  "New password": { zh: "新密码", ja: "新しいパスワード", ko: "새 비밀번호", es: "Nueva contraseña", fr: "Nouveau mot de passe" },
  "At least 8 characters": { zh: "至少 8 位", ja: "8文字以上", ko: "8자 이상", es: "Al menos 8 caracteres", fr: "Au moins 8 caractères" },
  "Confirm password": { zh: "确认密码", ja: "パスワード確認", ko: "비밀번호 확인", es: "Confirmar contraseña", fr: "Confirmer le mot de passe" },
  "Re-enter new password": { zh: "再次输入新密码", ja: "新しいパスワードを再入力", ko: "새 비밀번호 다시 입력", es: "Repite la nueva contraseña", fr: "Ressaisir le nouveau mot de passe" },
  "Save password": { zh: "保存密码", ja: "パスワードを保存", ko: "비밀번호 저장", es: "Guardar contraseña", fr: "Enregistrer le mot de passe" },
  "Verify your identity with an email code before setting a new login password.": { zh: "通过邮箱验证码验证身份后，可设置新的登录密码。", ja: "新しいログインパスワードを設定する前に、メールコードで本人確認を行ってください。", ko: "새 로그인 비밀번호를 설정하기 전에 이메일 코드로 본인 확인을 해주세요.", es: "Verifica tu identidad con un código de email antes de definir una nueva contraseña.", fr: "Vérifiez votre identité avec un code email avant de définir un nouveau mot de passe." },
  "Sign out": { zh: "退出登录", ja: "サインアウト", ko: "로그아웃", es: "Cerrar sesión", fr: "Se déconnecter" },
  "Sign out?": { zh: "确认退出登录？", ja: "サインアウトしますか？", ko: "로그아웃할까요?", es: "¿Cerrar sesión?", fr: "Se déconnecter ?" },
  "Cannot save": { zh: "无法保存", ja: "保存できません", ko: "저장할 수 없음", es: "No se puede guardar", fr: "Impossible d’enregistrer" },
  "Nickname cannot be empty.": { zh: "昵称不能为空。", ja: "ニックネームは空にできません。", ko: "닉네임은 비워둘 수 없습니다.", es: "El apodo no puede estar vacío.", fr: "Le pseudo ne peut pas être vide." },
  "Profile updated": { zh: "资料已更新", ja: "プロフィールを更新しました", ko: "프로필이 업데이트되었습니다", es: "Perfil actualizado", fr: "Profil mis à jour" },
  "Nickname saved.": { zh: "昵称已保存。", ja: "ニックネームを保存しました。", ko: "닉네임이 저장되었습니다.", es: "Apodo guardado.", fr: "Pseudo enregistré." },
  "Enter the verification code.": { zh: "请输入验证码。", ja: "認証コードを入力してください。", ko: "인증 코드를 입력하세요.", es: "Introduce el código de verificación.", fr: "Saisissez le code de vérification." },
  "Enter the new email address.": { zh: "请输入新邮箱地址。", ja: "新しいメールアドレスを入力してください。", ko: "새 이메일 주소를 입력하세요.", es: "Introduce el nuevo email.", fr: "Saisissez le nouvel email." },
  "Email updated": { zh: "邮箱已更新", ja: "メールを更新しました", ko: "이메일이 업데이트되었습니다", es: "Email actualizado", fr: "Email mis à jour" },
  "New email address saved.": { zh: "新邮箱地址已保存。", ja: "新しいメールアドレスを保存しました。", ko: "새 이메일 주소가 저장되었습니다.", es: "Nuevo email guardado.", fr: "Nouvel email enregistré." },
  "New password must be at least 8 characters.": { zh: "新密码至少需要 8 位。", ja: "新しいパスワードは8文字以上必要です。", ko: "새 비밀번호는 8자 이상이어야 합니다.", es: "La nueva contraseña debe tener al menos 8 caracteres.", fr: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
  "The two passwords do not match.": { zh: "两次输入的密码不一致。", ja: "2つのパスワードが一致しません。", ko: "두 비밀번호가 일치하지 않습니다.", es: "Las dos contraseñas no coinciden.", fr: "Les deux mots de passe ne correspondent pas." },
  "Password updated": { zh: "密码已更新", ja: "パスワードを更新しました", ko: "비밀번호가 업데이트되었습니다", es: "Contraseña actualizada", fr: "Mot de passe mis à jour" },
  "Use the new password on your next login.": { zh: "下次登录请使用新密码。", ja: "次回ログイン時は新しいパスワードを使用してください。", ko: "다음 로그인부터 새 비밀번호를 사용하세요.", es: "Usa la nueva contraseña en tu próximo inicio de sesión.", fr: "Utilisez le nouveau mot de passe à votre prochaine connexion." },
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
  "Next": { zh: "下一步", ja: "次へ", ko: "다음", es: "Siguiente", fr: "Suivant" },
  "OK": { zh: "确定", ja: "OK", ko: "확인", es: "OK", fr: "OK" },
  "Connected": { zh: "已连接", ja: "接続済み", ko: "연결됨", es: "Conectado", fr: "Connecté" },
  "Connected!": { zh: "连接成功！", ja: "接続しました！", ko: "연결되었습니다!", es: "¡Conectado!", fr: "Connecté !" },
  "Disconnected": { zh: "已断连", ja: "切断済み", ko: "연결 끊김", es: "Desconectado", fr: "Déconnecté" },
  "Unavailable": { zh: "无法使用", ja: "利用不可", ko: "사용 불가", es: "No disponible", fr: "Indisponible" },
  "Check": { zh: "检查", ja: "確認", ko: "확인", es: "Comprobar", fr: "Vérifier" },
  "Test": { zh: "测试", ja: "テスト", ko: "테스트", es: "Probar", fr: "Tester" },
  "Testing": { zh: "检查中", ja: "確認中", ko: "확인 중", es: "Comprobando", fr: "Vérification" },
  "Status test": { zh: "状态测试", ja: "ステータステスト", ko: "상태 테스트", es: "Prueba de estado", fr: "Test de statut" },
  "Testing status": { zh: "状态测试中", ja: "ステータス確認中", ko: "상태 확인 중", es: "Comprobando estado", fr: "Vérification du statut" },
  "Connect": { zh: "连接", ja: "接続", ko: "연결", es: "Conectar", fr: "Connecter" },
  "Connect agent": { zh: "连接 Agent", ja: "Agentに接続", ko: "Agent 연결", es: "Conectar Agent", fr: "Connecter l’Agent" },
  "Disconnect": { zh: "断开", ja: "切断", ko: "연결 해제", es: "Desconectar", fr: "Déconnecter" },
  "Connect guide": { zh: "连接教程", ja: "接続ガイド", ko: "연결 가이드", es: "Guía de conexión", fr: "Guide de connexion" },
  "Use on web": { zh: "在网页上用", ja: "Webで使う", ko: "웹에서 사용", es: "Usar en web", fr: "Utiliser sur le web" },
  "Use on Agent client": { zh: "在 Agent 客户端上用", ja: "Agentクライアントで使う", ko: "Agent 클라이언트에서 사용", es: "Usar en cliente Agent", fr: "Utiliser dans le client Agent" },
  "Switch method": { zh: "切换连接方式", ja: "方法を切り替え", ko: "방식 전환", es: "Cambiar método", fr: "Changer de méthode" },
  "Choose connection method": { zh: "选择连接方式", ja: "接続方法を選択", ko: "연결 방식 선택", es: "Elegir método de conexión", fr: "Choisir la méthode" },
  "Choose where you want to use this Agent. You can only pick one.": { zh: "请选择您希望在哪个环境中使用该 Agent，连接方式只能二选一。", ja: "このAgentを使う場所を選択してください。選べるのは1つだけです。", ko: "이 Agent를 사용할 위치를 선택하세요. 하나만 선택할 수 있습니다.", es: "Elige dónde quieres usar este Agent. Solo puedes elegir una opción.", fr: "Choisissez où utiliser cet Agent. Une seule option est possible." },
  "Get an API Key to connect quickly. Supports ChatGPT.": { zh: "获取 API Key 即可快速接入，支持ChatGPT。", ja: "API Keyで素早く接続できます。ChatGPTに対応。", ko: "API Key로 빠르게 연결합니다. ChatGPT를 지원합니다.", es: "Conecta rápido con una API Key. Compatible con ChatGPT.", fr: "Connectez-vous vite avec une API Key. Compatible avec ChatGPT." },
  "Install the plugin on your local Agent client. Supports Codex, ClaudeCodex, and OpenClaw.": { zh: "在本地 Agent 客户端安装插件完成配置，支持 Codex，ClaudeCodex，Openclaw。", ja: "ローカルのAgentクライアントにプラグインをインストールします。Codex、ClaudeCodex、OpenClawに対応。", ko: "로컬 Agent 클라이언트에 플러그인을 설치합니다. Codex, ClaudeCodex, OpenClaw를 지원합니다.", es: "Instala el plugin en tu cliente Agent local. Compatible con Codex, ClaudeCodex y OpenClaw.", fr: "Installez le plugin dans votre client Agent local. Compatible avec Codex, ClaudeCodex et OpenClaw." },
  "Connection notice": { zh: "连接提示", ja: "接続のお知らせ", ko: "연결 안내", es: "Aviso de conexión", fr: "Avis de connexion" },
  "Close connection notice": { zh: "关闭连接提示", ja: "接続のお知らせを閉じる", ko: "연결 안내 닫기", es: "Cerrar aviso de conexión", fr: "Fermer l’avis de connexion" },
  "Disconnect the connected agent before starting a new connection.": { zh: "请先断开已连接的 agent，再进行新的连接。", ja: "新しい接続を開始する前に、接続中のAgentを切断してください。", ko: "새 연결을 시작하기 전에 연결된 Agent를 해제하세요.", es: "Desconecta el Agent conectado antes de iniciar una nueva conexión.", fr: "Déconnectez l’Agent connecté avant de démarrer une nouvelle connexion." },
  "Disconnect the connected agent before switching methods.": { zh: "需断开已连接的agent，再切换连接方式。", ja: "方法を切り替える前に、接続中のAgentを切断してください。", ko: "방식을 전환하기 전에 연결된 Agent를 해제하세요.", es: "Desconecta el Agent conectado antes de cambiar de método.", fr: "Déconnectez l’Agent connecté avant de changer de méthode." },
  "Disconnect all": { zh: "一键断开全部", ja: "すべて切断", ko: "모두 연결 해제", es: "Desconectar todo", fr: "Tout déconnecter" },
  "Connectable providers": { zh: "可连接服务", ja: "接続可能なプロバイダー", ko: "연결 가능한 제공자", es: "Proveedores conectables", fr: "Fournisseurs connectables" },
  "Plugin version is outdated. Follow the connection guide to update the plugin.": { zh: "版本过旧，请参考连接流程更新 Plugin。", ja: "Pluginのバージョンが古いです。接続ガイドに沿って更新してください。", ko: "Plugin 버전이 오래되었습니다. 연결 가이드에 따라 업데이트하세요.", es: "La versión del Plugin está obsoleta. Sigue la guía de conexión para actualizarlo.", fr: "La version du Plugin est obsolète. Suivez le guide de connexion pour le mettre à jour." },
  "Disconnect and reconnect is recommended.": { zh: "建议断开后重新连接。", ja: "切断して再接続することをおすすめします。", ko: "연결을 해제한 뒤 다시 연결하는 것을 권장합니다.", es: "Se recomienda desconectar y volver a conectar.", fr: "Il est recommandé de déconnecter puis reconnecter." },
  "Install client plugin": { zh: "安装客户端插件", ja: "クライアントプラグインをインストール", ko: "클라이언트 플러그인 설치", es: "Instalar plugin del cliente", fr: "Installer le plugin client" },
  "Install": { zh: "安装", ja: "インストール", ko: "설치", es: "Instalar", fr: "Installer" },
  "Select your IDE and follow the instructions below.": { zh: "选择您的 IDE，并按下方说明完成安装。", ja: "IDEを選択し、以下の手順に従ってください。", ko: "IDE를 선택하고 아래 안내를 따라 설치하세요.", es: "Selecciona tu IDE y sigue las instrucciones.", fr: "Sélectionnez votre IDE et suivez les instructions ci-dessous." },
  "Select IDE": { zh: "选择 IDE", ja: "IDEを選択", ko: "IDE 선택", es: "Seleccionar IDE", fr: "Sélectionner l’IDE" },
  "Run Installation Command": { zh: "运行安装命令", ja: "インストールコマンドを実行", ko: "설치 명령 실행", es: "Ejecutar comando de instalación", fr: "Exécuter la commande d’installation" },
  "Verify Installation": { zh: "验证安装", ja: "インストールを確認", ko: "설치 확인", es: "Verificar instalación", fr: "Vérifier l’installation" },
  "Copy installation command": { zh: "复制安装命令", ja: "インストールコマンドをコピー", ko: "설치 명령 복사", es: "Copiar comando de instalación", fr: "Copier la commande d’installation" },
  "Command copied": { zh: "命令已复制", ja: "コマンドをコピーしました", ko: "명령을 복사했습니다", es: "Comando copiado", fr: "Commande copiée" },
  "Run it in your terminal.": { zh: "请在终端中运行。", ja: "ターミナルで実行してください。", ko: "터미널에서 실행하세요.", es: "Ejecútalo en tu terminal.", fr: "Exécutez-la dans votre terminal." },
  "The MCP server will be automatically configured": { zh: "MCP 服务将自动完成配置", ja: "MCPサーバーは自動的に設定されます", ko: "MCP 서버가 자동으로 구성됩니다", es: "El servidor MCP se configurará automáticamente", fr: "Le serveur MCP sera configuré automatiquement" },
  "To verify, check your MCP servers by running:": { zh: "如需验证，可运行命令检查 MCP 服务：", ja: "確認するには、次のコマンドでMCPサーバーを確認してください：", ko: "확인하려면 다음 명령으로 MCP 서버를 확인하세요:", es: "Para verificar, comprueba tus servidores MCP ejecutando:", fr: "Pour vérifier, contrôlez vos serveurs MCP avec :" },
  "Enter API Key": { zh: "输入 API Key", ja: "API Keyを入力", ko: "API Key 입력", es: "Introducir API Key", fr: "Saisir l’API Key" },
  "Get API Key from OpenRouter": { zh: "从 OpenRouter 获取 API Key", ja: "OpenRouterからAPI Keyを取得", ko: "OpenRouter에서 API Key 받기", es: "Obtener API Key en OpenRouter", fr: "Obtenir l’API Key depuis OpenRouter" },
  "Get API Key from OpenAI": { zh: "从 OpenAI 获取 API Key", ja: "OpenAIからAPI Keyを取得", ko: "OpenAI에서 API Key 받기", es: "Obtener API Key en OpenAI", fr: "Obtenir l’API Key depuis OpenAI" },
  "Verify & Connect": { zh: "验证并连接", ja: "確認して接続", ko: "확인 후 연결", es: "Verificar y conectar", fr: "Vérifier et connecter" },
  "Complete connection": { zh: "完成连接", ja: "接続を完了", ko: "연결 완료", es: "Completar conexión", fr: "Terminer la connexion" },
  "Auto install": { zh: "自动安装", ja: "自動インストール", ko: "자동 설치", es: "Instalación automática", fr: "Installation auto" },
  "One-click": { zh: "一键完成", ja: "ワンクリック", ko: "원클릭", es: "Un clic", fr: "Un clic" },
  "Enter the following command in the Codex chat to install the plugin.": { zh: "在 Codex 的聊天界面中输入以下命令安装插件", ja: "Codexのチャットに次のコマンドを入力してプラグインをインストールします。", ko: "Codex 채팅에 다음 명령을 입력해 플러그인을 설치하세요.", es: "Introduce el siguiente comando en el chat de Codex para instalar el plugin.", fr: "Saisissez la commande suivante dans le chat Codex pour installer le plugin." },
  "Copy": { zh: "复制", ja: "コピー", ko: "복사", es: "Copiar", fr: "Copier" },
  "Manual install": { zh: "手动安装", ja: "手動インストール", ko: "수동 설치", es: "Instalación manual", fr: "Installation manuelle" },
  "Follow the official guide to configure manually.": { zh: "按官方文档引导，手动配置插件路径和参数。", ja: "公式ガイドに従って手動で設定します。", ko: "공식 가이드를 따라 수동으로 설정하세요.", es: "Sigue la guía oficial para configurar manualmente.", fr: "Suivez le guide officiel pour configurer manuellement." },
  "Fill in the following info": { zh: "填入以下信息", ja: "以下の情報を入力", ko: "다음 정보를 입력", es: "Rellena la siguiente información", fr: "Renseignez les informations suivantes" },
  "Source": { zh: "来源", ja: "ソース", ko: "소스", es: "Fuente", fr: "Source" },
  "Git ref": { zh: "Git 引用", ja: "Git参照", ko: "Git ref", es: "Referencia Git", fr: "Référence Git" },
  "Prompt": { zh: "提示词", ja: "プロンプト", ko: "프롬프트", es: "Prompt", fr: "Prompt" },
  "Start a new chat session": { zh: "开始一个新的聊天会话", ja: "新しいチャットセッションを開始", ko: "새 채팅 세션 시작", es: "Iniciar una nueva sesión de chat", fr: "Démarrer une nouvelle session de chat" },
  "Log in to Quandora and authorize": { zh: "登录Quandora，并同意授权", ja: "Quandoraにログインして認可", ko: "Quandora에 로그인하고 승인", es: "Inicia sesión en Quandora y autoriza", fr: "Connectez-vous à Quandora et autorisez" },
  "Image preview": { zh: "图片预览", ja: "画像プレビュー", ko: "이미지 미리보기", es: "Vista previa de imagen", fr: "Aperçu de l’image" },
  "Image zoom controls": { zh: "图片缩放控制", ja: "画像ズーム操作", ko: "이미지 확대/축소 컨트롤", es: "Controles de zoom", fr: "Contrôles de zoom" },
  "Zoom out": { zh: "缩小", ja: "縮小", ko: "축소", es: "Alejar", fr: "Dézoomer" },
  "Zoom in": { zh: "放大", ja: "拡大", ko: "확대", es: "Acercar", fr: "Zoomer" },
  "Original size": { zh: "原尺寸", ja: "元のサイズ", ko: "원본 크기", es: "Tamaño original", fr: "Taille originale" },
  "Close image preview": { zh: "关闭图片预览", ja: "画像プレビューを閉じる", ko: "이미지 미리보기 닫기", es: "Cerrar vista previa", fr: "Fermer l’aperçu" },
  "Manual install guide preview": { zh: "手动安装教程预览", ja: "手動インストールガイドのプレビュー", ko: "수동 설치 가이드 미리보기", es: "Vista previa de la guía manual", fr: "Aperçu du guide manuel" },
  "Preview step 1 image": { zh: "预览步骤 1 图片", ja: "ステップ1の画像をプレビュー", ko: "1단계 이미지 미리보기", es: "Vista previa del paso 1", fr: "Aperçu de l’étape 1" },
  "Preview step 2 image": { zh: "预览步骤 2 图片", ja: "ステップ2の画像をプレビュー", ko: "2단계 이미지 미리보기", es: "Vista previa del paso 2", fr: "Aperçu de l’étape 2" },
  "Preview step 3 image": { zh: "预览步骤 3 图片", ja: "ステップ3の画像をプレビュー", ko: "3단계 이미지 미리보기", es: "Vista previa del paso 3", fr: "Aperçu de l’étape 3" },
  "Copy source": { zh: "复制来源", ja: "ソースをコピー", ko: "소스 복사", es: "Copiar fuente", fr: "Copier la source" },
  "Copy git ref": { zh: "复制 Git 引用", ja: "Git参照をコピー", ko: "Git ref 복사", es: "Copiar referencia Git", fr: "Copier la référence Git" },
  "Copy prompt": { zh: "复制提示词", ja: "プロンプトをコピー", ko: "프롬프트 복사", es: "Copiar prompt", fr: "Copier le prompt" },
  "Download Buddy": { zh: "下载 Buddy", ja: "Buddyをダウンロード", ko: "Buddy 다운로드", es: "Descargar Buddy", fr: "Télécharger Buddy" },
  "Desktop companion that syncs your fishing status in real time.": { zh: "桌面伴侣，实时同步主界面的钓鱼状态。", ja: "釣りステータスをリアルタイム同期するデスクトップコンパニオンです。", ko: "낚시 상태를 실시간으로 동기화하는 데스크톱 동반 앱입니다.", es: "Compañero de escritorio que sincroniza tu pesca en tiempo real.", fr: "Compagnon de bureau qui synchronise votre pêche en temps réel." },
  "Download": { zh: "下载", ja: "ダウンロード", ko: "다운로드", es: "Descargar", fr: "Télécharger" },
  "Connection request expired": { zh: "连接请求已过期", ja: "接続リクエストの期限が切れました", ko: "연결 요청이 만료되었습니다", es: "La solicitud de conexión expiró", fr: "La demande de connexion a expiré" },
  "would like to access your account and be able to:": { zh: "希望访问您的账号并能够：", ja: "があなたのアカウントにアクセスし、次の操作を行うことを希望しています：", ko: "이(가) 계정에 접근하여 다음을 수행하려고 합니다:", es: "quiere acceder a tu cuenta y poder:", fr: "souhaite accéder à votre compte et pouvoir :" },
  "Allow access": { zh: "允许访问", ja: "アクセスを許可", ko: "접근 허용", es: "Permitir acceso", fr: "Autoriser l’accès" },
  "No API keys yet": { zh: "暂无 API 密钥", ja: "API Keyはまだありません", ko: "아직 API Key가 없습니다", es: "Aún no hay API Keys", fr: "Aucune API Key pour le moment" },
  "Create your first API key to connect your AI agent.": { zh: "创建首个 API 密钥以连接你的 AI Agent。", ja: "最初のAPI Keyを作成してAI Agentを接続します。", ko: "첫 API Key를 만들어 AI Agent를 연결하세요.", es: "Crea tu primera API Key para conectar tu AI Agent.", fr: "Créez votre première API Key pour connecter votre AI Agent." },
  "API Key": { zh: "API 密钥", ja: "API Key", ko: "API Key", es: "API Key", fr: "API Key" },
  "Hide API Key": { zh: "隐藏 API 密钥", ja: "API Keyを非表示", ko: "API Key 숨기기", es: "Ocultar API Key", fr: "Masquer l’API Key" },
  "Show API Key": { zh: "显示 API 密钥", ja: "API Keyを表示", ko: "API Key 표시", es: "Mostrar API Key", fr: "Afficher l’API Key" },
  "Copy API Key": { zh: "复制 API 密钥", ja: "API Keyをコピー", ko: "API Key 복사", es: "Copiar API Key", fr: "Copier l’API Key" },
  "API key copied": { zh: "API 密钥已复制", ja: "API Keyをコピーしました", ko: "API Key를 복사했습니다", es: "API Key copiada", fr: "API Key copiée" },
  "Store it securely in your agent environment.": { zh: "请在 Agent 环境中安全保存。", ja: "Agent環境で安全に保管してください。", ko: "Agent 환경에 안전하게 보관하세요.", es: "Guárdala de forma segura en tu entorno Agent.", fr: "Conservez-la en sécurité dans votre environnement Agent." },
  "Skill": { zh: "Skill", ja: "Skill", ko: "Skill", es: "Skill", fr: "Skill" },
  "Updated": { zh: "更新于", ja: "更新日", ko: "업데이트", es: "Actualizado", fr: "Mis à jour" },
  "Check for skill updates": { zh: "检查 Skill 更新", ja: "Skill更新を確認", ko: "Skill 업데이트 확인", es: "Buscar actualizaciones de Skill", fr: "Rechercher les mises à jour Skill" },
  "Copy latest prompt": { zh: "复制最新版提示词", ja: "最新プロンプトをコピー", ko: "최신 프롬프트 복사", es: "Copiar prompt más reciente", fr: "Copier le dernier prompt" },
  "Latest prompt copied": { zh: "最新版提示词已复制", ja: "最新プロンプトをコピーしました", ko: "최신 프롬프트를 복사했습니다", es: "Prompt más reciente copiado", fr: "Dernier prompt copié" },
  "Prompt copied": { zh: "提示词已复制", ja: "プロンプトをコピーしました", ko: "프롬프트를 복사했습니다", es: "Prompt copiado", fr: "Prompt copié" },
  "Paste it into your AI agent.": { zh: "请粘贴到你的 AI Agent 中。", ja: "AI Agentに貼り付けてください。", ko: "AI Agent에 붙여넣으세요.", es: "Pégalo en tu AI Agent.", fr: "Collez-le dans votre AI Agent." },
  "More options": { zh: "更多操作", ja: "その他の操作", ko: "더 많은 옵션", es: "Más opciones", fr: "Plus d’options" },
  "Delete API Key": { zh: "删除 API 密钥", ja: "API Keyを削除", ko: "API Key 삭제", es: "Eliminar API Key", fr: "Supprimer l’API Key" },
  "Delete": { zh: "删除", ja: "削除", ko: "삭제", es: "Eliminar", fr: "Supprimer" },
  "Are you sure you want to delete": { zh: "确认删除", ja: "削除してもよろしいですか", ko: "삭제하시겠습니까", es: "¿Seguro que quieres eliminar", fr: "Voulez-vous vraiment supprimer" },
  "This action cannot be undone and any agents using this key will lose access.": { zh: "该操作不可撤销，使用该密钥的 Agent 将失去访问权限。", ja: "この操作は元に戻せません。このKeyを使用するAgentはアクセスできなくなります。", ko: "이 작업은 되돌릴 수 없으며 이 키를 사용하는 Agent는 접근 권한을 잃습니다.", es: "Esta acción no se puede deshacer y cualquier Agent que use esta clave perderá acceso.", fr: "Cette action est irréversible et les Agents utilisant cette clé perdront l’accès." },
  "Create New API Key": { zh: "创建新的 API 密钥", ja: "新しいAPI Keyを作成", ko: "새 API Key 만들기", es: "Crear nueva API Key", fr: "Créer une nouvelle API Key" },
  "Your API Key is Ready": { zh: "API 密钥已准备就绪", ja: "API Keyの準備ができました", ko: "API Key가 준비되었습니다", es: "Tu API Key está lista", fr: "Votre API Key est prête" },
  "Close API key dialog": { zh: "关闭 API 密钥弹窗", ja: "API Keyダイアログを閉じる", ko: "API Key 대화상자 닫기", es: "Cerrar diálogo de API Key", fr: "Fermer la fenêtre API Key" },
  "Generate API": { zh: "生成 API", ja: "APIを生成", ko: "API 생성", es: "Generar API", fr: "Générer l’API" },
  "Paste to Agent": { zh: "粘贴到 Agent", ja: "Agentに貼り付け", ko: "Agent에 붙여넣기", es: "Pegar en Agent", fr: "Coller dans l’Agent" },
  "Give your API key a name to identify it later.": { zh: "为 API 密钥命名，便于后续识别。", ja: "後で識別できるようAPI Keyに名前を付けてください。", ko: "나중에 식별할 수 있도록 API Key 이름을 지정하세요.", es: "Da un nombre a tu API Key para identificarla después.", fr: "Donnez un nom à votre API Key pour l’identifier plus tard." },
  "API Name": { zh: "API 名称", ja: "API名", ko: "API 이름", es: "Nombre de API", fr: "Nom de l’API" },
  "Create API Key": { zh: "创建 API 密钥", ja: "API Keyを作成", ko: "API Key 만들기", es: "Crear API Key", fr: "Créer l’API Key" },
  "Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek) to start using Quandora Trading.": { zh: "复制下方提示词并粘贴到你的 AI Agent（ChatGPT / Claude / DeepSeek）即可开始使用 Quandora Trading。", ja: "下のプロンプトをコピーしてAI Agent（ChatGPT / Claude / DeepSeek）に貼り付けると、Quandora Tradingを使い始められます。", ko: "아래 프롬프트를 복사해 AI Agent(ChatGPT / Claude / DeepSeek)에 붙여넣으면 Quandora Trading을 사용할 수 있습니다.", es: "Copia el prompt y pégalo en tu AI Agent (ChatGPT / Claude / DeepSeek) para empezar a usar Quandora Trading.", fr: "Copiez le prompt ci-dessous dans votre AI Agent (ChatGPT / Claude / DeepSeek) pour commencer à utiliser Quandora Trading." },
  "Copy Prompt": { zh: "复制提示词", ja: "プロンプトをコピー", ko: "프롬프트 복사", es: "Copiar prompt", fr: "Copier le prompt" },
  "Confirm disconnection": { zh: "确认断连", ja: "切断を確認", ko: "연결 해제 확인", es: "Confirmar desconexión", fr: "Confirmer la déconnexion" },
  "Disconnect agent": { zh: "确认断连", ja: "Agentを切断", ko: "Agent 연결 해제", es: "Desconectar Agent", fr: "Déconnecter l’Agent" },
  "Close confirmation dialog": { zh: "关闭确认弹窗", ja: "確認ダイアログを閉じる", ko: "확인 대화상자 닫기", es: "Cerrar diálogo de confirmación", fr: "Fermer la confirmation" },
  "Confirm disconnect": { zh: "确认断连", ja: "切断を確定", ko: "연결 해제 확인", es: "Confirmar desconexión", fr: "Confirmer la déconnexion" },
  "Confirm sign out": { zh: "确认退出", ja: "サインアウトを確認", ko: "로그아웃 확인", es: "Confirmar cierre de sesión", fr: "Confirmer la déconnexion" },
  "You will leave the current account session and return to the login page.": { zh: "退出后将结束当前账号会话，并返回登录页。", ja: "現在のアカウントセッションを終了し、ログインページに戻ります。", ko: "현재 계정 세션을 종료하고 로그인 페이지로 돌아갑니다.", es: "Saldrás de la sesión actual y volverás a la página de inicio de sesión.", fr: "Vous quitterez la session actuelle et reviendrez à la page de connexion." },
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

  const scratchCompletedMatch = en.match(/^Completed (.+)$/);
  if (scratchCompletedMatch) {
    const count = scratchCompletedMatch[1];
    const labels = {
      ja: `完了 ${count}`,
      ko: `완료 ${count}`,
      es: `Completado ${count}`,
      fr: `Terminé ${count}`,
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

  const runInstallCommandMatch = en.match(/^Run this command in your terminal to add Quandora MCP to (.+):$/);
  if (runInstallCommandMatch) {
    const ide = runInstallCommandMatch[1];
    const labels = {
      ja: `ターミナルで次のコマンドを実行し、Quandora MCPを${ide}に追加してください：`,
      ko: `터미널에서 다음 명령을 실행해 Quandora MCP를 ${ide}에 추가하세요:`,
      es: `Ejecuta este comando en tu terminal para añadir Quandora MCP a ${ide}:`,
      fr: `Exécutez cette commande dans votre terminal pour ajouter Quandora MCP à ${ide} :`,
    };
    return labels[lang];
  }

  const installAvailableMatch = en.match(/^After running the command, Quandora MCP will be available in (.+)\.$/);
  if (installAvailableMatch) {
    const ide = installAvailableMatch[1];
    const labels = {
      ja: `コマンドを実行すると、Quandora MCPが${ide}で利用可能になります。`,
      ko: `명령을 실행하면 Quandora MCP를 ${ide}에서 사용할 수 있습니다.`,
      es: `Después de ejecutar el comando, Quandora MCP estará disponible en ${ide}.`,
      fr: `Après l’exécution de la commande, Quandora MCP sera disponible dans ${ide}.`,
    };
    return labels[lang];
  }

  const ideCommandsMatch = en.match(/^You can start using Quandora commands in (.+) immediately$/);
  if (ideCommandsMatch) {
    const ide = ideCommandsMatch[1];
    const labels = {
      ja: `${ide}ですぐにQuandoraコマンドを使い始められます`,
      ko: `${ide}에서 Quandora 명령을 바로 사용할 수 있습니다`,
      es: `Puedes empezar a usar comandos de Quandora en ${ide} de inmediato`,
      fr: `Vous pouvez utiliser les commandes Quandora dans ${ide} immédiatement`,
    };
    return labels[lang];
  }

  const connectedMatch = en.match(/^(.+) has been connected\. You can start using it now\.$/);
  if (connectedMatch) {
    const provider = connectedMatch[1];
    const labels = {
      ja: `${provider}に接続しました。すぐに使用できます。`,
      ko: `${provider} 연결이 완료되었습니다. 이제 사용할 수 있습니다.`,
      es: `${provider} se ha conectado. Ya puedes usarlo.`,
      fr: `${provider} est connecté. Vous pouvez l’utiliser maintenant.`,
    };
    return labels[lang];
  }

  const disconnectProviderMatch = en.match(/^Disconnect (.+)\? You can reconnect it later\.$/);
  if (disconnectProviderMatch) {
    const provider = disconnectProviderMatch[1];
    const labels = {
      ja: `${provider}を切断しますか？後で再接続できます。`,
      ko: `${provider} 연결을 해제할까요? 나중에 다시 연결할 수 있습니다.`,
      es: `¿Desconectar ${provider}? Podrás volver a conectarlo más tarde.`,
      fr: `Déconnecter ${provider} ? Vous pourrez le reconnecter plus tard.`,
    };
    return labels[lang];
  }

  const allowProviderMatch = en.match(/^Allow (.+) to write, upload, and backtest plugin\.py, then retrieve factor details and summarize the results\.$/);
  if (allowProviderMatch) {
    const provider = allowProviderMatch[1];
    const labels = {
      ja: `${provider}にplugin.pyの作成、アップロード、バックテスト、因子詳細の取得、結果の要約を許可します。`,
      ko: `${provider}에 plugin.py 작성, 업로드, 백테스트, 팩터 상세 조회 및 결과 요약을 허용합니다.`,
      es: `Permite que ${provider} escriba, suba y haga backtest de plugin.py, luego recupere detalles de factores y resuma resultados.`,
      fr: `Autorisez ${provider} à écrire, téléverser et backtester plugin.py, puis à récupérer les détails des facteurs et résumer les résultats.`,
    };
    return labels[lang];
  }

  const expiredProviderMatch = en.match(/^This connection request has expired\. Return to (.+) and start a new connection request\.$/);
  if (expiredProviderMatch) {
    const provider = expiredProviderMatch[1];
    const labels = {
      ja: `この接続リクエストは期限切れです。${provider}に戻って新しい接続リクエストを開始してください。`,
      ko: `이 연결 요청은 만료되었습니다. ${provider}로 돌아가 새 연결 요청을 시작하세요.`,
      es: `Esta solicitud de conexión expiró. Vuelve a ${provider} e inicia una nueva solicitud.`,
      fr: `Cette demande de connexion a expiré. Revenez dans ${provider} et lancez une nouvelle demande.`,
    };
    return labels[lang];
  }

  const editMatch = en.match(/^Edit (.+)$/);
  if (editMatch) {
    const name = editMatch[1];
    const labels = {
      ja: `${name}を編集`,
      ko: `${name} 편집`,
      es: `Editar ${name}`,
      fr: `Modifier ${name}`,
    };
    return labels[lang];
  }

  const updateAvailableMatch = en.match(/^Update available: (.+)$/);
  if (updateAvailableMatch) {
    const version = updateAvailableMatch[1];
    const labels = {
      ja: `更新可能：${version}`,
      ko: `업데이트 가능: ${version}`,
      es: `Actualización disponible: ${version}`,
      fr: `Mise à jour disponible : ${version}`,
    };
    return labels[lang];
  }

  const promptSkillMatch = en.match(/^Prompt uses Skill (.+)\.$/);
  if (promptSkillMatch) {
    const version = promptSkillMatch[1];
    const labels = {
      ja: `プロンプトはSkill ${version}を使用しています。`,
      ko: `프롬프트가 Skill ${version}을 사용합니다.`,
      es: `El prompt usa Skill ${version}.`,
      fr: `Le prompt utilise Skill ${version}.`,
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
