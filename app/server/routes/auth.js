const UserController = require('../controllers/UserController');

module.exports = function (router) {

    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    /**
     * Login a user with a username (email) and password.
     * Find em', check em'.
     * Pass them an authentication token on success.
     * Otherwise, 401. You fucked up.
     *
     * body {
     *  email: email,
     *  password: password
     *  token: ?
     * }
     *
     */
    router.post('/login',
        function (req, res) {
            const email = req.body.email;
            const password = req.body.password;
            const token = req.body.token;

            if (token) {
                UserController.loginWithToken(token,
                    function (err, token, user) {
                        if (err || !user) {
                            return res.status(400).send(err);
                        }
                        return res.json({
                            token: token,
                            user: user
                        });
                    });
            } else {
                UserController.loginWithPassword(email, password,
                    function (err, token, user) {
                        if (err || !user) {
                            return res.status(400).send(err);
                        }
                        return res.json({
                            token: token,
                            user: user
                        });
                    });
            }

        });

    /**
     * Register a user with a username (email) and password.
     * If it already exists, then don't register, duh.
     *
     * body {
     *  email: email,
     *  password: password
     * }
     *
     */
    router.post('/register',
        function (req, res) {
            // Register with an email and password
            const email = req.body.email;
            const password = req.body.password;
            const confirmpassword = req.body.confirmpassword;

            UserController.createUser(email, password, confirmpassword,
                function (err, user) {
                    if (err) {
                        return res.status(400).send(err);
                    }
                    return res.json(user);
                });
        });

    router.post('/reset',
        function (req, res) {
            const email = req.body.email;
            if (!email) {
                return res.status(400).send();
            }

            UserController.sendPasswordResetEmail(email, function (err) {
                if (err) {
                    return res.status(400).send(err);
                }
                return res.json({
                    message: 'Email Sent'
                });
            });
        });

    /**
     * Reset user's password.
     * {
     *   token: STRING
     *   password: STRING,
     * }
     */
    router.post('/reset/password', function (req, res) {
        const pass = req.body.password;
        const token = req.body.token;

        UserController.resetPassword(token, pass, function (err, user) {
            if (err || !user) {
                return res.status(400).send(err);
            }
            return res.json(user);
        });
    });

    /**
     * Resend a password verification email for this user.
     *
     * body {
     *   id: user id
     * }
     */
    router.post('/verify/resend',
        function (req, res) {
            const id = req.body.id;
            if (id) {
                UserController.sendVerificationEmailById(id, function (err, user) {
                    if (err || !user) {
                        return res.status(400).send();
                    }
                    return res.status(200).send();
                });
            } else {
                return res.status(400).send();
            }
        });

    /**
     * Verify a user with a given token.
     */
    router.get('/verify/:token',
        function (req, res) {
            const token = req.params.token;
            UserController.verifyByToken(token, function (err, user) {

                if (err || !user) {
                    return res.status(400).send(err);
                }

                return res.json(user);

            });
        });

};