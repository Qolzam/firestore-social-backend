import * as functions from 'firebase-functions'
import { Email } from '../domain/common/email'
const nodemailer = require('nodemailer')

// Set variable for this project
// firebase functions:config:set gmail.email="myusername@gmail.com" gmail.password="secretpassword"
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword
  }
})

/**
 * Send email
 */
const sendEmail = (email: Email) => {
    return new Promise((resolve, reject) => {

          const mailOptions = {
            from: email.from,
            to: email.to,
            subject: email.subject,
            html: email.html
          }
           mailTransport.sendMail(mailOptions)
            .then(() => {
              console.log(`New subscription confirmation email sent to: ${email.to}`)
              resolve()
          })
            .catch((error: any) => {
              console.error('There was an error while sending the email:', error)
              reject(error)
            });
      })
}

export const emailAPI ={
    sendEmail
}