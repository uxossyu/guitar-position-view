# Guitar Position View

MIDIファイルを読み込み、ギターの指板上に最適な運指（ポジション）を可視化するWebアプリケーションです。
練習をサポートするために、五線譜およびTAB譜の高品質なレンダリング（alphaTab）と、指板マーカーの自動同期機能を備えています。

## 🚀 起動方法

以下のコマンドを順に実行してください：

```bash
# プロジェクトディレクトリに移動
cd guitar-position-view

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

起動後、ブラウザで `http://localhost:5173/guitar-position-view/` にアクセスしてください。

## ✨ 主な機能

- **MIDI解析**: トラック選択、BPM取得、キー検出。
- **運指最適化ロジック**: 動的計画法（DP）を用いて、弾きやすさを考慮したポジションを計算。5つのパターン（最小移動、ロー/ミッド/ハイボックス、単弦）を切り替え可能。
- **インタラクティブ指板**:
  - 現在・次に来る音のハイライト。
  - 度数/音名の表示切り替え。
  - 使用する弦の制限設定。
- **高品質な譜面表示**: `alphaTab` によるTAB・五線譜のレンダリングと再生同期。

## 🛠 現在の状況と引き継ぎ事項

### 既知の課題
- **AlphaTabの表示不具合**: 一部の環境で、MIDI読み込み後に楽譜エリアが空白になる現象が報告されています。`App.tsx` にデバッグ用の状態表示（`App State: Loaded`）を追加してあります。
- **ブラウザ検証ツールの制限**: 開発中のAIエージェント側のインフラ問題により、ブラウザ上の動作確認が現在不可能な状態です。

### 使用技術
- React / TypeScript / Vite
- Tailwind CSS
- [@coderline/alphatab](https://github.com/coderline/alphaTab) (譜面表示)
- [@tonejs/midi](https://github.com/Tonejs/Midi) (MIDI解析)
- [tonal](https://github.com/tonaljs/tonal) (音楽理論計算)

## 📁 主要ファイル構造
- `src/App.tsx`: メインロジック、状態管理。
- `src/components/AlphaTabDisplay.tsx`: alphaTabのラップコンポーネント。
- `src/lib/guitarMapping.ts`: 運指最適化アルゴリズム。
- `src/lib/midiParser.ts`: MIDIデータの抽出と加工。
