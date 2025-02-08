# Realtime Chat Application

## 📋 概要
このプロジェクトは、Node.jsとSocket.ioを使用した**リアルタイムチャットアプリケーション**です。ユーザーはルームを作成し、パスワード保護付きのチャットルームに参加することができます。また、ファイルのアップロード機能も備えています。

---

## 🚀 主な機能
- **ルーム作成・参加:** パスワード保護付きルームの作成と参加が可能。
- **リアルタイムメッセージング:** Socket.ioを使用した高速なリアルタイム通信。
- **ファイルアップロード:** 各チャットルームごとに最大5GBのファイルアップロードに対応。
- **セキュリティ:** bcryptによるパスワードハッシュ化、セッション管理。

---

## 🛠️ 使用技術
- **バックエンド:** Node.js, Express.js
- **リアルタイム通信:** Socket.io
- **データベース:** MySQL
- **テンプレートエンジン:** EJS
- **ファイルアップロード:** Multer

---

## ⚙️ インストール方法
1. **リポジトリのクローン:**
   ```bash
   git clone https://github.com/K1zunaaa/realtime-chat.git
   cd realtime-chat
   ```

2. **依存関係のインストール:**
   ```bash
   npm install
   ```

3. **環境変数の設定:**
   `.env.sample` ファイルをコピーして `.env` と名前を変更します。
   ```bash
   cp .env.sample .env
   ```
   `.env` ファイル内の各項目に必要な情報（DB接続情報、ポート設定など）を記入してください。

4. **データベースの設定:**
   - `dbconfig.js` ファイルにMySQLの接続情報を設定します。

5. **アプリケーションの起動:**
   ```bash
   node index.js
   ```

   アプリは `http://localhost` でアクセス可能です。

---

## 💡 使い方
1. **ホームページにアクセス:** `http://localhost`
2. **ルーム作成:** ルーム名、オーナー名、任意でパスワードを入力して作成します。
3. **ルーム参加:** ルームIDと必要に応じてパスワードを入力して参加します。
4. **ファイルアップロード:** ルーム内でファイルをアップロード可能です。

---

## 🔒 セキュリティ
- **パスワード:** bcryptでハッシュ化。
- **セッション管理:** express-sessionで実装。
- **IPアドレスの取得:** ルーム作成時にIPアドレスを保存。

---

## 📊 データベース構成

### **`rooms` テーブル**

| フィールド名      | 型             | NULL許可 | キー   | デフォルト値         | 補足                    |
|:------------------|:---------------|:---------|:-------|:----------------------|:------------------------|
| `id`              | `int`          | NO       | PRI    | NULL                 | `auto_increment`        |
| `roomId`          | `varchar(36)`  | NO       |        | NULL                 | UUIDなどを想定          |
| `roomName`        | `varchar(255)` | NO       |        | NULL                 | ルーム名                |
| `ownerName`       | `varchar(255)` | NO       |        | NULL                 | ルーム作成者の名前      |
| `password`        | `varchar(255)` | YES      |        | NULL                 | パスワード (ハッシュ化) |
| `createdAt`       | `timestamp`    | YES      |        | CURRENT_TIMESTAMP    | 自動生成 (作成日時)     |
| `createdFromIp`   | `varchar(255)` | NO       |        | NULL                 | ルーム作成者のIPアドレス|

---

## 📦 フォルダ構成
```
realtime-chat/
├── index.js
├── dbconfig.js
├── .env.sample
├── .env
├── public/
├── uploads/
├── views/
└── package.json
```
---

## 📄 ライセンス
このプロジェクトは [MIT License](LICENSE) のもとで公開されています。

