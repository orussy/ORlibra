const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const mongoose = require('mongoose');
const Mydata = require('./models/user');
const Book = require('./models/book');
const path = require('path');
const multer = require('multer');
const admin = require('firebase-admin');
const serviceAccount = require('./corpro-4ef2e-firebase-adminsdk-ahpv2-dac99b84f4.json');
const moment = require('moment');
const app = express();
const port = 3000;
const xlsx = require('xlsx');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'corpro-4ef2e.appspot.com'
});

const bucket = admin.storage().bucket();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 400 * 1024 * 1024 // 5 MB file size limit
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'its secret bitch',
  resave: false,
  saveUninitialized: true
}));

// Set view engine
app.set('view engine', 'ejs');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/');
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.redirect('/');
};

// Routes
app.get('/', (req, res) => {
  res.sendFile('./public/views/index.html', { root: __dirname });
});

app.get('/signup.html', (req, res) => {
  res.sendFile('./public/views/signup.html', { root: __dirname });
});

app.get('/store', isAuthenticated, (req, res) => {
  Book.find()
    .then(data => {
      res.render('store', { cor: data, username: req.session.user ? req.session.user.username : null });
    })
    .catch(err => {
      console.error('Error fetching books:', err);
      res.status(500).send('Error fetching books');
    });
});

app.get("/addbook", (req, res) => {
  res.sendFile("./public/views/addbook.html", { root: __dirname });
});


app.post('/addbooks', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // Read the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const booksData = xlsx.utils.sheet_to_json(worksheet);

    // Insert each book data into the database
    for (const book of booksData) {
      const bookData = {
        book_name: book.book_name,
        author_name: book.author_name,
        language: book.language,
        publishing_year: book.publishing_year,
        no_page: book.no_page,
        type: book.type,
        description: book.description,
        img: book.img,
        book_url: book.book_url
      };

      const bookExisting = await Book.findOne({ book_name: bookData.book_name });
      if (!bookExisting) {
        await Book.create(bookData);
      }
    }

    res.send('Books added successfully from Excel file');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing Excel file.');
  }
});

app.post('/addbook', upload.fields([{ name: 'img' }, { name: 'book' }]), async (req, res) => {
  try {
    if (!req.files || !req.files.img || !req.files.book) {
      return res.status(400).send('No files uploaded.');
    }

    const imgFile = req.files.img[0];
    const bookFile = req.files.book[0];

    const uploadToStorage = (file) => {
      return new Promise((resolve, reject) => {
        const blob = bucket.file(file.originalname);
        const blobStream = blob.createWriteStream({
          metadata: {
            contentType: file.mimetype
          }
        });

        blobStream.on('error', (err) => {
          reject(err);
        });

        blobStream.on('finish', async () => {
          await blob.makePublic();
          resolve(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        });

        blobStream.end(file.buffer);
      });
    };

    const imgURL = await uploadToStorage(imgFile);
    const bookURL = await uploadToStorage(bookFile);

    const bookda = {
      book_name: req.body.book_name,
      author_name: req.body.author_name,
      language: req.body.Language,
      publishing_year: req.body.publishing_year,
      no_page: req.body.no_page,
      type: req.body.type,
      description: req.body.dis,
      img: imgURL,
      book_url: bookURL
    };

    const bookexistinguser = await Book.findOne({ book_name: bookda.book_name });
    if (bookexistinguser) {
      res.send('Book already exists');
    } else {
      await Book.insertMany(bookda);
      res.send('Book added successfully');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error uploading files.');
  }
});

app.post('/rolledbook', isAuthenticated,async (req, res) => {
  const id = req.body.bookname;
  const username= req.session.user.username;
  console.log(id+ "  "+username +"1")
  const user=await Mydata.findOne({username:username});
  if(!user){
    return res.send("user not found");
  }
  const book= user.enrolled.map(item => item.book_id.toString());
  const isEnrolled = book.includes(id.toString()); 
  if(isEnrolled){
    return res.send("book already enrolled");
  }
  console.log(id+ "  "+username +"1")
  user.enrolled.push({book_id:id});
  await user.save();
});
app.get('/home', isAuthenticated, async (req, res) => {
  try {
      const username = req.session.user.username;

      // Fetch user document including enrolled books
      const user = await Mydata.findOne({ username });

      if (!user) {
          throw new Error('User not found');
      }

      // Extract enrolled book_ids
      const enrolledBooks = user.enrolled.map(item => item.book_id);

      // Fetch details of enrolled books
      const enrolledBooksDetails = await Book.find({ _id: { $in: enrolledBooks } });

      console.log(enrolledBooksDetails); // Check console for fetched book data

      // Render studentmain view with enrolledBooksDetails data
      res.render('studentmain', { enrolledBooksDetails,username: req.session.user ? req.session.user.username : null });
  } catch (error) {
      console.error('Error rendering home page:', error.message);
      // Handle error, render an error page, or redirect to another page
      res.status(500).send('Internal Server Error');
  }
});
app.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.username);
    const check = await Mydata.findOne({ username: req.body.username });
    if (!check) {
      console.log('Username not found');
      return res.send("Username not found");
    }
    const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
    if (isPasswordMatch) {
      const role = check.role;
      const username = check.username;
      req.session.user = { username, role };
      console.log('Login successful:', req.session.user);
      if (role === 'student') {
        return res.redirect('/home');
      } else if (role === 'admin') {
        return res.redirect('/admin');
      }
    } else {
      console.log('Wrong password');
      return res.send("Wrong password");
    }
  } catch (error) {
    console.error(error);
    return res.send("Error during login");
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/');
  });
});
app.get('/admin', isAdmin, async(req, res) => {
  try {
    const username = req.session.user.username;

    // Fetch user document including enrolled books
    const user = await Mydata.findOne({ username });

    if (!user) {
        throw new Error('User not found');
    }

    // Extract enrolled book_ids
    const enrolledBooks = user.enrolled.map(item => item.book_id);

    // Fetch details of enrolled books
    const enrolledBooksDetails = await Book.find({ _id: { $in: enrolledBooks } });

   // Check console for fetched book data

    // Render studentmain view with enrolledBooksDetails data
    res.render('adminhome', { enrolledBooksDetails ,username: req.session.user ? req.session.user.username : null });
} catch (error) {
    console.error('Error rendering home page:', error.message);
    // Handle error, render an error page, or redirect to another page
    res.status(500).send('Internal Server Error');
}
});
app.get('/adminaddbook', isAdmin, (req, res) => {
  res.render('admin', { username: req.session.user.username });
});

app.post('/signup', async (req, res) => {
  const data = {
    Fname: req.body.Fname,
    Lname: req.body.Lname,
    gender: req.body.gender,
    phone: req.body.phone,
    birthdate: req.body.birthdate,
    username: req.body.username,
    password: req.body.password
  };
  const existinguser = await Mydata.findOne({ username: data.username });
  if (existinguser) {
    res.send('User already exists');
  } else {
    const saltrounds = 10;
    const hashedpass = await bcrypt.hash(data.password, saltrounds);
    data.password = hashedpass;
    const userdata = await Mydata.insertMany(data);
    console.log(userdata);
    res.redirect('./views/index.html');
  }
});

mongoose.connect('mongodb+srv://ok3050802:KATtNriOhhUUl8Oe@cluster0.jboyzma.mongodb.net/corpro?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log('Database connected');
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
app.get("/:id", isAuthenticated,(req, res) => {
  const bookId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    console.log(`Invalid book ID: ${bookId}`);
    return res.status(400).send('Invalid book ID');
  }
  Book.findById(bookId)
    .then((result) => {
      if (!result) {
        console.log(`Book not found for ID: ${bookId}`);
        return res.status(404).send('Book not found');
      }
      res.render('book', { bookdata: result, username: req.session.user ? req.session.user.username : null });
    })
    .catch((err) => {
      console.error('Error finding book:', err);
      res.status(500).send('Error finding book');
    });
});
