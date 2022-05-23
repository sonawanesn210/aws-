const BookModel = require("../Models/BooksModel")
const userModel = require("../Models/usermodel")
const reviewModel = require("../Models/reviewmodel")
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose')
const aws= require("aws-sdk")



/////.............................................AWS CONNECTION......................................................

aws.config.update({
  accessKeyId: "AKIAY3L35MCRVFM24Q7U",
  secretAccessKey: "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",
  region: "ap-south-1"
})


let uploadFile= async ( file) =>{
  return new Promise( function(resolve, reject) {
   // this function will upload file to aws and return the link
   let s3= new aws.S3({apiVersion: '2006-03-01'}); // we will be using the s3 service of aws

   var uploadParams= {
       ACL: "public-read",
       Bucket: "classroom-training-bucket",  //HERE
       Key: "abc/" + file.originalname, //HERE 
       Body: file.buffer
   }


   s3.upload( uploadParams, function (err, data ){
       if(err) {
           return reject({"error": err})
       }
       console.log(data)
       console.log("file uploaded succesfully")
       return resolve(data.Location)
   })

   // let data= await s3.upload( uploadParams)
   // if( data) return data.Location
   // else return "there is an error"

  })
}


//STRING VALIDATION BY REJEX
const validatefeild = (shivam) => {
  return String(shivam).trim().match(
    /^[A-Za-z0-9\s\-_,\.;:()]+$/);
};

//ISBN VALIDATION BY REJEX
const isValidISBN = (ISBN) => {
  return String(ISBN).trim().match(/^\+?([1-9]{3})\)?[-. ]?([0-9]{10})$/)
}

//Rejex For ReleasedAT
const isValidDate = (date) => {
  return String(date).trim().match(/((18|19|20)[0-9]{2}[\-.](0[13578]|1[02])[\-.](0[1-9]|[12][0-9]|3[01]))|(18|19|20)[0-9]{2}[\-.](0[469]|11)[\-.](0[1-9]|[12][0-9]|30)|(18|19|20)[0-9]{2}[\-.](02)[\-.](0[1-9]|1[0-9]|2[0-8])|(((18|19|20)(04|08|[2468][048]|[13579][26]))|2000)[\-.](02)[\-.]29/)
}



//.............................................POST/books........................................................


const createBook = async (req, res) => {
  try {




    const data = req.body;



    if (Object.keys(data).length == 0) {
      return res.status(400).send({ status: false, message: "Feild Can't Empty.Please Enter Some Details" });
    }
    const obj = {



    }
    const title = data.title;
    const excerpt = data.excerpt;
    const userId = data.userId;
    const ISBN = data.ISBN;
    const category = data.category;
    const subcategory = data.subcategory;
    const isDeleted = data.isDeleted;
    const releasedAt = data.releasedAt;
    const bookCover=data.bookCover;

    if (!title) {
      return res.status(400).send({ status: false, message: "Title is missing" });
    }
    obj.title = title


    //Title validation by Rejex
    if (!validatefeild(obj.title)) {
      return res.status(400).send({ status: false, message: "Title must contain Alphabet or Number", });
    }

    const findtitle = await BookModel.findOne({ title: title }); //title exist or not


    if (findtitle) {
      return res.status(400).send({ status: false, message: `${title} Already Exist.Please,Give Another Title` })
    }

    if (!excerpt) {
      return res.status(400).send({ status: false, message: "excerpt is missing" });
    }
    obj.excerpt = excerpt



    //Name validation by Rejex
    if (!validatefeild(obj.excerpt)) {
      return res.status(400).send({ status: false, message: "excerpt must contain Alphabet or Number", });
    }

    if (!userId)
      return res.status(400).send({ status: false, message: "userId not given" })
    obj.userId = userId

    let isValiduserId = mongoose.Types.ObjectId.isValid(userId);  //return true or false


    if (!isValiduserId) {
      return res.status(400).send({ status: false, message: "userId is Not Valid" });
    }

    const finduserId = await userModel.findById(userId) //give whole data

    if (!finduserId) {
      return res.status(404).send({ status: false, message: "userId not found" })
    }
    if (!ISBN)
      return res.status(400).send({ status: false, message: "ISBN not given" })
    obj.ISBN = ISBN


    if (!isValidISBN(ISBN)) {
      return res.status(400).send({ status: false, message: "INVALID ISBN", });
    }
    const findISBN = await BookModel.findOne({ ISBN: ISBN })  //gives whole data


    if (findISBN) {
      return res.status(400).send({ status: false, message: `${ISBN} Already Exist.Please,Give Another ISBN` })

    }

    if (!category) {
      return res.status(400).send({ status: false, message: "category not given" })
    }

    obj.category = category

    if (!validatefeild(category)) {
      return res.status(400).send({ status: false, message: "category must contain Alphabet or Number", });
    }

    if (!subcategory) {
      return res.status(400).send({ status: false, message: "subcategory not given" })
    }
    obj.subcategory = subcategory
    for (let i = 0; i < subcategory.length; i++) {

      if (!validatefeild(subcategory[i])) {
        return res.status(400).send({ status: false, message: "subcategory must contain Alphabet or Number", });
      }
    }

    if (isDeleted) {
      obj.isDeleted = isDeleted
      if (typeof (isDeleted) != "boolean") {
        return res.status(400).send({ status: false, message: "Invalid Input of isDeleted.It must be true or false " });
      }
      if (isDeleted == true) {
        return res.status(400).send({ status: false, message: "isDeleted must be false while creating book" });
      }
    }

    if (!releasedAt) {
      return res.status(400).send({ status: false, message: "releasedAt not given" })
    }
    obj.releasedAt = releasedAt
    if (!isValidDate(releasedAt)) {
      return res.status(400).send({ status: false, message: "Invalid Format of releasedAt.It must Be YYYY-MM-DD", });
    }
    
    
    let files= req.files
    if(files && files.length>0){
        //upload to s3 and get the uploaded link
        // res.send the link back to frontend/postman
        let uploadedFileURL= await uploadFile( files[0] )
        obj.bookcover=uploadedFileURL
    }
    else{
        return res.status(400).send({ msg: "No file found" })
    }

    let token = req.headers["x-api-key"] || req.headers["x-Api-Key"];
    let decodedtoken = jwt.verify(token, "group51");

    if (decodedtoken.UserId != obj.userId) {
      return res.status(401).send({ status: false, message: "You are Not Authorized To create This Book With This userId" });
    }

    const Books = await BookModel.create(obj);
    return res.status(201).send({ status: true, message:"Success",data:Books });

  }
  catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};





//...................................................GET/books..........................................................


const getbooks = async function (req, res) {  //get books using filter query params
  try {
    const userId = req.query.userId;
    const category = req.query.category;
    const subcategory = req.query.subcategory;
    const obj = {
      isDeleted: false,

    };
    if (userId)
      obj.userId = userId;
    if (category)
      obj.category = category;
    if (subcategory)
      obj.subcategory = subcategory;

    if (obj.userId) {
      let isValiduserId = mongoose.Types.ObjectId.isValid(obj.userId);//check if objectId is valid objectid
      if (!isValiduserId) {
        return res.status(400).send({ status: false, message: "userId is Not Valid" });
      }

      const finduserId = await userModel.findById(obj.userId)//check id exist in userModel
      if (!finduserId)
        return res.status(404).send({ status: false, message: "userId dont exist" })
    }

    const bookdata = await BookModel.find(obj).sort({ title: 1 }).select({ _id: 1, title: 1, excerpt: 1, userId: 1, category: 1, reviews: 1, releasedAt: 1 })
    if (bookdata.length == 0) {
      return res.status(404).send({ status: false, message: "Books not found" });
    }
    res.status(200).send({ status: true, message: "Books list", data: bookdata });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};


//...................................................GET/books/:bookId..........................................................

const getbooksbyId = async (req, res) => {
  try {
    const id = req.params.bookId

    let isValidbookId = mongoose.Types.ObjectId.isValid(id);//check if objectId is valid objectid
    if (!isValidbookId) {
      return res.status(400).send({ status: false, message: "BookId is Not Valid" });
    }
    const findbookid = await BookModel.findById(id).select({ISBN:0,deletedAt:0,__v:0})

    if (!findbookid) {
      return res.status(400).send({ status: false, message: "Incorrect BookId" });
    }

    if (findbookid.isDeleted == false) {
      const findreview = await reviewModel.find({ bookId: id, isDeleted: false }).select({ _id: 1, bookId: 1, reviewedBy: 1, reviewedAt: 1, rating: 1, review: 1 })

      const bookdetails = JSON.parse(JSON.stringify(findbookid))
      bookdetails.reviewsData = findreview

      return res.status(200).send({ status: true, message: "Books list", data: bookdetails })

    }
    return res.status(404).send({ status: false, message: "Books Not Found" })
  }

  catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}



//...................................................PUT/books/:bookId..........................................................


const updateBooksById = async function (req, res) {
  try {

    const id = req.params.bookId


    if (id) {

      let isValidbookId = mongoose.Types.ObjectId.isValid(id);

      if (!isValidbookId) {
        return res.status(400).send({ status: false, message: "bookId is Not Valid" });
      }
    }



    const Bookdetails = await BookModel.findOne({ _id: id, isDeleted: false })
    if (!Bookdetails) {
      return res.status(404).send({ status: false, message: "No book found this bookId" })
    }

    if (!req.body.title && !req.body.excerpt && !req.body.releasedAt && !req.body.ISBN) {
      return res.status(400).send({ status: false, message: "Please Provide data to update" })
    }

    if (req.body.title) {
      Bookdetails.title = req.body.title
    }
    if (req.body.excerpt) {
      Bookdetails.excerpt = req.body.excerpt
    }
    if (req.body.releasedAt) {
      Bookdetails.releasedAt = req.body.releasedAt
    }
    if (req.body.ISBN) {
      Bookdetails.ISBN = req.body.ISBN
    }
    //Title validation by Rejex
    if (!validatefeild(Bookdetails.title)) {
      return res.status(400).send({ status: false, message: "Title must contain Alphabet or Number", });
    }

    const findtitle = await BookModel.findOne({ title: req.body.title }); //title exist or not

    if (findtitle) {
      return res.status(400).send({ status: false, message: `${req.body.title} Title Already Exist.Please,Give Another Title` })
    }


    if (!validatefeild(Bookdetails.excerpt)) {
      return res.status(400).send({ status: false, message: "excerpt must contain Alphabet or Number", });
    }


    if (!isValidISBN(Bookdetails.ISBN)) {
      return res.status(400).send({ status: false, message: "INVALID ISBN", });
    }
    const findISBN = await BookModel.findOne({ ISBN: req.body.ISBN })  //gives whole data
    if (findISBN) {
      return res.status(400).send({ status: false, message: `${req.body.ISBN} ISBN Already Exist.Please,Give Another ISBN` })
    }
    if (!isValidDate(Bookdetails.releasedAt)) {
      return res.status(400).send({ status: false, message: "Invalid Format of releasedAt", });
    }
    Bookdetails.save()
   return res.status(200).send({ status: true, message:"Success", data: Bookdetails })

  }
  catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

//...................................................DELETE /books/:bookId..........................................................


const deleteBooksById = async function (req, res) {

  try {
    const id = req.params.bookId
    if (id) {

      let isValidbookId = mongoose.Types.ObjectId.isValid(id);

      if (!isValidbookId) {
        return res.status(400).send({ status: false, message: "bookId is Not Valid" });
      }
    }
    const Bookdetails = await BookModel.findById(id)
    if (!Bookdetails) {
      return res.status(404).send({ status: false, message: "No Books Exist" })
    }
    //const countreviews = Bookdetails.reviews

    if (Bookdetails.isDeleted == true) {
      return res.status(404).send({ status: false, message: "This Book is already Deleted" })
    }
    let allBooks = await BookModel.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date(), reviews:0} }, { new: true /* , upsert: true  */  })
    //if (allBooks)
    await reviewModel.updateMany({ bookId: id }, { isDeleted: true}, { new: true/* , upsert: true */ })
    return res.status(200).send({ status: true, message: "Successfully Deleted" })
  }
  catch (err) {
    res.status(500).send({ status: false, message: err.message })
  }
}







module.exports.createBook = createBook
module.exports.getbooks = getbooks
module.exports.getbooksbyId = getbooksbyId
module.exports.updateBooksById = updateBooksById
module.exports.deleteBooksById = deleteBooksById