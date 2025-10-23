// Khai báo thư viện ở đầu
require('dotenv').config();
const express = require('express');
const expressLayout = require('express-ejs-layouts');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./server/config/db'); // db.js
const { isActiveRoute } = require('./server/helpers/routeHelpers');
const flash = require('express-flash');

const app = express();
const PORT = process.env.PORT || 3000;

// --- KHỞI TẠO SERVER BẰNG HÀM ASYNC ---
const startServer = async () => {
    // 1. CHỜ KẾT NỐI DATABASE HOÀN TẤT
    await connectDB(); 

    // 2. KHỞI TẠO CÁC MIDDLEWARE

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(cookieParser());
    app.use(methodOverride('_method'));

    // 3. THIẾT LẬP SESSION VÀ MONGOSTORE (SAU KHI KẾT NỐI DB)
    app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI, // Kết nối sẽ ổn định hơn
        }),
    }));

    app.use(express.static('public'));
    app.use(expressLayout);
    app.set('layout', './layouts/main');
    app.set('view engine', 'ejs');

    app.locals.isActiveRoute = isActiveRoute; 

    
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    // 4. THIẾT LẬP ROUTES
    app.use('/admin', require('./server/routes/admin'));
    app.use('/', require('./server/routes/main'));
    app.use('/', require('./server/routes/admin'));

    app.use(flash());

    // 5. LẮNG NGHE CỔNG (CHỈ KHI DB ĐÃ SẴN SÀNG)
    app.listen(PORT, ()=> {
        console.log(`App listening on port ${PORT}`);
        console.log('Server is fully ready!');
    });
};

// Gọi hàm khởi tạo
startServer();

