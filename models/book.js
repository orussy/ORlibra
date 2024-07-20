const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BookSchema =new mongoose.Schema({
    book_name:{
        type:String,
        trim:true,
        required:[true,'name required']
    },
    author_name:{
        type:String,
        trim:true,
        required:[true,'name required']
    },
    language:String,
    publishing_year:String,
    no_page:Number,
    img:{
        type:String,
        required:[true,'link required']
    },
    book_url:{
        type:String,
        required:[true,'url required']
    },
    rate:{
        type:Number,
        enum:[0,1,2,3,4,5],
        default:0
    }
    ,type:{
        type:String,
        required:[true,'type required']
    },
    description:String
})


const Book= new mongoose.model("Book",BookSchema);
module.exports= Book;