var UserController = require('../controllers/UserController');
var SettingsController = require('../controllers/SettingsController');
var request = require('request');
var json2xls = require('json2xls');

jwt = require('jsonwebtoken');
JWT_SECRET = process.env.JWT_SECRET;


var uuidv4 = require('uuid/v4');

module.exports = function (router) {

  function getToken(req) {
    return req.headers['x-access-token'];
  }

  /**
   * Using the access token provided, check to make sure that
   * you are, indeed, an admin.
   */
  function isAdmin(req, res, next) {

    var token = getToken(req);

    UserController.getByToken(token, function (err, user) {

      if (err) {
        return res.status(500).send(err);
      }

      if (user && user.admin) {
        req.user = user;
        return next();
      }

      return res.status(401).send({
        message: 'Get outta here, punk!'
      });

    });
  }

  /**
   * [Users API Only]
   *
   * Check that the id param matches the id encoded in the
   * access token provided.
   *
   * That, or you're the admin, so you can do whatever you
   * want I suppose!
   */
  function isOwnerOrAdmin(req, res, next) {
    var token = getToken(req);
    var userId = req.params.id;

    UserController.getByToken(token, function (err, user) {

      if (err || !user) {
        return res.status(500).send(err);
      }

      if (user._id == userId || user.admin) {
        return next();
      }
      return res.status(400).send({
        message: 'Token does not match user id.'
      });
    });
  }

  /**
   * Default response to send an error and the data.
   * @param  {[type]} res [description]
   * @return {[type]}     [description]
   */
  function defaultResponse(req, res) {
    return function (err, data) {
      if (err) {
        // SLACK ALERT!
        if (process.env.NODE_ENV === 'production') {
          request
            .post(process.env.SLACK_HOOK,
            {
              form: {
                payload: JSON.stringify({
                  "text":
                    "``` \n" +
                    "Request: \n " +
                    req.method + ' ' + req.url +
                    "\n ------------------------------------ \n" +
                    "Body: \n " +
                    JSON.stringify(req.body, null, 2) +
                    "\n ------------------------------------ \n" +
                    "\nError:\n" +
                    JSON.stringify(err, null, 2) +
                    "``` \n"
                })
              }
            },
            function (error, response, body) {
              return res.status(500).send({
                message: "Your error has been recorded, we'll get right on it!" + error
              });
            }
            );
        } else {
          return res.status(500).send(err);
        }
      } else {
        return res.json(data);
      }
    };
  }
  router.get('/users/exportcsv', isAdmin, function(req, res, next){

      var type = req.query.type;
      var partial = req.query.partial;
      var adminID = req.query.adminID;
      var filename = " users" + ".csv";
      if (type != "undefined") filename = type + filename;


      var dataArray;
      var mongoose = require('mongoose');
      var csv      = require('csv-express');

      var UserDB = mongoose.model('User');
      var query = {};
      var queryAdmin = {};
      var lastAdminLastExportAccepted;
      var JSONUser;

      function getMeow(lastAdminLastExportAccepted) {
        UserDB.find(query, {email: 1, profile: 1, verified:1, status: 1}).lean().exec({}, function(err, users) {
          if (err){
            res.send(err);
            console.log(err);
          } else {
            JSONUser=JSON.stringify(users);
            var xls = json2xls(json);
            fs.writeFileSync('data.xlsx', xls, 'binary');
            users = users.map(function(user) {
              // console.log("user was admitted at " + user.status.admittedAt);
              user.name = user.profile.name;
              user.admitted = user.status.admitted;
              user.confirmed = user.status.confirmed;
              delete user.profile;
              delete user.status;
              delete user._id;
              return user;
            });
            res.statusCode = 200;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader("x-filename", filename);
            res.status(200).csv(users, true);
          }
        });
      }

      if (type != "undefined") {
          query["status." + type] = true;
          queryAdmin["_id"] = adminID;
      }


      UserDB.findOne(queryAdmin, 'adminLastExportAccepted', function (err, admin) {
        if (err)
          return handleError(err);
        else {
          lastAdminLastExportAccepted = admin.adminLastExportAccepted;

          if (type == "admitted" && partial) {
            // console.log(type + " " + adminID);
            admin.adminLastExportAccepted = Date.now();
            admin.save();
            query["status.admittedAt"] = {$gt: lastAdminLastExportAccepted};
            query["status.confirmed"] = false;
          }

          getMeow(lastAdminLastExportAccepted);
        }
      });
    });

  /**
   *  API!
   */

  // ---------------------------------------------
  // Users
  // ---------------------------------------------

  /**
   * [ADMIN ONLY]
   *
   * GET - Get all users, or a page at a time.
   * ex. Paginate with ?page=0&size=100
   */
  router.get('/users', isAdmin, function (req, res) {
    var query = req.query;

    if (query.page && query.size) {

      UserController.getPage(query, defaultResponse(req, res));

    } else {

      UserController.getAll(defaultResponse(req, res));

    }
  });

  /**
   * [ADMIN ONLY]
   */
  router.get('/users/stats', isAdmin, function (req, res) {
    UserController.getStats(defaultResponse(req, res));
  });

  /**
   * [OWNER/ADMIN]
   *
   * GET - Get a specific user.
   */
  router.get('/users/:id', isOwnerOrAdmin, function (req, res) {
    UserController.getById(req.params.id, defaultResponse(req, res));
  });

  /**
   * [OWNER/ADMIN]
   *
   * PUT - Update a specific user's profile.
   */
  router.put('/users/:id/profile', isOwnerOrAdmin, function (req, res) {
    var profile = req.body.profile;
    var id = req.params.id;

    UserController.updateProfileById(id, profile, defaultResponse(req, res));
  });

  /**
   * [OWNER/ADMIN]
   *
   * PUT - Update a specific user's confirmation information.
   */
  router.put('/users/:id/confirm', isOwnerOrAdmin, function (req, res) {
    var confirmation = req.body.confirmation;
    var id = req.params.id;

    UserController.updateConfirmationById(id, confirmation, defaultResponse(req, res));
  });

  /**
   * [OWNER/ADMIN]
   *
   * POST - Decline an acceptance.
   */
  router.post('/users/:id/decline', isOwnerOrAdmin, function (req, res) {
    var confirmation = req.body.confirmation;
    var id = req.params.id;

    UserController.declineById(id, defaultResponse(req, res));
  });

  /**
   * Update a user's password.
   * {
   *   oldPassword: STRING,
   *   newPassword: STRING
   * }
   */
  router.put('/users/:id/password', isOwnerOrAdmin, function (req, res) {
    return res.status(304).send();
    // Currently disable.
    // var id = req.params.id;
    // var old = req.body.oldPassword;
    // var pass = req.body.newPassword;

    // UserController.changePassword(id, old, pass, function(err, user){
    //   if (err || !user){
    //     return res.status(400).send(err);
    //   }
    //   return res.json(user);
    // });
  });

  /**
   * Admit a user. ADMIN ONLY, DUH
   *
   * Also attaches the user who did the admitting, for liabaility.
   */
  router.post('/users/:id/admit', isAdmin, function (req, res) {
    // Accept the hacker. Admin only
    var id = req.params.id;
    var user = req.user;
    UserController.admitUser(id, user, defaultResponse(req, res));
  });

  /**
   * Check in a user. ADMIN ONLY, DUH
   */
  router.post('/users/:id/checkin', isAdmin, function (req, res) {
    var id = req.params.id;
    var user = req.user;
    UserController.checkInById(id, user, defaultResponse(req, res));
  });

  /**
   * Check in a user. ADMIN ONLY, DUH
   */
  router.post('/users/:id/checkout', isAdmin, function (req, res) {
    var id = req.params.id;
    var user = req.user;
    UserController.checkOutById(id, user, defaultResponse(req, res));
  });

  /**
   * Send emails to unsubmitted applicants
   */
  router.post('/users/sendlagemails', isAdmin, function(req, res){
    UserController.sendEmailsToNonCompleteProfiles(defaultResponse(req, res));
  });

    /**
   * Send emails to accepted applicants
   */
  router.post('/users/:email/sendacceptemails/', isAdmin, function(req, res){
    var email = req.params.email;
    UserController.sendEmailsToAdmitted(email, defaultResponse(req, res));
  });

  router.post('/users/:email/sendpaymentemails/', isAdmin, function(req, res){
    var email = req.params.email;
    UserController.sendPaymentVerification(email, defaultResponse(req, res));
  });
  /**
   * Make user an admin
   */
  router.post('/users/:id/makeadmin', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.makeAdminById(id, user, defaultResponse(req, res));
  });

  /**
   * Demote user
   */
  router.post('/users/:id/removeadmin', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.removeAdminById(id, user, defaultResponse(req, res));
  });

  router.post('/users/:id/acceptpayment', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.acceptPayment(id, user, defaultResponse(req, res));
  });

  router.post('/users/:id/unacceptpayment', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.unacceptPayment(id, user, defaultResponse(req, res));
  });



  // ---------------------------------------------
  // Settings [ADMIN ONLY!]
  // ---------------------------------------------

  /**
   * Get the public settings.
   * res: {
   *   timeOpen: Number,
   *   timeClose: Number,
   *   timeToConfirm: Number,
   *   acceptanceText: String,
   *   confirmationText: String,
   *   allowMinors: Boolean
   * }
   */
  router.get('/settings', function (req, res) {
    SettingsController.getPublicSettings(defaultResponse(req, res));
  });

  /**
   * Update the acceptance text.
   * body: {
   *   text: String
   * }
   */
  router.put('/settings/waitlist', isAdmin, function (req, res) {
    var text = req.body.text;
    SettingsController.updateField('waitlistText', text, defaultResponse(req, res));
  });

  /**
   * Update the acceptance text.
   * body: {
   *   text: String
   * }
   */
  router.put('/settings/acceptance', isAdmin, function (req, res) {
    var text = req.body.text;
    SettingsController.updateField('acceptanceText', text, defaultResponse(req, res));
  });

  /**
   * Update the confirmation text.
   * body: {
   *   text: String
   * }
   */
  router.put('/settings/confirmation', isAdmin, function (req, res) {
    var text = req.body.text;
    SettingsController.updateField('confirmationText', text, defaultResponse(req, res));
  });

  /**
   * Update the confirmation date.
   * body: {
   *   time: Number
   * }
   */
  router.put('/settings/confirm-by', isAdmin, function (req, res) {
    var time = req.body.time;
    SettingsController.updateField('timeConfirm', time, defaultResponse(req, res));
  });

  /**
   * Set the registration open and close times.
   * body : {
   *   timeOpen: Number,
   *   timeClose: Number
   * }
   */
  router.put('/settings/times', isAdmin, function (req, res) {
    var open = req.body.timeOpen;
    var close = req.body.timeClose;
    SettingsController.updateRegistrationTimes(open, close, defaultResponse(req, res));
  });

  /**
   * Get the whitelisted emails.
   *
   * res: {
   *   emails: [String]
   * }
   */
  router.get('/settings/whitelist', isAdmin, function (req, res) {
    SettingsController.getWhitelistedEmails(defaultResponse(req, res));
  });

  /**
   * [ADMIN ONLY]
   * {
   *   emails: [String]
   * }
   * res: Settings
   *
   */
  router.put('/settings/whitelist', isAdmin, function (req, res) {
    var emails = req.body.emails;
    SettingsController.updateWhitelistedEmails(emails, defaultResponse(req, res));
  });

  /**
   * Ping route for elastic load balancer
   */
  router.get('/ping', (req, res) => {
    res.sendStatus(200);
  });

  /* [ADMIN ONLY]
   * {
   *   allowMinors: Boolean
   * }
   * res: Settings
   *
   */
  router.put('/settings/minors', isAdmin, function (req, res) {
    var allowMinors = req.body.allowMinors;
    SettingsController.updateField('allowMinors', allowMinors, defaultResponse(req, res));
  });

};
