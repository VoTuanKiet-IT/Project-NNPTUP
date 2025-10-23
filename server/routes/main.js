const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const nodemailer = require('nodemailer');

router.get('', async (req, res) => {
  try {
    const locals = {
      title: "Hutech Blogs",
      description: "Chia sẻ và cùng học NodeJs",
      userName: req.session.userName || null
    }
    // console.log('User Name in session:', req.session.userName);
    let perPage = 5; // Số bài viết trên mỗi trang
    let page = req.query.page || 1;
    const data = await Post.aggregate([{ $sort: { createdAt: -1 } }])
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();
    const count = await Post.countDocuments({});
    const totalPages = Math.ceil(count / perPage); // Tính số trang dựa trên số lượng bài viết
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= totalPages;
    res.render('index', {
      locals,
      data,
      current: page,
      totalPages, // Truyền totalPages vào template
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: '/'
    });
  } catch (error) {
    console.log(error);
  }
});


router.get('/post/:id', async (req, res) => {
  try {
    let slug = req.params.id;
    const data = await Post.findById({ _id: slug });
    const locals = {
      title: data.title,
      description: "Chia sẻ và cùng học NodeJs",
    }
    res.render('post', {
      locals,
      data,
      currentRoute: `/post/${slug}`
    });
  } catch (error) {
    console.log(error);
  }
});

router.post('/search', async (req, res) => {
  try {
    const locals = {
      title: "Tìm kiếm",
      description: "Chia sẻ và cùng học NodeJs"
    }
    let searchTerm = req.body.searchTerm;
    // Sử dụng biểu thức chính quy để loại bỏ các ký tự không phải là chữ cái, số hoặc khoảng trắng
    const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/g, "");
    const data = await Post.find({
      $or: [
        { title: { $regex: new RegExp(searchNoSpecialChar, 'i') } },
        { body: { $regex: new RegExp(searchNoSpecialChar, 'i') } }
      ]
    });
    res.render("search", {
      data,
      locals,
      currentRoute: '/'
    });
  } catch (error) {
    console.log(error);
  }
});

router.get('/about', (req, res) => {
  res.render('about', {
    currentRoute: '/about'
  });
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Sử dụng TLS, không sử dụng SSL
  auth: {
    user: 'luongtuananh.thptct@gmail.com', // Địa chỉ email của bạn
    pass: 'qylzqgwhodfsreio' // Mật khẩu email của bạn
  }
});

// Route handler để hiển thị trang "contact" với form nhập
router.get('/contact', (req, res) => {
  res.render('contact', {
    successMessage: '', // Khởi tạo successMessage
    errorMessage: '' // Khởi tạo errorMessage
  });
});

// Route handler để xử lý yêu cầu POST từ form liên hệ
router.post('/contact/send', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    // Gửi email
    await transporter.sendMail({
      from: 'Tên Người Gửi:<lucalta.lqm@gmail.com>',
      to: 'luongtuananh.thptct@gmail.com',
      subject: 'Tin nhắn từ trang liên hệ',
      html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email Template</title>
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      background-color: #f0f0f0;
                      padding: 20px;
                  }

                  .container {
                      max-width: 600px;
                      margin: 0 auto;
                      background-color: #ffffff;
                      padding: 20px;
                      border-radius: 10px;
                      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                  }

                  h1 {
                      color: #333333;
                      text-align: center;
                  }

                  p {
                      color: #666666;
                      font-size: 16px;
                      margin-bottom: 20px;
                  }

                  .button {
                      display: inline-block;
                      background-color: #4CAF50;
                      color: #ffffff;
                      text-decoration: none;
                      padding: 10px 20px;
                      border-radius: 5px;
                  }

                  .button:hover {
                      background-color: #45a049;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <h1>Xin chào quản trị viên!</h1>
                  <p>Tin nhắn được gửi từ: ${name}</p>
                  <p>Địa chỉ gmail: ${email}</p>
                  <p>Nội dung tin: ${message}</p>
                  <a href="http://localhost:3000/" class="button">Thăm Website</a>
              </div>
          </body>
          </html>
      `
    });
    // Nếu gửi email thành công, trả về thông báo thành công
    res.render('contact', {
      successMessage: 'Email đã được gửi thành công!', // Truyền successMessage vào template
      errorMessage: '' // Truyền errorMessage vào template
    });
  } catch (error) {
    // Nếu gửi email thất bại, trả về thông báo lỗi
    console.error('Gửi email thất bại:', error);
    res.render('contact', {
      successMessage: '', // Truyền successMessage vào template
      errorMessage: 'Đã có lỗi xảy ra. Vui lòng thử lại!' // Truyền errorMessage vào template
    });
  }
});

module.exports = router;

// function insertPostData () {
//   Post.insertMany([
//     {
//       title: "Xây dựng API với Node.js",
//       body: "Học cách sử dụng Node.js để xây dựng các API RESTful bằng các framework như Express.js"
//     },
//   ])
// }
// insertPostData();