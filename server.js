const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')

mongoose.connect(process.env.uri, { useNewUrlParser: true })
var userSchema = mongoose.Schema({
 username: String
});
var exerciseSchema = mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
});
var User = mongoose.model("User", userSchema);
var Exercise = mongoose.model("Exercise", exerciseSchema);


app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static('public'))


/* routes */
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post("/api/exercise/new-user", (req,res)=>{
  var username = req.body.username;
  User.findOne({username: username}, (err, item)=>{
    if (err || item == null) {
      var user = new User({username:username});
      user.save((err, item)=>{
        if (err) {return res.json("Error while saving");}
        console.log(item);
        return res.json(item);
      });
    }
    else{return res.json(item);}
  });
});



/*
userId(_id),
description,
duration,
optionally date to /api/exercise/add.
If no date supplied it will use current date.
Returned will the the user object with also with the exercise fields added.
*/
app.post("/api/exercise/add", (req, res)=>{
  var id = req.body.userId;
  if (!id){return res.json({message:"Empty id"});}
  User.findOne({_id:id}, (err, item)=>{
    if (err || item == null) {return res.json({message: "User not found"})}
    else {
      var description = req.body.description;
      var duration = req.body.duration;
      var date = new Date(req.body.date);
      if (description == null || description.length == 0){return res.json({message:"Empty description"});}
      if (duration == null || duration == 0){return res.json({message:"Empty duration"});}
      if (date == null || date.length == 0 || date == "Invalid Date"){date = new Date();}
      var exercise = new Exercise({
        userId:id,
        description:description,
        duration: duration,
        date: date || new Date()
      });
      exercise.save((err, item)=>{
        if (err) {return res.json({message: "Error while saving ex"});}
        return res.json(item);
      });
    }
  });
});


app.get("/api/exercise/users", (req, res)=>{
  User.find({}).select("username -_id").exec((err, arr)=>{
    if (err) {return res.json({message: "Error"});}
    return res.json({users:arr});
  });
});


//GET /api/exercise/log?{userId}[&from][&to][&limit]
app.get("/api/exercise/log", (req,res)=>{
  var id = req.query.userId;
  if (id == null) {return res.json({message:"Empty id"});}
  User.findOne({_id:id}, (err, item)=>{
    if (err || item == null) {return res.json({message: "Invalid User Id"});}
    else{
      var from = new Date(req.body.from);
      var to = new Date(req.body.to);
      var limit = parseInt(req.body.limit);
      var query = Exercise.where({userId:id});
      if (from != null && from != "Invalid Date"){
        query.where("date").gte(from);
      }
      if (to != null && to != "Invalid Date"){
        query.where("date").lte(to);
      }
      if (limit != null && limit > 0){
        query.limit(limit);
      }      
      query.select("-_id userId description duration date").exec((err, arr)=>{
        if (err || arr.length == 0) {return res.json({message:"Didnt find exercises"});}
        return res.json({exrcises:arr});
      });
      
    }
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
