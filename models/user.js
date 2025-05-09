const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose"); //automatically creates username, password, salting, hashing

const userSchema = new Schema ({
    email: {
        type: String,
        required: true,
    }
})

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', userSchema);