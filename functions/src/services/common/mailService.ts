
import * as functions from 'firebase-functions'
import { adminDB, firestoreDB } from '../../data/index';
import { Feed } from '../../domain/common/feed';
const nodemailer = require('nodemailer');

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

export const onCreateFeedback = functions.firestore
.document(`feeds/{feedId}`)
.onCreate((event) => {
  return new Promise((resolve, reject) => {
    const feed: Feed =  event.data.data()
      const mailOptions = {
        from: `React Social Network Feedback <noreply@love-social.com>`,
        to: "amir.gholzam@live.com",
        subject: `${feed.feedType} -${feed.user!.email} - ${event.data.createTime}`,
        text: `
        Feedback type: ${feed.feedType}
        Feedback ID: ${feed.id}

        User Email: ${feed.user!.email}
        User Fullname: ${feed.user!.fullName}
        User ID: ${feed.user!.userId}
        
        Feedback: ${feed.text}
        `
      }
       mailTransport.sendMail(mailOptions)
        .then(() => {
          console.log(`New subscription confirmation email sent to:`)
          resolve()
      })
        .catch((error: any) => {
          console.error('There was an error while sending the email:', error)
          reject(error)
        });
        

  })
   })