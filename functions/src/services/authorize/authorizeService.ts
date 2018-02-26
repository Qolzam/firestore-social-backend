import * as functions from 'firebase-functions'
import { adminDB, firestoreDB } from '../../data/index'
import { Comment } from '../../domain/comments/comment'
import * as _ from 'lodash'
import { Circle } from '../../domain/circles/circle'
import * as moment from 'moment'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import { SocialError } from '../../domain/common/index'
import { PhoneVerification } from '../../domain/authorize/phoneVerification'
import { UserStateType } from '../../domain/authorize/userStateType';

const plivo = require('plivo')
const request = require('request')
const cookieParser = require('cookie-parser')()
const bcrypt = require('bcrypt')
const saltRounds = 10

/**
 * Handle on user create
 */
export const onUserCreate = functions.auth.user().onCreate((event) => {
    return new Promise<void>((resolve, reject) => {
        const user = event.data;
        const followingCircle = new Circle();
        followingCircle.creationDate = moment().unix();
        followingCircle.name = `Following`;
        followingCircle.ownerId = user.uid;
        followingCircle.isSystem = true
        return firestoreDB.collection(`users`).doc(user.uid).collection(`circles`).add({ ...followingCircle })
            .then((result) => {
                resolve()
            }).catch(reject)

    })
})

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const validateFirebaseIdToken = (req: any, res: any, next: any) => {
    console.log('Check if request is authorized with Firebase ID token');
  
    if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
        !req.cookies.__session) {
      console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
          'Make sure you authorize your request by providing the following HTTP header:',
          'Authorization: Bearer <Firebase ID Token>',
          'or by passing a "__session" cookie.');
          res.status(403).send(new SocialError("ServerError/Unauthorized", "User is Unauthorized!"))
      return;
    }
  
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      console.log('Found "Authorization" header');
      // Read the ID Token from the Authorization header.
      idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
      console.log('Found "__session" cookie');
      // Read the ID Token from cookie.
      idToken = req.cookies.__session;
    }
    adminDB.auth().verifyIdToken(idToken).then((decodedIdToken) => {
      console.log('ID Token correctly decoded', decodedIdToken);
      req.user = decodedIdToken;
      return next();
    }).catch((error) => {
      console.error('Error while verifying Firebase ID token:', error);
      res.status(403).send(new SocialError("ServerError/Unauthorized", "User is Unauthorized!"))
    });
  }


const app = express()
const cors = require('cors')({ origin: true })
app.disable("x-powered-by")
app.use(cors)
app.use(bodyParser.json())
app.use(cookieParser);
app.use(validateFirebaseIdToken);

app.post('/verify', async (req, res) => {
    const remoteIpAddress = req.connection.remoteAddress
    const gReCaptcha = req.body['g-recaptcha-response']
    const code = Math.floor(1000 + Math.random() * 9000)
    const sourcePhoneNumber = functions.config().phone.sourceNumber
    const targetPhoneNumber = req.body['phoneNumber']
    const phoneMessage = 'Verification code from <APP_NAME> : <CODE>'
    const secretKey = functions.config().recaptcha.secretKey
    const userId = (req as any).user.uid

    if (gReCaptcha === undefined || gReCaptcha === '' || gReCaptcha === null) {
        return res.json(new SocialError("ServerError/NullCaptchaValue", "Please select captcha first"));
    }
    const verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + gReCaptcha + "&remoteip=" + remoteIpAddress;

    request(verificationURL, (error: any, response: any, body: any) => {
        body = JSON.parse(body);
        if (body.success !== undefined && !body.success) {
            console.log('Captha/responseError', error)
            return res.json(new SocialError("ServerError/ResponseCaptchaError", "Failed captcha verification"))
        }
        console.log('Captha/responseSuccess')
        const client = new plivo.Client(functions.config().plivo.authId, functions.config().plivo.authToken);        
        client.messages.create(sourcePhoneNumber,targetPhoneNumber,phoneMessage.replace('<CODE>', String(code)))
        .then(function (message_created: any) {
            const verifyRef = firestoreDB.collection('verification').doc(userId).collection('phone')
            .doc()
            const phoneVerification = new PhoneVerification(
                verifyRef.id, 
                String(code), 
                targetPhoneNumber, 
                moment().unix(),
                remoteIpAddress,
                userId
            )
            verifyRef.set({...phoneVerification})
            return res.status(200).json({ "verifyId": verifyRef.id });
        })
    });
})

app.post('/code', async (req, res) => {
    const remoteIpAddress = req.connection.remoteAddress
    const code = req.body['code']
    const verifyId = req.body['verifyId']
    const targetPhoneNumber = req.body['phoneNumber']
    const userId = (req as any).user.uid

    const verifyRef = firestoreDB
    .collection('verification')
    .doc(userId)
    .collection('phone')
    .doc(verifyId)

   return verifyRef.get().then((result) => {
        const phoneVerification = result.data() as PhoneVerification
        console.log(phoneVerification, req.body,
            !phoneVerification.isVerified, 
            remoteIpAddress === phoneVerification.remoteIpAddress,
            targetPhoneNumber === phoneVerification.phoneNumber,
            userId === phoneVerification.userId
        )
        if(
            !phoneVerification.isVerified 
            && remoteIpAddress === phoneVerification.remoteIpAddress
            && targetPhoneNumber === phoneVerification.phoneNumber
            && userId === phoneVerification.userId){
                if(Number(phoneVerification.code) === Number(code)) {
                    const batch = firestoreDB.batch()
                    batch.update(result.ref, {isVerified: true})

                    const protectedUserRef = firestoreDB
                    .collection('protectedUser')
                    .doc(userId)
                    batch.update(protectedUserRef, {phoneVerified: true})
                    batch.commit().then(() => {
                        console.log('ServerSuccess/CodeAccepted', 'CodeAccepted')
                        const additionalClaims = {
                            phoneVerified: true
                          }
                        adminDB.auth().createCustomToken(userId, additionalClaims)
                            .then(function(token) {
                                // Send token back to client
                                return res.status(200).json({token})
                            })
                            .catch(function(error) {
                                console.log("Error creating custom token:", error);
                            });
                    })
                    .catch((error) => {
                        console.log('ServerError/CanUpdateState', error)
                        res.json(new SocialError("ServerError/CanUpdateState", "Can not update user state!"))
                    })
                } else {
                    res.status(403).json(new SocialError("ServerError/WrongCode", "The code is not correct!"))
                }
            } else {
                res.status(403).send(new SocialError("ServerError/Unauthorized", "User is Unauthorized!"))
            }
    })
    .catch((error) => {
        console.log('ServerError/VerifyIdNotAccept', error)
        return res.json(new SocialError("ServerError/VerifyIdNotAccept", "We coudn't for you verification!"))
    })
    

})


/**
 * Register user
 */
app.post('/register', async (req, res) => {
    const remoteIpAddress = req.connection.remoteAddress
    const userName = req.body['userName']
    const password = req.body['password']
    const email = req.body['email']
    const fullName = req.body['fullName']
    const avatar = req.body['avatar']
    const userId = (req as any).user.uid

    firestoreDB.doc(`userInfo/${userId}`).set(
        {
          id: userId,
          state: 'active',
          avatar,
          fullName,
          creationDate: moment().unix(),
          email
        }
      ).then(() => {
        bcrypt.hash(password, saltRounds, function(error: any, hash: any) {
            // Store hash in your password DB.
            firestoreDB.collection('protectedUser').doc(userId)
            .set({
                userName: userName,
                password: hash,
                phoneVerified: false
            }).then(() => {
                return res.status(200).json({})
            }).catch((error: any) => {
                res.status(500).send(new SocialError("ServerError/NotStoreProtectedUser", "Can not store protected user!"))
            })
          })
      }).catch((error: any) => {
        res.status(500).send(new SocialError("ServerError/NotStoreUserInfo", "Can not store user info!"))
    })
})

/**
 * Phone verification
 */
export const phoneVerification = functions.https.onRequest(app)