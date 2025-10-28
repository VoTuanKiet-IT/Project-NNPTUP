const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const ViewLogs = require('../models/ViewLogs');
const Saved = require('../models/Saved');
const Comment = require('../models/Comment');
const nodemailer = require('nodemailer');

router.get('', async (req, res) => {
  try {
    const locals = {
      title: "Hutech Blogs",
      description: "Chia sẻ và cùng học NodeJs",
    }
    console.log(`Info session: userName = ${req.session.userName}, userId = ${req.session.userId}`);
    console.log(`Rendering home page with userId: ${res.locals.userId}`);
    console.log(`Rendering home page with userName: ${res.locals.userName}`);
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

    const listviewlog = await ViewLogs.find({userId: req.session.userId})
      .sort({ createdAt: -1 })
      .populate('postId') // Tham chiếu đến trường postId
      .limit(perPage)
      .exec();

    res.render('index', {
      locals,
      data,
      listviewlog,
      current: page,
      totalPages, // Truyền totalPages vào template
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: '/'
    });
  } catch (error) {
    console.log(error);
  }
});

router.get('/dashboard', async (req, res) => {
    try {
        const locals = {
            title: "Hutech Blogs",
            description: "Chia sẻ và cùng học NodeJs",
        }
        let perPage = 5; 
        
        console.log(`Rendering home page with userId: ${res.locals.userId}`);
        console.log(`Rendering home page with userName: ${res.locals.userName}`);
        
        const fillerSaved = await Saved.find({userId: res.locals.userId})
            .sort({ createdAt: -1 })
            .limit(perPage) 
            .populate('postId') 
            .exec();

        console.log(`Found ${fillerSaved.length} saved posts for userId: ${req.session.userId}`);
        let page = req.query.page || 1;
   
        const count = await Post.countDocuments({});
        const totalPages = Math.ceil(count / perPage); // Tính số trang dựa trên số lượng bài viết
        const nextPage = parseInt(page) + 1;
        const hasNextPage = nextPage <= totalPages;

        
        res.render('dashboard', {
            locals,
            fillerSaved,
            current: page,
            totalPages, // Truyền totalPages vào template
            nextPage: hasNextPage ? nextPage : null,
            currentRoute: '/dashboard'
        });
    } catch (error) {
        console.error('Lỗi khi vào user:', error);
        res.status(500).json({ message: 'Lỗi server nội bộ.' });
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
        const comments = await Comment.find({ postId: data._id })
            .sort({ createdAt: -1 })
            .populate('userId') 
            .exec();
        
        if (data) {
            const fillerviewlos = await ViewLogs.find({ postId: data._id, userId: req.session.userId });
            if (fillerviewlos.length === 0 && req.session.userId) {
                const viewLog = new ViewLogs({
                    postId: data._id,
                    userId: req.session.userId,
                    createdAt: Date.now()
                });
                console.log('userId in session:', req.session.userId);
                console.log('Logging view for post:', viewLog.postId);
                await viewLog.save();
            } else if (fillerviewlos.length > 0 && req.session.userId) {
                fillerviewlos[0].createdAt = Date.now();
                await fillerviewlos[0].save();
            }
        }
        return res.render('post', {
            locals,
            data,
            comments,
            currentRoute: `/post/${slug}`
        });
        
    } catch (error) {
        console.error('Lỗi khi tải trang bài viết:', error);
        return res.status(500).send('Lỗi server nội bộ. Vui lòng kiểm tra console log.'); 
    }
});

router.post('/post/save', async (req, res) => {
    const userId = req.session.userId;
    const postId = req.body.postId;

    if (!userId) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập để lưu bài viết.' });
    }
    
    if (!postId) {
        // Kiểm tra postId có được gửi lên không
        return res.status(400).json({ message: 'Thiếu Post ID.' });
    }

    try {
        // 2. Kiểm tra bài viết đã được lưu chưa (để tránh trùng lặp)
        const existingSave = await Saved.findOne({ 
            userId: userId, 
            postId: postId 
        });

        if (existingSave) {
            // Nếu đã tồn tại, xóa (Toggle chức năng lưu)
            await Saved.deleteOne({ _id: existingSave._id });
            return res.status(200).json({ 
                status: 'unsaved',
                message: 'Bài viết đã được gỡ khỏi danh sách lưu.' 
            });
        }
        const newSave = new Saved({
            userId: userId,
            postId: postId,
            createdAt: Date.now()
        });
        await newSave.save();
        
        res.status(201).json({ 
            status: 'saved',
            message: 'Bài viết đã được lưu thành công!' 
        });
    } catch (error) {
        console.error('Lỗi khi lưu bài viết:', error);
        res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
});

router.post('/comment/add', async (req, res) => {
    const userId = req.session.userId;
    const { postId, content } = req.body; 
    if (!userId) {
        return res.status(401).send('Vui lòng đăng nhập để bình luận.');
    }
        if (!postId || !content) {
        return res.status(400).send('Thiếu Post ID hoặc nội dung bình luận.');
    }

    try {
        const newComment = new Comment({
            postId: postId,
            userId: userId,
            content: content,
            createdAt: Date.now()
        });
        console.log(`Saving comment for postId: ${newComment.postId} by userId: ${newComment.userId} with content: ${newComment.content}`);
        await newComment.save();
        
        res.redirect(`/post/${postId}`);
                                        
    } catch (error) {
        console.error('Lỗi khi lưu bình luận:', error);
        res.status(500).send('Lỗi server nội bộ khi lưu bình luận. Vui lòng kiểm tra log.');
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