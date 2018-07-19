
import * as functions from 'firebase-functions'
import { adminDB, firestoreDB } from '../../data/index'
import { Comment } from '../../domain/comments/comment'
import * as _ from 'lodash'

/**
 * Add comment
 */
export const onAddComment = functions.firestore
  .document(`comments/{commentId}`)
  .onCreate((snap, context) => {
    // changed from type Comment from this variable to allow compile
    var newValue = snap.data()
    const commentId: string = context.params.commentId
    if (newValue) {
      const postRef = firestoreDB.doc(`posts/${newValue.postId}`)

      // Get post
      var postId = newValue.postId
      /**
       * Increase comment counter and create three comments' slide preview
       */
     return firestoreDB.runTransaction((transaction) => {
        return transaction.get(postRef).then((postDoc) => {
          if (postDoc.exists) {
            const postData = postDoc.data()
            const commentCount = postData.commentCounter + 1
            transaction.update(postRef, { commentCounter: commentCount })
            let comments = postData.comments
            if (!comments) {
              comments = {}
            }
            if (commentCount < 4) {
              transaction.update(postRef, { comments: { ...comments, [commentId]: newValue } })
            } else {
              let sortedObjects = { ...comments, [commentId]: newValue }
              // Sort posts with creation date
              sortedObjects = _.fromPairs(_.toPairs(sortedObjects)
                .sort((a: any, b: any) => parseInt(b[1].creationDate, 10) - parseInt(a[1].creationDate, 10)).slice(0, 3))

              transaction.update(postRef, { comments: { ...sortedObjects } })
            }
          }
        })
      })
    }
  })

/**
 * Delete comment
 */
export const onDeleteComment = functions.firestore
  .document(`comments/{commentId}`)
  .onDelete((change, context) => {
    return new Promise((resolve, reject) => {
      // changed from type Comment from this variable to allow compile
      const deletedComment = change.data();

      const commentId: string = context.params.commentId
      const postId: string = deletedComment.postId
  
      const postRef = firestoreDB.doc(`posts/${postId}`)
      firestoreDB.collection(`comments`)
      .where(`postId`, `==`, postId)
      .orderBy('creationDate', 'desc')
      .get().then((result) => {
        let parsedData: {[commentId: string]: Comment} = {}
        let index = 0
        result.forEach((comment) => {
          if (index < 3) {
            const commentData = comment.data() as Comment
            commentData.id = comment.id
            
            parsedData = {
              ...parsedData,
              [comment.id]: {
                ...commentData
              }
            }

          }
         index++
        })
        postRef.update({comments: parsedData, commentCounter: result.size})
        .then(() => {
          resolve()
        })
      }).catch(reject)
    })
    
  })
