require('dotenv').config();

const chalk = require('chalk');

console.log(chalk.bgBlue.white('Loading packages...'));
var createError = require('http-errors');
var express = require('express');
var path = require('path');
const favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session'); // To be used wit passport.session()
const uuid = require('uuid'); // Used with session
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const User = require('./models/user.js'); // Mongoose 'User' model

console.log(chalk.bgCyan.black('Loading routes...'));
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET;
CALLBACK_URI = process.env.CALLBACK_URI;

console.log(chalk.bgYellow.black('Initializing Express...'));
var app = express();
const port = 8080;

app.set('title','freeBookCamp');

app.use(session({
  genid: req => {
    return uuid.v4(); // 'uuid' module
  },
  resave: true,
  saveUninitialized: true,
  secret: 'tacos'
}));

app.use(passport.initialize());
app.use(passport.session()); // Passport piggybacks off the Express session (above)

// Passport serialization and deserialization
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new TwitterStrategy({
  consumerKey: TWITTER_CONSUMER_KEY,
  consumerSecret: TWITTER_CONSUMER_SECRET,
  callbackURL: CALLBACK_URI,
  passReqToCallback: true // Allows stuff like username to be in the req
}, (req, token, tokenSecret, profile, callback) => {
  process.nextTick(() => { // Asynchronous
    // Find or Create
    console.log(chalk.bgBlack.yellow('Searching for user ID ') + profile.id);
    User.findOne({
      provider: 'twitter',
      id: profile.id
    }, (err, user) => {
      console.log(chalk.bgBlack.yellow('User callback'));
      if (err) {
        console.log(chalk.bgBlack.red(`Error: ${err}`));
        callback(err);
      }
      if (user) { // We found the user
        console.log(chalk.bgBlack.green('User found'));
        return callback(null, user);
      } else { // User does not exist
        console.log(chalk.bgWhite.black('User does not exist, yet'));
        const newUser = new User({
          provider: 'twitter',
          id: profile.id,
          token: token,
          username: profile.username
        });
        // Since newUser is a Mongoose schema from User, it has its own save method
        newUser.save((err, newUser, numAffected) => {
          if (err) {
            console.error(err);
          }
          return callback(null, newUser);
        });
      }
    });
  });
}));

// view engine setup
console.log(chalk.cyan('Setting view engine to Pug...'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public'), {
  strictMath: true,
  debug: true
}));
app.use(express.static(path.join(__dirname, 'public')));

console.log(chalk.cyan('Initializing routes...'));
app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

console.log(chalk.bgYellow.black('Setting promiseLibrary to Bluebird and connecting to MongoDB...'));
const mongooseOpts = { promiseLibrary: require('bluebird') };
mongoose.connect(process.env.MONGO_URI, mongooseOpts);
global.db = mongoose.connection;

global.db.once('open', () => {
  console.log(chalk.bgGreen.black('Connected to MongoDB.'));

  app.listen(port, () => {
    process.stdout.write('\x07'); // BEEP
    console.log(chalk.bgGreen.black(`Listening on port ${port}.`));
  });
});

global.db.on('error', error => {
  console.error(chalk.bgRed.black('Mongoose connection error: '));
  console.dir(error);
  process.exit(); // Exits with 'success' code 0 (i.e., clean exit)
});

module.exports = app;
