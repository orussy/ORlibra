const mongoose = require("mongoose");
const Schema = mongoose.Schema;




const LoginSchema =new mongoose.Schema({
    Fname:{
        type:String,
        trim:true,
        required: [true,'name required']
    },
    Lname:{
        type:String,
        trim:true,
        required:[true,'name required']
    },
    slug:{
        type:String,
        lowercase:true
    },
    gender:{
        type:String,
        enum:['Male','Female']

    },
    phone:{
        type:String,
        required:true
    },
    birthdate:{
        type:String,
        required:true
    },
    username:{
        type:String,
        unique: true,
        required:[true,'username required']
    },
    password:{
        type:String,
        required:true
    },
    enrolled:[{
        book_id:String,
    }],
    role:{
        type:String,
        enum: ['student','admin','instructor'],
        default:'student'
    }
    
},
{ timestamps: true }
);

const Log= new mongoose.model("Log", LoginSchema);
module.exports= Log;
