
import * as functions from 'firebase-functions'
import { adminDB, firestoreDB } from '../../data/index'
import { Feed } from '../../domain/common/feed'
import { emailAPI } from '../../api/emailAPI'
import { Email } from '../../domain/common/email'

const gmailEmail = functions.config().gmail.email
const appName = functions.config().setting.appname

export const onCreateFeedback = functions.firestore
.document(`feeds/{feedId}`)
.onCreate((event) => {
  return new Promise<void>((resolve, reject) => {
    const feed: Feed =  event.data.data()
    const from = `${appName} Feedback <${gmailEmail}>`
    const to = "amir.gholzam@gmail.com"
    const subject = `${feed.feedType} -${feed.user!.email} - ${event.data.createTime}`
    const text = `
    Feedback type: ${feed.feedType}
    Feedback ID: ${feed.id}
  
    User Email: ${feed.user!.email}
    User Fullname: ${feed.user!.fullName}
    User ID: ${feed.user!.userId}
  
    Feedback: ${feed.text}
    `
    /**
     * Send email
     */
    emailAPI.sendEmail(new Email(
      from,
      to,
      subject,
      text
    )).then(() => {
      resolve()
    }).catch((error) => {
      reject()
    })

  })
  
   })