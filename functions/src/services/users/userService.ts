
import * as functions from 'firebase-functions'
import { adminDB, firestoreDB } from '../../data/index';
import { Comment } from '../../domain/comments/comment';
import * as express from 'express';
import { User } from '../../domain/users/user';
import { HttpStatusCode } from '../../data/httpStatusCode';
import { SocialError } from '../../domain/common/index';


const app = express()
app.disable("x-powered-by")

/**
 * Get users by user identifier list
 * @param userIdList A list of user key
 */
const getUserByListId = async (userIdList: string[]) => {
    return new Promise<{[userId: string]: User}>((resolve, reject) => {
        let users: {[userId: string]: User} = {}
        if( userIdList && userIdList.length > 0) {
            userIdList.forEach((userId: string) => {
               firestoreDB.collection('userInfo').doc(userId).get().then((result) => {
                  let user = result.data() as User
                  users = {
                      ...users,
                      [userId]: {
                          ...user
                      }
                  }
               }).catch(reject)
            })
            resolve(users)
        }
    })
}

/**
 * Get users by  http trigget
 * Route ['users/']
 * Method [POST]
 */
app.post('/', async (request, response) => {
    const userIdList = JSON.parse(request.body)
    if(userIdList && Array.isArray(userIdList) && userIdList.length > 0) {
        getUserByListId(userIdList)
        .then((users) => {
            response.status(HttpStatusCode.OK).send(users)
        })

    }
    else {
        // Send baack bad request happened
        return response.status(HttpStatusCode.BadRequest)
        .send(new SocialError('UserService/UserIdListNotValid',
        `
        User list is undefined or not array or the length of array is not grater than zero!
        ${JSON.stringify(userIdList)}
        `))
    }

})

/**
 * Routing posts
 */
export const users =  functions.https.onRequest(app)
