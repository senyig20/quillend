// Load the dotfiles.
require('dotenv').load({silent: true});

var express         = require('express');

// Middleware!
var bodyParser      = require('body-parser');
var methodOverride  = require('method-override');
var morgan          = require('morgan');
var cookieParser    = require('cookie-parser');

// cors configuration
var cors = require('cors')

var mongoose        = require('mongoose');
var port            = process.env.PORT || 3000;
var database        = process.env.DATABASE || process.env.MONGODB_URI || "mongodb://localhost:27017";

var settingsConfig  = require('./config/settings');
var adminConfig     = require('./config/admin');

var app             = express();

// Connect to mongodb
mongoose.connect(database, {useMongoClient: true});
app.use(cors())

app.use(morgan('dev'));
app.use(cookieParser());

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(methodOverride());

app.use(express.static(__dirname + '/app/client'));

// Routers =====================================================================

var apiRouter = express.Router();
require('./app/server/routes/api')(apiRouter);
app.use('/api', apiRouter);

var authRouter = express.Router();
require('./app/server/routes/auth')(authRouter);
app.use('/auth', authRouter);

require('./app/server/routes')(app);

// listen (start app with node server.js) ======================================
app.listen(port);
console.log("App listening on port " + port);
angular
    .module('app')
    .factory('$exceptionHandler', function ($log) {
      var airbrake = new airbrakeJs.Client({
        projectId: 215046,
        projectKey: 'd809594fe4f63dbbb10cad6bca28df2c'
      });

      airbrake.addFilter(function (notice) {
        notice.context.environment = 'production';
        return notice;
      });

      return function (exception, cause) {
        $log.error(exception);
        airbrake.notify({error: exception, params: {angular_cause: cause}});
      };
    });
