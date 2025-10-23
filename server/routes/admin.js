const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { symlink } = require('fs');
const adminLayout = '../views/layouts/admin';
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key'; 


// Middleware kiểm tra xem người dùng có đăng nhập và có vai trò là admin hay không
// TRONG FILE CHỨA authMiddleware
const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        // Không có token: không được phép truy cập
        return res.status(401).render('error', { message: 'Không được phép truy cập. Vui lòng đăng nhập.' });
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.userId = decoded.userId;

        // **2. KIỂM TRA QUYỀN HẠN (ROLE/AUTHORIZATION)**

        if (decoded.role !== 'admin') {
            return res.status(403).render('error', { message: 'Cấm truy cập: Bạn không có quyền Admin.' });
        }
        next(); 
        
    } catch (error) {
        console.error('LỖI XÁC THỰC TOKEN:', error.message);
        res.clearCookie('token');
        return res.status(401).render('error', { message: 'Phiên đăng nhập đã hết hạn.' });
    }
}

//Trang chủ admin
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const locals = {
      title: 'Bảng điều khiển',
      description: 'Chia sẻ và học tập cùng Node.js'
    }
    const data = await Post.find();
    res.render('admin/dashboard', {
      locals,
      data,
      layout: adminLayout
    });
  }
  catch (error) {
    res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
  }
});



// Trang đăng ký
router.get('/register', async (req, res) => {
  try {
    const locals = {
      title: "Đăng ký",
      description: "Đăng ký để tiếp tục"
    }
    res.render('register', { locals });
  } catch (error) {
    res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
  }
});

// Đăng ký người dùng mới
router.post('/register', async (req, res) => {
  try {
    const { name, username, password , phone, email} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // Mã hóa mật khẩu
    try {
      await User.create({ name, username, password: hashedPassword, phone, email });
      res.status(201).render('success', { message: 'Đăng ký thành công' });
    } catch (error) {
      if (error.code === 11000) {
        res.status(409).render('error', { message: 'Tên người dùng đã được sử dụng' });
      }
      res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
    }
  } catch (error) {
    res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
  }
});


// Trang đăng nhập
router.get('/login', async (req, res) => {
  try {
    const locals = {
      title: "Đăng nhập",
      description: "Đăng nhập để tiếp tục"
    }
    res.render('login', { locals });
  } catch (error) {
    res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
  }
});

router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      console.log('--- Yêu cầu Đăng nhập ---');
      console.log(`1. Tên người dùng nhập: ${username}`);
      console.log(`2. Mật khẩu nhập: ${password}`);
      
      if (!user) {
          console.log('3. LỖI: Không tìm thấy người dùng.');
          return res.status(401).render('error', { message: 'Thông tin đăng nhập không hợp lệ' });
      }
      console.log(`3. User tìm thấy: ${user.username}`);
      console.log(`4. Mật khẩu băm trong DB: ${user.password}`); 
      const isPasswordValid = await bcrypt.compare(password, user.password);
      // ...
      console.log('5. THÀNH CÔNG:');

      const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret); 

      console.log(`6. Tạo token JWT với role: ${user.role}`); 
      res.cookie('token', token, { httpOnly: true });
      
      if (!isPasswordValid) {
          console.log('5. LỖI: Mật khẩu không hợp lệ.');
          return res.status(401).render('error', { message: 'Thông tin đăng nhập không hợp lệ' });
          
      } else {
          console.log('5. THÀNH CÔNG: Mật khẩu hợp lệ.');
          req.session.userName = user.name;
          if (user.role === 'admin') {
              res.redirect('/admin');
          } else {
              res.redirect('/');
          }
      }
    } catch (error) {
        // LỖI NỘI BỘ THỰC SỰ SẼ ĐƯỢC LOG Ở ĐÂY
        console.error('LỖI MÁY CHỦ NỘI BỘ TRONG QUÁ TRÌNH ĐĂNG NHẬP:', error);
        res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
    }
});

// Quản lý người dùng (dành cho admin)
router.get('/manage-users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }); // Lấy danh sách người dùng có vai trò là 'user'
    const posts = await Post.find(); // Lấy dữ liệu bài viết

    const locals = {
      title: 'Bảng điều khiển',
      description: 'Chia sẻ và học tập cùng Node.js'
    };

    res.render('admin/manage-users', {
      locals,
      users,
      posts,
      layout: adminLayout
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Lỗi server khi lấy danh sách người dùng' });
  }
});

  router.post('/edit-user/:id', authMiddleware, async (req, res) => {
    try {
      const { name, username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10); // Mã hóa mật khẩu mới
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).send('Người dùng không tồn tại');
      }
      user.name = name;
      user.username = username;
      user.password = hashedPassword; // Lưu mật khẩu đã được mã hóa
      await user.save();
      res.redirect('/manage-users');
    } catch (error) {
      console.error(error);
      res.status(500).render('error', { message: 'Lỗi server khi cập nhật thông tin người dùng' });
    }
  });
  

// Đăng xuất người dùng
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.session.destroy(err => {
        if (err) {
            console.error('Lỗi khi hủy session:', err);
            return res.redirect('/'); 
        }
        res.redirect('/');
    });
});

// Trang Dashboard của admin
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const locals = {
      title: 'Bảng điều khiển',
      description: 'Chia sẻ và học tập cùng Node.js'
    }
    const data = await Post.find();
    res.render('admin/dashboard', {
      locals,
      data,
      layout: adminLayout
    });
  } catch (error) {
    res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
  }
});

// Thêm bài viết mới
router.route('/add-post') 
    .get(authMiddleware, async (req, res) => {
    try {
      const locals = {
        title: 'Thêm bài viết',
        description: 'Chia sẻ và học tập cùng Node.js'
      };
      
      // const data = await Post.find(); 
      
      res.render('admin/add-post', {
        locals,
        layout: adminLayout
      });
    } catch (error) {
      console.error('LỖI KHI TRUY CẬP /add-post (GET):', error); 
      res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
    }
  })
  .post(authMiddleware, async (req, res) => {
  try {
    // **CODE NÀY PHẢI CHỨA LOGIC LƯU BÀI VIẾT BAN ĐẦU CỦA BẠN**
    const newPost = new Post({
      title: req.body.title,
      body: req.body.body
    });

    await Post.create(newPost);
    
    // Thay vì res.send() tạm thời, chuyển hướng về trang admin
    res.redirect('/admin'); 
    
  } catch (error) {
    // HIỂN THỊ LỖI TRÊN CONSOLE
    console.error('LỖI KHI XỬ LÝ FORM POST /add-post:', error);
    res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
  }
});
  
// Chỉnh sửa bài viết
router.route('/edit-post/:id')
  .get(authMiddleware, async (req, res) => {
    try {
      const locals = {
        title: "Chỉnh sửa bài viết",
        description: "Chia sẻ và học tập cùng Node.js",
      };
      const data = await Post.findOne({ _id: req.params.id });
      res.render('admin/edit-post', {
        locals,
        data,
        layout: adminLayout
      });
    } catch (error) {
      res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
    }
  })
  .put(authMiddleware, async (req, res) => {
    try {
      await Post.findByIdAndUpdate(req.params.id, {
        title: req.body.title,
        body: req.body.body,
        updatedAt: Date.now()
      });
      
      // THAY ĐỔI TẠI ĐÂY: Chuyển về trang quản lý bài viết
      res.redirect(`/admin`); 
      
      // Hoặc chuyển hướng về trang chỉnh sửa với thông báo thành công (tùy thuộc vào logic frontend)
      // res.redirect(`/edit-post/${req.params.id}`); 
      
    } catch (error) {
      res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
    }
  });

// Xóa bài viết
router.delete('/delete-post/:id', authMiddleware, async (req, res) => {
  try {
    await Post.deleteOne({ _id: req.params.id });
    res.redirect('/admin');
  } catch (error) {
    res.status(500).render('error', { message: 'Lỗi máy chủ nội bộ' });
  }
});

module.exports = router;
