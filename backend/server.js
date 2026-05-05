const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());



app.use("/uploads", express.static("uploads"));


// MONGODB 
mongoose.connect("mongodb://127.0.0.1:27017/lostfound")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));




const User = mongoose.model("User", {
  name: String,
  contact: String,
  department: String,
  username: String,
  password: String,
  role: { type: String, default: "user" } 
});

const Item = mongoose.model("Item", {
  name: String,
  desc: String,
  location: String,
  type: String,
  owner: Object,
  image: String,

  claimStatus: { type: String, default: "available" },
  requestedBy: Object
});



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });




// REGISTER
app.post("/register", async (req, res) => {
  let user = new User(req.body);
  await user.save();
  res.json({ success: true });
});



app.post("/login", async (req, res) => {

  let { username, password } = req.body;

  let user = await User.findOne({ username, password });

  if(user){
    res.json({
      success: true,
      user,
      isAdmin: user.role === "admin" 
    });
  } else {
    res.json({ success: false });
  }
});


// ADD ITEM
app.post("/add-item", upload.single("image"), async (req, res) => {

  let item = new Item({
    name: req.body.name,
    desc: req.body.desc,
    location: req.body.location,
    type: req.body.type,
    owner: JSON.parse(req.body.owner),
    image: req.file ? req.file.filename : null
  });

  await item.save();

  res.json({ success: true });
});


// GET ITEMS
app.get("/items", async (req, res) => {

  let items = await Item.find();

  let updated = items.map(i => ({
    ...i._doc,
    image: i.image ? `http://localhost:3000/uploads/${i.image}` : null
  }));

  res.json(updated);
});


// CLAIM REQUEST
app.post("/claim", async (req, res) => {

  let { itemId, user } = req.body;

  let item = await Item.findById(itemId);

  if(item){
    item.claimStatus = "pending";
    item.requestedBy = user;

    await item.save();

    res.json({ success: true });
  }
});


// APPROVE
app.post("/approve", async (req, res) => {

  let item = await Item.findById(req.body.itemId);

  item.claimStatus = "approved";

  await item.save();

  res.json({ success: true });
});


// REJECT
app.post("/reject", async (req, res) => {

  let item = await Item.findById(req.body.itemId);

  item.claimStatus = "available";
  item.requestedBy = null;

  await item.save();

  res.json({ success: true });
});


// DELETE ITEM (ADMIN)
app.post("/delete-item", async (req, res) => {

  await Item.findByIdAndDelete(req.body.id);

  res.json({ success: true });
});



app.listen(3000, () => {
  console.log("Server running on port 3000");
});


// GET USERS
app.get("/users", async (req, res) => {
  let users = await User.find();
  res.json(users);
});


// DELETE USER
app.post("/delete-user", async (req, res) => {

  await User.findByIdAndDelete(req.body.id);

  res.json({ success: true });
});

// DELETE USER 
app.post("/delete-user", async (req, res) => {

  let user = await User.findById(req.body.id);

  if(user.role === "admin"){
    return res.json({ success: false, message: "Cannot delete admin" });
  }

  await User.findByIdAndDelete(req.body.id);

  res.json({ success: true });
});
