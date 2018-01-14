import * as functions from 'firebase-functions'
import { adminDB, firestoreDB } from '../../data/index'
import { Comment } from '../../domain/comments/comment'
import * as _ from 'lodash'
import { Circle } from '../../domain/circles/circle'
import * as moment from 'moment'

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
        return firestoreDB.collection(`users`).doc(user.uid).collection(`circles`).add({...followingCircle})
        .then((result) => {
            resolve()
        }).catch(reject)

    })
})