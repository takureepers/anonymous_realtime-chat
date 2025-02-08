// .env ファイルを読み込む
require('dotenv').config();

// データベース接続情報を環境変数から取得
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

module.exports = dbConfig;