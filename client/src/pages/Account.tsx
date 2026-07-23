/*
 * Account — Otter Quant settings surface
 * Visual language follows the Design Markdown token system.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  translateUi,
  useAppLanguage,
  type UiCopy,
  type UiLang,
} from "@/contexts/AppLanguageContext";
import {
  User, Key, Link2, Shield, Copy, Check,
  Eye, EyeOff, RefreshCw, AlertTriangle, Compass,
  Send, Pencil, X, Plus, Trash2, FileText, MoreHorizontal, LogOut, Camera,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exchanges, type Exchange } from "@/lib/mockData";
import {
  getExchangeVenueMeta,
  readExchangeApiConnections,
  writeExchangeApiConnections,
  type ExchangeApiConnection,
  type ExchangeVenue,
} from "@/lib/exchangeApiConnections";
import { AgentSettingsPanel } from "@/components/account/AgentSettingsPanel";
import "./Account.css";

type TabId = "general" | "profile" | "agent" | "exchangeApi" | "api";
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const tabs: { id: TabId; labelEn: string; labelZh: string; icon: React.ElementType }[] = [
  { id: "general", labelEn: "General", labelZh: "通用", icon: Shield },
  { id: "profile", labelEn: "Profile", labelZh: "个人资料", icon: User },
  { id: "agent", labelEn: "Agent Settings", labelZh: "Agent设置", icon: Key },
];

// Switch these to true only when restoring "Workbench 260720".
const SHOW_ACCOUNT_PROFILE_WORKBENCH_260720 = true;
const SHOW_ACCOUNT_AGENT_SETTINGS_WORKBENCH_260720 = false;
const ENABLE_LOGIN_EMAIL_EDITING = false;

const languageOptions: { value: UiLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const accountCopy: Record<string, UiCopy> = {
  "General": { ja: "一般", ko: "일반", es: "General", fr: "Général" },
  "Profile": { ja: "プロフィール", ko: "프로필", es: "Perfil", fr: "Profil" },
  "Agent Settings": { ja: "Agent 設定", ko: "Agent 설정", es: "Ajustes del Agent", fr: "Paramètres de l’Agent" },
  "Already on the latest version": { ja: "すでに最新バージョンです", ko: "이미 최신 버전입니다", es: "Ya tienes la última versión", fr: "Vous utilisez déjà la dernière version" },
  "Exchange connection updated": { ja: "取引所の接続状態を更新しました", ko: "거래소 연결 상태를 업데이트했습니다", es: "Conexión con el exchange actualizada", fr: "Connexion à la plateforme mise à jour" },
  "Use a JPEG, PNG, or WebP image": { ja: "JPEG、PNG、WebP の画像を選択してください", ko: "JPEG, PNG 또는 WebP 이미지를 선택하세요", es: "Usa una imagen JPEG, PNG o WebP", fr: "Utilisez une image JPEG, PNG ou WebP" },
  "Avatar must be 5 MB or smaller": { ja: "アバターは 5 MB 以下にしてください", ko: "아바타는 5MB 이하여야 합니다", es: "El avatar debe pesar 5 MB o menos", fr: "L’avatar doit faire 5 Mo maximum" },
  "Avatar ready to save": { ja: "アバターを切り抜きました。プロフィールを保存してください", ko: "아바타를 잘랐습니다. 프로필을 저장하세요", es: "El avatar está listo. Guarda el perfil", fr: "L’avatar est prêt. Enregistrez le profil" },
  "Unable to process this image": { ja: "この画像を処理できません。別の画像をお試しください", ko: "이미지를 처리할 수 없습니다. 다른 이미지로 다시 시도하세요", es: "No se pudo procesar la imagen. Prueba con otra", fr: "Impossible de traiter cette image. Essayez-en une autre" },
  "Please enter the verification code": { ja: "認証コードを入力してください", ko: "인증 코드를 입력하세요", es: "Introduce el código de verificación", fr: "Saisissez le code de vérification" },
  "Please enter a new email address": { ja: "新しいメールアドレスを入力してください", ko: "새 이메일 주소를 입력하세요", es: "Introduce una nueva dirección de correo", fr: "Saisissez une nouvelle adresse e-mail" },
  "Please enter a valid email address": { ja: "有効なメールアドレスを入力してください", ko: "유효한 이메일 주소를 입력하세요", es: "Introduce una dirección de correo válida", fr: "Saisissez une adresse e-mail valide" },
  "Email updated successfully": { ja: "メールアドレスを更新しました", ko: "이메일 주소를 업데이트했습니다", es: "Correo actualizado correctamente", fr: "Adresse e-mail mise à jour" },
  "Please complete all required fields.": { ja: "必須項目をすべて入力してください。", ko: "필수 항목을 모두 입력하세요.", es: "Completa todos los campos obligatorios.", fr: "Remplissez tous les champs obligatoires." },
  "Name cannot be empty": { ja: "名前を入力してください", ko: "이름을 입력하세요", es: "El nombre no puede estar vacío", fr: "Le nom ne peut pas être vide" },
  "Exchange account name updated": { ja: "取引所アカウント名を更新しました", ko: "거래소 계정 이름을 업데이트했습니다", es: "Nombre de la cuenta del exchange actualizado", fr: "Nom du compte de la plateforme mis à jour" },
  "Exchange API deleted": { ja: "取引所 API を削除しました", ko: "거래소 API를 삭제했습니다", es: "API del exchange eliminada", fr: "API de la plateforme supprimée" },
  "Please enter an API name": { ja: "API 名を入力してください", ko: "API 이름을 입력하세요", es: "Introduce un nombre para la API", fr: "Saisissez un nom pour l’API" },
  "API key created successfully": { ja: "API キーを作成しました", ko: "API 키를 생성했습니다", es: "Clave API creada correctamente", fr: "Clé API créée" },
  "API key deleted": { ja: "API キーを削除しました", ko: "API 키를 삭제했습니다", es: "Clave API eliminada", fr: "Clé API supprimée" },
  "API name updated": { ja: "API 名を更新しました", ko: "API 이름을 업데이트했습니다", es: "Nombre de la API actualizado", fr: "Nom de l’API mis à jour" },
  "Account settings": { ja: "アカウント設定", ko: "계정 설정", es: "Ajustes de la cuenta", fr: "Paramètres du compte" },
  "Language": { ja: "言語", ko: "언어", es: "Idioma", fr: "Langue" },
  "Set display language for UI and notifications.": { ja: "画面と通知の表示言語を設定します。", ko: "화면과 알림의 표시 언어를 설정합니다.", es: "Configura el idioma de la interfaz y las notificaciones.", fr: "Définissez la langue de l’interface et des notifications." },
  "Select language": { ja: "言語を選択", ko: "언어 선택", es: "Seleccionar idioma", fr: "Sélectionner la langue" },
  "Color Configuration": { ja: "カラー設定", ko: "색상 설정", es: "Configuración de color", fr: "Configuration des couleurs" },
  "Choose how rising and falling values are colored.": { ja: "上昇値と下落値の色を選択します。", ko: "상승 및 하락 값의 색상 표시 방식을 선택합니다.", es: "Elige los colores para las subidas y bajadas.", fr: "Choisissez les couleurs des hausses et des baisses." },
  "Red up, green down": { ja: "上昇は赤、下落は緑", ko: "상승 빨강, 하락 초록", es: "Subida roja, bajada verde", fr: "Hausse en rouge, baisse en vert" },
  "Green up, red down": { ja: "上昇は緑、下落は赤", ko: "상승 초록, 하락 빨강", es: "Subida verde, bajada roja", fr: "Hausse en vert, baisse en rouge" },
  "Notifications": { ja: "通知", ko: "알림", es: "Notificaciones", fr: "Notifications" },
  "Interaction Messages": { ja: "運用通知", ko: "운영 알림", es: "Mensajes operativos", fr: "Notifications opérationnelles" },
  "Get notified about signal status changes, test results, and performance updates": { ja: "シグナルの状態変更、バックテスト結果、パフォーマンス更新を通知します", ko: "시그널 상태 변경, 백테스트 결과 및 성과 업데이트 알림을 받습니다", es: "Recibe avisos sobre cambios de señales, backtests y rendimiento", fr: "Recevez les changements de signaux, résultats de backtest et mises à jour de performance" },
  "Interaction messages disabled": { ja: "運用通知をオフにしました", ko: "운영 알림을 껐습니다", es: "Mensajes operativos desactivados", fr: "Notifications opérationnelles désactivées" },
  "Interaction messages enabled": { ja: "運用通知をオンにしました", ko: "운영 알림을 켰습니다", es: "Mensajes operativos activados", fr: "Notifications opérationnelles activées" },
  "Announcements": { ja: "お知らせ", ko: "공지", es: "Anuncios", fr: "Annonces" },
  "Get notified about skill updates, new skills, deprecations, platform announcements, maintenance, and Official Library expansion.": { ja: "Skill の更新、新しい Skill、廃止予定、プラットフォームのお知らせ、メンテナンス、公式ライブラリの拡張を通知します。", ko: "Skill 업데이트, 신규 Skill, 지원 종료, 플랫폼 공지, 유지보수 및 공식 라이브러리 확장 알림을 받습니다.", es: "Recibe avisos sobre actualizaciones y nuevos Skills, funciones obsoletas, anuncios, mantenimiento y ampliaciones de la biblioteca oficial.", fr: "Recevez les mises à jour et nouveaux Skills, dépréciations, annonces, maintenances et extensions de la bibliothèque officielle." },
  "Announcements disabled": { ja: "お知らせをオフにしました", ko: "공지를 껐습니다", es: "Anuncios desactivados", fr: "Annonces désactivées" },
  "Announcements enabled": { ja: "お知らせをオンにしました", ko: "공지를 켰습니다", es: "Anuncios activados", fr: "Annonces activées" },
  "Personal Profile": { ja: "個人プロフィール", ko: "개인 프로필", es: "Perfil personal", fr: "Profil personnel" },
  "Avatar preview": { ja: "アバターのプレビュー", ko: "아바타 미리보기", es: "Vista previa del avatar", fr: "Aperçu de l’avatar" },
  "Edit": { ja: "編集", ko: "편집", es: "Editar", fr: "Modifier" },
  "User avatar": { ja: "ユーザーアバター", ko: "사용자 아바타", es: "Avatar de usuario", fr: "Avatar utilisateur" },
  "Processing...": { ja: "処理中...", ko: "처리 중...", es: "Procesando...", fr: "Traitement..." },
  "Change avatar": { ja: "アバターを変更", ko: "아바타 변경", es: "Cambiar avatar", fr: "Changer l’avatar" },
  "Upload avatar": { ja: "アバターをアップロード", ko: "아바타 업로드", es: "Subir avatar", fr: "Importer un avatar" },
  "Remove": { ja: "削除", ko: "제거", es: "Quitar", fr: "Retirer" },
  "JPEG, PNG, or WebP up to 5 MB. Cropped to a square.": { ja: "JPEG、PNG、WebP（最大 5 MB）。正方形に切り抜かれます。", ko: "JPEG, PNG 또는 WebP, 최대 5MB. 정사각형으로 잘립니다.", es: "JPEG, PNG o WebP de hasta 5 MB. Se recortará en formato cuadrado.", fr: "JPEG, PNG ou WebP jusqu’à 5 Mo. L’image sera recadrée au format carré." },
  "Username": { ja: "ユーザー名", ko: "사용자 이름", es: "Nombre de usuario", fr: "Nom d’utilisateur" },
  "Use lowercase letters, numbers, and underscores": { ja: "英小文字、数字、アンダースコアを使用", ko: "영문 소문자, 숫자 및 밑줄 사용", es: "Usa minúsculas, números y guiones bajos", fr: "Utilisez des minuscules, chiffres et traits de soulignement" },
  "Use 3-20 lowercase letters, numbers, or underscores, starting with a letter.": { ja: "英字で始まる 3〜20 文字の英小文字、数字、アンダースコアを使用してください。", ko: "영문자로 시작하는 3~20자의 영문 소문자, 숫자 또는 밑줄을 사용하세요.", es: "Usa entre 3 y 20 minúsculas, números o guiones bajos, empezando por una letra.", fr: "Utilisez 3 à 20 minuscules, chiffres ou traits de soulignement, en commençant par une lettre." },
  "Display name": { ja: "表示名", ko: "표시 이름", es: "Nombre visible", fr: "Nom affiché" },
  "Shown across Quandora. Leave blank to use your @username": { ja: "Quandora 全体に表示されます。空欄の場合は @ユーザー名を使用します", ko: "Quandora 전체에 표시됩니다. 비워 두면 @사용자이름을 사용합니다", es: "Se muestra en Quandora. Déjalo vacío para usar tu @usuario", fr: "Affiché dans Quandora. Laissez vide pour utiliser votre @identifiant" },
  "Display name must be 50 characters or fewer.": { ja: "表示名は 50 文字以内にしてください。", ko: "표시 이름은 50자 이하여야 합니다.", es: "El nombre visible debe tener 50 caracteres o menos.", fr: "Le nom affiché doit contenir 50 caractères maximum." },
  "Bio": { ja: "自己紹介", ko: "소개", es: "Biografía", fr: "Bio" },
  "Tell us a little about yourself...": { ja: "自己紹介を入力...", ko: "간단한 소개를 입력하세요...", es: "Cuéntanos algo sobre ti...", fr: "Présentez-vous en quelques mots..." },
  "Bio must be 160 characters or fewer.": { ja: "自己紹介は 160 文字以内にしてください。", ko: "소개는 160자 이하여야 합니다.", es: "La biografía debe tener 160 caracteres o menos.", fr: "La bio doit contenir 160 caractères maximum." },
  "Cancel": { ja: "キャンセル", ko: "취소", es: "Cancelar", fr: "Annuler" },
  "Profile updated successfully": { ja: "プロフィールを更新しました", ko: "프로필을 업데이트했습니다", es: "Perfil actualizado correctamente", fr: "Profil mis à jour" },
  "Save changes": { ja: "変更を保存", ko: "변경 사항 저장", es: "Guardar cambios", fr: "Enregistrer les modifications" },
  "Security & Login": { ja: "セキュリティとログイン", ko: "보안 및 로그인", es: "Seguridad e inicio de sesión", fr: "Sécurité et connexion" },
  "Login Email": { ja: "ログイン用メール", ko: "로그인 이메일", es: "Correo de acceso", fr: "E-mail de connexion" },
  "Save": { ja: "保存", ko: "저장", es: "Guardar", fr: "Enregistrer" },
  "Current Email": { ja: "現在のメールアドレス", ko: "현재 이메일", es: "Correo actual", fr: "Adresse e-mail actuelle" },
  "Verification Code": { ja: "認証コード", ko: "인증 코드", es: "Código de verificación", fr: "Code de vérification" },
  "Enter verification code": { ja: "認証コードを入力", ko: "인증 코드 입력", es: "Introduce el código de verificación", fr: "Saisissez le code de vérification" },
  "Verification code sent to your current email": { ja: "現在のメールアドレスに認証コードを送信しました", ko: "현재 이메일로 인증 코드를 보냈습니다", es: "Código enviado a tu correo actual", fr: "Code envoyé à votre adresse e-mail actuelle" },
  "Resend Code": { ja: "再送信", ko: "코드 재전송", es: "Reenviar código", fr: "Renvoyer le code" },
  "Send Code": { ja: "コードを送信", ko: "코드 전송", es: "Enviar código", fr: "Envoyer le code" },
  "New Email": { ja: "新しいメールアドレス", ko: "새 이메일", es: "Nuevo correo", fr: "Nouvelle adresse e-mail" },
  "Enter new email address": { ja: "新しいメールアドレスを入力", ko: "새 이메일 주소 입력", es: "Introduce el nuevo correo", fr: "Saisissez la nouvelle adresse e-mail" },
  "Change Password": { ja: "パスワードを変更", ko: "비밀번호 변경", es: "Cambiar contraseña", fr: "Modifier le mot de passe" },
  "Last changed: 2026-07-20 14:30": { ja: "最終変更：2026-07-20 14:30", ko: "마지막 변경: 2026-07-20 14:30", es: "Último cambio: 2026-07-20 14:30", fr: "Dernière modification : 2026-07-20 14:30" },
  "Email": { ja: "メール", ko: "이메일", es: "Correo", fr: "E-mail" },
  "Verification code sent to your email": { ja: "メールに認証コードを送信しました", ko: "이메일로 인증 코드를 보냈습니다", es: "Código enviado a tu correo", fr: "Code envoyé à votre adresse e-mail" },
  "New Password": { ja: "新しいパスワード", ko: "새 비밀번호", es: "Nueva contraseña", fr: "Nouveau mot de passe" },
  "Enter new password": { ja: "新しいパスワードを入力", ko: "새 비밀번호 입력", es: "Introduce la nueva contraseña", fr: "Saisissez le nouveau mot de passe" },
  "Confirm New Password": { ja: "新しいパスワードを確認", ko: "새 비밀번호 확인", es: "Confirmar nueva contraseña", fr: "Confirmer le nouveau mot de passe" },
  "Re-enter new password": { ja: "新しいパスワードを再入力", ko: "새 비밀번호 다시 입력", es: "Vuelve a introducir la contraseña", fr: "Saisissez à nouveau le mot de passe" },
  "Passwords do not match": { ja: "パスワードが一致しません", ko: "비밀번호가 일치하지 않습니다", es: "Las contraseñas no coinciden", fr: "Les mots de passe ne correspondent pas" },
  "Please enter a new password": { ja: "新しいパスワードを入力してください", ko: "새 비밀번호를 입력하세요", es: "Introduce una nueva contraseña", fr: "Saisissez un nouveau mot de passe" },
  "Password must be at least 8 characters": { ja: "パスワードは 8 文字以上にしてください", ko: "비밀번호는 8자 이상이어야 합니다", es: "La contraseña debe tener al menos 8 caracteres", fr: "Le mot de passe doit contenir au moins 8 caractères" },
  "Password updated successfully": { ja: "パスワードを更新しました", ko: "비밀번호를 업데이트했습니다", es: "Contraseña actualizada correctamente", fr: "Mot de passe mis à jour" },
  "Connected Exchanges": { ja: "接続済み取引所", ko: "연결된 거래소", es: "Exchanges conectados", fr: "Plateformes connectées" },
  "New Exchange API": { ja: "新しい取引所 API", ko: "새 거래소 API", es: "Nueva API de exchange", fr: "Nouvelle API de plateforme" },
  "No exchange API connected": { ja: "取引所 API は未接続です", ko: "연결된 거래소 API가 없습니다", es: "No hay ninguna API de exchange conectada", fr: "Aucune API de plateforme connectée" },
  "Add a venue connection to enable live execution and account sync.": { ja: "取引所を接続すると、実運用とアカウント同期を利用できます。", ko: "거래소를 연결하면 실거래 실행 및 계정 동기화를 사용할 수 있습니다.", es: "Conecta un exchange para habilitar la ejecución en real y la sincronización de la cuenta.", fr: "Connectez une plateforme pour activer l’exécution réelle et la synchronisation du compte." },
  "More options": { ja: "その他の操作", ko: "추가 옵션", es: "Más opciones", fr: "Plus d’options" },
  "Delete Exchange API": { ja: "取引所 API を削除", ko: "거래소 API 삭제", es: "Eliminar API del exchange", fr: "Supprimer l’API de la plateforme" },
  "Venue": { ja: "取引所", ko: "거래소", es: "Exchange", fr: "Plateforme" },
  "API Key": { ja: "API キー", ko: "API 키", es: "Clave API", fr: "Clé API" },
  "Hide API Key": { ja: "API キーを隠す", ko: "API 키 숨기기", es: "Ocultar clave API", fr: "Masquer la clé API" },
  "Show API Key": { ja: "API キーを表示", ko: "API 키 표시", es: "Mostrar clave API", fr: "Afficher la clé API" },
  "Agent API": { ja: "Agent API", ko: "Agent API", es: "API del Agent", fr: "API de l’Agent" },
  "New API Key": { ja: "新しい API キー", ko: "새 API 키", es: "Nueva clave API", fr: "Nouvelle clé API" },
  "No API keys yet": { ja: "API キーはまだありません", ko: "아직 API 키가 없습니다", es: "Aún no hay claves API", fr: "Aucune clé API pour le moment" },
  "Create your first API key to connect your AI agent": { ja: "最初の API キーを作成して AI Agent を接続しましょう", ko: "첫 API 키를 생성하여 AI Agent를 연결하세요", es: "Crea tu primera clave API para conectar tu Agent de IA", fr: "Créez votre première clé API pour connecter votre Agent IA" },
  "Delete API Key": { ja: "API キーを削除", ko: "API 키 삭제", es: "Eliminar clave API", fr: "Supprimer la clé API" },
  "Skill": { ja: "Skill", ko: "Skill", es: "Skill", fr: "Skill" },
  "Updated": { ja: "更新日", ko: "업데이트", es: "Actualizado", fr: "Mis à jour" },
  "Check for skill updates": { ja: "Skill の更新を確認", ko: "Skill 업데이트 확인", es: "Buscar actualizaciones del Skill", fr: "Rechercher les mises à jour du Skill" },
  "Launch Guide": { ja: "起動ガイド", ko: "시작 가이드", es: "Guía de inicio", fr: "Guide de démarrage" },
  "Log Out": { ja: "ログアウト", ko: "로그아웃", es: "Cerrar sesión", fr: "Se déconnecter" },
  "After you log out, you'll return to the home page.": { ja: "ログアウトするとホームページに戻ります。", ko: "로그아웃하면 홈 페이지로 돌아갑니다.", es: "Al cerrar sesión, volverás a la página de inicio.", fr: "Après la déconnexion, vous reviendrez à l’accueil." },
  "Add Exchange API": { ja: "取引所 API を追加", ko: "거래소 API 추가", es: "Añadir API de exchange", fr: "Ajouter une API de plateforme" },
  "Configure API Credentials": { ja: "API 認証情報を設定", ko: "API 인증 정보 설정", es: "Configurar credenciales API", fr: "Configurer les identifiants API" },
  "Select Venue": { ja: "取引所を選択", ko: "거래소 선택", es: "Seleccionar exchange", fr: "Sélectionner une plateforme" },
  "API Configuration": { ja: "API 設定", ko: "API 설정", es: "Configuración de API", fr: "Configuration de l’API" },
  "Choose an exchange venue to connect your trading account.": { ja: "取引口座を接続する取引所を選択してください。", ko: "거래 계정을 연결할 거래소를 선택하세요.", es: "Elige el exchange al que conectar tu cuenta de trading.", fr: "Choisissez la plateforme à connecter à votre compte de trading." },
  "Continue": { ja: "続行", ko: "계속", es: "Continuar", fr: "Continuer" },
  "Account Name": { ja: "アカウント名", ko: "계정 이름", es: "Nombre de la cuenta", fr: "Nom du compte" },
  "e.g., Primary Futures Account": { ja: "例：メイン先物口座", ko: "예: 주 선물 계정", es: "p. ej., Cuenta principal de futuros", fr: "ex. : Compte Futures principal" },
  "Enter your API key": { ja: "API キーを入力", ko: "API 키 입력", es: "Introduce tu clave API", fr: "Saisissez votre clé API" },
  "API Secret": { ja: "API シークレット", ko: "API 시크릿", es: "Secreto API", fr: "Secret API" },
  "Enter your API secret": { ja: "API シークレットを入力", ko: "API 시크릿 입력", es: "Introduce tu secreto API", fr: "Saisissez votre secret API" },
  "Security Best Practices": { ja: "セキュリティのベストプラクティス", ko: "보안 권장 사항", es: "Buenas prácticas de seguridad", fr: "Bonnes pratiques de sécurité" },
  "API credentials are encrypted at rest. Do not enable withdrawal permissions. Trade and read-only scopes are sufficient for strategy execution and monitoring.": { ja: "API 認証情報は保存時に暗号化されます。出金権限は有効にしないでください。戦略の実行と監視には、取引権限と読み取り専用権限で十分です。", ko: "API 인증 정보는 저장 시 암호화됩니다. 출금 권한을 활성화하지 마세요. 전략 실행과 모니터링에는 거래 및 읽기 전용 권한이면 충분합니다.", es: "Las credenciales API se cifran en reposo. No habilites permisos de retirada. Los permisos de trading y solo lectura bastan para ejecutar y supervisar estrategias.", fr: "Les identifiants API sont chiffrés au repos. N’activez pas les retraits. Les droits de trading et de lecture seule suffisent pour exécuter et surveiller les stratégies." },
  "Disable withdrawal permissions.": { ja: "出金権限を無効にしてください。", ko: "출금 권한을 비활성화하세요.", es: "Desactiva los permisos de retirada.", fr: "Désactivez les droits de retrait." },
  "Restrict API access by IP whitelist.": { ja: "IP ホワイトリストで API アクセスを制限してください。", ko: "IP 허용 목록으로 API 액세스를 제한하세요.", es: "Restringe el acceso a la API con una lista blanca de IP.", fr: "Limitez l’accès à l’API avec une liste blanche d’IP." },
  "Rotate API credentials periodically.": { ja: "API 認証情報を定期的に更新してください。", ko: "API 인증 정보를 주기적으로 교체하세요.", es: "Rota las credenciales API periódicamente.", fr: "Renouvelez régulièrement les identifiants API." },
  "Back": { ja: "戻る", ko: "뒤로", es: "Atrás", fr: "Retour" },
  "Are you sure you want to delete": { ja: "削除しますか：", ko: "삭제하시겠습니까:", es: "¿Seguro que quieres eliminar", fr: "Voulez-vous vraiment supprimer" },
  "This action cannot be undone and this exchange account will no longer be available for trading deployment.": { ja: "この操作は取り消せません。この取引所アカウントは戦略の実運用に使用できなくなります。", ko: "이 작업은 취소할 수 없으며 이 거래소 계정은 더 이상 전략 실거래에 사용할 수 없습니다.", es: "Esta acción no se puede deshacer y la cuenta dejará de estar disponible para desplegar estrategias.", fr: "Cette action est irréversible et ce compte ne pourra plus servir au déploiement de stratégies." },
  "Delete": { ja: "削除", ko: "삭제", es: "Eliminar", fr: "Supprimer" },
  "This action cannot be undone and any agents using this key will lose access.": { ja: "この操作は取り消せません。このキーを使用している Agent はアクセスできなくなります。", ko: "이 작업은 취소할 수 없으며 이 키를 사용하는 Agent는 액세스 권한을 잃게 됩니다.", es: "Esta acción no se puede deshacer y cualquier Agent que use la clave perderá el acceso.", fr: "Cette action est irréversible et tout Agent utilisant cette clé perdra l’accès." },
  "Confirm Log Out": { ja: "ログアウトの確認", ko: "로그아웃 확인", es: "Confirmar cierre de sesión", fr: "Confirmer la déconnexion" },
  "Are you sure you want to log out of your current account?": { ja: "現在のアカウントからログアウトしますか？", ko: "현재 계정에서 로그아웃하시겠습니까?", es: "¿Seguro que quieres cerrar la sesión actual?", fr: "Voulez-vous vraiment vous déconnecter du compte actuel ?" },
  "Create New API Key": { ja: "新しい API キーを作成", ko: "새 API 키 생성", es: "Crear nueva clave API", fr: "Créer une nouvelle clé API" },
  "Your API Key is Ready": { ja: "API キーを作成しました", ko: "API 키가 준비되었습니다", es: "Tu clave API está lista", fr: "Votre clé API est prête" },
  "Generate API": { ja: "API を生成", ko: "API 생성", es: "Generar API", fr: "Générer l’API" },
  "Paste to Agent": { ja: "Agent に貼り付け", ko: "Agent에 붙여넣기", es: "Pegar en el Agent", fr: "Coller dans l’Agent" },
  "Give your API key a name to identify it later.": { ja: "後で識別できるように API キーに名前を付けてください。", ko: "나중에 식별할 수 있도록 API 키에 이름을 지정하세요.", es: "Asigna un nombre a la clave API para identificarla después.", fr: "Nommez la clé API pour pouvoir l’identifier plus tard." },
  "API Name": { ja: "API 名", ko: "API 이름", es: "Nombre de la API", fr: "Nom de l’API" },
  "e.g., My Trading Bot, Research Agent...": { ja: "例：取引 Bot、リサーチ Agent...", ko: "예: 트레이딩 봇, 리서치 Agent...", es: "p. ej., Bot de trading, Agent de investigación...", fr: "ex. : Bot de trading, Agent de recherche..." },
  "Create API Key": { ja: "API キーを作成", ko: "API 키 생성", es: "Crear clave API", fr: "Créer la clé API" },
  "Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek) to start using Quandora Trading.": { ja: "下のプロンプトをコピーして AI Agent（ChatGPT / Claude / DeepSeek）に貼り付けると、Quandora Trading を利用できます。", ko: "아래 프롬프트를 복사하여 AI Agent(ChatGPT / Claude / DeepSeek)에 붙여넣으면 Quandora Trading을 사용할 수 있습니다.", es: "Copia el prompt y pégalo en tu Agent de IA (ChatGPT / Claude / DeepSeek) para empezar a usar Quandora Trading.", fr: "Copiez le prompt ci-dessous dans votre Agent IA (ChatGPT / Claude / DeepSeek) pour commencer à utiliser Quandora Trading." },
  "Copied to clipboard": { ja: "クリップボードにコピーしました", ko: "클립보드에 복사했습니다", es: "Copiado al portapapeles", fr: "Copié dans le presse-papiers" },
  "Updated to latest skill & prompt copied": { ja: "最新の Skill に更新し、プロンプトをコピーしました", ko: "최신 Skill로 업데이트하고 프롬프트를 복사했습니다", es: "Skill actualizado y prompt copiado", fr: "Skill mis à jour et prompt copié" },
  "Prompt copied to clipboard": { ja: "プロンプトをクリップボードにコピーしました", ko: "프롬프트를 클립보드에 복사했습니다", es: "Prompt copiado al portapapeles", fr: "Prompt copié dans le presse-papiers" },
  "Copied": { ja: "コピー済み", ko: "복사됨", es: "Copiado", fr: "Copié" },
  "Copy Latest Prompt": { ja: "最新プロンプトをコピー", ko: "최신 프롬프트 복사", es: "Copiar último prompt", fr: "Copier le dernier prompt" },
  "Copy Prompt": { ja: "プロンプトをコピー", ko: "프롬프트 복사", es: "Copiar prompt", fr: "Copier le prompt" },
};

function accountTr(uiLang: UiLang, en: string, zh: string, copy: UiCopy = {}) {
  return translateUi(uiLang, en, zh, { ...accountCopy[en], ...copy });
}

const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE = 512;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

function createUsernameSeed(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

  return USERNAME_PATTERN.test(normalized) ? normalized : "user";
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read avatar"));
    reader.readAsDataURL(blob);
  });
}

function cropAvatarToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const outputSize = Math.min(sourceSize, AVATAR_OUTPUT_SIZE);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context || outputSize === 0) {
        reject(new Error("Unable to process avatar"));
        return;
      }

      canvas.width = outputSize;
      canvas.height = outputSize;
      context.drawImage(
        image,
        (image.naturalWidth - sourceSize) / 2,
        (image.naturalHeight - sourceSize) / 2,
        sourceSize,
        sourceSize,
        0,
        0,
        outputSize,
        outputSize
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to process avatar"));
            return;
          }
          readBlobAsDataUrl(blob).then(resolve, reject);
        },
        file.type,
        file.type === "image/png" ? undefined : 0.9
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to decode avatar"));
    };
    image.src = objectUrl;
  });
}

/* ── API Key data model ── */
interface ApiKeyItem {
  id: string;
  name: string;
  apiKey: string;
  skillVersion: string;
  createdAt: string;
  updatedAt: string;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ot_sk_";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

const SKILL_LATEST = "v2.4.1";

function buildPrompt(apiKey: string, skillVersion: string, uiLang: UiLang = "en"): string {
  const prompts: Record<UiLang, string> = {
    en: `# Quandora Trading Skill Configuration

## API Key
\`${apiKey}\`

## Skill Version
${skillVersion}

## Setup Instructions
Paste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Quandora Trading capabilities.

Your agent will be able to:
- Mine and backtest alpha factors automatically
- Access real-time market data (CEX & DEX)
- Submit strategies to the Quandora Arena
- Monitor portfolio performance

## Connection Endpoint
https://api.quandora.trade/v1/agent

## Authentication
Include the API key in your agent's system prompt or environment configuration. The agent will automatically authenticate when making requests.`,
    zh: `# Quandora Trading Skill 配置

## API 密钥
\`${apiKey}\`

## Skill 版本
${skillVersion}

## 配置说明
将整段提示词粘贴到你的 AI Agent（ChatGPT / Claude / DeepSeek）中，即可启用 Quandora Trading 能力。

你的 Agent 将能够：
- 自动挖掘并回测 Alpha 因子
- 访问实时市场数据（CEX 与 DEX）
- 向 Quandora Arena 提交策略
- 监控投资组合表现

## 连接端点
https://api.quandora.trade/v1/agent

## 身份验证
将 API 密钥加入 Agent 的系统提示词或环境配置。Agent 发起请求时将自动完成身份验证。`,
    ja: `# Quandora Trading Skill 設定

## API キー
\`${apiKey}\`

## Skill バージョン
${skillVersion}

## 設定手順
このプロンプト全体を AI Agent（ChatGPT / Claude / DeepSeek）に貼り付けると、Quandora Trading の機能が有効になります。

Agent で利用できる機能：
- Alpha ファクターの自動マイニングとバックテスト
- リアルタイム市場データ（CEX・DEX）へのアクセス
- Quandora Arena への戦略提出
- ポートフォリオのパフォーマンス監視

## 接続エンドポイント
https://api.quandora.trade/v1/agent

## 認証
API キーを Agent のシステムプロンプトまたは環境設定に追加してください。リクエスト時に自動認証されます。`,
    ko: `# Quandora Trading Skill 설정

## API 키
\`${apiKey}\`

## Skill 버전
${skillVersion}

## 설정 안내
이 프롬프트 전체를 AI Agent(ChatGPT / Claude / DeepSeek)에 붙여넣으면 Quandora Trading 기능이 활성화됩니다.

Agent에서 사용할 수 있는 기능:
- Alpha 팩터 자동 마이닝 및 백테스트
- 실시간 시장 데이터(CEX 및 DEX) 액세스
- Quandora Arena에 전략 제출
- 포트폴리오 성과 모니터링

## 연결 엔드포인트
https://api.quandora.trade/v1/agent

## 인증
API 키를 Agent의 시스템 프롬프트 또는 환경 설정에 추가하세요. 요청 시 자동으로 인증됩니다.`,
    es: `# Configuración del Skill de Quandora Trading

## Clave API
\`${apiKey}\`

## Versión del Skill
${skillVersion}

## Configuración
Pega este prompt completo en tu Agent de IA (ChatGPT / Claude / DeepSeek) para activar Quandora Trading.

Tu Agent podrá:
- Extraer y someter a backtest factores Alpha automáticamente
- Acceder a datos de mercado en tiempo real (CEX y DEX)
- Enviar estrategias a Quandora Arena
- Supervisar el rendimiento de la cartera

## Endpoint de conexión
https://api.quandora.trade/v1/agent

## Autenticación
Incluye la clave API en el prompt del sistema o la configuración del entorno de tu Agent. Las solicitudes se autenticarán automáticamente.`,
    fr: `# Configuration du Skill Quandora Trading

## Clé API
\`${apiKey}\`

## Version du Skill
${skillVersion}

## Configuration
Collez ce prompt complet dans votre Agent IA (ChatGPT / Claude / DeepSeek) pour activer Quandora Trading.

Votre Agent pourra :
- Rechercher et backtester automatiquement des facteurs Alpha
- Accéder aux données de marché en temps réel (CEX et DEX)
- Soumettre des stratégies à Quandora Arena
- Surveiller la performance du portefeuille

## Endpoint de connexion
https://api.quandora.trade/v1/agent

## Authentification
Ajoutez la clé API au prompt système ou à la configuration d’environnement de votre Agent. Les requêtes seront authentifiées automatiquement.`,
  };

  return prompts[uiLang];
}

const INITIAL_KEYS: ApiKeyItem[] = [
  {
    id: "1",
    name: "My Trading Bot",
    apiKey: "ot_sk_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG2h",
    skillVersion: "v2.4.1",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-28",
  },
  {
    id: "2",
    name: "Research Agent",
    apiKey: "ot_sk_hJ2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE",
    skillVersion: "v2.3.0",
    createdAt: "2026-02-15",
    updatedAt: "2026-03-15",
  },
];

/* ── Copy button helper ── */
function CopyBtn({ text, uiLang = "en" }: { text: string; uiLang?: UiLang }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(accountTr(uiLang, "Copied to clipboard", "已复制到剪贴板"));
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg transition-colors duration-200 ease-in-out text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── Copy Prompt button ── */
function CopyPromptBtn({ apiKey, skillVersion, itemSkillVersion, uiLang = "en" }: { apiKey: string; skillVersion: string; itemSkillVersion: string; uiLang?: UiLang }) {
  const [copied, setCopied] = useState(false);
  const needsUpdate = itemSkillVersion !== skillVersion;
  const handleCopy = () => {
    navigator.clipboard.writeText(buildPrompt(apiKey, skillVersion, uiLang));
    setCopied(true);
    toast.success(
      needsUpdate
        ? accountTr(uiLang, "Updated to latest skill & prompt copied", "已更新至最新 Skill 并复制提示词")
        : accountTr(uiLang, "Prompt copied to clipboard", "提示词已复制到剪贴板")
    );
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 ease-in-out border ${
        needsUpdate ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10" : "border-primary/20 text-primary hover:bg-primary/10"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      {copied
        ? accountTr(uiLang, "Copied", "已复制")
        : needsUpdate
          ? accountTr(uiLang, "Copy Latest Prompt", "复制最新提示词")
          : accountTr(uiLang, "Copy Prompt", "复制提示词")}
    </button>
  );
}

function ChartColorPreview({ mode }: { mode: ChartColorMode }) {
  const firstColor = mode === "redUpGreenDown" ? "bg-rose-500" : "bg-emerald-500";
  const secondColor = mode === "redUpGreenDown" ? "bg-emerald-500" : "bg-rose-500";
  return (
    <span className="inline-flex h-7 items-center gap-1.5" aria-hidden="true">
      <span className="relative inline-flex h-5 w-2.5 items-center justify-center">
        <span className={`h-4 w-1.5 rounded-sm ${firstColor}`} />
        <span className={`absolute h-5 w-px ${firstColor}`} />
      </span>
      <span className="relative inline-flex h-5 w-2.5 items-center justify-center">
        <span className={`h-4 w-1.5 rounded-sm ${secondColor}`} />
        <span className={`absolute h-5 w-px ${secondColor}`} />
      </span>
    </span>
  );
}

export default function Account() {
  return <AccountWorkbench260712 />;
}

function AccountWorkbench260712() {
  const { user, updateUser, logout } = useAuth();
  const { uiLang, setUiLang } = useAppLanguage();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [exchangeList, setExchangeList] = useState<Exchange[]>(exchanges);
  const [username, setUsername] = useState(() =>
    user?.username ?? createUsernameSeed(user?.email?.split("@")[0] || user?.displayName || "user")
  );
  const [email, setEmail] = useState("alpha.trader@example.com");
  const [displayName, setDisplayName] = useState(user?.displayName || "AlphaTrader");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [passwordVerCode, setPasswordVerCode] = useState("");
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [emailVerCode, setEmailVerCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [alphasNotify, setAlphasNotify] = useState(true);
  const [systemNotify, setSystemNotify] = useState(true);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => {
    if (typeof window === "undefined") return "greenUpRedDown";
    const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
    return stored === "redUpGreenDown" || stored === "greenUpRedDown" ? stored : "greenUpRedDown";
  });
  const [exchangeApiItems, setExchangeApiItems] = useState<ExchangeApiConnection[]>(() =>
    readExchangeApiConnections()
  );
  const [showCreateExchangeModal, setShowCreateExchangeModal] = useState(false);
  const [exchangeCreateStep, setExchangeCreateStep] = useState<1 | 2>(1);
  const [selectedExchangeVenue, setSelectedExchangeVenue] = useState<ExchangeVenue>("binance");
  const [exchangeAccountName, setExchangeAccountName] = useState("");
  const [exchangeApiKey, setExchangeApiKey] = useState("");
  const [exchangeApiSecret, setExchangeApiSecret] = useState("");
  const [editingExchangeNameId, setEditingExchangeNameId] = useState<string | null>(null);
  const [editExchangeNameValue, setEditExchangeNameValue] = useState("");
  const [exchangeDeleteConfirmId, setExchangeDeleteConfirmId] = useState<string | null>(null);
  const [exchangeMoreMenuId, setExchangeMoreMenuId] = useState<string | null>(null);
  const exchangeMoreMenuRef = useRef<HTMLDivElement>(null);

  // Edit mode states for each subsection
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileValidationRequested, setProfileValidationRequested] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [originalUsername, setOriginalUsername] = useState(username);
  const [originalDisplayName, setOriginalDisplayName] = useState(displayName);
  const [originalAvatar, setOriginalAvatar] = useState(avatar);
  const [originalBio, setOriginalBio] = useState(bio);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_KEYS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newApiName, setNewApiName] = useState("");
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const tr = useCallback(
    (en: string, zh: string, copy: UiCopy = {}) => accountTr(uiLang, en, zh, copy),
    [uiLang]
  );

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuId(null);
      }
    };
    if (moreMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreMenuId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exchangeMoreMenuRef.current && !exchangeMoreMenuRef.current.contains(e.target as Node)) {
        setExchangeMoreMenuId(null);
      }
    };
    if (exchangeMoreMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exchangeMoreMenuId]);

  useEffect(() => {
    writeExchangeApiConnections(exchangeApiItems);
  }, [exchangeApiItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHART_COLOR_MODE_STORAGE_KEY, chartColorMode);
  }, [chartColorMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PLAIN_EXPLANATION_STORAGE_KEY, "true");
  }, []);

  const handleRefreshSkill = useCallback((id: string) => {
    const now = new Date().toISOString().split("T")[0];
    setApiKeys((prev) =>
      prev.map((k) => {
        if (k.id !== id) return k;
        if (k.skillVersion === SKILL_LATEST) {
          toast.success(tr("Already on the latest version", "当前已是最新版本"));
          return k;
        }
        toast.success(tr(
          `Skill updated to ${SKILL_LATEST}`,
          `Skill 已更新到 ${SKILL_LATEST}`,
          {
            ja: `Skill を ${SKILL_LATEST} に更新しました`,
            ko: `Skill을 ${SKILL_LATEST}(으)로 업데이트했습니다`,
            es: `Skill actualizado a ${SKILL_LATEST}`,
            fr: `Skill mis à jour vers ${SKILL_LATEST}`,
          }
        ));
        return { ...k, skillVersion: SKILL_LATEST, updatedAt: now };
      })
    );
  }, [tr]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && tabs.some((t) => t.id === tab)) setActiveTab(tab as TabId);
  }, []);

  const handleConnect = (id: string) => {
    setExchangeList((prev) =>
      prev.map((ex) =>
        ex.id === id ? { ...ex, status: ex.status === "connected" ? "disconnected" : "connected" } : ex
      )
    );
    toast.success(tr("Exchange connection updated", "交易所连接状态已更新"));
  };

  const handleCancelProfile = () => {
    setUsername(originalUsername);
    setDisplayName(originalDisplayName);
    setAvatar(originalAvatar);
    setBio(originalBio);
    setProfileValidationRequested(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    setEditingProfile(false);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error(tr("Use a JPEG, PNG, or WebP image", "请选择 JPEG、PNG 或 WebP 图片"));
      return;
    }
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast.error(tr("Avatar must be 5 MB or smaller", "头像文件不能超过 5 MB"));
      return;
    }

    setProcessingAvatar(true);
    try {
      setAvatar(await cropAvatarToSquare(file));
      toast.success(tr("Avatar ready to save", "头像已裁剪，请保存资料"));
    } catch {
      toast.error(tr("Unable to process this image", "无法处理该图片，请更换后重试"));
    } finally {
      setProcessingAvatar(false);
    }
  };

  const handleCancelEmail = () => {
    setEmailVerCode("");
    setEmailCodeSent(false);
    setNewEmail("");
    setEditingEmail(false);
  };

  const handleSaveEmail = () => {
    if (!emailVerCode.trim()) {
      toast.error(tr("Please enter the verification code", "请输入验证码"));
      return;
    }
    if (!newEmail.trim()) {
      toast.error(tr("Please enter a new email address", "请输入新邮箱地址"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error(tr("Please enter a valid email address", "请输入有效的邮箱地址"));
      return;
    }

    toast.success(tr("Email updated successfully", "邮箱更新成功"));
    setEmail(newEmail);
    updateUser({ email: newEmail });
    setEmailVerCode("");
    setEmailCodeSent(false);
    setNewEmail("");
    setEditingEmail(false);
  };

  const handleCancelPassword = () => {
    setPasswordVerCode("");
    setPasswordCodeSent(false);
    setNewPassword("");
    setConfirmPassword("");
    setEditingPassword(false);
  };

  const resetExchangeCreateFlow = useCallback(() => {
    setExchangeCreateStep(1);
    setSelectedExchangeVenue("binance");
    setExchangeAccountName("");
    setExchangeApiKey("");
    setExchangeApiSecret("");
  }, []);

  const handleOpenExchangeModal = useCallback(() => {
    resetExchangeCreateFlow();
    setShowCreateExchangeModal(true);
  }, [resetExchangeCreateFlow]);

  const handleCreateExchangeApi = useCallback(() => {
    if (!exchangeAccountName.trim() || !exchangeApiKey.trim() || !exchangeApiSecret.trim()) {
      toast.error(tr("Please complete all required fields.", "请完整填写所有必填字段。"));
      return;
    }
    const now = new Date().toISOString().split("T")[0];
    const newExchangeItem: ExchangeApiConnection = {
      id: `ex-${Date.now()}`,
      venue: selectedExchangeVenue,
      accountName: exchangeAccountName.trim(),
      apiKey: exchangeApiKey.trim(),
      createdAt: now,
      updatedAt: now,
    };
    setExchangeApiItems((prev) => [newExchangeItem, ...prev]);
    setShowCreateExchangeModal(false);
    resetExchangeCreateFlow();
    const venueName = selectedExchangeVenue.toUpperCase();
    toast.success(tr(
      `${venueName} API connected successfully.`,
      `${venueName} API 已连接成功。`,
      {
        ja: `${venueName} API に接続しました。`,
        ko: `${venueName} API에 연결했습니다.`,
        es: `API de ${venueName} conectada correctamente.`,
        fr: `API ${venueName} connectée.`,
      }
    ));
  }, [exchangeAccountName, exchangeApiKey, exchangeApiSecret, resetExchangeCreateFlow, selectedExchangeVenue, tr, uiLang]);

  const handleSaveExchangeName = useCallback((id: string) => {
    if (!editExchangeNameValue.trim()) {
      toast.error(tr("Name cannot be empty", "名称不能为空"));
      return;
    }
    setExchangeApiItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, accountName: editExchangeNameValue.trim() } : item
      )
    );
    setEditingExchangeNameId(null);
    setEditExchangeNameValue("");
    toast.success(tr("Exchange account name updated", "交易所账户名称已更新"));
  }, [editExchangeNameValue, tr]);

  const handleDeleteExchangeApi = useCallback((id: string) => {
    setExchangeApiItems((prev) => prev.filter((item) => item.id !== id));
    toast.success(tr("Exchange API deleted", "交易所 API 已删除"));
  }, [tr]);

  // API Key actions
  const handleCreateApi = useCallback(() => {
    if (!newApiName.trim()) { toast.error(tr("Please enter an API name", "请输入 API 名称")); return; }
    const key = generateApiKey();
    setCreatedApiKey(key);
    setCreateStep(2);
  }, [newApiName, tr]);

  const handleFinishCreate = useCallback(() => {
    const now = new Date().toISOString().split("T")[0];
    const newItem: ApiKeyItem = {
      id: Date.now().toString(),
      name: newApiName.trim(),
      apiKey: createdApiKey,
      skillVersion: SKILL_LATEST,
      createdAt: now,
      updatedAt: now,
    };
    setApiKeys((prev) => [newItem, ...prev]);
    setShowCreateModal(false);
    setCreateStep(1);
    setNewApiName("");
    setCreatedApiKey("");
    toast.success(tr("API key created successfully", "API 密钥创建成功"));
  }, [newApiName, createdApiKey, tr]);

  const handleDeleteApi = useCallback((id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success(tr("API key deleted", "API 密钥已删除"));
  }, [tr]);

  const handleSaveName = useCallback((id: string) => {
    if (!editNameValue.trim()) { toast.error(tr("Name cannot be empty", "名称不能为空")); return; }
    const now = new Date().toISOString().split("T")[0];
    setApiKeys((prev) =>
      prev.map((k) => k.id === id ? { ...k, name: editNameValue.trim(), updatedAt: now } : k)
    );
    setEditingNameId(null);
    setEditNameValue("");
    toast.success(tr("API name updated", "API 名称已更新"));
  }, [editNameValue, tr]);

  const toggleKeyVisibility = useCallback((id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const disabledInputCls = "oq-input oq-input-disabled";
  const activeInputCls = "oq-input";
  const usernameCharacterCount = Array.from(username).length;
  const displayNameCharacterCount = Array.from(displayName).length;
  const bioCharacterCount = Array.from(bio).length;
  const usernameLengthInvalid = usernameCharacterCount < 3 || usernameCharacterCount > 20;
  const displayNameLengthInvalid = displayNameCharacterCount > 50;
  const bioLengthInvalid = bioCharacterCount > 160;
  const usernameInvalid = !USERNAME_PATTERN.test(username.trim());
  const showUsernameError = profileValidationRequested && usernameInvalid;
  const showDisplayNameError = profileValidationRequested && displayNameLengthInvalid;
  const showBioError = profileValidationRequested && bioLengthInvalid;

  return (
    <div className="oq-account">
      <div className="oq-account-shell">
        <nav className="oq-account-nav" aria-label={tr("Account settings", "账户设置")}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`oq-account-nav-item ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                <span>{tr(tab.labelEn, tab.labelZh, accountCopy[tab.labelEn])}</span>
              </button>
            );
          })}
        </nav>

        <section className="oq-account-content">

      {/* ═══════════════ General Tab ═══════════════ */}
      {activeTab === "general" && (
        <div className="oq-account-general">
          <section className="oq-settings-panel" aria-labelledby="oq-general-settings-title">
            <header className="oq-settings-panel-header">
              <h2 id="oq-general-settings-title" className="oq-account-section-title">
                {tr("General", "常规")}
              </h2>
            </header>

            <div className="oq-settings-list">
              <div className="oq-account-setting-row oq-account-language-setting">
                <div className="oq-settings-label">{tr("Language", "语言")}</div>
                <div className="oq-settings-description">
                  {tr("Set display language for UI and notifications.", "设置界面与通知的显示语言。")}
                </div>
                <Select value={uiLang} onValueChange={(value) => setUiLang(value as UiLang)}>
                  <SelectTrigger
                    size="sm"
                    className="oq-account-language-trigger"
                    aria-label={tr("Select language", "选择语言")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    align="end"
                    sideOffset={6}
                    className="oq-account-language-content"
                  >
                    {languageOptions.map((item) => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        className="oq-account-language-item"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="oq-account-setting-row">
                <div className="oq-settings-copy">
                  <div className="oq-settings-label">{tr("Color Configuration", "颜色配置")}</div>
                  <div className="oq-settings-description">
                    {tr("Choose how rising and falling values are colored.", "选择上涨与下跌数值的颜色显示。")}
                  </div>
                </div>
                <div className="oq-account-color-options">
                  {([
                    { value: "redUpGreenDown", en: "Red up, green down", zh: "红涨绿跌" },
                    { value: "greenUpRedDown", en: "Green up, red down", zh: "绿涨红跌" },
                  ] as const).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setChartColorMode(item.value)}
                      className={`oq-account-color-option${chartColorMode === item.value ? " is-active" : ""}`}
                    >
                      <span>{tr(item.en, item.zh, accountCopy[item.en])}</span>
                      <ChartColorPreview mode={item.value} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="oq-settings-panel" aria-labelledby="oq-notification-settings-title">
            <header className="oq-settings-panel-header">
              <h2 id="oq-notification-settings-title" className="oq-account-section-title">
                {tr("Notifications", "通知")}
              </h2>
            </header>
            <div className="oq-settings-list">
              <div className="oq-account-setting-row is-switch">
                <div className="oq-settings-copy">
                  <div className="oq-settings-label">{tr("Interaction Messages", "互动消息")}</div>
                  <div className="oq-settings-description">{tr("Get notified about signal status changes, test results, and performance updates", "接收信号状态变化、回测结果与绩效更新通知")}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={alphasNotify}
                  aria-label={tr("Interaction Messages", "互动消息")}
                  className={`oq-account-notification-switch${alphasNotify ? " is-on" : ""}`}
                  onClick={() => { setAlphasNotify(!alphasNotify); toast.success(alphasNotify ? tr("Interaction messages disabled", "已关闭互动消息") : tr("Interaction messages enabled", "已开启互动消息")); }}
                >
                  <span className="oq-account-notification-thumb" />
                </button>
              </div>
              <div className="oq-account-setting-row is-switch">
                <div className="oq-settings-copy">
                  <div className="oq-settings-label">{tr("Announcements", "公告")}</div>
                  <div className="oq-settings-description">
                    {tr(
                      "Get notified about skill updates, new skills, deprecations, platform announcements, maintenance, and Official Library expansion.",
                      "接收技能更新、新技能发布、废弃公告、平台通知、维护通知与官方库扩展信息。"
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={systemNotify}
                  aria-label={tr("Announcements", "公告")}
                  className={`oq-account-notification-switch${systemNotify ? " is-on" : ""}`}
                  onClick={() => { setSystemNotify(!systemNotify); toast.success(systemNotify ? tr("Announcements disabled", "已关闭公告") : tr("Announcements enabled", "已开启公告")); }}
                >
                  <span className="oq-account-notification-thumb" />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════ Profile Tab ═══════════════ */}
      {activeTab === "profile" && SHOW_ACCOUNT_PROFILE_WORKBENCH_260720 && (
        <div className="oq-account-profile">
          {/* Profile identity and avatar */}
          <section
            className="oq-profile-card oq-profile-identity-card"
            aria-label={tr("Personal Profile", "个人资料")}
          >
            <div className="oq-profile-section oq-profile-section-flat">
              {!editingProfile && (
                <div className="oq-profile-summary">
                  <div className="oq-avatar-preview" aria-label={tr("Avatar preview", "头像预览")}>
                    {avatar ? (
                      <img src={avatar} alt="" />
                    ) : (
                      <span>{(displayName.trim() || username).charAt(0).toUpperCase() || "U"}</span>
                    )}
                  </div>
                  <div className="oq-profile-summary-copy">
                    <strong title={displayName.trim() || `@${username}`}>
                      {displayName.trim() || `@${username}`}
                    </strong>
                    <span>@{username}</span>
                  </div>
                  <button
                    className="oq-profile-edit-button oq-profile-summary-action"
                    onClick={() => {
                      setOriginalUsername(username);
                      setOriginalDisplayName(displayName);
                      setOriginalAvatar(avatar);
                      setOriginalBio(bio);
                      setProfileValidationRequested(false);
                      setEditingProfile(true);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                    {tr("Edit", "编辑")}
                  </button>
                </div>
              )}

              {editingProfile && (
                <div className="oq-profile-editor">
                  <div className="oq-avatar-editor-field">
                    <Label className="label-upper">{tr("User avatar", "用户头像")}</Label>
                    <div className="oq-avatar-editor">
                      <div className="oq-avatar-preview" aria-label={tr("Avatar preview", "头像预览")}>
                        {avatar ? (
                          <img src={avatar} alt="" />
                        ) : (
                          <span>{(displayName.trim() || username).charAt(0).toUpperCase() || "U"}</span>
                        )}
                      </div>
                      <div className="oq-avatar-editor-controls">
                        <div className="oq-avatar-actions">
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            tabIndex={-1}
                            aria-hidden="true"
                            onChange={handleAvatarChange}
                          />
                          <button
                            type="button"
                            className="oq-avatar-upload-button"
                            disabled={processingAvatar}
                            onClick={() => avatarInputRef.current?.click()}
                          >
                            <Camera />
                            {processingAvatar
                              ? tr("Processing...", "处理中...")
                              : avatar
                                ? tr("Change avatar", "更换头像")
                                : tr("Upload avatar", "上传头像")}
                          </button>
                          {avatar && (
                            <button
                              type="button"
                              className="oq-avatar-remove-button"
                              onClick={() => setAvatar("")}
                            >
                              {tr("Remove", "移除")}
                            </button>
                          )}
                        </div>
                        <p>{tr("JPEG, PNG, or WebP up to 5 MB. Cropped to a square.", "支持 JPEG、PNG、WebP，最大 5 MB，将裁剪为正方形。")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="oq-profile-identity-fields">
                    <div className="oq-field-stack">
                      <Label className="label-upper" htmlFor="oq-profile-username">
                        {tr("Username", "用户名")}
                      </Label>
                      <div className="oq-profile-counted-control">
                        <Input
                          id="oq-profile-username"
                          aria-describedby={`oq-profile-username-count${showUsernameError ? " oq-profile-username-error" : ""}`}
                          aria-invalid={showUsernameError}
                          placeholder={tr(
                            "Use lowercase letters, numbers, and underscores",
                            "可用小写字母、数字和下划线"
                          )}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={activeInputCls}
                        />
                        <span
                          id="oq-profile-username-count"
                          className={`oq-profile-character-count oq-profile-input-count ${usernameLengthInvalid ? "is-invalid" : ""}`}
                        >
                          {usernameCharacterCount} / 20
                        </span>
                      </div>
                      {showUsernameError && (
                        <p id="oq-profile-username-error" className="oq-profile-field-error" role="alert">
                          {tr(
                            "Use 3-20 lowercase letters, numbers, or underscores, starting with a letter.",
                            "用户名需为 3-20 个字符，以小写字母开头，且仅含小写字母、数字或下划线。"
                          )}
                        </p>
                      )}
                    </div>

                    <div className="oq-field-stack">
                      <Label className="label-upper" htmlFor="oq-profile-display-name">
                        {tr("Display name", "显示名称")}
                      </Label>
                      <div className="oq-profile-counted-control">
                        <Input
                          id="oq-profile-display-name"
                          aria-describedby={`oq-profile-display-name-count${showDisplayNameError ? " oq-profile-display-name-error" : ""}`}
                          aria-invalid={showDisplayNameError}
                          placeholder={tr(
                            "Shown across Quandora. Leave blank to use your @username",
                            "在 Quandora 各处展示的昵称，留空则使用你的 @用户名"
                          )}
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className={activeInputCls}
                        />
                        <span
                          id="oq-profile-display-name-count"
                          className={`oq-profile-character-count oq-profile-input-count ${displayNameLengthInvalid ? "is-invalid" : ""}`}
                        >
                          {displayNameCharacterCount} / 50
                        </span>
                      </div>
                      {showDisplayNameError && (
                        <p id="oq-profile-display-name-error" className="oq-profile-field-error" role="alert">
                          {tr(
                            "Display name must be 50 characters or fewer.",
                            "显示名称不能超过 50 个字符。"
                          )}
                        </p>
                      )}
                    </div>

                    <div className="oq-field-stack">
                      <Label className="label-upper" htmlFor="oq-profile-bio">
                        {tr("Bio", "简介")}
                      </Label>
                      <div className="oq-profile-bio-control">
                        <Textarea
                          id="oq-profile-bio"
                          aria-describedby={`oq-profile-bio-count${showBioError ? " oq-profile-bio-error" : ""}`}
                          aria-invalid={showBioError}
                          placeholder={tr("Tell us a little about yourself...", "简单介绍一下你自己......")}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={4}
                          className="oq-input oq-profile-bio-input"
                        />
                        <span
                          id="oq-profile-bio-count"
                          className={`oq-profile-character-count oq-profile-bio-count ${bioLengthInvalid ? "is-invalid" : ""}`}
                        >
                          {bioCharacterCount} / 160
                        </span>
                      </div>
                      {showBioError && (
                        <p id="oq-profile-bio-error" className="oq-profile-field-error" role="alert">
                          {tr("Bio must be 160 characters or fewer.", "简介不能超过 160 个字符。")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="oq-profile-editor-actions">
                    <button
                      type="button"
                      className="oq-profile-edit-button oq-profile-cancel-button is-cancel"
                      onClick={handleCancelProfile}
                    >
                      {tr("Cancel", "取消")}
                    </button>
                    <button
                      type="button"
                      className="oq-profile-save-button"
                      onClick={() => {
                        const nextUsername = username.trim();
                        const nextDisplayName = displayName.trim();
                        const nextBio = bio.trim();
                        setProfileValidationRequested(true);
                        if (usernameInvalid || displayNameLengthInvalid || bioLengthInvalid) {
                          return;
                        }
                        setProfileValidationRequested(false);
                        updateUser({
                          username: nextUsername,
                          displayName: nextDisplayName,
                          avatar: avatar || undefined,
                          bio: nextBio,
                        });
                        setUsername(nextUsername);
                        setDisplayName(nextDisplayName);
                        setBio(nextBio);
                        setOriginalUsername(nextUsername);
                        setOriginalDisplayName(nextDisplayName);
                        setOriginalAvatar(avatar);
                        setOriginalBio(nextBio);
                        toast.success(tr("Profile updated successfully", "资料更新成功"));
                        setEditingProfile(false);
                      }}
                    >
                      {tr("Save changes", "保存修改")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Security and Login */}
          <section className="oq-profile-card oq-security-login-card" aria-labelledby="oq-security-login-title">
            <header className="oq-settings-panel-header">
              <h2 id="oq-security-login-title" className="oq-account-section-title">
                {tr("Security & Login", "安全性与登录")}
              </h2>
            </header>

            <div className="oq-settings-list oq-security-settings-list">
              <div className="oq-security-setting-section">
                <div className="oq-account-setting-row">
                  <div className="oq-settings-copy">
                    <div className="oq-settings-label">{tr("Login Email", "登录邮箱")}</div>
                    {(!ENABLE_LOGIN_EMAIL_EDITING || !editingEmail) && (
                      <div className="oq-settings-description">{email}</div>
                    )}
                  </div>
                  {ENABLE_LOGIN_EMAIL_EDITING && (
                    !editingEmail ? (
                      <button
                        className="oq-profile-edit-button"
                        onClick={() => setEditingEmail(true)}
                      >
                        <Pencil className="w-3 h-3" />
                        {tr("Edit", "编辑")}
                      </button>
                    ) : (
                      <div className="oq-security-setting-actions">
                        <button
                          type="button"
                          className="oq-profile-edit-button is-cancel"
                          onClick={handleCancelEmail}
                        >
                          <X className="w-3 h-3" />
                          {tr("Cancel", "取消")}
                        </button>
                        <button
                          type="button"
                          className="oq-profile-edit-button is-primary"
                          onClick={handleSaveEmail}
                        >
                          {tr("Save", "保存")}
                        </button>
                      </div>
                    )
                  )}
                </div>
                {ENABLE_LOGIN_EMAIL_EDITING && editingEmail && (
                  <div className="oq-profile-section-body oq-security-setting-editor">
                    <div className="oq-form-grid">
                      <div className="oq-field-stack">
                        <Label className="label-upper" htmlFor="oq-profile-current-email">
                          {tr("Current Email", "当前邮箱")}
                        </Label>
                        <Input
                          id="oq-profile-current-email"
                          value={email}
                          disabled
                          className={disabledInputCls}
                        />
                      </div>
                      <div className="oq-field-stack">
                        <Label className="label-upper">{tr("Verification Code", "验证码")}</Label>
                        <div className="oq-inline-control">
                          <Input
                            placeholder={tr("Enter verification code", "请输入验证码")}
                            value={emailVerCode}
                            onChange={(e) => setEmailVerCode(e.target.value)}
                            className={`${activeInputCls} flex-1`}
                          />
                          <button
                            className="oq-profile-code-button"
                            onClick={() => { setEmailCodeSent(true); toast.success(tr("Verification code sent to your current email", "验证码已发送至当前邮箱")); }}
                          >
                            <Send className="w-3 h-3" />
                            {emailCodeSent ? tr("Resend Code", "重新发送") : tr("Send Code", "发送验证码")}
                          </button>
                        </div>
                      </div>
                      <div className="oq-field-stack">
                        <Label className="label-upper">{tr("New Email", "新邮箱")}</Label>
                        <Input
                          type="email"
                          placeholder={tr("Enter new email address", "请输入新邮箱地址")}
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className={activeInputCls}
                        />
                        {newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) && (
                          <p className="text-xs text-destructive">{tr("Please enter a valid email address", "请输入有效的邮箱地址")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="oq-security-setting-section">
                <div className="oq-account-setting-row">
                  <div className="oq-settings-copy">
                    <div className="oq-settings-label">{tr("Change Password", "修改密码")}</div>
                    {!editingPassword && (
                      <div className="oq-settings-description">
                        {tr("Last changed: 2026-07-20 14:30", "上次更改时间：2026-07-20 14:30")}
                      </div>
                    )}
                  </div>
                  {!editingPassword && (
                    <button
                      className="oq-profile-edit-button"
                      onClick={() => setEditingPassword(true)}
                    >
                      <Pencil className="w-3 h-3" />
                      {tr("Edit", "编辑")}
                    </button>
                  )}
                </div>
                {editingPassword ? (
                  <div className="oq-profile-section-body oq-security-setting-editor">
                    <div className="oq-form-grid oq-password-form-grid">
                      <div className="oq-field-stack">
                        <Label className="label-upper">{tr("Email", "邮箱")}</Label>
                        <Input value={email} disabled className={disabledInputCls} />
                      </div>
                      <div className="oq-field-stack">
                        <Label className="label-upper">{tr("Verification Code", "验证码")}</Label>
                        <div className="oq-inline-control">
                          <Input
                            placeholder={tr("Enter verification code", "请输入验证码")}
                            value={passwordVerCode}
                            onChange={(e) => setPasswordVerCode(e.target.value)}
                            className={`${activeInputCls} flex-1`}
                          />
                          <button
                            className="oq-profile-code-button"
                            onClick={() => { setPasswordCodeSent(true); toast.success(tr("Verification code sent to your email", "验证码已发送至邮箱")); }}
                          >
                            <Send className="w-3 h-3" />
                            {passwordCodeSent ? tr("Resend Code", "重新发送") : tr("Send Code", "发送验证码")}
                          </button>
                        </div>
                      </div>
                      <div className="oq-field-stack">
                        <Label className="label-upper">{tr("New Password", "新密码")}</Label>
                        <Input type="password" placeholder={tr("Enter new password", "请输入新密码")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={activeInputCls} />
                      </div>
                      <div className="oq-field-stack">
                        <Label className="label-upper">{tr("Confirm New Password", "确认新密码")}</Label>
                        <Input type="password" placeholder={tr("Re-enter new password", "请再次输入新密码")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={activeInputCls} />
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-xs text-destructive">{tr("Passwords do not match", "两次输入密码不一致")}</p>
                        )}
                      </div>
                    </div>
                    <div className="oq-profile-editor-actions">
                      <button
                        type="button"
                        className="oq-profile-edit-button oq-profile-cancel-button is-cancel"
                        onClick={handleCancelPassword}
                      >
                        {tr("Cancel", "取消")}
                      </button>
                      <button
                        type="button"
                        className="oq-profile-save-button oq-password-save-button"
                        onClick={() => {
                          if (!passwordVerCode.trim()) { toast.error(tr("Please enter the verification code", "请输入验证码")); return; }
                          if (!newPassword.trim()) { toast.error(tr("Please enter a new password", "请输入新密码")); return; }
                          if (newPassword.length < 8) { toast.error(tr("Password must be at least 8 characters", "密码至少为 8 位")); return; }
                          if (newPassword !== confirmPassword) { toast.error(tr("Passwords do not match", "两次输入密码不一致")); return; }
                          toast.success(tr("Password updated successfully", "密码更新成功"));
                          setPasswordVerCode(""); setPasswordCodeSent(false); setNewPassword(""); setConfirmPassword(""); setEditingPassword(false);
                        }}
                      >
                        {tr("Save", "保存")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "agent" && SHOW_ACCOUNT_AGENT_SETTINGS_WORKBENCH_260720 && (
        <AgentSettingsPanel tr={tr} />
      )}

      {/* ═══════════════ Exchange API Tab ═══════════════ */}
      {activeTab === "exchangeApi" && (
        <div className="space-y-6">
          <div className="surface-card overflow-hidden">
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">{tr("Connected Exchanges", "已连接交易所")}</span>
                  <span className="text-xs text-muted-foreground ml-1">({exchangeApiItems.length})</span>
                </div>
                <button
                  className="h-8 text-xs px-4 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce font-medium"
                  onClick={handleOpenExchangeModal}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {tr("New Exchange API", "新建交易所 API")}
                </button>
              </div>
            </div>

            <div className="px-6 pb-6 pt-3">
              {exchangeApiItems.length === 0 ? (
                <div className="text-center py-12">
                  <Link2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{tr("No exchange API connected", "尚未连接交易所 API")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {tr("Add a venue connection to enable live execution and account sync.", "添加交易所连接后即可启用实盘执行与账户同步。")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exchangeApiItems.map((item) => {
                    const venue = getExchangeVenueMeta(item.venue);
                    const keyVisible = visibleKeys.has(item.id);
                    const maskedKey = `${item.apiKey.slice(0, 8)}${"\u2022".repeat(10)}`;
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-accent/35 px-5 py-4 transition-colors duration-200 hover:bg-accent/55"
                      >
                        <div className="flex items-center justify-between mb-3 gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {editingExchangeNameId === item.id ? (
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Input
                                  value={editExchangeNameValue}
                                  onChange={(e) => setEditExchangeNameValue(e.target.value)}
                                  className="h-7 text-sm rounded-lg bg-card border-border max-w-xs"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveExchangeName(item.id);
                                    if (e.key === "Escape") setEditingExchangeNameId(null);
                                  }}
                                />
                                <button
                                  className="h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110"
                                  onClick={() => handleSaveExchangeName(item.id)}
                                >
                                  <Check className="w-3 h-3" />
                                  {tr("Save", "保存")}
                                </button>
                                <button
                                  className="h-7 text-xs px-2 rounded-full flex items-center transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditingExchangeNameId(null)}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-semibold text-foreground truncate">{item.accountName}</span>
                                <button
                                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                  onClick={() => {
                                    setEditingExchangeNameId(item.id);
                                    setEditExchangeNameValue(item.accountName);
                                  }}
                                  title={tr("Edit", "编辑")}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                          <div className="relative shrink-0" ref={exchangeMoreMenuId === item.id ? exchangeMoreMenuRef : undefined}>
                            <button
                              className="h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                              onClick={() => setExchangeMoreMenuId(exchangeMoreMenuId === item.id ? null : item.id)}
                              title={tr("More options", "更多操作")}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {exchangeMoreMenuId === item.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 py-1 rounded-xl bg-card border border-border shadow-xl z-20">
                                <button
                                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-destructive hover:bg-destructive/10 transition-colors"
                                  onClick={() => {
                                    setExchangeMoreMenuId(null);
                                    setExchangeDeleteConfirmId(item.id);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {tr("Delete Exchange API", "删除交易所 API")}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-16 shrink-0">
                            {tr("Venue", "交易所")}
                          </span>
                          <div className="flex items-center gap-1.5 rounded-lg bg-background/55 px-2.5 py-1 text-xs text-foreground">
                            <span className={item.venue === "binance" ? "text-amber-400 font-semibold" : "text-foreground font-semibold"}>
                              {venue.badge}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-16 shrink-0">
                            {tr("API Key", "API 密钥")}
                          </span>
                          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-background/55 px-2.5 py-1">
                            <code className="font-mono text-xs text-primary truncate flex-1">
                              {keyVisible ? item.apiKey : maskedKey}
                            </code>
                            <button
                              onClick={() => toggleKeyVisibility(item.id)}
                              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title={keyVisible ? tr("Hide API Key", "隐藏 API 密钥") : tr("Show API Key", "显示 API 密钥")}
                            >
                              {keyVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <CopyBtn text={item.apiKey} uiLang={uiLang} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ API Keys Tab ═══════════════ */}
      {activeTab === "api" && (
        <div className="space-y-6">
          {/* Header + Create Button */}
          <div className="surface-card overflow-hidden">
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">{tr("Agent API", "Agent API")}</span>
                  <span className="text-xs text-muted-foreground ml-1">({apiKeys.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-8 text-xs px-4 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce font-medium"
                    onClick={() => { setShowCreateModal(true); setCreateStep(1); setNewApiName(""); setCreatedApiKey(""); }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {tr("New API Key", "新建 API 密钥")}
                  </button>
                </div>
              </div>
            </div>

            {/* API Keys List */}
            <div className="px-6 pb-6 pt-3">
              {apiKeys.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{tr("No API keys yet", "暂无 API 密钥")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{tr("Create your first API key to connect your AI agent", "创建首个 API 密钥以连接你的 AI Agent")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-accent/35 px-5 py-4 transition-colors duration-200 hover:bg-accent/55"
                    >
                      {/* Row 1: Name + Actions */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {editingNameId === item.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                className="h-7 text-sm rounded-lg bg-card border-border max-w-xs"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(item.id); if (e.key === "Escape") setEditingNameId(null); }}
                              />
                              <button
                                className="h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110"
                                onClick={() => handleSaveName(item.id)}
                              >
                                <Check className="w-3 h-3" />
                                {tr("Save", "保存")}
                              </button>
                              <button
                                className="h-7 text-xs px-2 rounded-full flex items-center transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingNameId(null)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                              <button
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                onClick={() => { setEditingNameId(item.id); setEditNameValue(item.name); }}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <CopyPromptBtn uiLang={uiLang} apiKey={item.apiKey} skillVersion={SKILL_LATEST} itemSkillVersion={item.skillVersion} />
                          {/* More menu */}
                          <div className="relative" ref={moreMenuId === item.id ? moreMenuRef : undefined}>
                            <button
                              className="h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                              onClick={() => setMoreMenuId(moreMenuId === item.id ? null : item.id)}
                              title={tr("More options", "更多操作")}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {moreMenuId === item.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 py-1 rounded-xl bg-card border border-border shadow-xl z-20">
                                <button
                                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-destructive hover:bg-destructive/10 transition-colors"
                                  onClick={() => { setMoreMenuId(null); setDeleteConfirmId(item.id); }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {tr("Delete API Key", "删除 API 密钥")}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: API Key */}
                      <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-14 shrink-0">{tr("API Key", "API 密钥")}</span>
                        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-background/55 px-2.5 py-1">
                          <code className="font-mono text-xs text-primary truncate flex-1">
                            {visibleKeys.has(item.id) ? item.apiKey : item.apiKey.slice(0, 6) + "\u2022".repeat(16) + "..."}
                          </code>
                          <button onClick={() => toggleKeyVisibility(item.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            {visibleKeys.has(item.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <CopyBtn uiLang={uiLang} text={item.apiKey} />
                        </div>
                      </div>

                      {/* Row 3: Meta info + Refresh */}
                      <div className="flex items-center">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="uppercase tracking-wider font-medium">{tr("Skill", "Skill")}</span>
                            <span className="text-primary font-semibold">{item.skillVersion}</span>
                            {item.skillVersion !== SKILL_LATEST && (
                              <span className="text-amber-500 ml-0.5">
                                {tr(
                                  `(update available: ${SKILL_LATEST})`,
                                  `（可更新至：${SKILL_LATEST}）`,
                                  {
                                    ja: `（更新可能：${SKILL_LATEST}）`,
                                    ko: `(업데이트 가능: ${SKILL_LATEST})`,
                                    es: `(actualización disponible: ${SKILL_LATEST})`,
                                    fr: `(mise à jour disponible : ${SKILL_LATEST})`,
                                  }
                                )}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {tr("Updated", "更新于")} {item.updatedAt}
                            <button
                              className="p-0.5 rounded-md text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => handleRefreshSkill(item.id)}
                              title={tr("Check for skill updates", "检查 Skill 更新")}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link href="/launch-guide">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            >
              <Compass className="w-3.5 h-3.5" />
              {tr("Launch Guide", "启动指引")}
            </Button>
          </Link>

        </div>
      )}

      {/* ═══════════════ Profile Actions ═══════════════ */}
      {activeTab === "profile" && SHOW_ACCOUNT_PROFILE_WORKBENCH_260720 && (
        <div className="oq-account-profile">
          <div className="surface-card oq-logout-card">
            <div className="oq-logout-content">
              <div>
                <div className="oq-logout-title">{tr("Log Out", "退出登录")}</div>
                <div className="oq-logout-copy">{tr("After you log out, you'll return to the home page.", "退出后，你将返回首页。")}</div>
              </div>
              <Button
                className="rounded-full gap-1.5 self-start sm:self-auto bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="w-4 h-4" />
                {tr("Log Out", "退出登录")}
              </Button>
            </div>
          </div>
        </div>
      )}
        </section>
      </div>

      {/* ═══════════════ Create Exchange API Modal ═══════════════ */}
      {showCreateExchangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateExchangeModal(false)} />
          <div className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">
                  {exchangeCreateStep === 1 ? tr("Add Exchange API", "添加交易所 API") : tr("Configure API Credentials", "配置 API 凭证")}
                </h3>
                <button
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border"
                  onClick={() => setShowCreateExchangeModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className={`flex items-center gap-2 ${exchangeCreateStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    exchangeCreateStep >= 1 ? "border-primary bg-primary/10" : "border-border"
                  }`}>1</div>
                  <span className="text-xs font-medium">{tr("Select Venue", "选择交易所")}</span>
                </div>
                <div className={`flex-1 h-px ${exchangeCreateStep >= 2 ? "bg-primary" : "bg-border"}`} />
                <div className={`flex items-center gap-2 ${exchangeCreateStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    exchangeCreateStep >= 2 ? "border-primary bg-primary/10" : "border-border"
                  }`}>2</div>
                  <span className="text-xs font-medium">{tr("API Configuration", "API 配置")}</span>
                </div>
              </div>
            </div>

            {exchangeCreateStep === 1 && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-xs text-muted-foreground">
                  {tr("Choose an exchange venue to connect your trading account.", "选择一个交易所来连接你的交易账户。")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "binance" as const, label: "Binance", brand: "BINANCE" },
                    { id: "okx" as const, label: "OKX", brand: "OKX" },
                  ].map((venue) => {
                    const active = selectedExchangeVenue === venue.id;
                    return (
                      <button
                        key={venue.id}
                        type="button"
                        onClick={() => setSelectedExchangeVenue(venue.id)}
                        className={`rounded-xl border text-left overflow-hidden transition-all duration-200 ${
                          active
                            ? "border-primary/50 bg-primary/10"
                            : "border-border bg-accent/40 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-stretch">
                          <div className="w-36 bg-black flex items-center justify-center px-3 py-5">
                            <span
                              className={`font-semibold tracking-wide text-sm ${
                                venue.id === "binance" ? "text-amber-400" : "text-white"
                              }`}
                            >
                              {venue.brand}
                            </span>
                          </div>
                          <div className="flex-1 px-4 py-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{venue.label}</span>
                            <span
                              className={`w-4 h-4 rounded-full border ${
                                active ? "border-primary bg-primary/80" : "border-border"
                              }`}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                    onClick={() => setExchangeCreateStep(2)}
                  >
                    {tr("Continue", "继续")}
                  </button>
                </div>
              </div>
            )}

            {exchangeCreateStep === 2 && (
              <div className="px-6 pb-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tr("Account Name", "账户名称")} *</Label>
                  <Input
                    value={exchangeAccountName}
                    onChange={(e) => setExchangeAccountName(e.target.value)}
                    placeholder={tr("e.g., Primary Futures Account", "例如：主力合约账户")}
                    className="rounded-lg bg-accent border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tr("API Key", "API 密钥")} *</Label>
                  <Input
                    value={exchangeApiKey}
                    onChange={(e) => setExchangeApiKey(e.target.value)}
                    placeholder={tr("Enter your API key", "输入你的 API 密钥")}
                    className="rounded-lg bg-accent border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tr("API Secret", "API Secret")} *</Label>
                  <Input
                    value={exchangeApiSecret}
                    onChange={(e) => setExchangeApiSecret(e.target.value)}
                    placeholder={tr("Enter your API secret", "输入你的 API Secret")}
                    className="rounded-lg bg-accent border-border"
                  />
                </div>

                <div className="rounded-xl border border-border bg-accent/30 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{tr("Security Best Practices", "安全最佳实践")}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {tr("API credentials are encrypted at rest. Do not enable withdrawal permissions. Trade and read-only scopes are sufficient for strategy execution and monitoring.", "API 凭证会以加密形式存储。请勿开启提币权限。仅开启交易与只读权限即可满足策略执行与监控需求。")}
                      </p>
                      <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                        <li>{tr("Disable withdrawal permissions.", "关闭提币权限。")}</li>
                        <li>{tr("Restrict API access by IP whitelist.", "通过 IP 白名单限制 API 访问。")}</li>
                        <li>{tr("Rotate API credentials periodically.", "定期轮换 API 凭证。")}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                    onClick={() => setExchangeCreateStep(1)}
                  >
                    {tr("Back", "返回")}
                  </button>
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                    onClick={handleCreateExchangeApi}
                  >
                    {tr("Add Exchange API", "添加交易所 API")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ Create API Modal ═══════════════ */}
      {/* ═══════════════ Delete Confirm Modal ═══════════════ */}
      {exchangeDeleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExchangeDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{tr("Delete Exchange API", "删除交易所 API")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tr("Are you sure you want to delete", "确认删除")}{" "}
                <span className="font-medium text-foreground">
                  "{exchangeApiItems.find((item) => item.id === exchangeDeleteConfirmId)?.accountName}"
                </span>
                ?
                {" "}
                {tr(
                  "This action cannot be undone and this exchange account will no longer be available for trading deployment.",
                  "该操作不可撤销，此交易所账户将无法用于策略部署。"
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                onClick={() => setExchangeDeleteConfirmId(null)}
              >
                {tr("Cancel", "取消")}
              </button>
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => {
                  handleDeleteExchangeApi(exchangeDeleteConfirmId);
                  setExchangeDeleteConfirmId(null);
                }}
              >
                {tr("Delete", "删除")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{tr("Delete API Key", "删除 API 密钥")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tr("Are you sure you want to delete", "确认删除")}{" "}
                <span className="font-medium text-foreground">"{apiKeys.find(k => k.id === deleteConfirmId)?.name}"</span>?
                {" "}
                {tr("This action cannot be undone and any agents using this key will lose access.", "该操作不可撤销，使用该密钥的 Agent 将失去访问权限。")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                onClick={() => setDeleteConfirmId(null)}
              >
                {tr("Cancel", "取消")}
              </button>
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => { handleDeleteApi(deleteConfirmId); setDeleteConfirmId(null); }}
              >
                {tr("Delete", "删除")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Logout Confirm Modal ═══════════════ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{tr("Confirm Log Out", "确认退出登录")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tr("Are you sure you want to log out of your current account?", "确认退出当前账户吗？")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {tr("Cancel", "取消")}
              </button>
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                  navigate("/landing");
                }}
              >
                {tr("Log Out", "退出登录")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Create API Modal ═══════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          {/* Modal */}
          <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header: Title + Close */}
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">
                  {createStep === 1 ? tr("Create New API Key", "创建新的 API 密钥") : tr("Your API Key is Ready", "API 密钥已准备就绪")}
                </h3>
                <button
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border"
                  onClick={() => { if (createStep === 2) handleFinishCreate(); else setShowCreateModal(false); }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Steps indicator */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex items-center gap-2 ${createStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    createStep >= 1 ? "border-primary bg-primary/10" : "border-border"
                  }`}>1</div>
                  <span className="text-xs font-medium">{tr("Generate API", "生成 API")}</span>
                </div>
                <div className={`flex-1 h-px ${createStep >= 2 ? "bg-primary" : "bg-border"}`} />
                <div className={`flex items-center gap-2 ${createStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    createStep >= 2 ? "border-primary bg-primary/10" : "border-border"
                  }`}>2</div>
                  <span className="text-xs font-medium">{tr("Paste to Agent", "粘贴到 Agent")}</span>
                </div>
              </div>
            </div>

            {/* Step 1: Name & Create */}
            {createStep === 1 && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-xs text-muted-foreground">{tr("Give your API key a name to identify it later.", "为 API 密钥命名，便于后续识别。")}</p>
                <div className="space-y-2">
                  <Label className="label-upper">{tr("API Name", "API 名称")}</Label>
                  <Input
                    placeholder={tr("e.g., My Trading Bot, Research Agent...", "例如：我的交易机器人、研究 Agent...")}
                    value={newApiName}
                    onChange={(e) => setNewApiName(e.target.value)}
                    className="rounded-lg bg-accent border-border"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateApi(); }}
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                    onClick={handleCreateApi}
                  >
                    {tr("Create API Key", "创建 API 密钥")}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Show Prompt */}
            {createStep === 2 && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-xs text-muted-foreground">{tr("Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek) to start using Quandora Trading.", "复制下方提示词并粘贴到你的 AI Agent（ChatGPT / Claude / DeepSeek）即可开始使用 Quandora Trading。")}</p>

                {/* Prompt preview */}
                <div>
                  <div className="p-4 rounded-xl bg-accent border border-border max-h-64 overflow-y-auto">
                    <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                      {buildPrompt(createdApiKey, SKILL_LATEST, uiLang)}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    className="h-9 px-6 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce flex items-center gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(buildPrompt(createdApiKey, SKILL_LATEST, uiLang));
                      toast.success(tr("Prompt copied to clipboard", "提示词已复制到剪贴板"));
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {tr("Copy Prompt", "复制提示词")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
