const express = require('express');
const app = express();
const path = require('path');
const fs  = require('fs');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const crypto = require('crypto');
const session = require('express-session');
const bcrypt = require('bcrypt');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const iconv = require('iconv-lite')
const dbConfig = require('./dbconfig'); // DBconfig

// HTTPサーバーとWebSocketサーバーを作成
const server = http.createServer(app);
const io = new Server(server);

// ミドルウェア設定
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// EJSテンプレートエンジンの設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ポート設定
const PORT = 80;

// セッション情報設定
app.use(session({
    secret: 'anonymous',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // HTTPSを使う場合はtrueに設定
}));

// ランダム文字列生成関数
function generateRandomString(length = 8) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// MySQLの接続設定
const db = mysql.createConnection(dbConfig);

// DB接続確認
try {
    db.connect();
    console.log('MySQLに接続しました');
} catch (err) {
    console.error('MySQL接続エラー:', err);
    process.exit(1); // 接続エラーの場合、プロセスを終了
}

// multer設定
const upload = multer({
    storage: multer.diskStorage({
        destination: path.join(__dirname, 'uploads'),
        filename: (req, file, cb) => {
            const safeFilename = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
            cb(null, safeFilename);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // ファイルサイズ制限 (5GB)
});

// ルートページ
app.get('/', (req, res) => res.render('index'));

// ルーム作成ページ
app.get('/rooms/create', (req, res) => res.render('create'));

// ルーム作成処理
app.post('/rooms/create', async (req, res) => {
    const { roomName, ownerName, password } = req.body;
    const createdFromIp = req.ip === '::1' ? '127.0.0.1' : req.ip;
    const roomId = generateRandomString();

    try {
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        const query = 'INSERT INTO rooms (roomId, roomName, ownerName, password, createdFromIp) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [roomId, roomName, ownerName, hashedPassword, createdFromIp], (err) => {
            if (err) {
                console.error('ルーム作成エラー:', err);
                return res.status(500).send('ルーム作成に失敗しました');
            }

            // 新しいルーム用のフォルダを作成
            const uploadDir = path.join(__dirname, 'uploads', roomId);
            fs.mkdir(uploadDir, { recursive: true }, (fsErr) => {
                if (fsErr) {
                    console.error('フォルダ作成エラー:', fsErr);
                    return res.status(500).send('ルーム作成に失敗しました');
                }

                req.session.UserInfo = { roomId, roomName, ownerName, createdFromIp, userName: ownerName };
                res.redirect(`/room/${roomId}`);
            });
        });
    } catch (err) {
        console.error('パスワードハッシュ化エラー:', err);
        res.status(500).send('ルーム作成に失敗しました');
    }
});

// ルームページの表示
app.get('/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const userInfo = req.session.UserInfo;

    if (!userInfo || userInfo.roomId !== roomId) {
        return res.redirect('/?error=unauthorized_access');
    }

    const query = 'SELECT * FROM rooms WHERE roomId = ?';
    db.query(query, [roomId], (err, rows) => {
        if (err) {
            console.error('ルーム情報取得エラー:', err);
            return res.status(500).send('ルーム情報の取得に失敗しました');
        }

        if (rows.length === 0) {
            return res.redirect('/?error=room_not_found');
        }

        res.render('room', { room: rows[0], userName: userInfo.userName });
    });
});

// ルーム参加フォームの表示
app.get('/rooms/join', (req, res) => res.render('join', { error: null }));

// ルーム参加処理
app.post('/rooms/join', (req, res) => {
    const { roomId, password, userName } = req.body;

    const query = 'SELECT * FROM rooms WHERE roomId = ?';
    db.query(query, [roomId], async (err, rows) => {
        if (err) {
            console.error('ルーム照会エラー:', err);
            return res.status(500).send('内部サーバーエラー');
        }

        if (rows.length === 0) {
            return res.render('join', { error: 'ルームIDまたはパスワードが間違っています。（ルームID）' });
        }

        const room = rows[0];

        try {
            if (room.password && !(await bcrypt.compare(password, room.password))) {
                return res.render('join', { error: 'ルームIDまたはパスワードが間違っています。（パスワード）' });
            }

            req.session.UserInfo = {
                roomId: room.roomId,
                roomName: room.roomName,
                ownerName: room.ownerName,
                userName,
                createdFromIp: room.createdFromIp,
            };

            res.redirect(`/room/${roomId}`);
        } catch (err) {
            console.error('パスワード照合エラー:', err);
            res.status(500).send('内部サーバーエラー');
        }
    });
});

// ファイルアップロード
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send("ファイルがアップロードされていません。");
    }

    const roomId = req.body.roomId; // ルームIDをリクエストから取得

    // ルームIDが指定されていない場合はエラーメッセージを返す
    if (!roomId) {
        return res.status(400).send("ルームIDが指定されていません。");
    }

    // ルームIDに対応するディレクトリを作成（存在しない場合）
    const uploadDir = path.join(__dirname, 'uploads', roomId);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // ファイル名をデコード（日本語対応）
    const originalName = iconv.decode(Buffer.from(req.file.originalname, 'binary'), 'utf8');

    // 保存先ファイルパスを作成
    const filePath = path.join(uploadDir, originalName);

    // ファイルの保存処理
    fs.rename(req.file.path, filePath, (err) => {
        if (err) {
            console.error('ファイルの保存エラー:', err);
            return res.status(500).send('ファイルの保存に失敗しました。');
        }

        // アップロードされたファイルの情報をレスポンスとして返す
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            fileName: originalName,  // デコードしたオリジナルのファイル名
            filePath: `/uploads/${roomId}/${originalName}`, // 保存先のパス
        });
    });
});

// WebSocket接続の処理
io.on('connection', (socket) => {
    console.log('ユーザーが接続しました');

    // チャットルームに参加
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`ユーザーがルーム ${roomId} に参加しました`);
    });

    // メッセージ送信処理
    socket.on('chatMessage', (data) => {
        const { roomId, message, userName } = data;
        console.log(`ルーム ${roomId} からのメッセージ: ${message} (${userName})`);
        io.to(roomId).emit('message', { userName, message });
    });

    // 入力中の状態通知
    socket.on('typing', (data) => {
        const { roomId, userName, typing } = data;
        socket.to(roomId).emit('typing', { userName, typing });  // 他のユーザーに「入力中」を通知
    });

    // 切断時の処理
    socket.on('disconnect', () => {
        console.log('ユーザーが切断しました');
    });
});

// サーバーを起動
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));