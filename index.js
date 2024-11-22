const express = require("express");
const PORT = process.env.PORT || 8000;
const app = express();
const dotenv = require("dotenv")
const cors = require('cors')

dotenv.config({})

app.use(cors())
app.use(express.json());
const userRouter = require("./routes/userRoute"); // Corrected the path
const applicationRouter = require("./routes/applicationRoute");
const svroRouter = require("./routes/svro");
app.use("/users", userRouter); // Using the router
app.use("/api", applicationRouter)
app.use("/svro", svroRouter)
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

module.exports = app;
