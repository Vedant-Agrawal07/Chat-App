import mongoose from "mongoose";

const connectDB = async()=>{

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI , {
    // useNewUriParser:true,
    // useUnifiedTopology:true,  these dont work now 
    // useFindAndModify:true
    });

    console.log("mongo db connection:"+conn.connection.host);

  } catch (error) {

    console.log(`error is ${error.message}`)
    process.exit();
    
  }

}

export default connectDB;