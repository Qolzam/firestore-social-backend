import * as functions from 'firebase-functions'
import { adminDB, firestoreDB } from '../../data/index'
import * as _ from 'lodash'
import * as moment from 'moment'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import { SocialError } from '../../domain/common/index'
import { PhoneVerification } from '../../domain/authorize/phoneVerification'
import { UserStateType } from '../../domain/authorize/userStateType';
const bcrypt = require('bcrypt')

const cookieParser = require('cookie-parser')()


const app = express()
const cors = require('cors')({ origin: true })
app.disable("x-powered-by")
app.use(cors)
app.use(bodyParser.json())
app.use(cookieParser);



app.post('/login', async (req, res) => {
    const remoteIpAddress = req.connection.remoteAddress
    const userName = req.body['userName']
    const password = req.body['password']
    console.log(userName, password)
    firestoreDB.collection('protectedUser').where('userName', '==', userName)
    .get().then((result) => {
        console.log('result', result.size, result.empty)
        if(result && !result.empty && result.size === 1) {
            const doc =  result.docs[0]
            console.log(doc)
            const data = doc.data()
            console.log('data = ', data)
            bcrypt.compare(password, data.password, (error: any, isSame: any) => {
                if(isSame === true) {
                    const additionalClaims = {
                        phoneVerified: data.phoneVerified,
                        userName: data.userName
                      }
                    adminDB.auth().createCustomToken(doc.id, additionalClaims)
                        .then((token) => {
                            // Send token back to client
                            return res.status(200).json({token})
                        })
                        .catch((error) => {
                            console.log("Error creating custom token:", error)
                           return res.status(500).send(new SocialError("ServerError/CreateToke", "Error on creating token!"))
                        })
                } else {
                   return res.status(500).send(new SocialError("ServerError/WrongPassword", "Password is wrong!"))
                }
            })

        } else {
           return res.status(500).send(new SocialError("ServerError/WrongUserName", "User name is wrong!"))
        }
    })
    .catch((error) => {
        return res.status(500).send(new SocialError("ServerError/FirestoreGetData", error))
    })
})


/**
 * Phone verification
 */
export const publicAuth = functions.https.onRequest(app)