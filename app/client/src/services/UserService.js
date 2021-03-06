angular.module('reg')
    .factory('UserService', [
        '$http',
        'Session',
        function ($http, Session) {

            const users = '/api/users';
            const base = users + '/';

            return {

                // ----------------------
                // Basic Actions
                // ----------------------
                getCurrentUser: function () {
                    return $http.get(base + Session.getUserId());
                },

                get: function (id) {
                    return $http.get(base + id);
                },

                getAll: function () {
                    return $http.get(base);
                },
                getCheckedPage: function (page, size, text) {
                    return $http.get(base + 'tobechecked' + '?' + $.param(
                        {
                            text: text,
                            page: page ? page : 0,
                            size: size ? size : 50
                        })
                    );
                },
                getCheckedPageSponsor: function (page, size, text) {
                    return $http.get(base + 'sponsorList' + '?' + $.param(
                        {
                            text: text,
                            page: page ? page : 0,
                            size: size ? size : 50
                        })
                    );
                },

                getAllCompaniesSelected: function () {
                    return $http.get(base + 'sponsorsSelected');
                },
                getAllAdmitted: function () {
                    return $http.get(base + 'allAdmitted');
                },
                getAllConfirmed: function () {
                    return $http.get(base + 'allConfirmed');
                },
                getAllUnpaid: function () {
                    return $http.get(base + 'allUnpaid');
                },

                getAllFinal: function () {
                    return $http.get(base + 'allFinal');
                },

                getPage: function (page, size, text, statusFilters) {
                    return $http.get(users + '?' + $.param(
                        {
                            text: text,
                            page: page ? page : 0,
                            size: size ? size : 100,
                            statusFilters: statusFilters ? statusFilters : {}
                        })
                    );
                },

                updateProfile: function (id, profile) {
                    return $http.put(base + id + '/profile', {
                        profile: profile
                    });
                },

                updateConfirmation: function (id, confirmation) {
                    return $http.put(base + id + '/confirm', {
                        confirmation: confirmation
                    });
                },

                declineAdmission: function (id) {
                    return $http.post(base + id + '/decline');
                },

                // -------------------------
                // Admin Only
                // -------------------------

                getStats: function () {
                    return $http.get(base + 'stats');
                },

                admitUser: function (id) {
                    return $http.post(base + id + '/admit');
                },
                checkIn: function (id) {
                    return $http.post(base + id + '/checkin');
                },
                checkOut: function (id) {
                    return $http.post(base + id + '/checkout');
                },
                makeAdmin: function (id) {
                    return $http.post(base + id + '/makeadmin');
                },
                acceptPayment: function (id) {
                    return $http.post(base + id + '/acceptpayment');
                },
                unacceptPayment: function (id) {
                    return $http.post(base + id + '/unacceptpayment');
                },
                sendLaggerPaymentEmails: function () {
                    return $http.post(base + 'sendlagpayemails');
                },
                sendSponsor: function () {
                    return $http.post(base + 'sendSponsorEmails');
                },
                removeAdmin: function (id) {
                    return $http.post(base + id + '/removeadmin');
                },
                sendLaggerEmails: function () {
                    return $http.post(base + 'sendlagemails');
                },
                sendAcceptEmails: function (email) {
                    return $http.post(base + email + '/sendacceptemails');
                },
                sendPaymentEmails: function (email) {
                    return $http.post(base + email + '/sendpaymentemails');
                },
            };
        }
    ]);
