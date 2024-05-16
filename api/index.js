const express = require('express');
const app =express();
const cors =require('cors');
const { default: mongoose } = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const jwt = require('jsonwebtoken')
const secret = 'asdfe45we45w345wegw345werjktjwertkj';
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({dest:'uploads/'});
const fs = require ('fs');
const Post = require('./models/Post');


app.use('/uploads', express.static(__dirname +'/uploads'));
app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());

 mongoose.connect('mongodb+srv://adraa:gyvyhvdayhvyd@cluster0.y6gb8xi.mongodb.net/')

app.post('/register', (req,res)=> {
   
    const {username,password} = req.body;
    try {
        const userDoc =  User.create({username,
             password:bcrypt.hashSync(password,salt)});
        res.json(userDoc);
    } catch(e){
        console.log(e);
        res.status(400).json(e);
        
    }
 
    
    
});

/* app.post('/login', async (req,res) => {
    const {username,password} = req.body;
    

    
    const userDoc = await User.findOne({username});
    
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      // logged in
      jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
        if (err) throw err;
        res.cookie('token', token).json({
          id:userDoc._id,
          username,
        });
      });
    } else {
      res.status(400).json('wrong credentials');
    }
  });*/
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const userDoc = await User.findOne({ username });

        if (!userDoc) {
            // User not found
            return res.status(400).json('Wrong credentials');
        }

        // User found, now check the password
        const passOk = bcrypt.compareSync(password, userDoc.password);

        if (passOk) {
            // Password matches, generate JWT token
            jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json({
                    id: userDoc._id,
                    username,
                });
            });
        } else {
            // Password does not match
            res.status(400).json('Wrong credentials');
        }
    } catch (error) {
        // Handle any other errors that might occur during database operation
        console.error('Login error:', error);
        res.status(500).json('Internal Server Error');
    }
});

app.get('/profile', (req,res) => {
   const {token} = req.cookies; 
   jwt.verify(token, secret, {}, (err, info )=>{
    if (err) throw err;
    res.json(info);
   });
    
});

app.post('/logout', (req,res) => {
    res.cookie('token', '').json('ok');

})

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath);

        const { token } = req.cookies;
        jwt.verify(token, secret, {}, async (err, info) => {
            if (err) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const { title, summary, content } = req.body;
            const postDoc = await Post.create({
                title,
                summary,
                content,
                cover: newPath,
                author: info.id,
            });
            res.json(postDoc);
        });
    } catch (error) {
        console.error('Error handling POST request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/post', async (req,res)=>{
    
    res.json(
        await Post.find()
        .populate('author', ['username'])
        .sort({createdAt: -1})
        .limit(20))
})

app.get('/post/:id', async(req,res)=> {
    const {id} =req.params;
   const postDoc = await Post.findById(id).populate('author', ['username']);
   res.json(postDoc);
    
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    try {
        let newPath = null;
        if (req.file) {
            const { originalname, path } = req.file;
            const parts = originalname.split('.');
            const ext = parts[parts.length - 1];
            newPath = path + '.' + ext;
            fs.renameSync(path, newPath);
        }

        const { token } = req.cookies;
        jwt.verify(token, secret, {}, async (err, info) => {
            if (err) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { id, title, summary, content } = req.body;

            // Find the post by ID
            const postDoc = await Post.findById(id);

            if (!postDoc) {
                return res.status(404).json({ error: 'Post not found' });
            }

            // Check if the authenticated user is the author of the post
            if (postDoc.author.toString() !== info.id) {
                return res.status(403).json({ error: 'You are not authorized to update this post' });
            }

            // Update the post fields
            postDoc.title = title;
            postDoc.summary = summary;
            postDoc.content = content;
            postDoc.cover = newPath ? newPath : postDoc.cover;

            // Save the updated post document
            await postDoc.save();

            res.json(postDoc);
        });
    } catch (error) {
        console.error('Error handling PUT request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(3030);

//mongodb+srv://adraa:gyvyhvdayhvyd@cluster0.y6gb8xi.mongodb.net/

