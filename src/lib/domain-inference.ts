/**
 * ナレッジの titleKey と本文からドメインをキーワードベースで推定
 */
export function inferDomain(titleKey: string, content: string): string {
  const text = (titleKey + " " + content).replace(/\s+/g, " ");
  if (/FMEA|故障モード|機能安全|信頼性|IATF|特殊特性/.test(text))
    return "機能安全/信頼性";
  if (
    /ソフト|マイコン|コンパイラ|volatile|変数|割り込み|USDM|メモリ|スタック|テイラリング/.test(
      text
    )
  )
    return "組み込みソフト";
  if (
    /AD変換|電力|電圧|パルス|充電|サンプルホールド|コンバータ/.test(text)
  )
    return "電力変換";
  if (/通信|CAN|シリアル|NW|ネットワーク|サイバーセキュリティ/.test(text))
    return "通信/車載NW回路";
  return "";
}

/**
 * ナレッジの titleKey から業務フローをキーワードベースで推定
 */
export function inferFlow(titleKey: string): string {
  if (/詳細設計|図面化/.test(titleKey)) return "詳細設計・図面化";
  if (/試作|評価/.test(titleKey)) return "初回試作・評価";
  if (/テスト/.test(titleKey)) return "ソフトウェアテスト評価";
  return "共通";
}
