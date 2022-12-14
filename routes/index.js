var chalk = require("chalk");
var express = require("express");
var passport = require("passport");
var router = express.Router();
var ObjectId = require("mongoose").Types.ObjectId;
var Book = require("../models/book.js");
var Trade = require("../models/trade.js");
var User = require("../models/user.js");

//Login check
var loggedIn = function (req, res, next) {
  if (req.user) {
    next();
  } else {
    res.render("login.pug");
  }
};

/* GET home page. */
router.get("/", function (req, res, next) {
  console.dir(req.user);
  if (typeof req.user !== "undefined") {
    res.render("shell", {
      title: req.app.get("title"),
      username: req.user.username,
    });
  } else {
    res.render("shell", { title: req.app.get("title"), username: undefined });
  }
});
//POST
router.post("/acceptTrade", loggedIn, function (req, res, next) {
  Trade.findOne(
    {
      _id: req.body.id,
    },
    function (err, trade) {
      if (err) {
        console.log(chalk.bgRed.white("Error: ") + " " + err);
        res.status(500).json({
          error: err,
        });
      } else if (trade) {
        console.log(chalk.green("Found trade to be accepted"));
        console.log(
          req.user.username +
            " == " +
            trade.fromUser[0].userName +
            " && " +
            req.user.provider +
            " == " +
            trade.fromUser[0].userProvider
        );

        if (
          req.user.username == trade.fromUser[0].userName &&
          req.user.provider == trade.fromUser[0].userProvider
        ) {
          //res.json({status: "found", trade: trade});
          Book.findOne(
            {
              _id: trade.book.id,
            },
            function (err, book) {
              if (err) {
                res.json({
                  error: err,
                });
              }
              if (book) {
                book.bookOwner[0].userName = trade.toUser[0].userName;
                book.bookOwner[0].userId = trade.toUser[0].userId;
                book.bookOwner[0].userProvider = trade.toUser[0].userProvider;
                book.tradePending = false;
                book.save(function (err, book) {
                  if (err) {
                    console.log(chalk.red("Error: ") + err);
                    res.json({
                      error: err,
                    });
                  }
                  if (book) {
                    trade.isCompleted = true;
                    trade.save(function (err, trade) {
                      if (err) {
                        console.log(chalk.reg("Error: ") + err);
                      }
                      res.json({
                        result: "success",
                      });
                    });
                  }
                });
              } else {
                res.json({
                  error: "Book not found",
                });
              }
            }
          );
        } else {
          res.status(500).json({
            error: "Not Authorized",
          });
        }
      } else {
        console.log(chalk.red("Not Found"));
        res.json({
          error: "notfound",
        });
      }
    }
  );
});

router.get("/addbook", loggedIn, function (req, res, next) {
  res.render("addbook.pug");
});

//THIS IS POST
router.post("/addnewbook", loggedIn, function (req, res, next) {
  console.log("At addnewbook...");
  console.log("Checking for req.body.title and req.body.image...");
  if (
    !req.hasOwnProperty("body") ||
    !req.body.hasOwnProperty("title") ||
    !req.body.hasOwnProperty("image")
  ) {
    res
      .status(500)
      .send("Unable to add book.  Please check data and try again...");
    return false;
  }

  var newBook = new Book({
    bookOwner: {
      userProvider: req.user.provider,
      userId: req.user.id,
      userName: req.user.username,
    },
    imgUrl: req.body.image,
    title: req.body.title,
    likes: [],
    tradePending: false,
  });

  newBook.save(function (err, result) {
    if (err) {
      console.log("Error!");
      res.status(500).send("Error adding book to library");
      return false;
    }
    if (result) {
      console.dir(result);
      res.json({ status: "added" });
      return true;
    }
    return false;
  });
});

router.get("/allbooks", function (req, res, next) {
  res.render("allbooks.pug");
});

router.post("/declineTrade", loggedIn, function (req, res, next) {
  Trade.findOne(
    {
      _id: req.body.id,
    },
    function (err, trade) {
      if (err) {
        console.log(chalk.bgRed.white("Error: ") + " " + err);
        res.status(500).json({
          error: err,
        });
      } else if (trade) {
        console.log(chalk.green("Found trade to be declined"));

        if (
          //Either the giver or the recipent can cancel the trade
          (req.user.username == trade.toUser[0].userName &&
            req.user.provider == trade.toUser[0].userProvider) ||
          (req.user.username == trade.fromUser[0].userName &&
            req.user.provider == trade.fromUser[0].userProvider)
        ) {
          console.log("Book ID is " + trade.book.id);
          console.dir(trade);
          var result = trade.remove();
          if (result) {
            console.log("Remove trade successful");
            Book.findOneAndUpdate(
              { _id: trade.book.id },
              { $set: { tradePending: false } },
              { new: true },
              function (err, doc) {
                if (err) {
                  console.log(chalk.red(err));
                  res
                    .status(500)
                    .json({ error: "Error while updating trade status" });
                  return false;
                }
                console.log("TradePending set to false");
                console.dir(doc);
                res.json({ result: "success" });
              }
            );
          }
        }
      } else {
        res.json({ error: "not found" });
      }
    }
  );
});

router.post("/getbooks", function (req, res, next) {
  console.log(chalk.bgBlue.white("At getbooks!"));
  if (typeof req.body.page !== "undefined") {
    var page = Number(req.body.page);
    console.log("Page is " + page);
    console.log(typeof page);
  } else {
    var page = 1;
    console.log("Defaulting page to 1...");
  }
  if (typeof req.body.limit == "number") {
    var limit = req.body.limit;
  } else {
    var limit = 10;
  }

  Book.paginate(
    {},
    { page: page, sort: { dateAdded: -1 }, limit: limit },
    function (err, results) {
      console.dir(results);
      var returnJson = {};
      if (typeof results.total !== "undefined") {
        returnJson.total = results.total;
        returnJson.pages = results.pages;
        returnJson.page = results.page;
      }
      returnJson.data = results.docs;
      console.log("here is returnJson");
      res.json(returnJson);
    }
  );
});

router.get("/getNTrades", loggedIn, function (req, res, next) {
  console.log("At getNTrades");
  var dbgObj = {
    "toUser.userName": req.user.username,
  };
  console.dir(dbgObj);

  var nReqsForYou = null;
  var nYourReqs = null;

  var cb1Complete = false;
  var cb2Complete = false;
  //Count User's Trade Requests (i.e., FROM User)
  Trade.count(
    {
      "fromUser.userName": req.user.username,
      isCompleted: false,
    },
    function (err, count) {
      console.log("At callback 1");
      if (err) {
        console.log(err);
        res.status(500).json({ error: err });
      }
      if (count) {
        console.log(`Count is ${count}.`);
        nReqsForYou = count;
        cb1Complete = true;
        sendResponse();
      } else {
        console.log(`Count is ${count}.`);
        nReqsForYou = 0;
        cb1Complete = true;
        sendResponse();
      }
    }
  );

  //Trades FOR User (i.e., TO user)
  var reqsForUser = Trade.count(
    {
      "toUser.userName": req.user.username,
      isCompleted: false,
    },
    function (err, count) {
      console.log("At callback 2");
      if (err) {
        console.log(err);
        res.status(500).json({ error: err });
      }
      if (count) {
        console.log(`Count is ${count}.`);
        console.log(count);
        nYourReqs = count;
        cb2Complete = true;
        sendResponse();
      } else {
        nYourReqs = 0;
        cb2Complete = true;
        sendResponse();
      }
    }
  );

  var sendResponse = function () {
    if (cb1Complete && cb2Complete) {
      res.json({ nYourReqs: nYourReqs, nReqsForYou: nReqsForYou });
    }
  };
});

router.get("/getTradeReqsForMe", loggedIn, function (req, res, next) {
  Trade.find(
    { "fromUser.userName": req.user.username, isCompleted: false },
    function (err, trades) {
      if (err) {
        res.status(500).json({ error: err });
        return false;
      }
      if (trades) {
        console.log("Returning trades...");
        res.json(trades);
        return true;
      } else {
        res.json({}); //Return an empty object if we have no trades
        return true;
      }
    }
  );
});

router.get("/getMyTradeReqs", loggedIn, function (req, res, next) {
  Trade.find(
    { "toUser.userName": req.user.username, isCompleted: false },
    function (err, trades) {
      if (err) {
        res.status(500).json({ error: err });
        return false;
      }
      if (trades) {
        console.log("Returning trades...");
        res.json(trades);
        return true;
      } else {
        res.json({}); //Return an empty object if we have no trades
        return true;
      }
    }
  );
});

router.get("/getProfile/:username", loggedIn, function (req, res, next) {
  User.findOne(
    {
      username: req.params.username,
    },
    function (err, user) {
      if (err) {
        res.error("Error: " + err);
      }
      if (user) {
        res.json(user.profile);
      }
    }
  );
});

router.get("/loginRtn", function (req, res, next) {
  res.render("loginrtn.pug");
});

router.get("/logout", function (req, res, next) {
  req.logout();
  res.render("logout.pug");
});

// My Books
router.get("/mybooks", loggedIn, function (req, res, next) {
  res.render("mybooks.pug");
});

// My Books (POST)
router.post("/mybooks", loggedIn, function (req, res, next) {
  console.log(chalk.bgBlue.white("At getbooks!"));
  if (typeof req.body.page !== "undefined") {
    var page = Number(req.body.page);
    console.log("Page is " + page);
  } else {
    var page = 1;
    console.log("Defaulting page to 1...");
  }
  if (typeof req.body.limit == "number") {
    var limit = req.body.limit;
  } else {
    var limit = 10;
  }

  Book.paginate(
    {
      "bookOwner.userName": req.user.username,
      "bookOwner.userProvider": req.user.provider,
    },
    { page: page, sort: { dateAdded: -1 }, limit: limit },
    function (err, results) {
      if (err) {
        console.log(chalk.bgRed("Error: ") + err);
        res.status(500).json({ error: err });
        return false;
      }
      //console.dir(results);
      var returnJson = {};
      if (typeof results.total !== "undefined") {
        returnJson.total = results.total;
        returnJson.pages = results.pages;
        returnJson.page = results.page;
      }
      returnJson.data = results.docs;
      res.json(returnJson);
    }
  );
});

// Profile
router.get("/profile", loggedIn, function (req, res, next) {
  console.log(chalk.cyan("At profile..."));
  User.findOne(
    {
      username: req.user.username,
    },
    function (err, user) {
      if (err) {
        res.error("Error: " + err);
      }
      if (user) {
        res.render("profile.pug", { profile: user.profile });
      }
    }
  );
});

// Profile Info - Current User
router.get("/profileinfo", loggedIn, function (req, res, next) {
  console.log(chalk.cyan("At profileinfo..."));
  User.findOne(
    {
      username: req.user.username,
    },
    function (err, user) {
      if (err) {
        res.json({ err: "Error fetching user information" });
      }
      if (user) {
        console.log("Here is profile information being returned...");
        console.dir(user.profile);
        res.json(user.profile);
      }
    }
  );
});

router.post("/requestTrade", loggedIn, function (req, res, next) {
  console.log("req.body...");
  console.dir(req.body);
  var foundBook = null;

  //Check and see if we have a body in this POST, and that we have a bookRequested in that POST
  if (typeof req.body !== "object") {
    res.status(500).json({
      status: "error",
      message: "No POST body",
    });
    return false;
  }
  if (!req.body.hasOwnProperty("bookRequested")) {
    res.status(500).json({
      status: "error",
      message: "No Book in Request",
    });
    return false;
  }

  //Find the book
  Book.findOne(
    {
      _id: new ObjectId(req.body.bookRequested),
    },
    function (err, book) {
      if (err) {
        console.log(chalk.red("Error: ") + err);
        res.status(500).json({
          status: "error",
          message: "Error querying book to be traded.",
        });
        return false;
      }

      if (!book) {
        console.log("Book not found!");
        res.status(500).json({
          status: "error",
          message: "Book not found",
        });
        return false;
      } else {
        console.log("Book found!");
        foundBook = book;
        tradeContinue(req, res);
      }
    }
  );

  //Remember, the callback above is async, so we have to use a callback function to dictate what to do if we found a book to trade...
  var tradeContinue = function (req, res) {
    console.log("Book user has requested trade for has been found...");
    //console.dir(foundBook);

    var bookOwner = foundBook.bookOwner;

    //Checking to see if trade is not already outstanding...
    Trade.findOne(
      {
        bookId: foundBook.id,
        isCompleted: false,
      },
      function (err, trade) {
        //console.log(typeof trade); //will be null if no trades with that book id are found...
        if (trade !== null) {
          res.status(500).json({
            status: "error",
            message:
              "A pending trade request is already outstanding for this book.",
          });
          return false;
        } else {
          var tradeData = {
            book: {
              id: foundBook.id,
              title: foundBook.title,
            },
            fromUser: bookOwner,
            toUser: [
              {
                userProvider: req.user.provider,
                userId: req.user.id,
                userName: req.user.username,
              },
            ],
            isCompleted: false,
          };
          console.log("Here is tradeData");
          console.dir(tradeData);
          //console.log("here is tradeData toUser");
          //console.dir(tradeData.toUser);
          //console.log("here is tradeData from User")
          //console.dir(tradeData.fromUser);
          var trade = new Trade(tradeData);

          //Save the pending trade request to the journal.  If successful, mark the book as trade pending...
          trade.save(function (err, result) {
            if (err) {
              console.log(chalk.red("Error while saving"));
              console.dir(err);
            }
            if (result) {
              console.log("Success while saving");
              console.dir(result);
              foundBook.tradePending = true;
              foundBook.save(function (err, result) {
                if (err) {
                  console.log(chalk.red("Error:") + " " + err);
                }
                if (result) {
                  console.log(chalk.green("Result:") + " " + res);
                  res.json({ status: "success" });
                }
              });
            }
          });
        }
      }
    );
  };
});

// Splash page
router.get("/splash", function (req, res, next) {
  res.render("home");
});

router.post("/updateProfile", function (req, res, next) {
  console.log(chalk.cyan("Update Profile called!"));
  User.findOne(
    {
      username: req.user.username,
    },
    function (err, user) {
      if (err) {
        console.error("Error!!!: " + err);
        res.error("Error: " + err);
      }
      if (user) {
        console.log("At user...");
        console.dir(user);
        console.log("At user._doc.profile...");
        console.dir(user._doc.profile);
        user.profile.fullname = req.body.fullname;
        user.profile.city = req.body.city;
        user.profile.state = req.body.state;
        user.save(function (err, user) {
          if (err) {
            console.error(err);
            res.status(500).error("Error");
          } else {
            console.log("Saved called without errors!");
            res.json({ status: "success" });
          }
        });
      }
    }
  );
});

router.get("/auth/twitter", function (req, res, next) {
  passport.authenticate("twitter", function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      console.log("USER NOT DEFINED");
      return res.redirect("/");
    }
  })(req, res, next);
});

router.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", {
    successRedirect: "/#/loginRtn",
    failureRedirect: "/",
  })
);

module.exports = router;
