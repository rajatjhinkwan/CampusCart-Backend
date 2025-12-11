// services/index.js
const emailService = require('./emailService');
const smsService = require('./smsService');
const pushNotificationService = require('./pushNotificationService');
const paymentService = require('./paymentService');

module.exports = {
  emailService,
  smsService,
  pushNotificationService,
  paymentService,
};
