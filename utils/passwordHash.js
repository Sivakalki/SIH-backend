const bcrypt = require("bcrypt")

const hashPwd=async (password)=>{
    let salt = await bcrypt.genSalt(10);
    let hashpassword = await  bcrypt.hash(password,salt)
    return hashpassword
}

const comparePwd = async (pwd1, pwd2) => {
    return await bcrypt.compare(pwd1, pwd2); 
};
module.exports = {hashPwd, comparePwd}
