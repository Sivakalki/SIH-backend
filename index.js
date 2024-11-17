const express = require("express");
const PORT = process.env.PORT || 8000;
const app = express();
const dotenv = require("dotenv")
dotenv.config({})

app.use(express.json());
const userRouter = require("./routes/userRoute"); // Corrected the path

app.use("/user", userRouter); // Using the router

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

module.exports = app;
