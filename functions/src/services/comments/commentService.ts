
import * as functions from 'firebase-functions'
import { adminDB, firestoreDB } from '../../data/index'
import { Comment } from '../../domain/comments/comment'
import * as _ from 'lodash'

/**
 * Add comment
 */
export const onAddComment = functions.firestore
  .document(`comments/{commentId}`)
  .onCreate((dataSnapshot, event) => {
    var newComment = dataSnapshot.data() as Comment
    const commentId: string = event.params.commentId
    if (newComment) {
      const postRef = firestoreDB.doc(`posts/${newComment.postId}`)

      // Get post
      var postId = newComment.postId
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
              transaction.update(postRef, { comments: { ...comments, [commentId]: newComment } })
            } else {
              let sortedObjects = { ...comments, [commentId]: newComment }
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
  .onDelete((dataSnapshot, context) => {
    return new Promise((resolve, reject) => {
      const deletedComment = dataSnapshot.data() as Comment
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
